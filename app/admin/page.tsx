import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  try {
  const supabase = createServerClient();
  const { data: orders } = await supabase.from('orders').select('total,status').limit(500);
  const revenue = (orders ?? []).filter((o) => !['cancelled','refunded'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const pending = (orders ?? []).filter((o) => o.status === 'pending_payment').length;
  const { data: lowStock } = await supabase.from('product_skus').select('sku_code,stock').lt('stock', 6).limit(10);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">今日總覽</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-white p-4">累計營收<br /><b>NT$ {revenue}</b></div>
        <div className="rounded bg-white p-4">待付款<br /><b>{pending}</b></div>
        <div className="rounded bg-white p-4">訂單數<br /><b>{orders?.length ?? 0}</b></div>
      </div>
      <div className="rounded bg-white p-4">
        <b>低庫存預警 (&lt;6)</b>
        <ul className="mt-2 text-sm">{lowStock?.map((s) => <li key={s.sku_code}>{s.sku_code}：剩 {s.stock}</li>)}</ul>
      </div>
    </div>
  );
  } catch {
    return <div className="rounded bg-white p-4 text-sm">尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數），總覽需接上資料庫才會顯示。</div>;
  }
}
