// Server Component / Server Action 用 (自動帶 cookies) — 僅 Server 端 import 此檔
import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Server 端專用（包一層避免 client 誤引）
export function createServerClient() {
  const cookieStore = cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              (cookieStore as any).set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// 只給 Server / Edge Function 用 (繞過 RLS，處理訂單/退款)
export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
