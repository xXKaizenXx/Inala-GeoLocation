-- Seed starter venues.
-- Run after schema.sql.

insert into public.venues (name, address, latitude, longitude, allowed_radius_m, is_active)
values
  ('My Test Venue', 'Kuilsriver, Cape Town', -33.9526, 18.6852613666195, 200, true),
  ('Test Venue Paarl', 'Paarl, Cape Town', -33.715546, 18.966248, 150, true)
on conflict do nothing;
