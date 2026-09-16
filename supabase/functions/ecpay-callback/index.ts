// Supabase Edge Function: ecpay-callback
// 綠界 ReturnURL (server-to-server POST, form-urlencoded)，需驗 CheckMacValue + 冪等
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';
import { createHash } from 'node:crypto';

function enc(s: string): string {
  // 比照 .NET HttpUtility.UrlEncode：僅 -_.!*() 不編碼，空白轉 +，其餘百分編碼（含 ~ '）
  return encodeURIComponent(s)
    .replace(/%20/g, '+').replace(/~/g, '%7e').replace(/'/g, '%27');
}
function checkMac(params: Record<string, string>, key: string, iv: string): string {
  const sorted = Object.keys(params).filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${key}&${sorted.map((k) => `${k}=${params[k]}`).join('&')}&HashIV=${iv}`;
  return createHash('sha256').update(enc(raw).toLowerCase()).digest('hex').toUpperCase();
}

serve(async (req) => {
  const text = await req.text();
  const body: Record<string, string> = Object.fromEntries(new URLSearchParams(text));
  const hashKey = Deno.env.get('ECPAY_HASH_KEY')!;
  const hashIV = Deno.env.get('ECPAY_HASH_IV')!;
  if (checkMac(body, hashKey, hashIV) !== (body.CheckMacValue ?? '').toUpperCase()) {
    return new Response('0|CheckMac fail', { status: 400 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: pay } = await supabase.from('payments').select('*').eq('merchant_trade_no', body.MerchantTradeNo).single();
  if (!pay) return new Response('0|order not found', { status: 404 });
  if (pay.status === 'paid') return new Response('1|OK'); // 冪等

  if (body.RtnCode === '1') {
    await supabase.from('payments').update({
      status: 'paid', ecpay_trade_no: body.TradeNo, paid_at: new Date().toISOString(), raw_callback: body,
    }).eq('id', pay.id);
    await supabase.from('orders').update({ status: 'paid' }).eq('id', pay.order_id);
    await supabase.from('shipments').upsert({ order_id: pay.order_id, status: 'preparing' }, { onConflict: 'order_id' });
  } else {
    await supabase.from('payments').update({ status: 'failed', raw_callback: body }).eq('id', pay.id);
  }
  return new Response('1|OK');
});
