export type PromoFailureReason = "INVALID" | "INACTIVE" | "EXPIRED" | "NOT_TAKEAWAY_ELIGIBLE";

export type PromotionRecord = {
  code: string;
  discount: number | string;
  active: boolean;
  takeaway_eligible: boolean;
  valid_until: string | Date | null;
};

export type PromotionValidation =
  | { valid: true; code: string; discount_percentage: number }
  | { valid: false; reason: PromoFailureReason };

export function normalizePromoCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().slice(0, 64) : "";
}

export function validatePromotionRecord(record: PromotionRecord | null | undefined, now = new Date()): PromotionValidation {
  if (!record) return { valid: false, reason: "INVALID" };
  if (!record.active) return { valid: false, reason: "INACTIVE" };
  if (record.valid_until) {
    const expiry = new Date(record.valid_until);
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const expiryDay = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()));
    if (expiryDay < today) return { valid: false, reason: "EXPIRED" };
  }
  if (!record.takeaway_eligible) return { valid: false, reason: "NOT_TAKEAWAY_ELIGIBLE" };
  const discount = Number(record.discount);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return { valid: false, reason: "INVALID" };
  return { valid: true, code: normalizePromoCode(record.code), discount_percentage: discount };
}
