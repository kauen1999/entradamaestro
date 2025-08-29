// src/modules/pagotic/pagotic.service.ts
// src/modules/pagotic/pagotic.service.ts
import { getPagoticToken } from "./pagotic.auth";
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";
import { toPagoticError } from "./pagotic.errors";
import {
  buildFiltersQuery,
  buildSortsQuery,
  withTimeout,
  sanitizeForLog,
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

/** Regras mínimas para transação online (cartão) */
function assertOnlinePayment(body: CreatePagoticPayment): void {
  // type precisa ser "online" (se veio outro, forçamos em createPayment)
  if (body.type !== "online") {
    throw new Error('Para cartão, "type" deve ser "online".');
  }

  // payer obrigatório
  const p = body.payer;
  if (!p?.email || !p.name) {
    throw new Error('Campos obrigatórios em "payer": name e email.');
  }

  // payment_methods obrigatório
  if (!Array.isArray(body.payment_methods) || body.payment_methods.length === 0) {
    throw new Error('Envie pelo menos um item em "payment_methods" para pagamento online.');
  }

  // checa cada método
  for (const pm of body.payment_methods) {
    if (typeof pm.media_payment_id !== "number") {
      throw new Error('payment_methods[].media_payment_id é obrigatório (número).');
    }
    if (!pm.number || typeof pm.number !== "string") {
      throw new Error('payment_methods[].number é obrigatório (PAN do cartão).');
    }
    if (
      typeof pm.expiration_year !== "number" ||
      typeof pm.expiration_month !== "number"
    ) {
      throw new Error("payment_methods[].expiration_year e expiration_month são obrigatórios.");
    }
    if (!pm.security_code || typeof pm.security_code !== "string") {
      throw new Error("payment_methods[].security_code (CVV) é obrigatório.");
    }
    const holder = pm.holder;
    if (!holder?.name) {
      throw new Error('payment_methods[].holder.name é obrigatório.');
    }
  }
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

    // Exigido pelo provedor: sempre enviar notification_url público
    if (!notification_url) {
      throw new Error(
        "notification_url ausente. Configure PAGOTIC_NOTIFICATION_URL no ambiente ou envie uma URL pública válida."
      );
    }

    // Força "online" caso o chamador não tenha definido (fluxo de cartão)
    const typeFinal: CreatePagoticPayment["type"] =
      input.type && ["debit", "online", "transfer", "debin", "coupon"].includes(input.type)
        ? input.type
        : "online";

    const body: CreatePagoticPayment = {
      ...input,
      type: typeFinal,
      collector_id: input.collector_id ?? this.env.PAGOTIC_COLLECTOR_ID,
      currency_id: input.currency_id ?? this.currency(),
      return_url,
      back_url,
      notification_url,
    };

    // Validações mínimas para "online"
    if (body.type === "online") {
      assertOnlinePayment(body);
    }

    // Log de preview (sanitizado)
    const preview = sanitizeForLog({
      external_transaction_id: body.external_transaction_id,
      type: body.type,
      return_url: body.return_url,
      back_url: body.back_url,
      notification_url: body.notification_url,
      payer: body.payer,
      detailsCount: Array.isArray(body.details) ? body.details.length : 0,
      pmCount: Array.isArray(body.payment_methods) ? body.payment_methods.length : 0,
    });
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][createPayment] body.preview", preview);

    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagos, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][createPayment] raw response:", rsp.status, text);

    if (!rsp.ok) {
      // Tenta enriquecer o erro antes de lançar
      try {
        throw await toPagoticError(new Response(text, { status: rsp.status }));
      } catch (e) {
        throw e;
      }
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
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][getPaymentById] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
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
    const rsp = await this.authedFetch(`${PAGOTIC_ENDPOINTS.pagos}?${q.toString()}`);
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][listPayments] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as PagoticListResponse<PagoticPaymentResponse>;
  }

  async cancelPayment(id: string, status_detail?: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosCancelar(id), {
      method: "POST",
      body: JSON.stringify(status_detail ? { status_detail } : {}),
    });
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][cancelPayment] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
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
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][refundPayment] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as Record<string, unknown>;
  }

  async groupPayments(req: PagoticGroupRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosAgrupar, {
      method: "POST",
      body: JSON.stringify(req.paymentIds),
    });
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][groupPayments] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as Record<string, unknown>;
  }

  async ungroupPayments(groupId: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDesagrupar, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][ungroupPayments] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as Record<string, unknown>;
  }

  async distributePayment(req: PagoticDistributionRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDistribucion, {
      method: "POST",
      body: JSON.stringify(req),
    });
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][distributePayment] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as Record<string, unknown>;
  }

  async resendNotification(id: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(
      `${PAGOTIC_ENDPOINTS.resendNotification}/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    const text = await rsp.text();
    // eslint-disable-next-line no-console
    console.log("[PagoTIC][resendNotification] raw response:", rsp.status, text);

    if (!rsp.ok) throw await toPagoticError(new Response(text, { status: rsp.status }));
    return JSON.parse(text) as Record<string, unknown>;
  }
}

