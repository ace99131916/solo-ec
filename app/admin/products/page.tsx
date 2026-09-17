'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';


export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', base_price: 990, is_featured: false, description: '' });
  const [skuForm, setSkuForm] = useState<Record<string, { spec: string; price: string; stock: string }>>({});
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', base_price: 0, description: '' });
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [skuEditDraft, setSkuEditDraft] = useState({ spec: '', price: '', stock: '' });

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('products').select('id,name,slug,is_active,is_featured,base_price,description,cover_image,images,detail_text,detail_images,product_skus(id,sku_code,spec_name,price,stock,is_active)').order('created_at', { ascending: false }).limit(200);
    if (data) setRows(data);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg('');
    const sb = createClient();
    if (!form.name || !form.slug) { setMsg('請填商品名與 slug'); return; }
    const { data, error } = await sb.from('products').insert({
      name: form.name, slug: form.slug, base_price: Number(form.base_price),
      description: form.description, is_featured: form.is_featured, is_active: true,
    }).select('id').single();
    if (error) { setMsg(`新增失敗：${error.message}`); return; }
    await sb.from('product_skus').insert({ product_id: data.id, sku_code: `${form.slug.toUpperCase()}-STD`, spec_name: '標準', price: Number(form.base_price), stock: 50 });
    setMsg('已新增（含一組標準 SKU），請再到 Table Editor 補圖與分類');
    setForm({ name: '', slug: '', base_price: 990, is_featured: false, description: '' });
    load();
  }

  async function toggle(p: any, field: 'is_active' | 'is_featured') {
    const sb = createClient();
    await sb.from('products').update({ [field]: !p[field] }).eq('id', p.id);
    load();
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setEditDraft({ name: p.name ?? '', base_price: p.base_price ?? 0, description: p.description ?? '' });
  }

  async function saveInfo(productId: string) {
    if (!editDraft.name.trim()) { setMsg('商品名不可空白'); return; }
    setMsg('儲存中…');
    const { error } = await createClient().from('products').update({
      name: editDraft.name.trim(),
      base_price: Number(editDraft.base_price) || 0,
      description: editDraft.description,
    }).eq('id', productId);
    setMsg(error ? `儲存失敗：${error.message}` : '商品基本資料已更新，前台即時顯示。');
    if (!error) {
      setEditingId(null);
      load();
    }
  }

  async function saveSku(productId: string, skuId?: string) {
    const f = skuForm[productId] ?? { spec: '', price: '', stock: '' };
    const sb = createClient();
    if (!f.spec || !f.price) { setMsg('SKU 需填規格與價格'); return; }
    if (skuId) {
      await sb.from('product_skus').update({ spec_name: f.spec, price: Number(f.price), stock: Number(f.stock || 0) }).eq('id', skuId);
    } else {
      await sb.from('product_skus').insert({ product_id: productId, sku_code: `SKU-${Date.now().toString(36).toUpperCase()}`, spec_name: f.spec, price: Number(f.price), stock: Number(f.stock || 0) });
    }
    setMsg('SKU 已儲存（超賣防護靠下單 RPC 鎖庫存，勿手動把庫存設負數）');
    load();
  }

  function startSkuEdit(s: any) {
    setEditingSkuId(s.id);
    setSkuEditDraft({ spec: s.spec_name ?? '', price: String(s.price ?? ''), stock: String(s.stock ?? '') });
  }

  async function updateSku(skuId: string) {
    if (!skuEditDraft.spec.trim() || !skuEditDraft.price) { setMsg('規格與價格不可空白'); return; }
    setMsg('儲存中…');
    const { error } = await createClient().from('product_skus').update({
      spec_name: skuEditDraft.spec.trim(),
      price: Number(skuEditDraft.price),
      stock: Number(skuEditDraft.stock || 0),
    }).eq('id', skuId);
    setMsg(error ? `儲存失敗：${error.message}` : '規格已更新，前台即時顯示。');
    if (!error) {
      setEditingSkuId(null);
      load();
    }
  }

  async function toggleSkuActive(s: any) {
    await createClient().from('product_skus').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  }

  async function deleteSku(s: any) {
    if (!confirm(`確定刪除規格「${s.spec_name}」？購物車內該規格會一併移除（歷史訂單不受影響）。`)) return;
    const { error } = await createClient().from('product_skus').delete().eq('id', s.id);
    setMsg(error ? `刪除失敗：${error.message}` : '規格已刪除。');
    if (!error) load();
  }

  // 上傳圖片/影片到 product-images bucket，回寫 cover_image；asGallery=true 則附加到 images 多圖（含影片）
  async function uploadMedia(productId: string, file: File, asGallery: boolean) {
    setUploading(productId + (asGallery ? '-g' : '-c'));
    setMsg('');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${productId}/${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}（確認 Storage 有 product-images bucket 且你有 admin 權限）`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      const url = data.publicUrl;
      if (asGallery) {
        const cur = rows.find((r) => r.id === productId);
        const next = [...(cur?.images ?? []), url];
        const { error } = await sb.from('products').update({ images: next }).eq('id', productId);
        setMsg(error ? `回寫失敗：${error.message}` : '已加入多圖（含影片），前台畫廊即時顯示。');
      } else {
        const { error } = await sb.from('products').update({ cover_image: url }).eq('id', productId);
        setMsg(error ? `回寫失敗：${error.message}` : '首圖已更新，前台即時顯示。');
      }
      load();
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeGalleryImage(productId: string, url: string) {
    if (!confirm('從多圖移除這個媒體？（Storage 檔案本身保留）')) return;
    const sb = createClient();
    const cur = rows.find((r) => r.id === productId);
    await sb.from('products').update({ images: (cur?.images ?? []).filter((u: string) => u !== url) }).eq('id', productId);
    load();
  }

  // 商品介紹：存文字
  async function saveDetailText(productId: string, text: string) {
    setMsg('儲存中…');
    const { error } = await createClient().from('products').update({ detail_text: text }).eq('id', productId);
    setMsg(error ? `儲存失敗：${error.message}` : '商品介紹文字已儲存，前台即時顯示。');
    if (!error) load();
  }

  // 商品介紹：上傳介紹圖/影片到 detail_images
  async function uploadDetailMedia(productId: string, file: File) {
    setUploading(productId + '-d');
    setMsg('');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${productId}/detail-${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      const cur = rows.find((r) => r.id === productId);
      const { error } = await sb.from('products').update({ detail_images: [...(cur?.detail_images ?? []), data.publicUrl] }).eq('id', productId);
      setMsg(error ? `回寫失敗：${error.message}` : '介紹圖已加入，前台即時顯示。');
      load();
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeDetailImage(productId: string, url: string) {
    if (!confirm('從商品介紹移除這個媒體？（Storage 檔案本身保留）')) return;
    const sb = createClient();
    const cur = rows.find((r) => r.id === productId);
    await sb.from('products').update({ detail_images: (cur?.detail_images ?? []).filter((u: string) => u !== url) }).eq('id', productId);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded bg-white p-4">
        <h1 className="font-bold">新增商品</h1>
        <div className="mt-2 grid gap-2 md:grid-cols-5">
          <input className="rounded border p-2" placeholder="商品名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded border p-2" placeholder="slug (英文-唯一)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="rounded border p-2" type="number" placeholder="售價" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
          <input className="rounded border p-2 md:col-span-2" placeholder="簡短描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> 首頁精選</label>
          <button onClick={create} className="rounded bg-black px-4 py-2 text-white">新增</button>
          {msg && <span>{msg}</span>}
        </div>
      </div>
      {rows.map((p) => (
        <div key={p.id} className="rounded bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b>{p.name}</b><span className="text-xs text-neutral-500">{p.slug}｜NT$ {p.base_price}</span>
            <button onClick={() => (editingId === p.id ? setEditingId(null) : startEdit(p))} className="rounded border px-2 py-0.5 text-xs">{editingId === p.id ? '取消編輯' : '編輯名稱/價格/描述'}</button>
            <button onClick={() => toggle(p, 'is_active')} className="rounded border px-2 py-0.5 text-xs">{p.is_active ? '下架' : '上架'}</button>
            <button onClick={() => toggle(p, 'is_featured')} className="rounded border px-2 py-0.5 text-xs">{p.is_featured ? '取消精選' : '設精選'}</button>
          </div>
          {editingId === p.id && (
            <div className="mt-2 grid gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block">
                  <span className="text-neutral-500">商品名稱</span>
                  <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="mt-1 w-full rounded border bg-white p-1.5" />
                </label>
                <label className="block">
                  <span className="text-neutral-500">售價（NT$，各 SKU 價格請在下方另調）</span>
                  <input type="number" value={editDraft.base_price} onChange={(e) => setEditDraft({ ...editDraft, base_price: Number(e.target.value) })} className="mt-1 w-full rounded border bg-white p-1.5" />
                </label>
              </div>
              <label className="block">
                <span className="text-neutral-500">簡短描述（前台價格下方）</span>
                <input value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} className="mt-1 w-full rounded border bg-white p-1.5" />
              </label>
              <div className="text-xs text-neutral-400">slug（{p.slug}）是網址，建好後不建議改；要改網址請刪除重建。</div>
              <div>
                <button onClick={() => saveInfo(p.id)} className="rounded-full bg-black px-4 py-1 text-xs text-white">儲存基本資料</button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-start gap-3 rounded-lg bg-neutral-50 p-3">
            <div className="text-sm">
              <div className="font-medium">首圖</div>
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.name} className="mt-1 h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="mt-1 flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-200 text-2xl">📦</div>
              )}
              <label className="mt-1 block cursor-pointer rounded border bg-white px-2 py-1 text-xs text-center hover:bg-neutral-100">
                {uploading === p.id + '-c' ? '上傳中…' : '上傳首圖'}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(p.id, f, false); e.target.value = ''; }} />
              </label>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium">多圖＋影片（{(p.images ?? []).length}）</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(p.images ?? []).map((u: string) => (
                  <span key={u} className="group relative inline-block">
                    {/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(u) ? (
                      <span className="flex h-12 w-12 items-center justify-center rounded bg-black text-[10px] text-white">▶ 影片</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u} alt="" className="h-12 w-12 rounded object-cover" loading="lazy" />
                    )}
                    <button onClick={() => removeGalleryImage(p.id, u)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white group-hover:flex" title="移除">×</button>
                  </span>
                ))}
                {!(p.images ?? []).length && <span className="text-xs text-neutral-400">尚無多圖</span>}
              </div>
              <label className="mt-1.5 inline-block cursor-pointer rounded border bg-white px-2 py-1 text-xs hover:bg-neutral-100">
                {uploading === p.id + '-g' ? '上傳中…' : '＋ 上傳圖片/影片'}
                <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(p.id, f, true); e.target.value = ''; }} />
              </label>
              <span className="ml-2 text-xs text-neutral-400">影片請壓到 50MB 內（mp4/webm）</span>
            </div>
          </div>
          <div className="mt-2 text-sm space-y-1">
            {(p.product_skus ?? []).map((s: any) => (
              editingSkuId === s.id ? (
                <div key={s.id} className="grid gap-1 rounded-lg bg-neutral-50 p-2 md:grid-cols-[1fr_100px_90px_auto]">
                  <input value={skuEditDraft.spec} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, spec: e.target.value })} placeholder="規格" className="rounded border bg-white p-1" />
                  <input value={skuEditDraft.price} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, price: e.target.value })} placeholder="價格" type="number" className="rounded border bg-white p-1" />
                  <input value={skuEditDraft.stock} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, stock: e.target.value })} placeholder="庫存" type="number" className="rounded border bg-white p-1" />
                  <span className="flex gap-1">
                    <button onClick={() => updateSku(s.id)} className="rounded bg-black px-2 py-1 text-xs text-white">儲存</button>
                    <button onClick={() => setEditingSkuId(null)} className="rounded border px-2 py-1 text-xs">取消</button>
                  </span>
                </div>
              ) : (
                <div key={s.id} className="flex flex-wrap items-center gap-2">
                  <span>{s.sku_code}｜{s.spec_name}｜NT$ {s.price}｜庫存 {s.stock}{s.is_active === false ? '（已停用）' : ''}</span>
                  <button onClick={() => startSkuEdit(s)} className="rounded border px-2 py-0.5 text-xs">編輯</button>
                  <button onClick={() => toggleSkuActive(s)} className="rounded border px-2 py-0.5 text-xs">{s.is_active === false ? '啟用' : '停用'}</button>
                  <button onClick={() => deleteSku(s)} className="rounded border px-2 py-0.5 text-xs text-red-600">刪除</button>
                </div>
              )
            ))}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <input className="rounded border p-1 text-sm" placeholder="新規格 (如 粉/標準)" value={skuForm[p.id]?.spec ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: e.target.value, price: skuForm[p.id]?.price ?? '', stock: skuForm[p.id]?.stock ?? '' } })} />
            <input className="rounded border p-1 text-sm" placeholder="價格" value={skuForm[p.id]?.price ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: skuForm[p.id]?.spec ?? '', price: e.target.value, stock: skuForm[p.id]?.stock ?? '' } })} />
            <input className="rounded border p-1 text-sm" placeholder="庫存" value={skuForm[p.id]?.stock ?? ''} onChange={(e) => setSkuForm({ ...skuForm, [p.id]: { spec: skuForm[p.id]?.spec ?? '', price: skuForm[p.id]?.price ?? '', stock: e.target.value } })} />
            <button onClick={() => saveSku(p.id)} className="rounded border px-3 py-1 text-sm">＋ 新增 SKU</button>
          </div>
          <DetailEditor
            product={p}
            onSaveText={(t) => saveDetailText(p.id, t)}
            onUpload={(f) => uploadDetailMedia(p.id, f)}
            onRemove={(u) => removeDetailImage(p.id, u)}
            busy={uploading === p.id + '-d'}
          />
        </div>
      ))}
    </div>
  );
}

function DetailEditor({ product, onSaveText, onUpload, onRemove, busy }: {
  product: any;
  onSaveText: (t: string) => void;
  onUpload: (f: File) => void;
  onRemove: (u: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const cur = text ?? product.detail_text ?? '';
  const imgs: string[] = product.detail_images ?? [];
  return (
    <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
      <div className="font-medium">商品介紹（前台主圖下方圖文區）</div>
      <textarea
        value={cur}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="介紹說明：規格、材質、使用方式、注意事項…（換行會保留）"
        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button onClick={() => { onSaveText(cur); setText(null); }} className="rounded-full bg-black px-4 py-1 text-xs text-white">儲存介紹文字</button>
        <label className="cursor-pointer rounded-full border bg-white px-3 py-1 text-xs hover:bg-neutral-100">
          {busy ? '上傳中…' : '＋ 上傳介紹圖/影片'}
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
        <span className="text-xs text-neutral-400">沒填文字也沒傳圖時，前台不顯示此區</span>
      </div>
      {imgs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {imgs.map((u: string) => (
            <span key={u} className="group relative inline-block">
              {/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(u) ? (
                <span className="flex h-12 w-20 items-center justify-center rounded bg-black text-[10px] text-white">▶ 影片</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="" className="h-12 w-20 rounded object-cover" loading="lazy" />
              )}
              <button onClick={() => onRemove(u)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white group-hover:flex" title="移除">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
