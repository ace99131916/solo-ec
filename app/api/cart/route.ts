import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST {sku_id, qty}：登入者累加到 cart_items（qty 為本次增量，預設 1）
export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, guest: true });
  const { sku_id, qty = 1 } = await req.json();
  if (!sku_id) return NextResponse.json({ ok: false, error: 'missing sku_id' }, { status: 400 });
  const { data: ex } = await supabase
    .from('cart_items')
    .select('qty')
    .eq('user_id', data.user.id)
    .eq('sku_id', sku_id)
    .single();
  const nextQty = Math.min((ex?.qty ?? 0) + qty, 99);
  const { error } = await supabase
    .from('cart_items')
    .upsert({ user_id: data.user.id, sku_id, qty: nextQty }, { onConflict: 'user_id,sku_id' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, qty: nextQty });
}

// PATCH {sku_id, qty} / DELETE?sku_id=
export async function PATCH(req: Request) {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, guest: true });
  const { sku_id, qty } = await req.json();
  if (qty <= 0) await supabase.from('cart_items').delete().eq('sku_id', sku_id);
  else
    await supabase.from('cart_items').upsert({ user_id: data.user.id, sku_id, qty }, { onConflict: 'user_id,sku_id' });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, guest: true });
  const sku = new URL(req.url).searchParams.get('sku_id');
  if (sku) await supabase.from('cart_items').delete().eq('sku_id', sku);
  else await supabase.from('cart_items').delete().eq('user_id', data.user.id);
  return NextResponse.json({ ok: true });
}
