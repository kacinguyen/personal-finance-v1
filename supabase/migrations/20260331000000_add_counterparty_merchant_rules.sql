-- Auto-create merchant rules from VERY_HIGH confidence Plaid counterparties.
-- Skips merchants that already have active rules (Safeway, Uber, Whole Foods).
-- Source: plaid_counterparty_confidence = 'VERY_HIGH', single-category merchants only.

DO $$
DECLARE
  uid UUID := '2f865a70-5fc6-487e-ba01-aa80d104cf57';
BEGIN

-- AMC Theatres → Entertainment
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'AMC Theatres', 'exact', '5c3df73e-974e-45f2-b0ce-d92e0d67a1b5', 10)
ON CONFLICT DO NOTHING;

-- Apple → Subscriptions
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Apple', 'exact', '3c00a884-b8ae-479f-b78e-8437da4eb070', 10)
ON CONFLICT DO NOTHING;

-- ARCO → Transportation (gas)
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'ARCO', 'exact', '11fc2754-ecdd-49b2-a83e-935c6bbed739', 10)
ON CONFLICT DO NOTHING;

-- Chick-fil-A → Restaurants
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Chick-fil-A', 'exact', '3fd9c6a7-4c4d-4c0d-b7d0-37e72fe325b1', 10)
ON CONFLICT DO NOTHING;

-- CVS → Self-care (pharmacy)
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'CVS', 'contains', '07617114-b1e3-4f60-abf9-93d0694c7602', 10)
ON CONFLICT DO NOTHING;

-- FasTrak → Car (tolls)
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'FasTrak', 'contains', 'ce508ede-8a7f-4ba4-9f58-9192293ed98b', 10)
ON CONFLICT DO NOTHING;

-- Hilton → Travel
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Hilton', 'contains', '8eb0b9a1-e60c-47c6-a75a-35de2263013c', 10)
ON CONFLICT DO NOTHING;

-- IKEA → Home (Plaid: HOME_IMPROVEMENT_FURNITURE; was miscategorized as Restaurants)
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'IKEA', 'exact', 'b385622f-29cb-43ea-912d-efcee1e6b005', 10)
ON CONFLICT DO NOTHING;

-- Lululemon → Clothing
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Lululemon', 'exact', 'f34356fe-15fc-466c-839a-a27751dc0e3b', 10)
ON CONFLICT DO NOTHING;

-- New York Times → Subscriptions
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'New York Times', 'contains', '3c00a884-b8ae-479f-b78e-8437da4eb070', 10)
ON CONFLICT DO NOTHING;

-- PG&E → Utilities
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'PG&E', 'contains', '15c1bb03-116b-4d9c-872f-ed8a4ff67966', 10)
ON CONFLICT DO NOTHING;

-- Raising Cane's → Restaurants
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Raising Cane', 'contains', '3fd9c6a7-4c4d-4c0d-b7d0-37e72fe325b1', 10)
ON CONFLICT DO NOTHING;

-- Recreation.gov → Entertainment
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Recreation.gov', 'exact', '5c3df73e-974e-45f2-b0ce-d92e0d67a1b5', 10)
ON CONFLICT DO NOTHING;

-- Uber Eats → Restaurants (distinct from Uber → Transportation)
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Uber Eats', 'exact', '3fd9c6a7-4c4d-4c0d-b7d0-37e72fe325b1', 15)
ON CONFLICT DO NOTHING;

-- Uniqlo → Clothing
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Uniqlo', 'exact', 'f34356fe-15fc-466c-839a-a27751dc0e3b', 10)
ON CONFLICT DO NOTHING;

-- Walgreens → Health & Wellness
INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
VALUES (uid, 'Walgreens', 'exact', '756e8fcb-10c5-4fbf-8db7-b8eec82c08f8', 10)
ON CONFLICT DO NOTHING;

END $$;
