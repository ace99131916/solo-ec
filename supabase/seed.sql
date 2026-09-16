-- Seed V2：合併 redino + gztoy 架構，照片欄位先空，文字為中性示範
insert into public.categories (name, slug, sort) values
  ('本期優惠','sale',5),
  ('男性專區','men',10),
  ('女性專區','women',20),
  ('後庭專區','anal',30),
  ('潤滑液','lube',40),
  ('保險套','condom',50),
  ('品牌館','brand',60),
  ('排行榜','ranking',70),
  ('知識專欄','guide',80)
on conflict (slug) do nothing;

with c as (select id, slug from public.categories)
insert into public.products (name, slug, category_id, brand, description, base_price, is_featured, is_active)
select v.name, v.slug, c.id, v.brand, v.desc_, v.price, v.feat, true
from (values
  ('入門探索組・標準版','starter-set-std','men','OwnBrand','示範商品：入門款，照片上線前請更換。隱密包裝出貨。',990,true),
  ('靜音震動・入門款','silent-vibe-mini','women','OwnBrand','示範商品：極靜音入門款，照片上線前請更換。',1280,true),
  ('水性潤滑・舒感型 200ml','lube-water-comfort','lube','OwnBrand','示範商品：水性基底，照片上線前請更換。',430,true),
  ('超薄保險套 12入','condom-thin-12','condom','OwnBrand','示範商品：超薄貼合，照片上線前請更換。',299,false),
  ('後庭入門・矽膠款','anal-beginner-silicone','anal','OwnBrand','示範商品：親膚矽膠＋收納袋，照片上線前請更換。',680,false),
  ('品牌精選・進階款','brand-premium-pro','brand','Premium','示範商品：品牌旗艦進階款，照片上線前請更換。',2980,true)
) as v(name, slug, cat, brand, desc_, price, feat)
join c on c.slug = v.cat
on conflict (slug) do nothing;

with p as (select id, slug from public.products)
insert into public.product_skus (product_id, sku_code, spec_name, price, stock, safety_stock)
select p.id, v.sku, v.spec_, v.price, v.stock, 5
from (values
  ('starter-set-std','START-STD','標準',990,50),
  ('silent-vibe-mini','VIBE-MINI-PINK','粉/標準',1280,40),
  ('silent-vibe-mini','VIBE-MINI-PURPLE','紫/標準',1280,40),
  ('lube-water-comfort','LUBE-W-200','200ml',430,100),
  ('condom-thin-12','CONDOM-THIN-12','12入',299,200),
  ('anal-beginner-silicone','ANAL-SIL-BEG','入門/矽膠',680,30),
  ('brand-premium-pro','PREM-PRO-BLK','黑/進階',2980,20)
) as v(pslug, sku, spec_, price, stock)
join p on p.slug = v.pslug
on conflict (sku_code) do nothing;

insert into public.coupons (code, name, discount_type, discount_value, min_amount, usage_limit, per_user_limit, is_active)
values
  ('WELCOME100','首購折100','fixed',100,500,null,1,true),
  ('FREESHIP','滿千免運加碼折60','fixed',60,1000,null,1,true)
on conflict (code) do nothing;

insert into public.banners (title, image_url, link_url, sort, is_active)
values
  ('9月購物季・全館滿千免運','https://via.placeholder.com/1200x400?text=Sale','/products',10,true),
  ('新手攻略・第一次怎麼挑','https://via.placeholder.com/1200x400?text=Guide','/guide',20,true)
on conflict do nothing;
