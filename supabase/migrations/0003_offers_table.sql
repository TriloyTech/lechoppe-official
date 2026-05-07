-- offers table for post-booking promo engine
create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  discount    int  not null default 10,         -- percentage off
  description text,
  valid_until date,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Seed one active offer
insert into offers (code, discount, description, valid_until, active)
values (
  'BIENVENUE15',
  15,
  'Bienvenue chez L''Échoppe ! Profitez de 15% de réduction sur votre premier repas.',
  (now() + interval '90 days')::date,
  true
)
on conflict (code) do nothing;

-- RLS: anyone can read active offers (needed for client-side fetch after booking)
alter table offers enable row level security;

create policy "Anyone can read active offers"
  on offers for select
  using (active = true);

create policy "Service role full access to offers"
  on offers for all
  using (true)
  with check (true);
