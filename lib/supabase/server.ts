import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.triloytech.com";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "dummy-service-role-key-for-tests";

  return createClient(supabaseUrl, serviceRoleKey, {
    db: {
      schema: "lechoppe",
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
