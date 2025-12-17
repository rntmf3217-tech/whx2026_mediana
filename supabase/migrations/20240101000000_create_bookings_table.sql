create table if not exists public.bookings (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  company_name text not null,
  country text not null,
  product_interest text not null,
  inquiry_type text not null,
  message text,
  date text not null,
  time text not null,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Allow public access for all operations"
on public.bookings
for all
using (true)
with check (true);
