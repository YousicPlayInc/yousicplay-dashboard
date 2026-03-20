-- Create the assumptions table
create table if not exists assumptions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value numeric not null,
  updated_by text,
  updated_at timestamp with time zone default now()
);

-- Enable real-time
alter publication supabase_realtime add table assumptions;

-- Seed default values
insert into assumptions (key, value) values
  ('raise', 150000),
  ('proMonthly', 14.99),
  ('proAnnual', 79.99),
  ('studioMonthly', 24.99),
  ('studioAnnual', 149.99),
  ('convRate', 0.04),
  ('churn', 0.06),
  ('viralK', 1.3),
  ('founders', 4),
  ('agentsPerFounder', 10),
  ('usersM6', 8000),
  ('usersM12', 45000),
  ('usersM18', 150000),
  ('activationRate', 0.60),
  ('tokenCostPerUserM6', 0.64),
  ('tokenCostPerUserM12', 0.49),
  ('tokenCostPerUserM18', 0.46),
  ('agentCostMo', 2450),
  ('founderPayM1_6', 5000),
  ('founderPayM7_12', 9000),
  ('founderPayM13_18', 15000),
  ('mktBudgetM1_6', 1000),
  ('mktBudgetM7_12', 2500),
  ('mktBudgetM13_18', 5000),
  ('wowM6', 0.12),
  ('wowM12', 0.10),
  ('wowM18', 0.08),
  ('priceDecline18mo', 0.50)
on conflict (key) do nothing;
