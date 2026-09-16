'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { mergeLocalToServer } from '@/lib/cart';

export default function LoginPage() {
  const router = useRouter();
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
          // 登入成功後把訪客購物車合併上雲
          try {
            const sb = createClient();
            const { data } = await sb.auth.getUser();
            if (data.user) await mergeLocalToServer(sb, data.user.id);
          } catch {}
          router.push('/cart');
        }
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold">會員登入 / 註冊</h1>
      <p className="mt-1 text-sm text-neutral-500">
        未登入可逛街＋加購物車（存瀏覽器），結帳時才需登入。登入後購物車自動合併。
      </p>
      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="密碼（註冊時設定，登入沿用）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
          onClick={() =>
            run(
              async () => {
                const sb = createClient();
                return sb.auth.signInWithPassword({ email, password });
              },
              '登入成功，跳轉購物車…',
              true
            )
          }
        >
          登入
        </button>
        <button
          disabled={loading}
          className="w-full rounded border py-2 disabled:opacity-50"
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
          className="w-full rounded border py-2 text-sm disabled:opacity-50"
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
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      </div>
    </div>
  );
}
