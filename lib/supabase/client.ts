import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.triloytech.com";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: "lechoppe",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function getStorageUrl(_bucket: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/uploads/${path}`;
}
