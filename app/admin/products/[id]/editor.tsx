'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

// 單一商品編輯頁：基本資料＋圖片/影片＋規格庫存＋商品介紹
export default function ProductEditor({ productId }: { productId: string }) {
  const [p, setP] = useState<any | null>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState('載入中…');
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', description: '', category_id: '' });
  const [skuDraft, setSkuDraft] = useState({ spec: '', price: '', stock: '' });
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [skuEditDraft, setSkuEditDraft] = useState({ spec: '', price: '', stock: '' });

  async function load() {
    const sb = createClient();
    const { data, error } = await sb.from('products').select('id,name,slug,is_active,is_featured,base_price,description,category_id,cover_image,images,detail_text,detail_images,product_skus(id,sku_code,spec_name,price,stock,is_active)').eq('id', productId).single();
    if (error) { setMsg(`載入失敗：${error.message}`); return; }
    setP(data);
    setMsg('');
    const { data: catData } = await sb.from('categories').select('id,name,slug').order('sort').limit(100);
    if (catData) setCats(catData);
  }
  useEffect(() => { load(); }, [productId]);

  async function syncBasePrice() {
    const sb = createClient();
    const { data } = await sb.from('product_skus').select('price').eq('product_id', productId).eq('is_active', true);
    if (data?.length) {
      const min = Math.min(...data.map((s: any) => s.price));
      await sb.from('products').update({ base_price: min }).eq('id', productId);
    }
  }

  async function toggle(field: 'is_active' | 'is_featured') {
    await createClient().from('products').update({ [field]: !(p as any)[field] }).eq('id', productId);
    load();
  }

  async function deleteProduct() {
    if (!confirm(`確定刪除「${p.name}」？規格和購物車內項目會一併移除（歷史訂單不受影響），此動作無法復原。`)) return;
    const { error } = await createClient().from('products').delete().eq('id', productId);
    if (error) { setMsg(`刪除失敗：${error.message}`); return; }
    location.href = '/admin/products';
  }

  async function saveInfo() {
    if (!editDraft.name.trim()) { setMsg('商品名不可空白'); return; }
    setMsg('儲存中…');
    const { error } = await createClient().from('products').update({
      name: editDraft.name.trim(),
      description: editDraft.description,
      category_id: editDraft.category_id || null,
    }).eq('id', productId);
    setMsg(error ? `儲存失敗：${error.message}` : '基本資料已更新，前台即時顯示。');
    if (!error) { setEditingInfo(false); load(); }
  }

  async function uploadMedia(file: File, asGallery: boolean) {
    setUploading(asGallery ? 'g' : 'c');
    setMsg('');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${productId}/${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      if (asGallery) {
        const next = [...((p as any)?.images ?? []), data.publicUrl];
        const { error } = await sb.from('products').update({ images: next }).eq('id', productId);
        setMsg(error ? `回寫失敗：${error.message}` : '已加入多圖，前台即時顯示。');
      } else {
        const { error } = await sb.from('products').update({ cover_image: data.publicUrl }).eq('id', productId);
        setMsg(error ? `回寫失敗：${error.message}` : '首圖已更新，前台即時顯示。');
      }
      load();
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeGalleryImage(url: string) {
    if (!confirm('從多圖移除？（Storage 檔案本身保留）')) return;
    await createClient().from('products').update({ images: ((p as any)?.images ?? []).filter((u: string) => u !== url) }).eq('id', productId);
    load();
  }

  async function saveSku() {
    if (!skuDraft.spec || !skuDraft.price) { setMsg('SKU 需填規格與價格'); return; }
    const sb = createClient();
    await sb.from('product_skus').insert({ product_id: productId, sku_code: `SKU-${Date.now().toString(36).toUpperCase()}`, spec_name: skuDraft.spec, price: Number(skuDraft.price), stock: Number(skuDraft.stock || 0) });
    setMsg('SKU 已新增，售價已同步為最低價。');
    setSkuDraft({ spec: '', price: '', stock: '' });
    await syncBasePrice();
    load();
  }

  async function updateSku(skuId: string) {
    if (!skuEditDraft.spec.trim() || !skuEditDraft.price) { setMsg('規格與價格不可空白'); return; }
    const { error } = await createClient().from('product_skus').update({
      spec_name: skuEditDraft.spec.trim(),
      price: Number(skuEditDraft.price),
      stock: Number(skuEditDraft.stock || 0),
    }).eq('id', skuId);
    setMsg(error ? `儲存失敗：${error.message}` : '規格已更新，售價已同步。');
    if (!error) { setEditingSkuId(null); await syncBasePrice(); load(); }
  }

  async function toggleSkuActive(s: any) {
    await createClient().from('product_skus').update({ is_active: !s.is_active }).eq('id', s.id);
    await syncBasePrice();
    load();
  }

  async function deleteSku(s: any) {
    if (!confirm(`確定刪除規格「${s.spec_name}」？購物車內該規格會一併移除（歷史訂單不受影響）。`)) return;
    const { error } = await createClient().from('product_skus').delete().eq('id', s.id);
    setMsg(error ? `刪除失敗：${error.message}` : '規格已刪除，售價已同步。');
    if (!error) { await syncBasePrice(); load(); }
  }

  async function saveDetailText(text: string) {
    setMsg('儲存中…');
    const { error } = await createClient().from('products').update({ detail_text: text }).eq('id', productId);
    setMsg(error ? `儲存失敗：${error.message}` : '介紹文字已儲存。');
    if (!error) load();
  }

  async function uploadDetailMedia(file: File) {
    setUploading('d');
    setMsg('');
    try {
      const sb = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${productId}/detail-${Date.now()}-${safe}`;
      const { error: upErr } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
      if (upErr) { setMsg(`上傳失敗：${upErr.message}`); return; }
      const { data } = sb.storage.from('product-images').getPublicUrl(path);
      const { error } = await sb.from('products').update({ detail_images: [...((p as any)?.detail_images ?? []), data.publicUrl] }).eq('id', productId);
      setMsg(error ? `回寫失敗：${error.message}` : '介紹圖已加入。');
      load();
    } catch (e: any) {
      setMsg(`上傳失敗：${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeDetailImage(url: string) {
    if (!confirm('從商品介紹移除？（Storage 檔案本身保留）')) return;
    await createClient().from('products').update({ detail_images: ((p as any)?.detail_images ?? []).filter((u: string) => u !== url) }).eq('id', productId);
    load();
  }

  if (!p) return <div className="rounded bg-white p-4 text-sm text-neutral-500">{msg}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/admin/products" className="rounded-full border bg-white px-4 py-1.5 text-sm hover:bg-neutral-100">← 回商品列表</a>
        <a href={`/products/${p.slug}`} target="_blank" className="rounded-full border bg-white px-4 py-1.5 text-sm hover:bg-neutral-100">前台預覽 ↗</a>
      </div>
      {msg && <div className="text-sm text-neutral-500">{msg}</div>}

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {p.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_image} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-200 text-2xl">📦</div>
          )}
          <div>
            <div className="text-lg font-bold">{p.name}</div>
            <div className="text-xs text-neutral-500">{p.slug}｜NT$ {p.base_price}｜{cats.find((c) => c.id === p.category_id)?.name ?? '未分類'}{p.is_active === false ? '・已下架' : ''}{p.is_featured ? '・精選' : ''}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <button onClick={() => { setEditingInfo(!editingInfo); setEditDraft({ name: p.name ?? '', description: p.description ?? '', category_id: p.category_id ?? '' }); }} className="rounded-full border px-3 py-1.5">{editingInfo ? '取消編輯' : '編輯名稱/分類/描述'}</button>
          <button onClick={() => toggle('is_active')} className="rounded-full border px-3 py-1.5">{p.is_active ? '下架' : '上架'}</button>
          <button onClick={() => toggle('is_featured')} className="rounded-full border px-3 py-1.5">{p.is_featured ? '取消精選' : '設精選'}</button>
          <button onClick={deleteProduct} className="rounded-full border border-red-300 px-3 py-1.5 text-red-600">刪除商品</button>
        </div>
        {editingInfo && (
          <div className="mt-3 grid gap-2 rounded-xl bg-neutral-50 p-3 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="block">
                <span className="text-neutral-500">商品名稱</span>
                <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2" />
              </label>
              <label className="block">
                <span className="text-neutral-500">分類</span>
                <select value={editDraft.category_id} onChange={(e) => setEditDraft({ ...editDraft, category_id: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2">
                  <option value="">未分類</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div className="rounded-lg bg-white p-2 text-xs text-neutral-500">售價 NT$ {p.base_price}（自動取啟用中 SKU 最低價，改下方 SKU 會同步）</div>
            <label className="block">
              <span className="text-neutral-500">簡短描述</span>
              <input value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2" />
            </label>
            <div>
              <button onClick={saveInfo} className="rounded-full bg-black px-4 py-1.5 text-xs text-white">儲存基本資料</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 text-sm shadow-soft">
        <div className="font-bold">首圖＋多圖/影片</div>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <div>
            <div className="text-xs text-neutral-500">首圖</div>
            {p.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image} alt={p.name} className="mt-1 h-24 w-24 rounded-xl object-cover" />
            ) : (
              <div className="mt-1 flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-200 text-3xl">📦</div>
            )}
            <label className="mt-1.5 block cursor-pointer rounded-lg border px-2 py-1 text-center text-xs hover:bg-neutral-100">
              {uploading === 'c' ? '上傳中…' : '上傳首圖'}
              <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, false); e.target.value = ''; }} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-neutral-500">多圖＋影片（{(p.images ?? []).length}）</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(p.images ?? []).map((u: string) => (
                <span key={u} className="group relative inline-block">
                  {/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(u) ? (
                    <span className="flex h-12 w-12 items-center justify-center rounded bg-black text-[10px] text-white">▶ 影片</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u} alt="" className="h-12 w-12 rounded object-cover" loading="lazy" />
                  )}
                  <button onClick={() => removeGalleryImage(u)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white group-hover:flex" title="移除">×</button>
                </span>
              ))}
              {!(p.images ?? []).length && <span className="text-xs text-neutral-400">尚無多圖</span>}
            </div>
            <label className="mt-1.5 inline-block cursor-pointer rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100">
              {uploading === 'g' ? '上傳中…' : '＋ 上傳圖片/影片'}
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, true); e.target.value = ''; }} />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 text-sm shadow-soft">
        <div className="font-bold">規格 / 價格 / 庫存</div>
        <div className="mt-2 space-y-1.5">
          {(p.product_skus ?? []).map((s: any) => (
            editingSkuId === s.id ? (
              <div key={s.id} className="grid gap-1.5 rounded-xl bg-neutral-50 p-2 md:grid-cols-[1fr_110px_100px_auto]">
                <input value={skuEditDraft.spec} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, spec: e.target.value })} placeholder="規格" className="rounded-lg border bg-white p-1.5" />
                <input value={skuEditDraft.price} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, price: e.target.value })} placeholder="價格" type="number" className="rounded-lg border bg-white p-1.5" />
                <input value={skuEditDraft.stock} onChange={(e) => setSkuEditDraft({ ...skuEditDraft, stock: e.target.value })} placeholder="庫存" type="number" className="rounded-lg border bg-white p-1.5" />
                <span className="flex gap-1.5">
                  <button onClick={() => updateSku(s.id)} className="rounded-full bg-black px-3 py-1.5 text-xs text-white">儲存</button>
                  <button onClick={() => setEditingSkuId(null)} className="rounded-full border px-3 py-1.5 text-xs">取消</button>
                </span>
              </div>
            ) : (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-900/5 px-3 py-2">
                <span className="font-mono text-xs text-neutral-400">{s.sku_code}</span>
                <b>{s.spec_name}</b>
                <span>NT$ {s.price}</span>
                <span className="text-neutral-500">庫存 {s.stock}</span>
                {s.is_active === false && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">已停用</span>}
                <span className="ml-auto flex gap-1.5 text-xs">
                  <button onClick={() => { setEditingSkuId(s.id); setSkuEditDraft({ spec: s.spec_name ?? '', price: String(s.price ?? ''), stock: String(s.stock ?? '') }); }} className="rounded-full border px-3 py-1">編輯</button>
                  <button onClick={() => toggleSkuActive(s)} className="rounded-full border px-3 py-1">{s.is_active === false ? '啟用' : '停用'}</button>
                  <button onClick={() => deleteSku(s)} className="rounded-full border border-red-300 px-3 py-1 text-red-600">刪除</button>
                </span>
              </div>
            )
          ))}
        </div>
        <div className="mt-3 grid gap-2 rounded-xl bg-neutral-50 p-3 md:grid-cols-[1fr_110px_100px_auto]">
          <input placeholder="新規格（如 粉/標準）" value={skuDraft.spec} onChange={(e) => setSkuDraft({ ...skuDraft, spec: e.target.value })} className="rounded-lg border bg-white p-1.5" />
          <input placeholder="價格" type="number" value={skuDraft.price} onChange={(e) => setSkuDraft({ ...skuDraft, price: e.target.value })} className="rounded-lg border bg-white p-1.5" />
          <input placeholder="庫存" type="number" value={skuDraft.stock} onChange={(e) => setSkuDraft({ ...skuDraft, stock: e.target.value })} className="rounded-lg border bg-white p-1.5" />
          <button onClick={saveSku} className="rounded-full border bg-white px-4 py-1.5 text-xs">＋ 新增規格</button>
        </div>
      </div>

      <DetailBlock
        text={p.detail_text ?? ''}
        images={p.detail_images ?? []}
        busy={uploading === 'd'}
        onSave={saveDetailText}
        onUpload={uploadDetailMedia}
        onRemove={removeDetailImage}
      />

      <div className="rounded-2xl border border-ink-900/10 bg-white p-5 text-sm shadow-soft">
        <div className="font-bold">圖片大圖預覽 <span className="ml-1 text-xs font-normal text-neutral-400">跟上方首圖＋多圖同一份資料，上面改這裡同步變</span></div>
        {p.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_image} alt={`${p.name} 首圖`} className="mt-2 max-h-96 w-full rounded-xl bg-neutral-50 object-contain" />
        ) : (
          <div className="mt-2 rounded-xl bg-neutral-100 p-6 text-center text-neutral-400">尚未上傳首圖</div>
        )}
        {(p.images ?? []).length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {(p.images ?? []).map((u: string) => (
              <div key={u} className="overflow-hidden rounded-xl bg-neutral-50">
                {/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(u) ? (
                  <video src={u} controls preload="metadata" className="max-h-64 w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u} alt={`${p.name} 多圖`} className="max-h-64 w-full object-contain" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ text, images, busy, onSave, onUpload, onRemove }: {
  text: string; images: string[]; busy: boolean;
  onSave: (t: string) => void; onUpload: (f: File) => void; onRemove: (u: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cur = draft ?? text;
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-5 text-sm shadow-soft">
      <div className="font-bold">商品介紹（前台主圖下方圖文區）</div>
      <textarea
        value={cur}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="規格、材質、使用方式、注意事項…（換行會保留）"
        className="mt-2 w-full rounded-xl border px-3 py-2"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => { onSave(cur); setDraft(null); }} className="rounded-full bg-black px-4 py-1.5 text-xs text-white">儲存介紹文字</button>
        <label className="cursor-pointer rounded-full border px-3 py-1.5 text-xs hover:bg-neutral-100">
          {busy ? '上傳中…' : '＋ 上傳介紹圖/影片'}
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      </div>
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {images.map((u: string) => (
            <span key={u} className="group relative inline-block">
              {/(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(u) ? (
                <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-black text-[10px] text-white">▶ 影片</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="" className="h-14 w-20 rounded-lg object-cover" loading="lazy" />
              )}
              <button onClick={() => onRemove(u)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white group-hover:flex" title="移除">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
