'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { DEFAULT_BLOCKS, SIZE_OPTIONS, THEME_OPTIONS, DEFAULT_HERO_PAYLOAD, getHeroPayload, getFooterPayload, getEyebrow, EYEBROW_EDITABLE_IDS, type SiteBlock } from '@/lib/site-blocks';

const BLOCK_LABEL: Record<string, string> = {
  announcement: '頂部公告列（最上方黑條）',
  line: 'LINE 浮動客服（右下角固定鈕）',
  footer: '頁尾設定',
  hero: '主視覺 Hero',
  categories: '熱門分類',
  featured: 'TOP 推薦',
  brands: '品牌旗艦館',
  guides: '知識專欄',
  trust: '購物保障',
};

export default function SiteEditor() {
  const [rows, setRows] = useState<SiteBlock[]>(DEFAULT_BLOCKS);
  const [msg, setMsg] = useState('載入中…');
  const [saving, setSaving] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  async function load() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setMsg('尚未設定 Supabase 連線（先照 DEPLOY.md 設定環境變數），目前顯示預設值。');
        return;
      }
      const sb = createClient();
      const { data, error } = await sb.from('site_blocks').select('*');
      if (error) {
        if (error.code === '42P01' || error.message.includes('site_blocks')) {
          setTableMissing(true);
          setMsg('資料表還沒建：請到 Supabase SQL Editor 執行 supabase/site-blocks.sql 一次，再重整。');
          return;
        }
        setMsg(`載入失敗：${error.message}`);
        return;
      }
      const byId = new Map((data ?? []).map((r: any) => [r.id, r]));
      setRows(
        DEFAULT_BLOCKS.map((d) => {
          const r = byId.get(d.id) as any;
          if (!r) return d;
          return {
            id: d.id,
            title: r.title ?? d.title,
            subtitle: r.subtitle ?? d.subtitle,
            visible: r.visible ?? true,
            sort: r.sort ?? d.sort,
            titleSize: r.title_size ?? d.titleSize,
            theme: r.theme ?? d.theme,
            payload: (r.payload ?? undefined) as SiteBlock['payload'],
          };
        }).sort((a, b) => a.sort - b.sort)
      );
      setMsg('');
      setTableMissing(false);
    } catch (e: any) {
      setMsg(`載入失敗：${e.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function patch(id: string, p: Partial<SiteBlock>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function patchPayload(id: string, fn: (p: { eyebrow: string; promos: { threshold: string; gift: string }[] }) => { eyebrow: string; promos: { threshold: string; gift: string }[] }) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const cur = getHeroPayload(r);
        return { ...r, payload: fn({ eyebrow: cur.eyebrow, promos: cur.promos.map((m) => ({ ...m })) }) };
      })
    );
  }

  function patchFooter(id: string, fn: (p: { about: string[]; email: string; hours: string; copyright: string; columns: { heading: string; links: { label: string; href: string }[] }[] }) => { about: string[]; email: string; hours: string; copyright: string; columns: { heading: string; links: { label: string; href: string }[] }[] }) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const cur = getFooterPayload(r);
        const base = { about: [...cur.about], email: cur.email, hours: cur.hours, copyright: cur.copyright, columns: cur.columns.map((c) => ({ heading: c.heading, links: c.links.map((l) => ({ ...l })) })) };
        return { ...r, payload: fn(base) };
      })
    );
  }

  function patchFooterColumns(id: string, columns: { heading: string; links: { label: string; href: string }[] }[]) {
    patchFooter(id, (p) => ({ ...p, columns }));
  }

  function patchEyebrow(id: string, eyebrow: string) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const cur = typeof r.payload === 'object' && r.payload !== null ? r.payload : {};
        return { ...r, payload: { ...cur, eyebrow } };
      })
    );
  }

  async function save(row: SiteBlock) {
    setSaving(row.id);
    setMsg('');
    try {
      const { error } = await createClient()
        .from('site_blocks')
        .upsert(
          {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            visible: row.visible,
            sort: Number(row.sort) || 0,
            title_size: row.titleSize,
            theme: row.theme,
            ...(row.payload ? { payload: row.payload } : {}),
          },
          { onConflict: 'id' }
        );
      setMsg(error ? `儲存失敗：${error.message}` : `「${BLOCK_LABEL[row.id]}」已儲存，前台重整即生效。`);
    } catch (e: any) {
      setMsg(`儲存失敗：${e.message}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">首頁版面設定</h1>
          <p className="mt-1 text-sm text-neutral-500">
            調整每區文字內容、標題大小、配色主題、顯示開關、排序。儲存後前台即時生效。
          </p>
        </div>
        <button onClick={load} className="rounded-full border px-4 py-1.5 text-sm hover:bg-neutral-100">
          重新載入
        </button>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6">
          <b>還沒建表。</b>到 Supabase Dashboard → SQL Editor，貼上專案內{' '}
          <code className="rounded bg-white px-1">supabase/site-blocks.sql</code> 全選 Run，再回來按重新載入。
        </div>
      )}
      {msg && !tableMissing && <div className="text-sm text-neutral-500">{msg}</div>}

      <div className="grid gap-4">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold">
                {BLOCK_LABEL[r.id] ?? r.id}
                <span className="ml-2 text-xs font-normal text-neutral-400">id: {r.id}</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.visible}
                  onChange={(e) => patch(r.id, { visible: e.target.checked })}
                  className="h-4 w-4 accent-black"
                />
                顯示此區
              </label>
            </div>

            {r.id !== 'footer' && (
              <>
                {EYEBROW_EDITABLE_IDS.includes(r.id) && (
                  <label className="mt-3 block text-sm">
                    <span className="text-neutral-500">英文小標（標題上方金色小字，留空恢復預設）</span>
                    <input
                      value={typeof (r.payload as any)?.eyebrow === 'string' ? (r.payload as any).eyebrow : ''}
                      placeholder={getEyebrow(r)}
                      onChange={(e) => patchEyebrow(r.id, e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 tracking-[0.15em]"
                    />
                  </label>
                )}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-neutral-500">{r.id === 'line' ? 'LINE 連結（須 http 開頭，如 https://line.me/R/ti/p/@你的ID）' : '標題文字'}</span>
                    <input
                      value={r.title}
                      onChange={(e) => patch(r.id, { title: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>
                  {r.id !== 'line' && (
                    <label className="block text-sm">
                      <span className="text-neutral-500">副標 / 描述</span>
                      <input
                        value={r.subtitle}
                        onChange={(e) => patch(r.id, { subtitle: e.target.value })}
                        placeholder="留空則不顯示"
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                      />
                    </label>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <label className="block">
                    <span className="text-neutral-500">標題大小</span>
                    <select
                      value={r.titleSize}
                      onChange={(e) => patch(r.id, { titleSize: e.target.value as SiteBlock['titleSize'] })}
                      className="mt-1 w-full rounded-xl border bg-white px-2 py-2"
                    >
                      {SIZE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-neutral-500">配色主題</span>
                    <select
                      value={r.theme}
                      onChange={(e) => patch(r.id, { theme: e.target.value as SiteBlock['theme'] })}
                      className="mt-1 w-full rounded-xl border bg-white px-2 py-2"
                    >
                      {THEME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-neutral-500">排序（小在上）</span>
                    <input
                      type="number"
                      value={r.sort}
                      onChange={(e) => patch(r.id, { sort: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>
                </div>
              </>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => save(r)}
                disabled={saving === r.id || tableMissing}
                className="rounded-full bg-ink-950 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-ink-800 disabled:opacity-40"
              >
                {saving === r.id ? '儲存中…' : '儲存此區'}
              </button>
              <span className="text-xs text-neutral-400">只存這一區，不影響其他區</span>
            </div>

            {r.id === 'footer' && (
              <div className="mt-3 rounded-xl bg-cream-50 p-4 text-sm">
                <div className="font-bold">頁尾內容（品牌簡介三行＋聯絡＋版權列）</div>
                {(() => {
                  const fp = getFooterPayload(r);
                  return (
                    <>
                      {fp.about.map((line, i) => (
                        <label key={i} className="mt-2 block">
                          <span className="text-neutral-500">簡介第 {i + 1} 行</span>
                          <input
                            value={line}
                            onChange={(e) =>
                              patchFooter(r.id, (p) => ({
                                ...p,
                                about: p.about.map((a, j) => (j === i ? e.target.value : a)),
                              }))
                            }
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                          />
                        </label>
                      ))}
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <label className="block">
                          <span className="text-neutral-500">聯絡信箱</span>
                          <input
                            value={fp.email}
                            onChange={(e) => patchFooter(r.id, (p) => ({ ...p, email: e.target.value }))}
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                          />
                        </label>
                        <label className="block">
                          <span className="text-neutral-500">客服時間</span>
                          <input
                            value={fp.hours}
                            onChange={(e) => patchFooter(r.id, (p) => ({ ...p, hours: e.target.value }))}
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                          />
                        </label>
                      </div>
                      <label className="mt-2 block">
                        <span className="text-neutral-500">版權列（© 年份 店名・後面這段）</span>
                        <input
                          value={fp.copyright}
                          onChange={(e) => patchFooter(r.id, (p) => ({ ...p, copyright: e.target.value }))}
                          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                        />
                      </label>
                      <div className="mt-3 border-t pt-3">
                        <div className="font-bold">連結欄（購物說明 / 會員服務）</div>
                        {fp.columns.map((col, ci) => (
                          <div key={ci} className="mt-2 rounded-xl border bg-white p-3">
                            <input
                              value={col.heading}
                              onChange={(e) =>
                                patchFooterColumns(
                                  r.id,
                                  fp.columns.map((c, j) => (j === ci ? { ...c, heading: e.target.value } : c))
                                )
                              }
                              placeholder="欄目標題"
                              className="w-full rounded-lg border px-2 py-1.5 font-bold"
                            />
                            {col.links.map((l, li) => (
                              <div key={li} className="mt-1.5 flex gap-1.5">
                                <input
                                  value={l.label}
                                  onChange={(e) =>
                                    patchFooterColumns(
                                      r.id,
                                      fp.columns.map((c, j) =>
                                        j === ci ? { ...c, links: c.links.map((x, k) => (k === li ? { ...x, label: e.target.value } : x)) } : c
                                      )
                                    )
                                  }
                                  placeholder="文字"
                                  className="flex-1 rounded-lg border px-2 py-1.5"
                                />
                                <input
                                  value={l.href}
                                  onChange={(e) =>
                                    patchFooterColumns(
                                      r.id,
                                      fp.columns.map((c, j) =>
                                        j === ci ? { ...c, links: c.links.map((x, k) => (k === li ? { ...x, href: e.target.value } : x)) } : c
                                      )
                                    )
                                  }
                                  placeholder="/guide"
                                  className="flex-1 rounded-lg border px-2 py-1.5"
                                />
                                <button
                                  onClick={() =>
                                    patchFooterColumns(
                                      r.id,
                                      fp.columns.map((c, j) => (j === ci ? { ...c, links: c.links.filter((_, k) => k !== li) } : c))
                                    )
                                  }
                                  className="shrink-0 rounded-lg border px-2 text-red-600"
                                  title="刪除此連結"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {col.links.length < 6 && (
                              <button
                                onClick={() =>
                                  patchFooterColumns(
                                    r.id,
                                    fp.columns.map((c, j) => (j === ci ? { ...c, links: [...c.links, { label: '', href: '/' }] } : c))
                                  )
                                }
                                className="mt-1.5 rounded-full border px-3 py-1 text-xs"
                              >
                                ＋ 新增連結
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-neutral-400">
                        若出現 payload 欄位不存在，請先到 Supabase 執行 supabase/footer.sql。
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {r.id === 'hero' && (
              <div className="mt-4 rounded-xl bg-cream-50 p-4 text-sm">
                <div className="font-bold">Hero 細項：徽章 + 滿額贈（右邊精選卡片請改用 Banner 管理）</div>
                {(() => {
                  const hp = getHeroPayload(r);
                  return (
                    <>
                      <label className="mt-2 block">
                        <span className="text-neutral-500">頂部徽章文字</span>
                        <input
                          value={hp.eyebrow}
                          onChange={(e) => patchPayload(r.id, (p) => ({ ...p, eyebrow: e.target.value }))}
                          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                        />
                      </label>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        {hp.promos.map((promo, i) => (
                          <div key={i} className="rounded-xl border bg-white p-2.5">
                            <div className="text-xs text-neutral-400">第 {i + 1} 格</div>
                            <input
                              value={promo.threshold}
                              onChange={(e) =>
                                patchPayload(r.id, (p) => ({
                                  ...p,
                                  promos: p.promos.map((m, j) => (j === i ? { ...m, threshold: e.target.value } : m)),
                                }))
                              }
                              placeholder="滿1000"
                              className="mt-1 w-full rounded-lg border px-2 py-1.5"
                            />
                            <input
                              value={promo.gift}
                              onChange={(e) =>
                                patchPayload(r.id, (p) => ({
                                  ...p,
                                  promos: p.promos.map((m, j) => (j === i ? { ...m, gift: e.target.value } : m)),
                                }))
                              }
                              placeholder="贈品名稱"
                              className="mt-1.5 w-full rounded-lg border px-2 py-1.5"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-neutral-400">
                        儲存後前台 Hero 即時更新。若出現 payload 欄位不存在，請先到 Supabase 執行 supabase/hero-settings.sql。
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
