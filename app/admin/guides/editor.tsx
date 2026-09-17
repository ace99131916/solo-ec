'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  sort: number;
  is_active: boolean;
};

const EMPTY: Omit<Row, 'id'> = { slug: '', title: '', excerpt: '', content: '', sort: 0, is_active: true };

export default function GuidesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Row | null>(null);
  const [msg, setMsg] = useState('載入中…');
  const [tableMissing, setTableMissing] = useState(false);

  async function load() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setMsg('尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數）。');
        return;
      }
      const { data, error } = await createClient().from('guides').select('*').order('sort').limit(100);
      if (error) {
        if (error.code === '42P01' || error.message.includes('guides')) {
          setTableMissing(true);
          setMsg('資料表還沒建：請到 Supabase SQL Editor 執行 supabase/guides.sql 一次，再重整。');
          return;
        }
        setMsg(`載入失敗：${error.message}`);
        return;
      }
      setRows((data ?? []) as Row[]);
      setMsg('');
      setTableMissing(false);
    } catch (e: any) {
      setMsg(`載入失敗：${e.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const payload = editing
      ? { slug: editing.slug, title: editing.title, excerpt: editing.excerpt, content: editing.content, sort: Number(editing.sort) || 0, is_active: editing.is_active }
      : { slug: form.slug.trim(), title: form.title.trim(), excerpt: form.excerpt.trim(), content: form.content.trim(), sort: Number(form.sort) || 0, is_active: form.is_active };
    if (!payload.slug || !payload.title) {
      setMsg('slug（英文唯一）和標題必填。');
      return;
    }
    setMsg('儲存中…');
    try {
      const sb = createClient();
      const { error } = editing
        ? await sb.from('guides').update(payload).eq('id', editing.id)
        : await sb.from('guides').insert(payload);
      setMsg(error ? `失敗：${error.message}` : '已儲存，前台重整即生效。');
      if (!error) {
        setForm(EMPTY);
        setEditing(null);
        load();
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    }
  }

  async function toggleActive(r: Row) {
    await createClient().from('guides').update({ is_active: !r.is_active }).eq('id', r.id);
    load();
  }

  async function del(id: string) {
    if (!confirm('確定刪除這篇文章？首頁和專欄頁會同步消失。')) return;
    await createClient().from('guides').delete().eq('id', id);
    load();
  }

  const active = editing ?? form;
  const setActive = (p: Partial<Row & typeof EMPTY>) => {
    if (editing) setEditing({ ...editing, ...p });
    else setForm({ ...form, ...p });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">知識專欄管理</h1>
        <p className="mt-1 text-sm text-neutral-500">新增 / 修改 / 刪除 / 排序 / 上下架。存檔後首頁 JOURNAL 卡片和 /guide 列表同步更新。</p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6">
          <b>還沒建表。</b>到 Supabase Dashboard → SQL Editor，貼上專案內{' '}
          <code className="rounded bg-white px-1">supabase/guides.sql</code> 全選 Run，再回來重整。
        </div>
      )}
      {msg && <div className="text-sm text-neutral-500">{msg}</div>}

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="font-bold">{editing ? '編輯文章' : '新增文章'}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-neutral-500">標題 *</span>
            <input value={active.title} onChange={(e) => setActive({ title: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="新手選購攻略…" />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">slug（英文唯一）*</span>
            <input value={active.slug} onChange={(e) => setActive({ slug: e.target.value })} disabled={!!editing} className="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-neutral-100" placeholder="guide-buy" />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-neutral-500">摘要（首頁卡片顯示）</span>
          <input value={active.excerpt} onChange={(e) => setActive({ excerpt: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="一句話摘要…" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-neutral-500">內文（/guide 頁顯示）</span>
          <textarea value={active.content} onChange={(e) => setActive({ content: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="建議 800–1500 字，可內連商品…" />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            排序
            <input type="number" value={active.sort} onChange={(e) => setActive({ sort: Number(e.target.value) })} className="w-20 rounded-xl border px-2 py-1.5" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active.is_active} onChange={(e) => setActive({ is_active: e.target.checked })} className="h-4 w-4 accent-black" />
            上架顯示
          </label>
          <button onClick={save} disabled={tableMissing} className="rounded-full bg-ink-950 px-5 py-1.5 font-medium text-white hover:bg-ink-800 disabled:opacity-40">
            {editing ? '儲存修改' : '新增文章'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(EMPTY); }} className="rounded-full border px-4 py-1.5">
              取消編輯
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="font-bold">全部文章（{rows.length}）</div>
        <ul className="mt-2 divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <span className="font-medium">{r.title}</span>
                <span className="ml-2 text-xs text-neutral-400">/{r.slug}・排序 {r.sort}{r.is_active ? '' : '・已下架'}</span>
                {r.excerpt && <div className="truncate text-xs text-neutral-500">{r.excerpt}</div>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => setEditing(r)} className="rounded-full border px-3 py-1 text-xs">編輯</button>
                <button onClick={() => toggleActive(r)} className="rounded-full border px-3 py-1 text-xs">{r.is_active ? '下架' : '上架'}</button>
                <button onClick={() => del(r.id)} className="rounded-full border px-3 py-1 text-xs text-red-600">刪</button>
              </div>
            </li>
          ))}
          {!rows.length && !tableMissing && <li className="py-3 text-neutral-400">還沒有文章，從上面新增第一篇。</li>}
        </ul>
      </div>
    </div>
  );
}
