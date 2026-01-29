-- Add fields discovered from real Intuit payslip analysis

ALTER TABLE paystubs
  -- Additional earnings (RSU-related)
  ADD COLUMN dividend_equivalent DECIMAL(12,2),      -- RSU dividend equivalents
  ADD COLUMN taxable_gift_cards DECIMAL(12,2),       -- Spotlight GC, taxable gift card income

  -- Additional insurance
  ADD COLUMN ad_and_d_insurance DECIMAL(12,2),       -- Accidental Death & Dismemberment

  -- Employer contributions (informational, not deducted from pay)
  ADD COLUMN employer_401k_match DECIMAL(12,2),      -- Employer's 401k matching contribution
  ADD COLUMN employer_life_insurance DECIMAL(12,2),  -- Employer-paid group term life (imputed income)

  -- Time tracking
  ADD COLUMN hours_worked DECIMAL(6,2);              -- Total hours for pay period
