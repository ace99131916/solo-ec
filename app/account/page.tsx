'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { ORDER_STATUS_ZH } from '@/lib/shop';

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) { router.push('/login'); return; }
      const { data: p } = await sb.from('profiles').select('*').eq('id', u.user.id).single();
      setProfile({ email: u.user.email, ...p });
      const { data: o } = await sb.from('orders').select('id,order_no,status,total,created_at').order('created_at', { ascending: false }).limit(20);
      if (o) setOrders(o);
      const { data: pl } = await sb.from('point_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (pl) setPoints(pl);
    })();
  }, [router]);

  async function save() {
    setMsg('');
    const sb = createClient();
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from('profiles').update({ name: profile.name, phone: profile.phone }).eq('id', u.user!.id);
    setMsg(error ? `儲存失敗：${error.message}` : '已儲存');
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push('/');
  }

  if (!profile) return <p className="text-sm">載入會員資料中…</p>;

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <aside className="rounded-xl bg-white p-4 shadow-sm text-sm space-y-2">
        <div className="font-bold">會員後台</div>
        <div className="text-neutral-500">{profile.email}</div>
        <div>等級：{profile.level}｜點數：{profile.points}</div>
        <button onClick={logout} className="rounded border px-3 py-1">登出</button>
      </aside>
      <div className="space-y-4">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">基本資料</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input className="rounded border p-2" placeholder="姓名" value={profile.name ?? ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <input className="rounded border p-2" placeholder="手機" value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <button onClick={save} className="mt-2 rounded bg-black px-4 py-2 text-white text-sm">儲存</button>
          {msg && <span className="ml-2 text-sm">{msg}</span>}
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">我的訂單（近 20 筆）</h2>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th>訂單</th><th>狀態</th><th>金額</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td>{o.order_no}<br /><span className="text-xs text-neutral-400">{new Date(o.created_at).toLocaleString()}</span></td>
                  <td>{ORDER_STATUS_ZH[o.status] ?? o.status}</td>
                  <td>NT$ {o.total}</td>
                  <td><a className="text-blue-600" href={`/account/orders/${o.id}`}>明細</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="text-sm text-neutral-500">尚無訂單，去 <a className="text-blue-600" href="/products">逛逛</a>。</p>}
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">點數明細（5% 回饋）</h2>
          <ul className="mt-2 text-sm space-y-1">
            {points.map((p) => (
              <li key={p.id}>{new Date(p.created_at).toLocaleString()}｜{p.change_value > 0 ? '+' : ''}{p.change_value}｜{p.reason}</li>
            ))}
          </ul>
          {!points.length && <p className="text-sm text-neutral-500">尚無點數紀錄。</p>}
        </section>
      </div>
    </div>
  );
}
