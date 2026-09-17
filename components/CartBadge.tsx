'use client';
import { useEffect, useState } from 'react';

// Header 購物車件數徽章：登入讀雲端，訪客讀 localStorage，跨分頁同步
export default function CartBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    async function refresh() {
      let n = 0;
      try {
        const raw = localStorage.getItem('solo-ec-cart');
        if (raw) n += (JSON.parse(raw) as any[]).reduce((s, l) => s + (l.qty || 0), 0);
      } catch {}
      try {
        const { createClient } = await import('@/lib/supabase-client');
        const sb = createClient();
        const { data: u } = await sb.auth.getUser();
        if (u.user) {
          const { data } = await sb.from('cart_items').select('qty').eq('user_id', u.user.id);
          if (data?.length) n = data.reduce((s, r: any) => s + r.qty, 0);
        }
      } catch {}
      setCount(n);
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return (
    <a href="/cart" className="relative whitespace-nowrap text-[13px]">
      🛒 購物車
      {count > 0 && (
        <span className="absolute -right-3 -top-2 rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  );
}
