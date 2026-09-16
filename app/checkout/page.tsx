'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import CvsPicker, { type CvsSelection } from '@/components/CvsPicker';

// 結帳：宅配填地址 / 超商取貨用 CvsPicker，送單走 place_order RPC，再導綠界付款
export default function CheckoutPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [method, setMethod] = useState<'home' | 'cvs'>('home');
  const [cvs, setCvs] = useState<CvsSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        setAuthed(!!data.user);
        const raw = localStorage.getItem('solo-ec-cvs');
        if (raw) setCvs(JSON.parse(raw));
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  if (authed === false) {
    router.push('/login');
    return <p className="text-sm">請先登入，跳轉中…</p>;
  }
  if (authed === null) return <p className="text-sm">載入中…</p>;

  async function submit(fd: FormData) {
    setBusy(true);
    setErr('');
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Demo 模式：尚未設定 Supabase 連線，可先體驗選門市＋購物車流程，送單需接上 Supabase。');
      if (method === 'cvs' && !cvs) throw new Error('請先選擇取貨門市');
      const sb = createClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error('尚未登入');
      const { data: cart } = await sb.from('cart_items').select('sku_id,qty');
      // demo/訪客模式：雲端購物車為空時用 localStorage
      let items = cart ?? [];
      if (!items.length) {
        try {
          items = JSON.parse(localStorage.getItem('solo-ec-cart') ?? '[]');
        } catch {
          items = [];
        }
      }
      if (!items.length) throw new Error('購物車是空的');
      const { data: orderId, error } = await sb.rpc('place_order', {
        p_user_id: u.user.id,
        p_items: items,
        p_shipping_method: method,
        p_recipient_name: String(fd.get('name') ?? ''),
        p_recipient_phone: String(fd.get('phone') ?? ''),
        p_recipient_address:
          method === 'home' ? String(fd.get('address') ?? '') : `${cvs?.store_name} ${cvs?.store_address}`,
        p_coupon_code: String(fd.get('coupon') ?? '') || null,
      });
      if (error) throw new Error(error.message.includes('fetch') ? '尚未設定 Supabase 連線（demo 模式不送單）' : error.message);
      if (method === 'cvs' && cvs) {
        // 門市資訊補進訂單（place_order 未收門市欄位時，先存 localStorage 供後台對帳）
        localStorage.setItem(`solo-ec-order-${orderId}`, JSON.stringify(cvs));
      }
      // 取綠界付款表單：需帶登入 token（Edge Function 有開 verify_jwt，直接跳轉帶不了 header）
      const { data: sess } = await sb.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ecpay-create?order_id=${orderId}`,
        { headers: { Authorization: `Bearer ${sess.session?.access_token ?? ''}` } }
      );
      if (!res.ok) throw new Error(`取付款單失敗（${res.status}），請重試或聯繫客服`);
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <form
      action={submit}
      className="mx-auto max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold">結帳</h1>
      <input name="name" placeholder="收件人" className="w-full rounded border p-2" required />
      <input name="phone" placeholder="手機" className="w-full rounded border p-2" required />
      <div className="flex gap-2">
        <label className="flex-1 rounded border p-2 text-center text-sm">
          <input type="radio" checked={method === 'home'} onChange={() => setMethod('home')} /> 宅配
        </label>
        <label className="flex-1 rounded border p-2 text-center text-sm">
          <input type="radio" checked={method === 'cvs'} onChange={() => setMethod('cvs')} /> 超商取貨
        </label>
      </div>
      {method === 'home' ? (
        <input name="address" placeholder="宅配地址" className="w-full rounded border p-2" required />
      ) : (
        <CvsPicker onPick={setCvs} />
      )}
      <input name="coupon" placeholder="優惠碼 (如 WELCOME100)" className="w-full rounded border p-2" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded bg-black py-2 text-white disabled:opacity-50">
        {busy ? '建立訂單中…' : '建立訂單並前往綠界付款'}
      </button>
    </form>
  );
}
