// 購物車：未登入走 localStorage，登入後與 Supabase cart_items 合併
// key: solo-ec-cart -> [{sku_id, qty}]
'use client';

export type CartLine = { sku_id: string; qty: number };
const KEY = 'solo-ec-cart';

export function readLocalCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x?.sku_id && x?.qty > 0) : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}

export function addLocal(sku_id: string, qty = 1): CartLine[] {
  const lines = readLocalCart();
  const found = lines.find((l) => l.sku_id === sku_id);
  if (found) found.qty = Math.min(found.qty + qty, 99);
  else lines.push({ sku_id, qty });
  writeLocalCart(lines);
  return lines;
}

export function setQtyLocal(sku_id: string, qty: number): CartLine[] {
  let lines = readLocalCart();
  if (qty <= 0) lines = lines.filter((l) => l.sku_id !== sku_id);
  else {
    const found = lines.find((l) => l.sku_id === sku_id);
    if (found) found.qty = Math.min(qty, 99);
    else lines.push({ sku_id, qty });
  }
  writeLocalCart(lines);
  return lines;
}

export function clearLocal() {
  localStorage.removeItem(KEY);
}

// 登入後呼叫：把 local 購物車 upsert 到 Supabase
export async function mergeLocalToServer(supabase: any, userId: string) {
  const lines = readLocalCart();
  for (const l of lines) {
    await supabase.from('cart_items').upsert(
      { user_id: userId, sku_id: l.sku_id, qty: l.qty },
      { onConflict: 'user_id,sku_id' }
    );
  }
}
