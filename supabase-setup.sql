-- Create the assumptions table (value is text to support both numbers and JSON)
create table if not exists assumptions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  updated_by text,
  updated_at timestamp with time zone default now()
);

-- Enable real-time
alter publication supabase_realtime add table assumptions;

-- Seed default scalar values
insert into assumptions (key, value) values
  ('raise', '150000'),
  ('proMonthly', '14.99'),
  ('proAnnual', '79.99'),
  ('studioMonthly', '24.99'),
  ('studioAnnual', '149.99'),
  ('convRate', '0.04'),
  ('churn', '0.12'),
  ('viralK', '0.6'),
  ('tokenCostPerUserM6', '0.64'),
  ('tokenCostPerUserM12', '0.49'),
  ('tokenCostPerUserM18', '0.46'),
  ('priceDecline18mo', '0.50')
on conflict (key) do nothing;

-- RLS policies for anonymous access
create policy "Allow anonymous read" on assumptions for select using (true);
create policy "Allow anonymous insert" on assumptions for insert with check (true);
create policy "Allow anonymous update" on assumptions for update using (true);
