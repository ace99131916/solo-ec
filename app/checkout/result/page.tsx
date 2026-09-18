'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

import { ORDER_STATUS_ZH } from '@/lib/shop';

export default function CheckoutResult() {
  const [order, setOrder] = useState<any>(null);
  const [hint, setHint] = useState('查詢訂單狀態中…');
  useEffect(() => {
    (async () => {
      // 綠界返回不會帶 order_id，改用結帳時存的最後一筆
      const id =
        new URLSearchParams(location.search).get('order_id') ||
        localStorage.getItem('solo-ec-last-order');
      if (!id) { setHint('找不到訂單資訊，請到會員中心查看。'); return; }
      const sb = createClient();
      const { data } = await sb.from('orders').select('id,order_no,status,total').eq('id', id).single();
      if (data) setOrder(data);
      else setHint('綠界付款完成後約數秒才會更新狀態，若仍是待付款請稍後重新整理，或到會員中心查看。');
    })();
  }, []);
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-ink-900/10 bg-white p-7 text-center shadow-soft">
      <div className="text-[11px] font-bold tracking-[0.28em] text-gold-600">PAYMENT</div>
      <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight">付款結果</h1>
      {!order ? (
        <p className="mt-2 text-sm text-ink-700/60">{hint}</p>
      ) : (
        <div className="mt-3 rounded-2xl bg-cream-100 p-4 text-sm">
          <div className={`font-serif text-lg font-bold ${order.status === 'paid' ? 'text-emerald-700' : ''}`}>
            {order.status === 'paid' ? '已付款成功' : `${ORDER_STATUS_ZH[order.status] ?? order.status}（綠界通知約數秒）`}
          </div>
          <div className="mt-1 text-ink-700/65">訂單 {order.order_no}｜NT$ {order.total}</div>
          <a className="font-medium text-gold-600 hover:underline" href={`/account/orders/${order.id}`}>看訂單明細 →</a>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <a href="/products" className="flex-1 rounded-full border border-ink-900/15 py-2.5 text-sm hover:bg-cream-100">繼續逛逛</a>
        <a href="/account" className="flex-1 rounded-full bg-ink-950 py-2.5 text-sm font-bold text-white transition hover:bg-gold-600">查看訂單</a>
      </div>
    </div>
  );
}
