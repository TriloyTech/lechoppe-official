// ─── lib/supabase/types.ts ────────────────────────────────────────────────
// Shared TypeScript types for Supabase tables.
// Run `npx supabase gen types typescript` to auto-generate from your schema.

export interface MenuItem {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  price: number;
  // Core named categories + open string for custom ones the admin creates
  category:
    | "entrée"
    | "burger"
    | "spécialité"
    | "classique"
    | "dessert"
    | "boisson"
    | string; // custom / other categories
  available: boolean;
  chef_suggestion: boolean;
  takeaway_available: boolean;
  image_url: string | null;
  has_allergens: boolean;
  allergens_text: string | null;
}

export interface Reservation {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  party_size: number;
  date: string;       // ISO date string "YYYY-MM-DD"
  time: string;       // "HH:MM"
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
}
