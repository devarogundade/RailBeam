import {
  paymentSettlementBodySchema,
  publicPaymentRequestSchema,
  type PaymentSettlementBody,
  type PublicPaymentRequest,
} from "@beam/stardorm-api-contract";
import type { BeamHttpClient } from "../http.js";

export type BeamPaymentsApi = {
  /** Public checkout row (`GET /payments/:id`). */
  get: (id: string) => Promise<PublicPaymentRequest>;
  /** Records on-chain settlement (`POST /payments/:id/pay`). */
  pay: (id: string, body: PaymentSettlementBody) => Promise<PublicPaymentRequest>;
};

export function createBeamPaymentsApi(http: BeamHttpClient): BeamPaymentsApi {
  return {
    get: (id) =>
      http.requestJson("GET", `/payments/${encodeURIComponent(id)}`, {
        parse: publicPaymentRequestSchema,
      }),
    pay: (id, body) =>
      http.requestJson("POST", `/payments/${encodeURIComponent(id)}/pay`, {
        body: paymentSettlementBodySchema.parse(body),
        parse: publicPaymentRequestSchema,
      }),
  };
}
