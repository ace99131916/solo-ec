import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // 未設定 Supabase（本機 demo / 建置期）直接放行，避免 prerender 卡住
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  try {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            (res.cookies as any).set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /admin 需登入 + role=admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,is_blocked')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin' || profile.is_blocked) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  return res;
  } catch {
    return res;
  }
}

export const config = { matcher: ['/admin/:path*'] };
