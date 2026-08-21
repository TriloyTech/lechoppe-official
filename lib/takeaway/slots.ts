import type { OperatingHours, TakeawaySettings } from "./types";

const DAY_BY_SHORT: Record<string, keyof OperatingHours> = { Sun: "sunday", Mon: "monday", Tue: "tuesday", Wed: "wednesday", Thu: "thursday", Fri: "friday", Sat: "saturday" };
const PARIS = "Europe/Paris";
export const MAX_GENERATED_SLOTS = 2_000;

function parisParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatParisDateTimeLocal(value: Date | string) {
  const parts = parisParts(value instanceof Date ? value : new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Converts a Europe/Paris wall-clock value without consulting the browser timezone. */
export function parisLocalDateTimeToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Invalid Paris date and time");
  const naive = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  const offsets = new Set<number>();
  for (const delta of [-86_400_000, 0, 86_400_000]) {
    const sample = new Date(naive + delta); const rendered = parisParts(sample);
    offsets.add(Date.UTC(Number(rendered.year), Number(rendered.month) - 1, Number(rendered.day), Number(rendered.hour), Number(rendered.minute)) - sample.getTime());
  }
  const candidates = [...offsets].map((offset) => new Date(naive - offset)).filter((candidate) => formatParisDateTimeLocal(candidate) === value).sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new Error("Paris date and time does not exist");
  return candidates[0];
}

export function parisDateTime(date: string, time: string) { return parisLocalDateTimeToUtc(`${date}T${time}`); }

export function estimateConfiguredSlotCount(settings: Pick<TakeawaySettings, "operating_hours" | "slot_interval_minutes" | "advance_order_max_days" | "closing_cutoff_minutes">) {
  const dailyCounts = Object.values(settings.operating_hours).map((windows) => windows.reduce((count, window) => {
    const open = Number(window.open.slice(0, 2)) * 60 + Number(window.open.slice(3));
    const close = Number(window.close.slice(0, 2)) * 60 + Number(window.close.slice(3)) - settings.closing_cutoff_minutes;
    return count + (close >= open ? Math.floor((close - open) / settings.slot_interval_minutes) + 1 : 0);
  }, 0));
  const days = settings.advance_order_max_days + 1;
  let maximum = 0;
  for (let startingWeekday = 0; startingWeekday < dailyCounts.length; startingWeekday++) {
    let count = 0; for (let day = 0; day < days; day++) count += dailyCounts[(startingWeekday + day) % dailyCounts.length];
    maximum = Math.max(maximum, count);
  }
  return maximum;
}

export function generateSlots(settings: TakeawaySettings, now = new Date()) {
  const byTimestamp = new Map<number, Date>();
  for (let day = 0; day <= settings.advance_order_max_days; day++) {
    const base = new Date(now.getTime() + day * 86_400_000); const parts = parisParts(base); const date = `${parts.year}-${parts.month}-${parts.day}`; const weekday = DAY_BY_SHORT[parts.weekday];
    for (const window of settings.operating_hours[weekday]) {
      const open = Number(window.open.slice(0, 2)) * 60 + Number(window.open.slice(3)); const close = Number(window.close.slice(0, 2)) * 60 + Number(window.close.slice(3)) - settings.closing_cutoff_minutes;
      for (let minute = open; minute <= close; minute += settings.slot_interval_minutes) {
        const slot = parisDateTime(date, `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
        if (slot >= new Date(now.getTime() + settings.prep_lead_time_minutes * 60_000)) byTimestamp.set(slot.getTime(), slot);
        if (byTimestamp.size > MAX_GENERATED_SLOTS) throw new Error("Takeaway schedule generates too many pickup slots");
      }
    }
  }
  return [...byTimestamp.values()].sort((a, b) => a.getTime() - b.getTime());
}

export type PickupSlotAvailability = { value: string; type: "asap" | "scheduled"; available: boolean };
export function classifyPickupSlots(slots: Date[], counts: Map<string, number>, maximumPerSlot: number): PickupSlotAvailability[] {
  const availability = slots.map((slot) => ({ value: slot.toISOString(), type: "scheduled" as const, available: maximumPerSlot === 0 || (counts.get(slot.toISOString()) ?? 0) < maximumPerSlot }));
  const firstAvailable = availability.find((slot) => slot.available);
  return availability.map((slot) => slot === firstAvailable ? { ...slot, type: "asap" as const } : slot);
}

export function isValidPickupTime(value: Date, settings: TakeawaySettings, now = new Date()) { return generateSlots(settings, now).some((slot) => Math.abs(slot.getTime() - value.getTime()) < 1000); }
