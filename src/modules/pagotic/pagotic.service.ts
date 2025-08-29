// src/moduls/pagotic/pagotic.service.ts
import { getPagoticToken } from "./pagotic.auth";
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";
import { toPagoticError } from "./pagotic.errors";
import {
  buildFiltersQuery,
  buildSortsQuery,
  withTimeout,
} from "./pagotic.utils";
import type {
  CreatePagoticPayment,
  PagoticGroupRequest,
  PagoticListFilter,
  PagoticListResponse,
  PagoticPaymentResponse,
  PagoticRefundRequest,
  PagoticDistributionRequest,
  PagoticPayer,
} from "./pagotic.types";

type EnvLike = Partial<Record<string, string | undefined>>;

/** URL http(s) pública e não-localhost */
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

/** Normaliza URL de input; vazia/localhost → undefined */
function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

/** Valida um payer "mínimo útil" p/ online */
function isMinimalPayer(p?: PagoticPayer): p is Required<Pick<PagoticPayer, "name" | "email">> & PagoticPayer {
  if (!p) return false;
  const hasName = typeof p.name === "string" && p.name.trim().length > 1;
  const hasEmail = typeof p.email === "string" && /\S+@\S+\.\S+/.test(p.email);
  return Boolean(hasName && hasEmail);
}

/** Verifica se há pelo menos 1 método de pagamento com amount > 0 e media_payment_id definido */
function hasValidPaymentMethods(input: CreatePagoticPayment): boolean {
  if (!Array.isArray(input.payment_methods) || input.payment_methods.length === 0) return false;
  return input.payment_methods.every(pm =>
    typeof pm.media_payment_id === "number" &&
    typeof pm.amount === "number" &&
    pm.amount > 0
  );
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
    return fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      signal,
    });
  }

  // --- Core operations ---

  async createPayment(input: CreatePagoticPayment): Promise<PagoticPaymentResponse> {
    // Resolve URLs com fallback ao .env
    const return_url =
      normalizeInputUrl(input.return_url) ?? this.envUrl("PAGOTIC_RETURN_URL");
    const back_url =
      normalizeInputUrl(input.back_url) ?? this.envUrl("PAGOTIC_BACK_URL");
    const notification_url =
      normalizeInputUrl(input.notification_url) ??
      this.envUrl("PAGOTIC_NOTIFICATION_URL");

    // --- Validações obrigatórias ---
    if (!notification_url) {
      throw new Error(
        "notification_url ausente. Configure PAGOTIC_NOTIFICATION_URL no ambiente ou envie uma URL pública válida."
      );
    }
    if (!Array.isArray(input.details) || input.details.length === 0) {
      throw new Error("details obrigatório: informe ao menos 1 item de cobrança (concept_id, description, amount…).");
    }
    // Para fluxo online, exija payer + payment_methods mínimos
    const type = input.type ?? "online";
    if (type === "online") {
      if (!isMinimalPayer(input.payer)) {
        throw new Error("payer obrigatório para pagamentos online: defina ao menos { name, email } válidos.");
      }
      if (!hasValidPaymentMethods(input)) {
        throw new Error("payment_methods obrigatório para online: informe ao menos { media_payment_id, amount > 0 }.");
      }
    }

    // Monta body final
    const body: CreatePagoticPayment = {
      ...input,
      type, // força padrão "online" se não vier
      collector_id: input.collector_id ?? this.env.PAGOTIC_COLLECTOR_ID,
      currency_id: input.currency_id ?? this.currency(),
      return_url,
      back_url,
      notification_url,
    };

    // Preview (sem dados sensíveis)
    const preview = {
      external_transaction_id: body.external_transaction_id,
      type: body.type,
      currency_id: body.currency_id,
      return_url: body.return_url,
      back_url: body.back_url,
      notification_url: body.notification_url,
      hasPaymentMethods: Array.isArray(body.payment_methods) && body.payment_methods.length > 0,
      detailsCount: Array.isArray(body.details) ? body.details.length : 0,
    };
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][createPayment] preview", preview);

    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagos, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][createPayment] raw response:", rsp.status, raw);

    if (!rsp.ok) {
      // Deixa o handler genérico transformar, mas com contexto nos logs já acima
      throw await toPagoticError(
        // Recria Response com o mesmo status/text só para manter a assinatura
        new Response(raw, { status: rsp.status, headers: rsp.headers })
      );
    }

    try {
      return JSON.parse(raw) as PagoticPaymentResponse;
    } catch {
      throw new Error(`Invalid JSON PagoTIC: ${raw.slice(0, 300)}`);
    }
  }

  async getPaymentById(id: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosById(id));
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][getPaymentById] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as PagoticPaymentResponse;
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

    const rsp = await this.authedFetch(`${PAGOTIC_ENDPOINTS.pagos}?${q.toString()}`);
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][listPayments] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as PagoticListResponse<PagoticPaymentResponse>;
  }

  async cancelPayment(id: string, status_detail?: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosCancelar(id), {
      method: "POST",
      body: JSON.stringify(status_detail ? { status_detail } : {}),
    });
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][cancelPayment] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as PagoticPaymentResponse;
  }

  async refundPayment(
    id: string,
    body: PagoticRefundRequest = {},
  ): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDevolucion(id), {
      method: "POST",
      body: JSON.stringify(body),
    });
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][refundPayment] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async groupPayments(req: PagoticGroupRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosAgrupar, {
      method: "POST",
      body: JSON.stringify(req.paymentIds),
    });
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][groupPayments] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async ungroupPayments(groupId: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDesagrupar, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][ungroupPayments] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async distributePayment(req: PagoticDistributionRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDistribucion, {
      method: "POST",
      body: JSON.stringify(req),
    });
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][distributePayment] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async resendNotification(id: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(
      `${PAGOTIC_ENDPOINTS.resendNotification}/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    const raw = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][resendNotification] raw response:", rsp.status, raw);

    if (!rsp.ok) throw await toPagoticError(new Response(raw, { status: rsp.status, headers: rsp.headers }));
    return JSON.parse(raw) as Record<string, unknown>;
  }
}
