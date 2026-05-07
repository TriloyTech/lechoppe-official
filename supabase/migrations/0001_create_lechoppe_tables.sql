-- Migration: 0001_create_lechoppe_tables.sql
-- Created for L'Échoppe de Paris restaurant management

create extension if not exists "pgcrypto";

-- ─── Menu Items ────────────────────────────────────────────────────────────
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  description text,
  price numeric(8,2) not null default 0,
  category text not null default 'burger' check (category in ('burger','side','drink','dessert')),
  available boolean default true,
  image_url text
);

-- ─── Reservations ──────────────────────────────────────────────────────────
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text,
  party_size int not null default 2,
  date date not null,
  time time not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  notes text
);

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table menu_items enable row level security;
alter table reservations enable row level security;

-- Menu: public read, authenticated write
do $$ begin
  if not exists (select 1 from pg_policies where tablename='menu_items' and policyname='Public can read menu') then
    create policy "Public can read menu" on menu_items for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='menu_items' and policyname='Auth users manage menu') then
    create policy "Auth users manage menu" on menu_items for all using (auth.role() = 'authenticated');
  end if;
end $$;

-- Reservations: anyone can insert (booking form), public read, auth manage
do $$ begin
  if not exists (select 1 from pg_policies where tablename='reservations' and policyname='Anyone can book') then
    create policy "Anyone can book" on reservations for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reservations' and policyname='Public can read reservations') then
    create policy "Public can read reservations" on reservations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reservations' and policyname='Auth users manage reservations') then
    create policy "Auth users manage reservations" on reservations for all using (auth.role() = 'authenticated');
  end if;
end $$;

-- ─── Seed Data ─────────────────────────────────────────────────────────────
insert into menu_items (name, description, price, category, available) values
  ('Le Signature',     'Wagyu beef, aged comté, truffle aioli, brioche artisanal',  24.00, 'burger',  true),
  ('L''Américain',     'Double smash, cheddar fondu, pickles maison, sauce secrète',19.50, 'burger',  true),
  ('Végétal Parisien', 'Galette de champignons, chèvre frais, roquette, noisette',  17.00, 'burger',  true),
  ('Frites Maison',    'Double-fried en graisse de canard, fleur de sel',            8.50, 'side',    true),
  ('Salade César',     'Romaine, parmesan 24 mois, anchois, croûtons au beurre',    9.00, 'side',    true),
  ('Limonade de Paris','Citron pressé maison, sirop lavande, eau pétillante',        6.00, 'drink',   true),
  ('Café Gourmand',    'Espresso, madeleine au beurre, financier pistache',           7.50, 'dessert', true)
on conflict do nothing;

insert into reservations (name, email, phone, party_size, date, time, status, notes) values
  ('Jean-Pierre Dupont', 'jp.dupont@email.fr', '+33 6 12 34 56 78', 2,
   current_date + interval '3 days', '19:30', 'pending', 'Table en fenêtre si possible'),
  ('Marie Leclerc', 'marie.leclerc@gmail.com', null, 4,
   current_date + interval '5 days', '20:00', 'confirmed', null)
on conflict do nothing;
