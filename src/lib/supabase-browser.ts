import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Frontend use is limited to live updates (Realtime), for example
 * the new-order alert. All reads and writes go through src/server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
