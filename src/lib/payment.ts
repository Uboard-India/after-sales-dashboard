import type { ComplaintRow } from "./types";

export type PaymentStatus = "Paid" | "Pending" | "FOC";

/**
 * Classify a complaint's payment state from the two sheet columns:
 *  - "Payment Received" (paymentReceived) — usually an amount, sometimes
 *    text like "FOC", "payment pending", "Service PO received".
 *  - "Payment type" (paymentType) — how it was paid ("Uboard account",
 *    "Cash hand over to ...", "FOC ...").
 *
 * FOC   = free of charge (no payment ever expected)
 * Paid  = an amount/confirmation was recorded
 * Pending = closed/working but money not yet received (or not recorded)
 */
export function paymentStatus(r: ComplaintRow): PaymentStatus {
  const rec = (r.paymentReceived || "").trim().toLowerCase();
  const typ = (r.paymentType || "").trim().toLowerCase();
  const both = `${rec} ${typ}`;

  if (/foc/.test(both)) return "FOC";
  if (/pending/.test(both)) return "Pending";

  // An explicit zero means nothing received yet.
  if (rec === "0") return "Pending";

  // Confirmation words in either column → treated as received.
  if (/uboard account|cash|received|service po|\byes\b|approval/.test(both)) return "Paid";

  // Any digit in the amount column = an amount was recorded.
  if (/\d/.test(rec)) return "Paid";

  // Nothing recorded.
  return "Pending";
}

/** True when the unit is OUT of warranty (so the customer is expected to pay). */
export function isOutOfWarranty(r: ComplaintRow): boolean {
  return !/^y/i.test((r.warrantyStatus || "").trim());
}
