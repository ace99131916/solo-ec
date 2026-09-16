'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function CheckoutResult() {
  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const id = new URLSearchParams(location.search).get('order_id');
      if (!id) return;
      const sb = createClient();
      const { data } = await sb.from('orders').select('order_no,status,total').eq('id', id).single();
      if (data) setOrder(data);
    })();
  }, []);
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold">付款結果</h1>
      {!order ? (
        <p className="mt-2 text-sm text-neutral-500">綠界付款完成後會自動跳回本站並更新訂單狀態。若停留在此超過 1 分鐘，請到會員中心查看訂單。</p>
      ) : (
        <div className="mt-2 text-sm">訂單 {order.order_no}｜NT$ {order.total}｜狀態 {order.status}<br />可在 <a className="text-blue-600" href="/account">會員中心</a> 追蹤出貨。</div>
      )}
      <div className="mt-4 flex gap-2">
        <a href="/products" className="flex-1 rounded border py-2">繼續逛逛</a>
        <a href="/account" className="flex-1 rounded bg-black py-2 text-white">查看訂單</a>
      </div>
    </div>
  );
}
