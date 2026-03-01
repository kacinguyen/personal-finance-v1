-- ============================================================
-- Demo Data Seed Script for Pachira Finance App
-- Run in Supabase SQL Editor after creating the demo user
-- and logging in once to trigger category seeding.
--
-- IMPORTANT: Replace the UUID below with the actual demo user ID
-- from Supabase Auth > Users after creating demo@pachira.app
-- ============================================================

-- Set the demo user_id variable (REPLACE THIS)
DO $$
DECLARE
  demo_uid UUID := 'c79e07e3-a981-4084-b1f6-2c32b9a80677';
  -- Account IDs (generated)
  acc_checking UUID := gen_random_uuid();
  acc_savings UUID := gen_random_uuid();
  acc_credit UUID := gen_random_uuid();
  acc_brokerage UUID := gen_random_uuid();
  acc_401k UUID := gen_random_uuid();
  acc_ira UUID := gen_random_uuid();
  -- Goal IDs
  goal_emergency UUID := gen_random_uuid();
  goal_401k UUID := gen_random_uuid();
  goal_espp UUID := gen_random_uuid();
  goal_japan UUID := gen_random_uuid();
  -- Paystub IDs
  ps1 UUID := gen_random_uuid();
  ps2 UUID := gen_random_uuid();
  ps3 UUID := gen_random_uuid();
  ps4 UUID := gen_random_uuid();
  ps5 UUID := gen_random_uuid();
  ps6 UUID := gen_random_uuid();
  -- Category IDs (looked up)
  cat_rent UUID;
  cat_groceries UUID;
  cat_utilities UUID;
  cat_internet UUID;
  cat_restaurants UUID;
  cat_cafes UUID;
  cat_shopping UUID;
  cat_subscriptions UUID;
  cat_rideshare UUID;
  cat_salary UUID;
  cat_cc_payment UUID;
  cat_health UUID;
  cat_social UUID;
  cat_entertainment UUID;
  cat_selfcare UUID;
  cat_clothing UUID;
  cat_other UUID;
  cat_home UUID;
  cat_food UUID;
  cat_transportation UUID;
BEGIN

  -- ============================================================
  -- Look up category IDs by normalized_name
  -- ============================================================
  SELECT id INTO cat_rent FROM categories WHERE user_id = demo_uid AND normalized_name = 'rent' LIMIT 1;
  SELECT id INTO cat_groceries FROM categories WHERE user_id = demo_uid AND normalized_name = 'groceries' LIMIT 1;
  SELECT id INTO cat_utilities FROM categories WHERE user_id = demo_uid AND normalized_name = 'utilities' LIMIT 1;
  SELECT id INTO cat_internet FROM categories WHERE user_id = demo_uid AND normalized_name = 'internet' LIMIT 1;
  SELECT id INTO cat_restaurants FROM categories WHERE user_id = demo_uid AND normalized_name = 'restaurants' LIMIT 1;
  SELECT id INTO cat_cafes FROM categories WHERE user_id = demo_uid AND normalized_name = 'cafes' LIMIT 1;
  SELECT id INTO cat_shopping FROM categories WHERE user_id = demo_uid AND normalized_name = 'shopping' LIMIT 1;
  SELECT id INTO cat_subscriptions FROM categories WHERE user_id = demo_uid AND normalized_name = 'subscriptions' LIMIT 1;
  SELECT id INTO cat_rideshare FROM categories WHERE user_id = demo_uid AND normalized_name = 'rideshare' LIMIT 1;
  SELECT id INTO cat_salary FROM categories WHERE user_id = demo_uid AND normalized_name = 'salary' LIMIT 1;
  SELECT id INTO cat_cc_payment FROM categories WHERE user_id = demo_uid AND normalized_name = 'credit card payment' LIMIT 1;
  SELECT id INTO cat_health FROM categories WHERE user_id = demo_uid AND normalized_name = 'health & wellness' LIMIT 1;
  SELECT id INTO cat_social FROM categories WHERE user_id = demo_uid AND normalized_name = 'social' LIMIT 1;
  SELECT id INTO cat_entertainment FROM categories WHERE user_id = demo_uid AND normalized_name = 'entertainment' LIMIT 1;
  SELECT id INTO cat_selfcare FROM categories WHERE user_id = demo_uid AND normalized_name = 'self-care' LIMIT 1;
  SELECT id INTO cat_clothing FROM categories WHERE user_id = demo_uid AND normalized_name = 'clothing' LIMIT 1;
  SELECT id INTO cat_other FROM categories WHERE user_id = demo_uid AND normalized_name = 'other' LIMIT 1;
  SELECT id INTO cat_home FROM categories WHERE user_id = demo_uid AND normalized_name = 'home' LIMIT 1;
  SELECT id INTO cat_food FROM categories WHERE user_id = demo_uid AND normalized_name = 'food & drink' LIMIT 1;
  SELECT id INTO cat_transportation FROM categories WHERE user_id = demo_uid AND normalized_name = 'transportation' LIMIT 1;

  -- ============================================================
  -- 1. ACCOUNTS
  -- ============================================================
  INSERT INTO accounts (id, user_id, name, institution_name, account_type, mask, balance_current, balance_available, is_manual, is_active) VALUES
    (acc_checking,  demo_uid, 'Everyday Checking',  'Chase',    'checking',       '4821', 3847.00,  3647.00, true, true),
    (acc_savings,   demo_uid, 'High Yield Savings',  'Marcus',   'savings',        '7733', 14250.00, 14250.00, true, true),
    (acc_credit,    demo_uid, 'Sapphire Reserve',    'Chase',    'credit_card',    '9012', 1823.00,  NULL,     true, true),
    (acc_brokerage, demo_uid, 'Brokerage',           'Fidelity', 'investment',     '5501', 32150.00, NULL,     true, true),
    (acc_401k,      demo_uid, '401(k)',              'Fidelity', 'retirement_401k','3344', 47892.00, NULL,     true, true),
    (acc_ira,       demo_uid, 'Roth IRA',            'Vanguard', 'retirement_ira', '8890', 12500.00, NULL,     true, true);

  -- ============================================================
  -- 2. ACCOUNT BALANCE HISTORY (weekly snapshots, ~12 weeks)
  -- ============================================================
  -- Checking (oscillates around paydays)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_checking, demo_uid, 2150.00, '2025-12-01'),
    (acc_checking, demo_uid, 4850.00, '2025-12-08'),
    (acc_checking, demo_uid, 3200.00, '2025-12-15'),
    (acc_checking, demo_uid, 5100.00, '2025-12-22'),
    (acc_checking, demo_uid, 2800.00, '2025-12-29'),
    (acc_checking, demo_uid, 4700.00, '2026-01-05'),
    (acc_checking, demo_uid, 3100.00, '2026-01-12'),
    (acc_checking, demo_uid, 5050.00, '2026-01-19'),
    (acc_checking, demo_uid, 2900.00, '2026-01-26'),
    (acc_checking, demo_uid, 4600.00, '2026-02-02'),
    (acc_checking, demo_uid, 3300.00, '2026-02-09'),
    (acc_checking, demo_uid, 3847.00, '2026-02-16');

  -- Savings (gradual growth)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_savings, demo_uid, 12800.00, '2025-12-01'),
    (acc_savings, demo_uid, 12850.00, '2025-12-15'),
    (acc_savings, demo_uid, 13100.00, '2025-12-29'),
    (acc_savings, demo_uid, 13200.00, '2026-01-05'),
    (acc_savings, demo_uid, 13400.00, '2026-01-12'),
    (acc_savings, demo_uid, 13550.00, '2026-01-19'),
    (acc_savings, demo_uid, 13700.00, '2026-01-26'),
    (acc_savings, demo_uid, 13850.00, '2026-02-02'),
    (acc_savings, demo_uid, 14000.00, '2026-02-09'),
    (acc_savings, demo_uid, 14250.00, '2026-02-16');

  -- Credit card (fluctuates)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_credit, demo_uid, 1450.00, '2025-12-01'),
    (acc_credit, demo_uid, 1900.00, '2025-12-15'),
    (acc_credit, demo_uid, 2200.00, '2025-12-29'),
    (acc_credit, demo_uid, 800.00,  '2026-01-05'),
    (acc_credit, demo_uid, 1300.00, '2026-01-19'),
    (acc_credit, demo_uid, 1850.00, '2026-01-26'),
    (acc_credit, demo_uid, 700.00,  '2026-02-02'),
    (acc_credit, demo_uid, 1200.00, '2026-02-09'),
    (acc_credit, demo_uid, 1823.00, '2026-02-16');

  -- Brokerage (steady growth)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_brokerage, demo_uid, 29800.00, '2025-12-01'),
    (acc_brokerage, demo_uid, 30100.00, '2025-12-15'),
    (acc_brokerage, demo_uid, 30450.00, '2025-12-29'),
    (acc_brokerage, demo_uid, 30200.00, '2026-01-05'),
    (acc_brokerage, demo_uid, 30800.00, '2026-01-19'),
    (acc_brokerage, demo_uid, 31200.00, '2026-01-26'),
    (acc_brokerage, demo_uid, 31600.00, '2026-02-02'),
    (acc_brokerage, demo_uid, 31900.00, '2026-02-09'),
    (acc_brokerage, demo_uid, 32150.00, '2026-02-16');

  -- 401k (steady growth with contributions)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_401k, demo_uid, 44500.00, '2025-12-01'),
    (acc_401k, demo_uid, 44900.00, '2025-12-15'),
    (acc_401k, demo_uid, 45300.00, '2025-12-29'),
    (acc_401k, demo_uid, 45100.00, '2026-01-05'),
    (acc_401k, demo_uid, 45800.00, '2026-01-19'),
    (acc_401k, demo_uid, 46200.00, '2026-01-26'),
    (acc_401k, demo_uid, 46700.00, '2026-02-02'),
    (acc_401k, demo_uid, 47300.00, '2026-02-09'),
    (acc_401k, demo_uid, 47892.00, '2026-02-16');

  -- Roth IRA (modest growth)
  INSERT INTO account_balance_history (account_id, user_id, balance, recorded_at) VALUES
    (acc_ira, demo_uid, 11800.00, '2025-12-01'),
    (acc_ira, demo_uid, 11900.00, '2025-12-15'),
    (acc_ira, demo_uid, 12000.00, '2025-12-29'),
    (acc_ira, demo_uid, 11950.00, '2026-01-05'),
    (acc_ira, demo_uid, 12100.00, '2026-01-19'),
    (acc_ira, demo_uid, 12200.00, '2026-01-26'),
    (acc_ira, demo_uid, 12300.00, '2026-02-02'),
    (acc_ira, demo_uid, 12400.00, '2026-02-09'),
    (acc_ira, demo_uid, 12500.00, '2026-02-16');

  -- ============================================================
  -- 3. TRANSACTIONS (~130 spanning Dec 2025 – Feb 2026)
  -- ============================================================

  -- === DECEMBER 2025 ===
  -- Income
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-05', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2025-12-19', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false);
  -- Rent
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-01', 'Avalon Apartments', -1850.00, 'Rent', cat_rent, 'manual', 'Chase Checking', false, false);
  -- Groceries
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-03', 'Trader Joe''s', -67.42, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-07', 'Whole Foods Market', -89.15, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-11', 'Safeway', -52.30, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-15', 'Trader Joe''s', -71.88, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-20', 'Whole Foods Market', -95.20, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-27', 'Safeway', -48.67, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false);
  -- Utilities
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-05', 'PG&E', -145.32, 'Utilities', cat_utilities, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2025-12-08', 'Comcast Internet', -65.00, 'Internet', cat_internet, 'manual', 'Chase Checking', false, false);
  -- Restaurants
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-02', 'Nopalito', -48.50, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-06', 'Burma Superstar', -52.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-13', 'Tartine Bakery', -32.75, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-18', 'Che Fico', -68.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-22', 'Dumpling Home', -29.50, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-28', 'Delfina', -55.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false);
  -- Cafes
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-04', 'Blue Bottle Coffee', -6.50, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-09', 'Sightglass Coffee', -7.25, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-14', 'Philz Coffee', -6.80, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-19', 'Ritual Coffee', -5.90, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-23', 'Blue Bottle Coffee', -7.00, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-29', 'Sightglass Coffee', -6.75, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false);
  -- Shopping
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-10', 'Amazon', -34.99, 'Shopping', cat_shopping, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-16', 'Target', -52.15, 'Shopping', cat_shopping, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-24', 'Everlane', -78.00, 'Clothing', cat_clothing, 'manual', 'Chase Sapphire', false, false);
  -- Subscriptions
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-01', 'Spotify', -10.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-01', 'Netflix', -15.49, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-15', 'iCloud+', -2.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-15', 'ChatGPT Plus', -20.00, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false);
  -- Rideshare
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-05', 'Uber', -18.45, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-12', 'Lyft', -22.30, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-20', 'Uber', -15.80, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-26', 'Lyft', -28.50, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false);
  -- Health
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-08', 'ClassPass', -49.00, 'Health & Wellness', cat_health, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-22', 'Walgreens', -18.50, 'Health & Wellness', cat_health, 'manual', 'Chase Sapphire', false, false);
  -- Social / Entertainment
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-14', 'AMC Metreon', -24.00, 'Entertainment', cat_entertainment, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2025-12-21', 'Eventbrite - Holiday Party', -35.00, 'Social', cat_social, 'manual', 'Chase Sapphire', false, false);
  -- CC Payment
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2025-12-28', 'Chase Credit Card Payment', -1900.00, 'Credit Card Payment', cat_cc_payment, 'manual', 'Chase Checking', false, false);

  -- === JANUARY 2026 ===
  -- Income
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-05', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2026-01-19', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false);
  -- Rent
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-01', 'Avalon Apartments', -1850.00, 'Rent', cat_rent, 'manual', 'Chase Checking', false, false);
  -- Groceries
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-02', 'Trader Joe''s', -72.30, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-06', 'Whole Foods Market', -83.45, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-11', 'Safeway', -61.20, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-17', 'Trader Joe''s', -68.90, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-22', 'Whole Foods Market', -91.15, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-28', 'Safeway', -55.40, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false);
  -- Utilities
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-05', 'PG&E', -152.18, 'Utilities', cat_utilities, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2026-01-08', 'Comcast Internet', -65.00, 'Internet', cat_internet, 'manual', 'Chase Checking', false, false);
  -- Restaurants
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-03', 'Souvla', -38.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-08', 'Bi-Rite Creamery', -16.50, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-14', 'State Bird Provisions', -72.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-20', 'Panda Express', -14.50, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-25', 'Nopa', -58.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-30', 'Pizzeria Delfina', -42.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false);
  -- Cafes
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-02', 'Philz Coffee', -7.10, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-07', 'Blue Bottle Coffee', -6.50, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-13', 'Sightglass Coffee', -7.50, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-18', 'Ritual Coffee', -6.25, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-24', 'Philz Coffee', -6.80, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-29', 'Blue Bottle Coffee', -7.00, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false);
  -- Shopping
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-10', 'Amazon', -29.99, 'Shopping', cat_shopping, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-18', 'Uniqlo', -65.00, 'Clothing', cat_clothing, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-26', 'Target', -42.30, 'Shopping', cat_shopping, 'manual', 'Chase Sapphire', false, false);
  -- Subscriptions
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-01', 'Spotify', -10.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-01', 'Netflix', -15.49, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-15', 'iCloud+', -2.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-15', 'ChatGPT Plus', -20.00, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false);
  -- Rideshare
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-04', 'Uber', -21.50, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-11', 'Lyft', -16.80, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-19', 'Uber', -25.30, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-27', 'Lyft', -19.40, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false);
  -- Health
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-08', 'ClassPass', -49.00, 'Health & Wellness', cat_health, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-15', 'CVS Pharmacy', -12.50, 'Health & Wellness', cat_health, 'manual', 'Chase Sapphire', false, false);
  -- Social
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-12', 'Alamo Drafthouse', -28.00, 'Entertainment', cat_entertainment, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-01-25', 'Eventbrite - Tech Meetup', -15.00, 'Social', cat_social, 'manual', 'Chase Sapphire', false, false);
  -- Self-care
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-20', 'Drybar', -45.00, 'Self-care', cat_selfcare, 'manual', 'Chase Sapphire', false, false);
  -- CC Payment
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-01-28', 'Chase Credit Card Payment', -1850.00, 'Credit Card Payment', cat_cc_payment, 'manual', 'Chase Checking', false, false);

  -- === FEBRUARY 2026 (partial month through ~Feb 20) ===
  -- Income
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-05', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2026-02-19', 'Employer Direct Deposit', 5200.00, 'Salary', cat_salary, 'manual', 'Chase Checking', false, false);
  -- Rent
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-01', 'Avalon Apartments', -1850.00, 'Rent', cat_rent, 'manual', 'Chase Checking', false, false);
  -- Groceries
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-02', 'Trader Joe''s', -74.50, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-07', 'Whole Foods Market', -88.20, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-12', 'Safeway', -56.90, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-17', 'Trader Joe''s', -62.35, 'Groceries', cat_groceries, 'manual', 'Chase Sapphire', false, false);
  -- Utilities
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-05', 'PG&E', -138.75, 'Utilities', cat_utilities, 'manual', 'Chase Checking', false, false),
    (demo_uid, '2026-02-08', 'Comcast Internet', -65.00, 'Internet', cat_internet, 'manual', 'Chase Checking', false, false);
  -- Restaurants
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-01', 'Lazy Bear', -85.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-07', 'Dumpling Home', -28.50, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-14', 'Foreign Cinema', -92.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-18', 'Souvla', -36.00, 'Restaurants', cat_restaurants, 'manual', 'Chase Sapphire', false, false);
  -- Cafes
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-03', 'Blue Bottle Coffee', -6.50, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-06', 'Sightglass Coffee', -7.25, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-10', 'Philz Coffee', -6.80, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-15', 'Ritual Coffee', -5.90, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-19', 'Blue Bottle Coffee', -7.00, 'Cafes', cat_cafes, 'manual', 'Chase Sapphire', false, false);
  -- Shopping
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-08', 'Amazon', -45.99, 'Shopping', cat_shopping, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-15', 'Aritzia', -89.00, 'Clothing', cat_clothing, 'manual', 'Chase Sapphire', false, false);
  -- Subscriptions
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-01', 'Spotify', -10.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-01', 'Netflix', -15.49, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-15', 'iCloud+', -2.99, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-15', 'ChatGPT Plus', -20.00, 'Subscriptions', cat_subscriptions, 'manual', 'Chase Sapphire', false, false);
  -- Rideshare
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-03', 'Uber', -19.80, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-10', 'Lyft', -23.50, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false),
    (demo_uid, '2026-02-17', 'Uber', -17.20, 'Rideshare', cat_rideshare, 'manual', 'Chase Sapphire', false, false);
  -- Health
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-08', 'ClassPass', -49.00, 'Health & Wellness', cat_health, 'manual', 'Chase Sapphire', false, false);
  -- Social
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-14', 'Eventbrite - Women in AI SF', -25.00, 'Social', cat_social, 'manual', 'Chase Sapphire', false, false);
  -- Needs review transactions (1-2 for demo)
  INSERT INTO transactions (user_id, date, merchant, amount, category, category_id, source, source_name, needs_review, pending) VALUES
    (demo_uid, '2026-02-18', 'SQ *MYSTERIOUS CHARGE', -42.00, 'Other', cat_other, 'manual', 'Chase Sapphire', true, false),
    (demo_uid, '2026-02-19', 'PAYPAL *TRANSFER', -150.00, 'Other', cat_other, 'manual', 'Chase Checking', true, false);

  -- ============================================================
  -- 4. PAYSTUBS (6 biweekly, Dec 2025 – Feb 2026)
  -- ============================================================
  INSERT INTO paystubs (id, user_id, pay_date, pay_period_start, pay_period_end, employer_name,
    gross_pay, regular_pay, traditional_401k, health_insurance, dental_insurance, vision_insurance,
    hsa_contribution, espp_contribution, federal_income_tax, state_income_tax, social_security_tax,
    medicare_tax, net_pay, employer_401k_match, source) VALUES
    (ps1, demo_uid, '2025-12-05', '2025-11-18', '2025-12-01', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual'),
    (ps2, demo_uid, '2025-12-19', '2025-12-02', '2025-12-15', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual'),
    (ps3, demo_uid, '2026-01-05', '2025-12-16', '2025-12-29', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual'),
    (ps4, demo_uid, '2026-01-19', '2025-12-30', '2026-01-12', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual'),
    (ps5, demo_uid, '2026-02-05', '2026-01-13', '2026-01-26', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual'),
    (ps6, demo_uid, '2026-02-19', '2026-01-27', '2026-02-09', 'Acme Corp',
     5417.00, 5417.00, 542.00, 120.00, 18.00, 14.00,
     150.00, 271.00, 813.00, 378.00, 336.00,
     79.00, 3696.00, 271.00, 'manual');

  -- ============================================================
  -- 5. BUDGETS
  -- ============================================================
  -- Delete any auto-created defaults first
  DELETE FROM budgets WHERE user_id = demo_uid;

  INSERT INTO budgets (user_id, category, category_id, monthly_limit, budget_type, flexibility, is_active) VALUES
    (demo_uid, 'Home',              cat_home,          1850.00, 'need', 'fixed',    true),
    (demo_uid, 'Food & Drink',      cat_food,          800.00,  'need', 'variable', true),
    (demo_uid, 'Transportation',    cat_transportation, 200.00,  'need', 'variable', true),
    (demo_uid, 'Health & Wellness', cat_health,        100.00,  'need', 'variable', true),
    (demo_uid, 'Subscriptions',     cat_subscriptions, 50.00,   'want', 'fixed',    true),
    (demo_uid, 'Shopping',          cat_shopping,      200.00,  'want', 'variable', true),
    (demo_uid, 'Social',            cat_social,        150.00,  'want', 'variable', true);

  -- ============================================================
  -- 6. GOALS
  -- ============================================================
  INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, deadline, goal_type, icon, color, priority, is_active, auto_contribute, contribution_field) VALUES
    (goal_emergency, demo_uid, 'Emergency Fund',  'Build 3 months of expenses', 15000.00, 12000.00, '2026-06-30', 'emergency_fund', 'Shield',      '#10B981', 1, true, false, NULL),
    (goal_401k,      demo_uid, '401k Match',      'Maximize employer 401k match', 6500.00, 3252.00, '2026-12-31', 'retirement_401k', 'PiggyBank',  '#6366F1', 2, true, true,  'traditional_401k'),
    (goal_espp,      demo_uid, 'ESPP',            'Maximize ESPP contribution', 6500.00, 1626.00, '2026-12-31', 'espp',            'Building2',   '#14B8A6', 3, true, true,  'espp_contribution'),
    (goal_japan,     demo_uid, 'Japan Trip 2026', 'Two weeks in Japan this fall', 5000.00, 800.00,  '2026-09-15', 'vacation',        'Plane',       '#F59E0B', 4, true, false, NULL);

  -- ============================================================
  -- 7. GOAL CONTRIBUTIONS
  -- ============================================================
  -- 401k auto-contributions from paystubs
  INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, source, paystub_id, notes) VALUES
    (goal_401k, demo_uid, 542.00, '2025-12-05', 'paystub', ps1, '401k contribution'),
    (goal_401k, demo_uid, 542.00, '2025-12-19', 'paystub', ps2, '401k contribution'),
    (goal_401k, demo_uid, 542.00, '2026-01-05', 'paystub', ps3, '401k contribution'),
    (goal_401k, demo_uid, 542.00, '2026-01-19', 'paystub', ps4, '401k contribution'),
    (goal_401k, demo_uid, 542.00, '2026-02-05', 'paystub', ps5, '401k contribution'),
    (goal_401k, demo_uid, 542.00, '2026-02-19', 'paystub', ps6, '401k contribution');

  -- ESPP auto-contributions from paystubs
  INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, source, paystub_id, notes) VALUES
    (goal_espp, demo_uid, 271.00, '2025-12-05', 'paystub', ps1, 'ESPP contribution'),
    (goal_espp, demo_uid, 271.00, '2025-12-19', 'paystub', ps2, 'ESPP contribution'),
    (goal_espp, demo_uid, 271.00, '2026-01-05', 'paystub', ps3, 'ESPP contribution'),
    (goal_espp, demo_uid, 271.00, '2026-01-19', 'paystub', ps4, 'ESPP contribution'),
    (goal_espp, demo_uid, 271.00, '2026-02-05', 'paystub', ps5, 'ESPP contribution'),
    (goal_espp, demo_uid, 271.00, '2026-02-19', 'paystub', ps6, 'ESPP contribution');

  -- Emergency fund manual contributions
  INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, source, notes) VALUES
    (goal_emergency, demo_uid, 500.00, '2025-12-10', 'manual', 'Monthly savings transfer'),
    (goal_emergency, demo_uid, 500.00, '2026-01-10', 'manual', 'Monthly savings transfer'),
    (goal_emergency, demo_uid, 500.00, '2026-02-10', 'manual', 'Monthly savings transfer');

  -- Japan trip manual contributions
  INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, source, notes) VALUES
    (goal_japan, demo_uid, 300.00, '2025-12-15', 'manual', 'Trip savings'),
    (goal_japan, demo_uid, 300.00, '2026-01-15', 'manual', 'Trip savings'),
    (goal_japan, demo_uid, 200.00, '2026-02-15', 'manual', 'Trip savings');

  -- ============================================================
  -- 8. RSU VESTS
  -- ============================================================
  INSERT INTO rsu_vests (user_id, vest_date, shares_vested, vest_price, sell_to_cover_shares, sell_to_cover_value, company_name, notes) VALUES
    (demo_uid, '2025-12-15', 50.0000, 185.5000, 18.0000, 3339.00, 'Acme Corp', 'Q4 2025 vest'),
    (demo_uid, '2026-02-15', 50.0000, 192.7500, 18.0000, 3469.50, 'Acme Corp', 'Q1 2026 vest');

  -- ============================================================
  -- 9. MERCHANT CATEGORY RULES
  -- ============================================================
  INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority, is_active) VALUES
    (demo_uid, 'Trader Joe''s',       'contains',    cat_groceries,     10, true),
    (demo_uid, 'Whole Foods',          'contains',    cat_groceries,     10, true),
    (demo_uid, 'Safeway',              'contains',    cat_groceries,     10, true),
    (demo_uid, 'Uber',                 'starts_with', cat_rideshare,     5,  true),
    (demo_uid, 'Lyft',                 'starts_with', cat_rideshare,     5,  true),
    (demo_uid, 'Spotify',              'exact',       cat_subscriptions, 10, true),
    (demo_uid, 'Netflix',              'exact',       cat_subscriptions, 10, true),
    (demo_uid, 'Blue Bottle',          'contains',    cat_cafes,         5,  true),
    (demo_uid, 'Philz Coffee',        'contains',    cat_cafes,         5,  true),
    (demo_uid, 'Avalon Apartments',    'exact',       cat_rent,          10, true);

  RAISE NOTICE 'Demo data seeded successfully for user %', demo_uid;

END $$;
