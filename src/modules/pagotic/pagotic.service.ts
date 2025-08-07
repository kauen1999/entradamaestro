import axios from "axios";
import qs from "qs";
import type { PagoTICResponse, PagoTICPayload } from "./pagotic.types";

class PagoTICService {
  private baseUrl: string;
  private authUrl = "https://a.paypertic.com/auth/realms/entidades/protocol/openid-connect/token";
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;

  constructor() {
    const {
      PAGOTIC_BASE_URL,
      PAGOTIC_CLIENT_ID,
      PAGOTIC_CLIENT_SECRET,
      PAGOTIC_USERNAME,
      PAGOTIC_PASSWORD,
    } = process.env;

    if (
      !PAGOTIC_BASE_URL ||
      !PAGOTIC_CLIENT_ID ||
      !PAGOTIC_CLIENT_SECRET ||
      !PAGOTIC_USERNAME ||
      !PAGOTIC_PASSWORD
    ) {
      throw new Error(
        "Missing PagoTIC environment variables: PAGOTIC_BASE_URL, PAGOTIC_CLIENT_ID, PAGOTIC_CLIENT_SECRET, PAGOTIC_USERNAME, PAGOTIC_PASSWORD"
      );
    }

    this.baseUrl = PAGOTIC_BASE_URL;
    this.clientId = PAGOTIC_CLIENT_ID;
    this.clientSecret = PAGOTIC_CLIENT_SECRET;
    this.username = PAGOTIC_USERNAME;
    this.password = PAGOTIC_PASSWORD;
  }

  private async getToken(): Promise<string> {
    const payload = {
      grant_type: "password",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
    };

    const { data } = await axios.post(this.authUrl, qs.stringify(payload), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!data?.access_token) {
      throw new Error("Token não retornado.");
    }
    return data.access_token;
  }

  public async createPayment(payload: PagoTICPayload): Promise<PagoTICResponse> {
    const token = await this.getToken();
    const { data } = await axios.post(
      `${this.baseUrl}/pagos`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  }
}

export const pagoticService = new PagoTICService();
