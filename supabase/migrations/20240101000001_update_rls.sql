drop policy if exists "Allow public access for all operations" on public.bookings;
create policy "Allow public access for all operations"
on public.bookings
for all
using (true)
with check (true);
