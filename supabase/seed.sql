-- supabase/seed.sql

insert into public.products
  (id, sku, name, description, category, unit, base_price, cost_price, moq, stock_qty, price_tiers)
values
  ('p-un-992','SKU-992','Baklava & Böreklik Un 25 KG','Özel ipek tip 550 • çuval ambalaj',
   'FLOUR','Çuval',450,385,10,1840,
   '[{"minQuantity":10,"unitPrice":450},{"minQuantity":50,"unitPrice":438},{"minQuantity":100,"unitPrice":425}]'),

  ('p-yag-418','SKU-418','Pastacılık Kruvasan Margarini 10 KG','Yüksek elastikiyet, laminasyon blok yağ',
   'FAT','Koli',1250,1050,5,620,
   '[{"minQuantity":5,"unitPrice":1250},{"minQuantity":25,"unitPrice":1215},{"minQuantity":50,"unitPrice":1180}]'),

  ('p-kakao-771','SKU-771','Alkalize Kakao Tozu %20-22 • 20 KG','Koyu renk, yoğun aroma • pastacılık kakao',
   'CHOCOLATE','Torba',2800,2380,2,240,
   '[{"minQuantity":2,"unitPrice":2800},{"minQuantity":10,"unitPrice":2720},{"minQuantity":25,"unitPrice":2650}]'),

  ('p-un-120','SKU-120','Ekmeklik Tam Buğday Unu 50 KG','Taş değirmen • yüksek lif oranı',
   'FLOUR','Çuval',690,600,5,960,
   '[{"minQuantity":5,"unitPrice":690},{"minQuantity":30,"unitPrice":672},{"minQuantity":60,"unitPrice":655}]'),

  ('p-yag-233','SKU-233','Sütlü Tereyağı 5 KG','Geleneksel yayık tereyağı • soğuk zincir',
   'FAT','Koli',2400,2100,4,310,
   '[{"minQuantity":4,"unitPrice":2400},{"minQuantity":20,"unitPrice":2330},{"minQuantity":40,"unitPrice":2265}]'),

  ('p-maya-305','SKU-305','Instant Kuru Maya 500 G','Yüksek aktiviteli • 20li koli',
   'ADDITIVE','Koli',380,330,12,1450,
   '[{"minQuantity":12,"unitPrice":380},{"minQuantity":48,"unitPrice":365},{"minQuantity":96,"unitPrice":352}]'),

  ('p-seker-512','SKU-512','Pudra Şekeri 25 KG','0 numara öğütülmüş • topaklanma önleyici',
   'SWEETENER','Çuval',980,860,6,740,
   '[{"minQuantity":6,"unitPrice":980},{"minQuantity":24,"unitPrice":952},{"minQuantity":48,"unitPrice":930}]'),

  ('p-cikolata-604','SKU-604','Sütlü Kuvertür Çikolata 1 KG','%34 kakao • damla ve blok seçenekli',
   'CHOCOLATE','Koli',1450,1200,10,520,
   '[{"minQuantity":10,"unitPrice":1450},{"minQuantity":40,"unitPrice":1405},{"minQuantity":80,"unitPrice":1368}]'),

  ('p-krema-707','SKU-707','Pasta Kreması Şanti 1 KG','Uzun ömürlü • bitkisel yağ bazlı',
   'ADDITIVE','Koli',720,615,6,880,
   '[{"minQuantity":6,"unitPrice":720},{"minQuantity":24,"unitPrice":699},{"minQuantity":60,"unitPrice":678}]'),

  ('p-glutensiz-815','SKU-815','Glutensiz Pirinç Unu 10 KG','Sertifikalı glutensiz hat • torba',
   'FLOUR','Torba',560,495,8,260,
   '[{"minQuantity":8,"unitPrice":560},{"minQuantity":32,"unitPrice":542},{"minQuantity":64,"unitPrice":525}]')
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  unit = excluded.unit,
  base_price = excluded.base_price,
  cost_price = excluded.cost_price,
  moq = excluded.moq,
  stock_qty = excluded.stock_qty,
  price_tiers = excluded.price_tiers;

