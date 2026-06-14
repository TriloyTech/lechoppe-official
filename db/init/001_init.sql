CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text,
  price numeric(8,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'burger',
  available boolean DEFAULT true,
  chef_suggestion boolean NOT NULL DEFAULT false,
  takeaway_available boolean DEFAULT true,
  image_url text,
  has_allergens boolean DEFAULT false,
  allergens_text text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  party_size int NOT NULL DEFAULT 2,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  notes text
);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount int NOT NULL DEFAULT 10,
  description text,
  valid_until date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_chef_suggestion ON menu_items (chef_suggestion) WHERE chef_suggestion = true;
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations (date, time);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers (active, valid_until);

INSERT INTO menu_items (name, description, price, category, available, chef_suggestion) VALUES
  ('Tartare de Bœuf Maison', 'Bœuf haché au couteau, câpres, cornichons, jaune d''œuf, moutarde de Dijon', 18.00, 'entrée', true, true),
  ('Soupe à l''Oignon Gratinée', 'Oignons confits, bouillon de bœuf, croûton grillé, comté fondu', 11.00, 'entrée', true, false),
  ('Œuf Cocotte Forestier', 'Girolles sautées, crème fraîche, herbes du jardin', 12.00, 'entrée', true, false),
  ('Salade du Marché', 'Mesclun, chèvre chaud, noix, vinaigrette balsamique', 13.00, 'entrée', true, false),
  ('Le Dallas', 'Double smash patty, cheddar fondu, pickles maison, oignons caramélisés, sauce secrète maison', 19.00, 'burger', true, true),
  ('Le Signature', 'Wagyu japonais A5, comté 18 mois, lamelles de truffe noire, beurre de foie gras', 34.00, 'burger', true, true),
  ('L''Américain', 'Double smash, cheddar fondu, pickles maison, sauce secrète', 19.50, 'burger', true, false),
  ('Le Végétarien', 'Galette de lentilles maison, féta, légumes grillés, houmous, herbes fraîches', 17.00, 'burger', true, false),
  ('Cuisse de Canard Confite', 'Confit 12h, pommes sarladaises, jus de viande réduit, fleur de sel de Guérande', 21.00, 'spécialité', true, true),
  ('Bœuf Bourguignon Maison', 'Bœuf braisé 6h, carottes, champignons, lardons fumés, purée truffée', 24.00, 'spécialité', true, false),
  ('Steak Frites Maison', 'Entrecôte charolaise 200g, frites maison double cuisson, sauce béarnaise', 22.00, 'classique', true, false),
  ('Moelleux au Chocolat', 'Chocolat Valrhona 70%, cœur coulant caramel beurre salé, glace vanille Bourbon', 9.00, 'dessert', true, true),
  ('Crème Brûlée à la Vanille', 'Vanille de Madagascar, cassonade dorée à la flamme', 8.00, 'dessert', true, false),
  ('Vin Rouge — Bordeaux AOC', 'Carafe 50cl · Château Maucaillou, Moulis-en-Médoc', 18.00, 'boisson', true, false),
  ('Café Gourmand', 'Espresso + 3 mignardises du chef', 6.00, 'boisson', true, false)
ON CONFLICT DO NOTHING;

INSERT INTO reservations (name, email, phone, party_size, date, time, status, notes) VALUES
  ('Jean-Pierre Dupont', 'jp.dupont@email.fr', '+33 6 12 34 56 78', 2, current_date + interval '3 days', '19:30', 'pending', 'Table en fenêtre si possible'),
  ('Marie Leclerc', 'marie.leclerc@gmail.com', null, 4, current_date + interval '5 days', '20:00', 'confirmed', null)
ON CONFLICT DO NOTHING;

INSERT INTO offers (code, discount, description, valid_until, active) VALUES
  ('BIENVENUE15', 15, 'Bienvenue chez L''Échoppe ! Profitez de 15% de réduction sur votre premier repas.', (now() + interval '90 days')::date, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES
  ('categories', '[{"key":"burger","emoji":"🍔","fr":"Burgers & Plats","en":"Burgers & Mains"},{"key":"side","emoji":"🥗","fr":"Entrées & Accompagnements","en":"Starters & Sides"},{"key":"dessert","emoji":"🍮","fr":"Desserts","en":"Desserts"},{"key":"drink","emoji":"🥂","fr":"Boissons","en":"Drinks"}]'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

