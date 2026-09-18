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

const PAGE_SIZE = 30;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');

  async function load(st: string, keyword: string, pg: number) {
    const sb = createClient();
    let query = sb.from('orders').select('id,order_no,status,total,recipient_name,recipient_phone,recipient_address,created_at', { count: 'exact' });
    if (st) query = query.eq('status', st);
    const kw = keyword.trim().replace(/[,()%]/g, '');
    if (kw) query = query.or(`order_no.ilike.%${kw}%,recipient_phone.ilike.%${kw}%,recipient_name.ilike.%${kw}%`);
    const from = pg * PAGE_SIZE;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) { setMsg(`載入失敗：${error.message}`); return; }
    setOrders(data ?? []);
    setTotal(count ?? 0);
  }
  useEffect(() => {
    const t = setTimeout(() => load(status, q, page), 400);
    return () => clearTimeout(t);
  }, [status, q, page]);

  async function setOrder(id: string, s: string) {
    setMsg('');
    const sb = createClient();
    const { error } = await sb.from('orders').update({ status: s }).eq('id', id);
    if (error) setMsg(`更新失敗：${error.message}`);
    else { setMsg(`已更新為 ${ORDER_STATUS_ZH[s]}`); load(status, q, page); }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="rounded bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-bold">訂單管理</h1>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="搜尋訂單號 / 電話 / 姓名…" className="w-56 rounded-full border px-3 py-1 text-sm" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded border p-1 text-sm">
          <option value="">全部狀態</option>
          {Object.entries(ORDER_STATUS_ZH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => load(status, q, page)} className="rounded border px-3 py-1 text-sm">重新整理</button>
        <span className="ml-auto text-xs text-neutral-400">第 {page + 1} / {pageCount} 頁・共 {total} 筆</span>
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
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <button onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={page === 0} className="rounded-full border px-4 py-1 disabled:opacity-40">← 上一頁</button>
        <span className="text-neutral-500">第 {page + 1} / {pageCount} 頁</span>
        <button onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))} disabled={page >= pageCount - 1} className="rounded-full border px-4 py-1 disabled:opacity-40">下一頁 →</button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">常見卡點：綠界 callback 未回寫多半是 ReturnURL 用了 localhost 或 CheckMacValue 大小寫錯誤；出貨請先備貨再按「已出貨」，完成後系統可發 5% 點數（需手動或排程）。</p>
    </div>
  );
}
