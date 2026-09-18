'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { mergeLocalToServer } from '@/lib/cart';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/cart';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<{ error: any }>, okMsg: string, redirect = false) {
    setLoading(true);
    setMsg('');
    try {
      const { error } = await fn();
      if (error) setMsg(`失敗：${error.message}`);
      else {
        setMsg(okMsg);
        if (redirect) {
          // 登入成功後把訪客購物車合併上雲，再回到原本要去的頁（預設購物車）
          try {
            const sb = createClient();
            const { data } = await sb.auth.getUser();
            if (data.user) await mergeLocalToServer(sb, data.user.id);
          } catch {}
          router.push(next);
        }
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-ink-900/10 bg-white p-7 shadow-soft">
      <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">MEMBER</div>
      <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight">會員登入 / 註冊</h1>
      <p className="mt-1.5 text-sm leading-6 text-ink-700/60">
        未登入可逛街＋加購物車（存瀏覽器），結帳時才需登入。登入後購物車自動合併。
      </p>
      <div className="mt-5 space-y-3">
        <input
          className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-ink-900/15 p-2.5 text-sm"
          type="password"
          placeholder="密碼（註冊時設定，登入沿用）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full rounded-full bg-ink-950 py-2.5 text-sm font-bold text-white transition hover:bg-gold-600 disabled:opacity-50"
          onClick={() =>
            run(
              async () => {
                const sb = createClient();
                return sb.auth.signInWithPassword({ email, password });
              },
              '登入成功，跳轉中…',
              true
            )
          }
        >
          登入
        </button>
        <button
          disabled={loading}
          className="w-full rounded-full border border-ink-900/15 py-2.5 text-sm transition hover:bg-cream-100 disabled:opacity-50"
          onClick={() =>
            run(
              async () => {
                const sb = createClient();
                return sb.auth.signUp({ email, password });
              },
              '註冊成功（若需驗證請收信），再按登入。'
            )
          }
        >
          註冊
        </button>
        <button
          disabled={loading}
          className="w-full rounded-full border border-ink-900/15 py-2.5 text-sm transition hover:bg-cream-100 disabled:opacity-50"
          onClick={() =>
            run(
              async () => {
                const sb = createClient();
                return sb.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: `${location.origin}/cart` },
                });
              },
              'Magic link 已寄出，請收信。'
            )
          }
        >
          改用 Email 免密碼登入
        </button>
        {msg && <p className="text-sm text-ink-700/65">{msg}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-700/60">載入中…</p>}>
      <LoginForm />
    </Suspense>
  );
}
