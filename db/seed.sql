-- Sake Discovery — seed data.
-- The 12 sample sake and 6 regions from the interaction prototype. These are
-- placeholders for the restaurant's real inventory (plan v2 §15, Phase 1).
--
-- Run after schema.sql. Safe to re-run: see the two idempotency guards below.

-- `regions` has a natural text primary key, so a re-run is a plain no-op per row
-- and a region added later is not clobbered.
insert into regions (id, name, name_jp, description, map_cx, map_cy, map_rx, map_ry, map_rotation) values
  ('hokkaido', 'Hokkaido', '北海道',     'Cold winters and mountain snowmelt make for clean, refreshing sake.', 195,  55, 50, 34, -6),
  ('tohoku',   'Tohoku',   '東北',       'Heavy snowfall country, famous for fruity, award-winning sake.',      168, 142, 56, 50, -4),
  ('chubu',    'Chubu',    '中部・新潟', 'Home of Niigata, birthplace of clean, dry tanrei-karakuchi sake.',    138, 236, 58, 46, -8),
  ('kansai',   'Kansai',   '関西',       'Historic brewing heartland around Kyoto and Hyogo.',                  116, 322, 52, 44, -5),
  ('chugoku',  'Chugoku',  '中国',       'Home of Dassai and the polished, fruity ginjo style.',                 90, 400, 48, 38, -6),
  ('kyushu',   'Kyushu',   '九州',       'A warmer climate producing bold, umami-rich sake.',                    68, 466, 46, 34, -4)
on conflict (id) do nothing;

-- `sake.id` is a generated uuid, so there is no natural key to conflict on and
-- `on conflict do nothing` would not stop a second run from inserting twelve
-- duplicate bottles. The guard is therefore "seed only an empty table", which is
-- what idempotent has to mean here: once the restaurant has entered real
-- inventory, re-running this file must do nothing at all rather than re-add the
-- placeholders alongside it.
do $$
begin
  if exists (select 1 from sake) then
    raise notice 'sake table is not empty — seed skipped.';
    return;
  end if;

  insert into sake (name_en, name_jp, brewery, prefecture, region_id, category, sweetness, body, aroma_intensity, description, food_pairing, image_url, fridge_number, price, in_stock) values
    ('Hakkaisan', '八海山', 'Hakkaisan Brewery', 'Niigata', 'chubu', 'Junmai Ginjo', 15, 22, null,
     'Clean, dry, and crisp — the archetype of Niigata''s tanrei-karakuchi style.',
     array['Sashimi', 'Seafood', 'Beginner friendly'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Denshu_Japanese_Sake_-_Flickr_-_odako1.jpg/500px-Denshu_Japanese_Sake_-_Flickr_-_odako1.jpg', 27, 145, true),

    ('Kubota Senju', '久保田 千寿', 'Asahi Shuzo', 'Niigata', 'chubu', 'Ginjo', 22, 30, null,
     'Soft and elegant, with gentle rice sweetness balanced by a dry finish.',
     array['Sushi', 'Light appetizers'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Sake_bottle.JPG/500px-Sake_bottle.JPG', 14, 130, true),

    ('Juyondai', '十四代', 'Takagi Shuzo', 'Yamagata', 'tohoku', 'Junmai Daiginjo', 68, 55, null,
     'Lush and fruity, famously hard to find — a modern classic.',
     array['Cheese', 'Fruit', 'Special occasion'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Ouka_kaiun.jpg/500px-Ouka_kaiun.jpg', 31, 320, true),

    ('Tatenokawa 18', '楯野川 純米大吟醸18', 'Tatenokawa', 'Yamagata', 'tohoku', 'Junmai Daiginjo', 40, 35, null,
     'Polished to 18%, delicate and fragrant with a silky texture.',
     array['Delicate fish', 'White meat'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Sake_Kyo-no-haru%2CTake-no-tuyu.JPG/500px-Sake_Kyo-no-haru%2CTake-no-tuyu.JPG', 22, 285, true),

    ('Kikumasamune', '菊正宗', 'Kikumasamune', 'Hyogo', 'kansai', 'Honjozo', 25, 62, null,
     'A traditional Nada-style sake, full-bodied with deep umami.',
     array['Grilled meat', 'Umami dishes'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sake_katsumasa.jpg/500px-Sake_katsumasa.jpg', 5, 95, true),

    ('Gekkeikan', '月桂冠', 'Gekkeikan', 'Kyoto', 'kansai', 'Junmai', 46, 44, null,
     'A soft, approachable Fushimi-style sake, lovely served warm.',
     array['Everyday food', 'Warm sake'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Nihonshu.jpg/500px-Nihonshu.jpg', 11, 90, true),

    ('Dassai 45', '獺祭 45', 'Asahi Shuzo (Yamaguchi)', 'Yamaguchi', 'chugoku', 'Junmai Daiginjo', 55, 38, null,
     'Bright and fruity, polished to 45% — approachable and aromatic.',
     array['Tempura', 'Light dishes'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Lyon_7e_-_Rue_de_Bonald_-_Restaurant_Kuro_Goma%2C_bouteille_et_verre_de_Ninki_Ichi.jpg/500px-Lyon_7e_-_Rue_de_Bonald_-_Restaurant_Kuro_Goma%2C_bouteille_et_verre_de_Ninki_Ichi.jpg', 8, 175, true),

    ('Kamotsuru', '賀茂鶴', 'Kamotsuru Shuzo', 'Hiroshima', 'chugoku', 'Junmai', 35, 50, null,
     'Soft Hiroshima water gives this sake a smooth, rounded body.',
     array['Grilled fish', 'Oysters'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/JOH_8482_-_Kabuto.jpg/500px-JOH_8482_-_Kabuto.jpg', 19, 115, true),

    ('Nabeshima', '鍋島', 'Fukuchiyo Shuzo', 'Saga', 'kyushu', 'Junmai Ginjo', 50, 48, null,
     'Award-winning Saga sake with balanced sweetness and clean acidity.',
     array['Grilled dishes', 'Vegetables'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Iwao_no_Izumi_250322.jpg/500px-Iwao_no_Izumi_250322.jpg', 17, 190, true),

    ('Tenzan', '天山', 'Tenzan Shuzo', 'Saga', 'kyushu', 'Junmai', 32, 58, null,
     'Full-bodied and warming — built to stand up to hearty cooking.',
     array['Nabe hotpot', 'Robust dishes'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Sagaminada_20250322_Lt1.jpg/500px-Sagaminada_20250322_Lt1.jpg', 24, 105, true),

    ('Otokoyama', '男山', 'Otokoyama Brewery', 'Hokkaido', 'hokkaido', 'Junmai Ginjo', 20, 34, null,
     'Brewed with pristine Daisetsuzan snowmelt — clean and refreshing.',
     array['Crab', 'Cold dishes'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/%E3%81%8A%E9%85%92_%2843414299132%29.jpg/500px-%E3%81%8A%E9%85%92_%2843414299132%29.jpg', 33, 135, true),

    ('Kunimare', '国稀', 'Kunimare Shuzo', 'Hokkaido', 'hokkaido', 'Ginjo', 58, 28, null,
     'Japan''s northernmost brewery — light, gently sweet, easy drinking.',
     array['Light appetizers', 'Aperitif'], 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/The_renowned_japanese_drink_%22Sake%22.JPG/500px-The_renowned_japanese_drink_%22Sake%22.JPG', 29, 120, true);
end $$;
