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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm">
      <div className="grain relative w-full max-w-md overflow-hidden rounded-3xl bg-ink-900 p-7 text-center text-cream-50 shadow-lift">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/20 blur-[70px]" />
        <div className="relative">
          <div className="font-serif text-2xl font-black tracking-tight">{SITE.name}</div>
          <div className="mt-1 text-[11px] tracking-[0.28em] text-gold-300">ADULTS ONLY ・ 18+</div>
          <p className="mt-3 text-sm leading-6 text-cream-100/70">本站部分商品為成人用品，需年滿 18 歲方可瀏覽。進入即表示您已滿 18 歲並同意隱私政策。</p>
          <div className="mt-5 flex gap-2">
            <button
              className="flex-1 rounded-full bg-cream-50 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-gold-200"
              onClick={() => { try { localStorage.setItem('solo-ec-age', '1'); } catch {} setShow(false); }}
            >我已滿 18 歲，進入</button>
            <a className="flex-1 rounded-full border border-white/25 py-2.5 text-sm text-cream-100 transition hover:border-gold-300 hover:text-gold-200" href="https://www.google.com">未滿 18 歲</a>
          </div>
        </div>
      </div>
    </div>
  );
}
