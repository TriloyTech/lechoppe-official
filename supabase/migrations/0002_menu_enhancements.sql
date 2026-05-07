-- Migration: 0002_menu_enhancements.sql
-- Adds chef_suggestion flag and expands category enum for L'Échoppe full menu

-- ── Add chef_suggestion column if missing ─────────────────────────────────────
alter table menu_items add column if not exists chef_suggestion boolean default false;

-- ── Expand category check constraint to match new categories ──────────────────
-- Drop old constraint, recreate with extended values
alter table menu_items drop constraint if exists menu_items_category_check;
alter table menu_items add constraint menu_items_category_check
  check (category in ('burger','side','drink','dessert','entrée','spécialité','classique','boisson'));

-- ── Upsert full menu from data/menu.ts ───────────────────────────────────────
insert into menu_items (id, name, description, price, category, available, chef_suggestion) values
  -- Entrées
  ('e1e1e1e1-0000-0000-0000-000000000001'::uuid, 'Tartare de Bœuf Maison',
   'Bœuf haché au couteau, câpres, cornichons, jaune d''œuf, moutarde de Dijon',
   18.00, 'entrée', true, true),
  ('e2e2e2e2-0000-0000-0000-000000000002'::uuid, 'Soupe à l''Oignon Gratinée',
   'Oignons confits, bouillon de bœuf, croûton grillé, comté fondu',
   11.00, 'entrée', true, false),
  ('e3e3e3e3-0000-0000-0000-000000000003'::uuid, 'Œuf Cocotte Forestier',
   'Girolles sautées, crème fraîche, herbes du jardin',
   12.00, 'entrée', true, false),
  ('e4e4e4e4-0000-0000-0000-000000000004'::uuid, 'Salade du Marché',
   'Mesclun, chèvre chaud, noix, vinaigrette balsamique',
   13.00, 'entrée', true, false),
  ('e5e5e5e5-0000-0000-0000-000000000005'::uuid, 'Carpaccio de Bœuf',
   'Bœuf charolais, parmesan, roquette, huile de truffe',
   16.00, 'entrée', true, false),
  -- Burgers
  ('b1b1b1b1-0000-0000-0000-000000000001'::uuid, 'Le Dallas',
   'Double smash patty, cheddar fondu, pickles maison, oignons caramélisés, sauce secrète maison',
   19.00, 'burger', true, true),
  ('b2b2b2b2-0000-0000-0000-000000000002'::uuid, 'Le Signature',
   'Wagyu japonais A5, comté 18 mois, lamelles de truffe noire, beurre de foie gras',
   34.00, 'burger', true, true),
  ('b3b3b3b3-0000-0000-0000-000000000003'::uuid, 'L''Américain',
   'Double smash, cheddar fondu, pickles maison, sauce secrète',
   19.50, 'burger', true, false),
  ('b4b4b4b4-0000-0000-0000-000000000004'::uuid, 'Le Végétarien',
   'Galette de lentilles maison, féta, légumes grillés, houmous, herbes fraîches',
   17.00, 'burger', true, false),
  -- Spécialités
  ('s1s1s1s1-0000-0000-0000-000000000001'::uuid, 'Cuisse de Canard Confite',
   'Confit 12h, pommes sarladaises, jus de viande réduit, fleur de sel de Guérande',
   21.00, 'spécialité', true, true),
  ('s2s2s2s2-0000-0000-0000-000000000002'::uuid, 'Bœuf Bourguignon Maison',
   'Bœuf braisé 6h, carottes, champignons, lardons fumés, purée truffée',
   24.00, 'spécialité', true, false),
  ('s3s3s3s3-0000-0000-0000-000000000003'::uuid, 'Saint-Jacques Poêlées',
   'Noix de saint-jacques, beurre blanc au citron, risotto à l''encre de seiche',
   28.00, 'spécialité', true, false),
  -- Classiques
  ('c1c1c1c1-0000-0000-0000-000000000001'::uuid, 'Steak Frites Maison',
   'Entrecôte charolaise 200g, frites maison double cuisson, sauce béarnaise',
   22.00, 'classique', true, false),
  ('c2c2c2c2-0000-0000-0000-000000000002'::uuid, 'Poulet Fermier Rôti',
   'Demi-poulet Label Rouge, pommes de terre confites, jus de rôti',
   19.00, 'classique', true, false),
  ('c3c3c3c3-0000-0000-0000-000000000003'::uuid, 'Croque Monsieur Revisité',
   'Pain de mie maison, jambon ibérique, béchamel truffée, comté',
   14.00, 'classique', true, false),
  -- Desserts
  ('d1d1d1d1-0000-0000-0000-000000000001'::uuid, 'Moelleux au Chocolat',
   'Chocolat Valrhona 70%, cœur coulant caramel beurre salé, glace vanille Bourbon',
   9.00, 'dessert', true, true),
  ('d2d2d2d2-0000-0000-0000-000000000002'::uuid, 'Crème Brûlée à la Vanille',
   'Vanille de Madagascar, cassonade dorée à la flamme',
   8.00, 'dessert', true, false),
  ('d3d3d3d3-0000-0000-0000-000000000003'::uuid, 'Tarte Tatin Maison',
   'Pommes caramélisées, pâte feuilletée pur beurre, crème fraîche',
   9.00, 'dessert', true, false),
  -- Boissons
  ('v1v1v1v1-0000-0000-0000-000000000001'::uuid, 'Vin Rouge — Bordeaux AOC',
   'Carafe 50cl · Château Maucaillou, Moulis-en-Médoc',
   18.00, 'boisson', true, false),
  ('v2v2v2v2-0000-0000-0000-000000000002'::uuid, 'Vin Blanc — Chablis',
   'Carafe 50cl · Domaine Laroche, Premier Cru',
   20.00, 'boisson', true, false),
  ('v3v3v3v3-0000-0000-0000-000000000003'::uuid, 'Café Gourmand',
   'Espresso + 3 mignardises du chef',
   6.00, 'boisson', true, false)
on conflict (id) do update set
  name            = excluded.name,
  description     = excluded.description,
  price           = excluded.price,
  category        = excluded.category,
  available       = excluded.available,
  chef_suggestion = excluded.chef_suggestion;
