'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { addLocal } from '@/lib/cart';

export default function AddToCart({ sku_id, disabled }: { sku_id: string; disabled?: boolean }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMsg('');
    addLocal(sku_id, 1); // 訪客先存本地，保證可視化可操作
    try {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      if (data.user) {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku_id, qty: 1 }),
        });
        setMsg('已加入購物車（已同步雲端）');
      } else setMsg('已加入購物車（訪客模式，登入後合併）');
    } catch {
      setMsg('已加入購物車（本機模式）');
    }
    setBusy(false);
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <span>
      <button
        onClick={add}
        disabled={disabled || busy}
        className="rounded bg-black px-3 py-1 text-white disabled:opacity-40"
      >
        {disabled ? '缺貨' : busy ? '加入中…' : '加入購物車'}
      </button>
      {msg && <span className="ml-2 text-xs text-green-700">{msg}</span>}
    </span>
  );
}
