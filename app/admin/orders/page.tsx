'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ORDER_STATUS_ZH } from '@/lib/shop';

const NEXT: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled', 'refunding'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  refunding: ['refunded'],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const sb = createClient();
    let q = sb.from('orders').select('id,order_no,status,total,recipient_name,recipient_phone,recipient_address,created_at').order('created_at', { ascending: false }).limit(200);
    if (status) q = q.eq('status', status);
    const { data } = await q;
    if (data) setOrders(data);
  }
  useEffect(() => { load(); }, [status]);

  async function setOrder(id: string, s: string) {
    setMsg('');
    const sb = createClient();
    const { error } = await sb.from('orders').update({ status: s }).eq('id', id);
    if (error) setMsg(`更新失敗：${error.message}`);
    else { setMsg(`已更新為 ${ORDER_STATUS_ZH[s]}`); load(); }
  }

  return (
    <div className="rounded bg-white p-4">
      <div className="flex items-center gap-2">
        <h1 className="font-bold">訂單管理</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border p-1 text-sm">
          <option value="">全部狀態</option>
          {Object.entries(ORDER_STATUS_ZH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={load} className="rounded border px-3 py-1 text-sm">重新整理</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <div className="overflow-x-auto">
      <table className="mt-4 w-full min-w-[640px] text-sm">
        <thead><tr className="text-left text-neutral-500"><th>訂單/時間</th><th>收件</th><th>金額</th><th>狀態/操作</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t align-top">
              <td><a className="text-blue-600" href={`/account/orders/${o.id}`}>{o.order_no}</a><br /><span className="text-xs text-neutral-400">{new Date(o.created_at).toLocaleString()}</span></td>
              <td>{o.recipient_name}<br /><span className="text-xs">{o.recipient_phone}<br />{o.recipient_address}</span></td>
              <td>NT$ {o.total}</td>
              <td>
                <div>{ORDER_STATUS_ZH[o.status] ?? o.status}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(NEXT[o.status] ?? []).map((n) => (
                    <button key={n} onClick={() => setOrder(o.id, n)} className="rounded border px-2 py-0.5 text-xs">→{ORDER_STATUS_ZH[n]}</button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">常見卡點：綠界 callback 未回寫多半是 ReturnURL 用了 localhost 或 CheckMacValue 大小寫錯誤；出貨請先備貨再按「已出貨」，完成後系統可發 5% 點數（需手動或排程）。</p>
    </div>
  );
}
