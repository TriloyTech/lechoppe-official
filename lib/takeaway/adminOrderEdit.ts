import { formatParisDateTimeLocal, parisLocalDateTimeToUtc } from "./slots.ts";

export type AdminOrderEditDraft = { pickup: string; notes: string };
export type AdminOrderEditOriginal = { pickupTime: string; staffNotes: string | null };

export function createAdminOrderEditDraft(original: AdminOrderEditOriginal): AdminOrderEditDraft {
  return { pickup: formatParisDateTimeLocal(original.pickupTime), notes: original.staffNotes ?? "" };
}

export function buildAdminOrderEditPatch(original: AdminOrderEditOriginal, draft: AdminOrderEditDraft) {
  const patch: { pickup_time?: string; staff_notes?: string } = {};
  if (draft.pickup !== formatParisDateTimeLocal(original.pickupTime)) patch.pickup_time = parisLocalDateTimeToUtc(draft.pickup).toISOString();
  if (draft.notes !== (original.staffNotes ?? "")) patch.staff_notes = draft.notes;
  return patch;
}
