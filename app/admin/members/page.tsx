'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function MembersAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  async function load() {
    let query = createClient().from('profiles').select('id,email,name,phone,level,points,role,is_blocked,created_at').order('created_at', { ascending: false }).limit(200);
    const { data } = await query;
    if (data) setRows(q ? data.filter((r) => (r.email + (r.name ?? '') + (r.phone ?? '')).includes(q)) : data);
  }
  useEffect(() => { load(); }, []);
  async function update(id: string, patch: any) {
    await createClient().from('profiles').update(patch).eq('id', id);
    load();
  }
  return (
    <div className="rounded bg-white p-4">
      <div className="flex gap-2"><h1 className="font-bold">會員管理</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋 email/姓名/手機" className="rounded border p-1 text-sm" />
        <button onClick={load} className="rounded border px-3 text-sm">搜尋</button>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead><tr className="text-left text-neutral-500"><th>會員</th><th>等級/點數</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td>{r.email}<br /><span className="text-xs">{r.name}／{r.phone} {r.role === 'admin' ? '・管理員' : ''}</span></td>
              <td>{r.level}／{r.points}</td>
              <td>{r.is_blocked ? '已停權' : '正常'}</td>
              <td className="space-x-1">
                <button onClick={() => update(r.id, { level: r.level === 'vip' ? 'general' : 'vip' })} className="rounded border px-2 text-xs">切 VIP</button>
                <button onClick={() => update(r.id, { is_blocked: !r.is_blocked })} className="rounded border px-2 text-xs">{r.is_blocked ? '解鎖' : '停權'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
