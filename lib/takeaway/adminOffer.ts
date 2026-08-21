export interface AdminOfferDraft {
  code: string;
  discount: number;
  active: boolean;
  takeaway_eligible: boolean;
  expiryType: "infinite" | "7_days" | "1_month" | "custom";
  valid_until: string;
}

interface ExistingOffer {
  code?: string;
  discount?: number | string;
  active?: boolean;
  takeaway_eligible?: boolean;
  valid_until?: string | null;
}

export function createAdminOfferDraft(offer?: ExistingOffer): AdminOfferDraft {
  const validUntil = offer?.valid_until;
  return {
    code: offer?.code ?? "",
    discount: Number(offer?.discount ?? 10),
    active: offer?.active ?? true,
    takeaway_eligible: offer?.takeaway_eligible === true,
    expiryType: validUntil ? "custom" : "infinite",
    valid_until: validUntil ? new Date(validUntil).toISOString().slice(0, 10) : "",
  };
}

export function buildAdminOfferPayload(draft: AdminOfferDraft) {
  const validUntil = draft.expiryType !== "infinite" && draft.valid_until
    ? new Date(`${draft.valid_until}T23:59:59.999Z`).toISOString()
    : null;

  return {
    code: draft.code,
    discount: draft.discount,
    active: draft.active,
    takeaway_eligible: draft.takeaway_eligible,
    valid_until: validUntil,
  };
}
