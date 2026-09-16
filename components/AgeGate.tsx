'use client';
import { useEffect, useState } from 'react';
import { SITE } from '@/lib/shop';

export default function AgeGate() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('solo-ec-age')) setShow(true);
    } catch { setShow(true); }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-md rounded-2xl bg-white p-6 text-center">
        <div className="text-2xl font-bold">🔞 {SITE.name}</div>
        <p className="mt-2 text-sm text-neutral-600">本站部分商品為成人用品，需年滿 18 歲方可瀏覽。進入即表示您已滿 18 歲並同意隱私政策。</p>
        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 rounded bg-black py-2 text-white"
            onClick={() => { try { localStorage.setItem('solo-ec-age', '1'); } catch {} setShow(false); }}
          >我已滿 18 歲，進入</button>
          <a className="flex-1 rounded border py-2" href="https://www.google.com">未滿 18 歲</a>
        </div>
      </div>
    </div>
  );
}
