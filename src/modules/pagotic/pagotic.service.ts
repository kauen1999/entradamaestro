// src/modules/pagotic/pagotic.service.ts
import { getPagoticToken } from "./pagotic.auth";
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";
import { toPagoticError } from "./pagotic.errors";
import {
  buildFiltersQuery,
  buildSortsQuery,
  withTimeout,
  // (só usamos para checagens/formatos)
} from "./pagotic.utils";
import type {
  CreatePagoticPayment,
  PagoticGroupRequest,
  PagoticListFilter,
  PagoticListResponse,
  PagoticPaymentResponse,
  PagoticRefundRequest,
  PagoticDistributionRequest,
} from "./pagotic.types";

type EnvLike = Partial<Record<string, string | undefined>>;

function isPublicHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    const isHttp = u.protocol === "http:" || u.protocol === "https:";
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".local");
    return isHttp && !isLocal;
  } catch {
    return false;
  }
}

function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

export class PagoticService {
  constructor(private readonly env: EnvLike = process.env) {}

  private baseUrl(): string {
    const raw =
      (this.env.PAGOTIC_BASE_URL ||
        this.env.PAGOTIC_API_URL ||
        "https://api.paypertic.com") as string;
    return raw.replace(/\/+$/, "");
  }

  private timeoutMs(): number {
    const raw = this.env.PAGOTIC_TIMEOUT_MS;
    return raw ? Number(raw) : 15_000;
  }

  private envUrl(
    k: "PAGOTIC_RETURN_URL" | "PAGOTIC_BACK_URL" | "PAGOTIC_NOTIFICATION_URL",
  ): string | undefined {
    const v = this.env[k];
    return isPublicHttpUrl(v) ? v : undefined;
  }

  private currency(): string {
    return this.env.PAGOTIC_CURRENCY || this.env.PAGOTIC_CURRENCY_ID || "ARS";
  }

  private authEnv(): NodeJS.ProcessEnv {
    return { ...process.env, ...this.env } as NodeJS.ProcessEnv;
  }

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getPagoticToken(this.authEnv());
    const signal = withTimeout(this.timeoutMs());
    const url = `${this.baseUrl()}${path}`;

    console.log("[PagoTIC][HTTP] →", init.method ?? "GET", url);
    const rsp = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      signal,
    });
    console.log("[PagoTIC][HTTP] ←", rsp.status, url);
    return rsp;
  }

  // --- Core operations ---

  async createPayment(input: CreatePagoticPayment): Promise<PagoticPaymentResponse> {
    const return_url =
      normalizeInputUrl(input.return_url) ?? this.envUrl("PAGOTIC_RETURN_URL");
    const back_url =
      normalizeInputUrl(input.back_url) ?? this.envUrl("PAGOTIC_BACK_URL");
    const notification_url =
      normalizeInputUrl(input.notification_url) ??
      this.envUrl("PAGOTIC_NOTIFICATION_URL");

    if (!notification_url) {
      console.error("[PagoTIC][createPayment] FAIL: notification_url ausente/Inválida", {
        env_notification_url: this.env.PAGOTIC_NOTIFICATION_URL,
        input_notification_url: input.notification_url,
      });
      throw new Error(
        "notification_url ausente. Configure PAGOTIC_NOTIFICATION_URL no ambiente ou envie uma URL pública válida."
      );
    }

    const body: CreatePagoticPayment = {
      ...input,
      // se você estiver usando cartão online, garanta que o front mande type: "online"
      // não forçamos aqui para não quebrar cupons/transfer/etc.
      collector_id: input.collector_id ?? this.env.PAGOTIC_COLLECTOR_ID,
      currency_id: input.currency_id ?? this.currency(),
      return_url,
      back_url,
      notification_url,
    };

    // Log de preview (sem dados sensíveis)
    console.log("[PagoTIC][createPayment] request.preview", {
      external_transaction_id: body.external_transaction_id,
      type: body.type,
      detailsCount: Array.isArray(body.details) ? body.details.length : 0,
      hasPayer: Boolean(body.payer),
      pmCount: Array.isArray(body.payment_methods) ? body.payment_methods.length : 0,
      return_url: body.return_url,
      back_url: body.back_url,
      notification_url: body.notification_url,
    });

    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagos, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const text = await rsp.text();
    console.log("[PagoTIC][createPayment] raw response:", rsp.status, text.slice(0, 800));

    if (!rsp.ok) {
      // Devolve erro detalhado
      try {
        const j = JSON.parse(text);
        console.error("[PagoTIC][createPayment] ERROR JSON:", j);
      } catch {
        console.error("[PagoTIC][createPayment] ERROR TXT:", text);
      }
      throw await toPagoticError(rsp);
    }

    try {
      return JSON.parse(text) as PagoticPaymentResponse;
    } catch {
      throw new Error(`Invalid JSON PagoTIC: ${text.slice(0, 200)}`);
    }
  }

  async getPaymentById(id: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosById(id));
    const text = await rsp.text();
    console.log("[PagoTIC][getPaymentById] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as PagoticPaymentResponse;
  }

  async listPayments(params: {
    page?: number;
    limit?: number;
    filters: PagoticListFilter[];
    sorts?: Record<string, "ascending" | "descending">;
  }): Promise<PagoticListResponse<PagoticPaymentResponse>> {
    const { page = 1, limit = 10, filters, sorts = {} } = params;
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    buildFiltersQuery(filters).forEach((v, k) => q.append(k, v));
    buildSortsQuery(sorts).forEach((v, k) => q.append(k, v));
    const url = `${PAGOTIC_ENDPOINTS.pagos}?${q.toString()}`;
    const rsp = await this.authedFetch(url);
    const text = await rsp.text();
    console.log("[PagoTIC][listPayments] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as PagoticListResponse<PagoticPaymentResponse>;
  }

  async cancelPayment(id: string, status_detail?: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosCancelar(id), {
      method: "POST",
      body: JSON.stringify(status_detail ? { status_detail } : {}),
    });
    const text = await rsp.text();
    console.log("[PagoTIC][cancelPayment] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as PagoticPaymentResponse;
  }

  async refundPayment(
    id: string,
    body: PagoticRefundRequest = {},
  ): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDevolucion(id), {
      method: "POST",
      body: JSON.stringify(body),
    });
    const text = await rsp.text();
    console.log("[PagoTIC][refundPayment] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as Record<string, unknown>;
  }

  async groupPayments(req: PagoticGroupRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosAgrupar, {
      method: "POST",
      body: JSON.stringify(req.paymentIds),
    });
    const text = await rsp.text();
    console.log("[PagoTIC][groupPayments] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as Record<string, unknown>;
  }

  async ungroupPayments(groupId: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDesagrupar, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
    const text = await rsp.text();
    console.log("[PagoTIC][ungroupPayments] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as Record<string, unknown>;
  }

  async distributePayment(req: PagoticDistributionRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDistribucion, {
      method: "POST",
      body: JSON.stringify(req),
    });
    const text = await rsp.text();
    console.log("[PagoTIC][distributePayment] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as Record<string, unknown>;
  }

  async resendNotification(id: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(
      `${PAGOTIC_ENDPOINTS.resendNotification}/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    const text = await rsp.text();
    console.log("[PagoTIC][resendNotification] raw response:", rsp.status, text.slice(0, 800));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return JSON.parse(text) as Record<string, unknown>;
  }
}
