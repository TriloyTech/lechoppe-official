import type { Lang } from "@/context/LangContext";

export type LocalizedText = Record<Lang, string>;
export type PaymentMethod = "cash" | "card" | "ticket_restaurant" | "other";
export type OrderStatus = "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type PaymentStatus = "UNPAID" | "PAID";
/** Technical payload safety ceiling; distinct from the business value 0 = unlimited. */
export const TECHNICAL_MAX_ITEM_QUANTITY = 1_000;
export const TECHNICAL_MAX_ORDER_QUANTITY = 2_000;

export interface OperatingWindow { open: string; close: string }
export type OperatingHours = Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", OperatingWindow[]>;

export interface TakeawaySettings {
  takeaway_enabled: boolean;
  pause_mode: boolean;
  operating_hours: OperatingHours;
  closing_cutoff_minutes: number;
  prep_lead_time_minutes: number;
  slot_interval_minutes: number;
  advance_order_max_days: number;
  max_orders_per_slot: number;
  min_order_amount: number;
  max_order_amount: number;
  audio_alert_enabled: boolean;
  accepted_payment_methods: PaymentMethod[];
}

export interface TakeawayOptionChoice {
  id: string;
  group_id: string;
  name: LocalizedText;
  price_modifier: number;
  vat_rate_override: number | null;
  is_available: boolean;
  is_default: boolean;
  display_order: number;
}

export interface TakeawayOptionGroup {
  id: string;
  key: string;
  name: LocalizedText;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  is_active: boolean;
  display_order: number;
  choices?: TakeawayOptionChoice[];
}

export interface PublicTakeawayConfig extends Omit<TakeawaySettings, "audio_alert_enabled" | "max_orders_per_slot"> {}

export interface TakeawayCatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  has_allergens: boolean;
  allergens_text: string | null;
  vat_rate: number;
  max_quantity_per_order: number;
  display_order: number;
  option_groups: TakeawayOptionGroup[];
}

export interface CartLine {
  key: string;
  item: TakeawayCatalogItem;
  choiceIds: string[];
  specialInstructions: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_notes?: string;
  pickup_time_type: "asap" | "scheduled";
  pickup_time: string;
  promo_code?: string;
  lang: Lang;
  bot_token: string;
  bot_answer: number;
  website?: string;
  items: { item_id: string; choice_ids: string[]; special_instructions?: string; quantity: number }[];
}

export interface VatBreakdown { rate: number; base_ht: number; vat_amount: number }

export const DEFAULT_TAKEAWAY_SETTINGS: TakeawaySettings = {
  takeaway_enabled: false,
  pause_mode: false,
  operating_hours: {
    monday: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }],
    tuesday: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }],
    wednesday: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }],
    thursday: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }],
    friday: [{ open: "12:00", close: "15:00" }, { open: "19:00", close: "23:00" }],
    saturday: [{ open: "12:00", close: "15:00" }, { open: "19:00", close: "23:00" }],
    sunday: [],
  },
  closing_cutoff_minutes: 30,
  prep_lead_time_minutes: 20,
  slot_interval_minutes: 15,
  advance_order_max_days: 0,
  max_orders_per_slot: 0,
  min_order_amount: 0,
  max_order_amount: 0,
  audio_alert_enabled: true,
  accepted_payment_methods: ["cash", "card", "ticket_restaurant", "other"],
};
