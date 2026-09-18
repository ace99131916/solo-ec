import { createServerClient } from '@/lib/supabase';
import { ORDER_STATUS_ZH } from '@/lib/shop';

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', params.id).single();
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', params.id);
  if (!order) return <p>找不到訂單（僅本人或管理員可看）。</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <a href="/account" className="text-sm text-ink-700/60 hover:text-ink-950">← 回會員中心</a>
      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <h1 className="font-serif font-bold">訂單 {order.order_no}</h1>
        <p className="mt-1 text-sm text-ink-700/55">狀態：{ORDER_STATUS_ZH[order.status]}｜下單：{new Date(order.created_at).toLocaleString()}</p>
        <div className="mt-3 space-y-1 text-sm">
          <div>收件人：{order.recipient_name}／{order.recipient_phone}</div>
          <div>地址：{order.recipient_address}</div>
          <div>小計 NT$ {order.subtotal}｜折扣 −NT$ {order.discount}｜運費 NT$ {order.shipping_fee}</div>
          <div className="font-serif font-bold">合計 NT$ {order.total}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <h2 className="font-serif font-bold">商品明細</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {items?.map((i: any) => (
            <li key={i.id} className="flex justify-between border-b border-ink-900/5 pb-2"><span>{i.product_name}／{i.spec_name} × {i.qty}</span><span className="font-medium">NT$ {i.subtotal}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
