'use client';

import { useMemo, useState } from 'react';
import { mockStores } from '@/lib/mock';

export type CvsSelection = { store_id: string; store_name: string; store_address: string };

const CHAINS = ['全部', '7-11', '全家', '萊爾富'];

// 超商取貨門市選擇器：
// - 初版：內建搜尋 + mock 門市，點選即寫入結帳表單 + localStorage，零設定可視化
// - 正式：按「開啟綠界門市地圖」打 /api/cvs/map-url 開新視窗選店，回傳由 /checkout/cvs-callback 接回
export default function CvsPicker({ onPick }: { onPick: (s: CvsSelection) => void }) {
  const [q, setQ] = useState('');
  const [chain, setChain] = useState('全部');
  const [picked, setPicked] = useState<CvsSelection | null>(() => {
    try {
      const raw = localStorage.getItem('solo-ec-cvs');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const list = useMemo(
    () =>
      mockStores.filter(
        (s) =>
          (chain === '全部' || s.chain === chain) &&
          (!q || s.name.includes(q) || s.address.includes(q))
      ),
    [q, chain]
  );

  function pick(s: { id: string; name: string; address: string }) {
    const sel = { store_id: s.id, store_name: s.name, store_address: s.address };
    setPicked(sel);
    localStorage.setItem('solo-ec-cvs', JSON.stringify(sel));
    onPick(sel);
  }

  async function openEcpayMap(subType: string) {
    const res = await fetch('/api/cvs/map-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logisticsSubType: subType }),
    });
    const { action, fields } = await res.json();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = '_blank';
    Object.entries(fields as Record<string, string>).forEach(([k, v]) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = k;
      i.value = v;
      form.appendChild(i);
    });
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  return (
    <div className="rounded border p-3">
      <div className="flex flex-wrap gap-2">
        {CHAINS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChain(c)}
            className={`rounded border px-3 py-1 text-sm ${chain === c ? 'bg-black text-white' : ''}`}
          >
            {c}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋門市/地址"
          className="min-w-[160px] flex-1 rounded border p-1 text-sm"
        />
      </div>
      {picked && (
        <p className="mt-2 rounded bg-green-50 p-2 text-sm">
          已選：{picked.store_name}（{picked.store_address}）
        </p>
      )}
      <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
            <span>[{s.chain}] {s.name} — {s.address}</span>
            <button type="button" className="rounded border px-2" onClick={() => pick(s)}>
              選擇
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2 text-xs">
        <button type="button" className="rounded border px-2 py-1" onClick={() => openEcpayMap('UNIMART')}>
          綠界地圖：7-11
        </button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => openEcpayMap('FAMI')}>
          綠界地圖：全家
        </button>
        <button type="button" className="rounded border px-2 py-1" onClick={() => openEcpayMap('HILIFE')}>
          綠界地圖：萊爾富
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        初版用內建門市即可操作；正式串接按綠界按鈕開官方地圖，選完自動跳回並帶入（見 /checkout/cvs-callback）。
      </p>
    </div>
  );
}
