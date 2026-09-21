'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  sort: number;
  is_active: boolean;
  published_at: string;
};

const EMPTY = { slug: '', title: '', excerpt: '', content: '', cover_image: '', sort: 0, is_active: true, published_at: '' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Row | null>(null);
  const [msg, setMsg] = useState('載入中…');
  const [tableMissing, setTableMissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setMsg('尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數）。');
        return;
      }
      const { data, error } = await createClient().from('news').select('*').order('sort').order('created_at', { ascending: false }).limit(100);
      if (error) {
        if (error.code === '42P01' || error.message.includes('news')) {
          setTableMissing(true);
          setMsg('資料表還沒建：請到 Supabase SQL Editor 執行 supabase/news.sql 一次，再重整。');
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

  useEffect(() => { load(); }, []);

  async function uploadCover(file: File, target: 'form' | 'edit') {
    setUploading(true);
    setMsg('');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `news/${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      if (target === 'form') setForm({ ...form, cover_image: data.publicUrl });
      else if (editing) setEditing({ ...editing, cover_image: data.publicUrl });
      setMsg('封面已上傳，記得按儲存。');
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const payload = editing
      ? { slug: editing.slug, title: editing.title, excerpt: editing.excerpt, content: editing.content, cover_image: editing.cover_image || null, sort: Number(editing.sort) || 0, is_active: editing.is_active, published_at: editing.published_at || null }
      : { slug: form.slug.trim(), title: form.title.trim(), excerpt: form.excerpt.trim(), content: form.content.trim(), cover_image: form.cover_image || null, sort: Number(form.sort) || 0, is_active: form.is_active, published_at: form.published_at || null };
    if (!payload.slug || !payload.title) { setMsg('slug（英文唯一）和標題必填。'); return; }
    setMsg('儲存中…');
    try {
      const sb = createClient();
      const { error } = editing
        ? await sb.from('news').update(payload).eq('id', editing.id)
        : await sb.from('news').insert(payload);
      setMsg(error ? `失敗：${error.message}` : '已發布，前台即時顯示。');
      if (!error) {
        setForm({ ...EMPTY });
        setEditing(null);
        load();
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    }
  }

  async function toggleActive(r: Row) {
    await createClient().from('news').update({ is_active: !r.is_active }).eq('id', r.id);
    load();
  }

  async function del(id: string) {
    if (!confirm('確定刪除這則資訊？前台會同步消失。')) return;
    await createClient().from('news').delete().eq('id', id);
    load();
  }

  // 插入圖片：上傳到 Supabase 後把網址插進游標處（獨立一行，前台自動顯示為大圖）
  async function insertImage(file: File) {
    setInserting(true);
    setMsg('圖片上傳中…');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `news/${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      const tag = `\n\n${data.publicUrl}\n\n`;
      const ta = contentRef.current;
      if (ta) {
        const start = ta.selectionStart ?? active.content.length;
        const end = ta.selectionEnd ?? start;
        const next = active.content.slice(0, start) + tag + active.content.slice(end);
        setActive({ content: next });
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + tag.length;
          ta.setSelectionRange(pos, pos);
        });
      } else {
        setActive({ content: `${active.content}${tag}` });
      }
      setMsg('圖片已插入，記得按發布/儲存。');
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setInserting(false);
    }
  }

  const active = editing ?? form;
  const setActive = (p: Partial<Row & typeof EMPTY>) => {
    if (editing) setEditing({ ...editing, ...p });
    else setForm({ ...form, ...p });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">最新資訊管理</h1>
        <p className="mt-1 text-sm text-neutral-500">發布商店公告、新品、活動。存檔後首頁最新資訊區和 /news 同步更新（首頁只顯示最新 3 則）。</p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6">
          <b>還沒建表。</b>到 Supabase Dashboard → SQL Editor，貼上專案內{' '}
          <code className="rounded bg-white px-1">supabase/news.sql</code> 全選 Run，再回來重整。
        </div>
      )}
      {msg && <div className="text-sm text-neutral-500">{msg}</div>}

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="font-bold">{editing ? '編輯資訊' : '發布新資訊'}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-neutral-500">標題 *</span>
            <input value={active.title} onChange={(e) => setActive({ title: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="例：中秋優惠全館 9 折" />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">slug（英文唯一）*</span>
            <input value={active.slug} onChange={(e) => setActive({ slug: e.target.value })} disabled={!!editing} className="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-neutral-100" placeholder="mid-autumn-sale" />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-neutral-500">摘要（首頁卡片顯示）</span>
          <input value={active.excerpt} onChange={(e) => setActive({ excerpt: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="一句話摘要…" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-neutral-500">內文</span>
          <textarea ref={contentRef} value={active.content} onChange={(e) => setActive({ content: e.target.value })} rows={8} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="活動辦法、期間、注意事項…（換行保留）" />
        </label>
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <label className="cursor-pointer rounded-full border px-4 py-1.5 hover:bg-neutral-50">
            {inserting ? '上傳中…' : '＋ 插入圖片'}
            <input type="file" accept="image/*" className="hidden" disabled={inserting || tableMissing} onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ''; }} />
          </label>
          <span className="text-xs text-neutral-400">上傳後自動插進游標處，前台顯示為大圖</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block text-sm">
            <span className="text-neutral-500">發布日期（留空即今天）</span>
            <input type="date" value={active.published_at ? active.published_at.slice(0, 10) : ''} onChange={(e) => setActive({ published_at: e.target.value || '' })} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">排序（小在前）</span>
            <input type="number" value={active.sort} onChange={(e) => setActive({ sort: Number(e.target.value) })} className="mt-1 w-full rounded-xl border px-3 py-2" />
          </label>
          <div className="flex items-end gap-2 text-sm">
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2">
              <input type="checkbox" checked={active.is_active} onChange={(e) => setActive({ is_active: e.target.checked })} className="h-4 w-4 accent-black" />
              上架顯示
            </label>
          </div>
          <div className="flex items-end gap-2 text-sm">
            <label className="cursor-pointer rounded-xl border px-3 py-2 hover:bg-neutral-50">
              {uploading ? '上傳中…' : active.cover_image ? '更換封面' : '上傳封面'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f, editing ? 'edit' : 'form'); e.target.value = ''; }} />
            </label>
          </div>
        </div>
        {active.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.cover_image} alt="封面預覽" className="mt-2 max-h-40 rounded-xl" />
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={save} disabled={tableMissing} className="rounded-full bg-ink-950 px-5 py-1.5 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-40">
            {editing ? '儲存修改' : '發布'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm({ ...EMPTY }); }} className="rounded-full border px-4 py-1.5 text-sm">取消編輯</button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="font-bold">全部資訊（{rows.length}）</div>
        <ul className="mt-2 divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <span className="font-medium">{r.title}</span>
                <span className="ml-2 text-xs text-neutral-400">/{r.slug}・{r.published_at ? r.published_at.slice(0, 10) : todayStr()}・排序 {r.sort}{r.is_active ? '' : '・已下架'}</span>
                {r.excerpt && <div className="truncate text-xs text-neutral-500">{r.excerpt}</div>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => setEditing(r)} className="rounded-full border px-3 py-1 text-xs">編輯</button>
                <button onClick={() => toggleActive(r)} className="rounded-full border px-3 py-1 text-xs">{r.is_active ? '下架' : '上架'}</button>
                <button onClick={() => del(r.id)} className="rounded-full border px-3 py-1 text-xs text-red-600">刪</button>
              </div>
            </li>
          ))}
          {!rows.length && !tableMissing && <li className="py-3 text-neutral-400">還沒發布，從上面新增第一則。</li>}
        </ul>
      </div>
    </div>
  );
}
