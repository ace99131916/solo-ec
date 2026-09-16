'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// 綠界門市地圖 ServerReplyURL 落點：把回傳門市寫入 localStorage 後跳回 /checkout
function CvsCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('門市回傳處理中…');

  useEffect(() => {
    const id = params.get('CVSStoreID') ?? params.get('store_id') ?? '';
    const name = params.get('CVSStoreName') ?? params.get('store_name') ?? '';
    const addr = params.get('CVSAddress') ?? params.get('store_address') ?? '';
    if (id || name) {
      localStorage.setItem('solo-ec-cvs', JSON.stringify({ store_id: id, store_name: name, store_address: addr }));
      setMsg(`已帶回門市：${name}，返回結帳頁…`);
      setTimeout(() => router.push('/checkout'), 1200);
    } else {
      setMsg('未收到門市資訊（可能是直接開啟此頁）。請回結帳頁用內建選擇器。');
    }
  }, [params, router]);

  return <p className="rounded bg-white p-6 text-sm">{msg}</p>;
}

export default function CvsCallbackPage() {
  return (
    <Suspense fallback={<p className="rounded bg-white p-6 text-sm">載入中…</p>}>
      <CvsCallbackInner />
    </Suspense>
  );
}
