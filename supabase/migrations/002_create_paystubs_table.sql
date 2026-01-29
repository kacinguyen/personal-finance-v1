-- Migration: Create paystubs table for W-2 paystub data
-- Designed for manual entry and future PDF/OCR extraction

CREATE TABLE paystubs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pay period identification
  pay_date DATE NOT NULL,
  pay_period_start DATE,
  pay_period_end DATE,
  employer_name TEXT,              -- For multi-job support

  -- === EARNINGS ===
  gross_pay DECIMAL(12,2) NOT NULL,
  regular_pay DECIMAL(12,2),
  overtime_pay DECIMAL(12,2),
  bonus_pay DECIMAL(12,2),
  commission DECIMAL(12,2),
  pto_payout DECIMAL(12,2),
  other_earnings DECIMAL(12,2),

  -- === PRE-TAX DEDUCTIONS ===
  traditional_401k DECIMAL(12,2),
  health_insurance DECIMAL(12,2),
  dental_insurance DECIMAL(12,2),
  vision_insurance DECIMAL(12,2),
  hsa_contribution DECIMAL(12,2),
  fsa_contribution DECIMAL(12,2),
  espp_contribution DECIMAL(12,2),
  life_insurance DECIMAL(12,2),
  other_pretax DECIMAL(12,2),

  -- === TAXES ===
  federal_income_tax DECIMAL(12,2),
  state_income_tax DECIMAL(12,2),
  social_security_tax DECIMAL(12,2),
  medicare_tax DECIMAL(12,2),
  local_tax DECIMAL(12,2),
  state_disability_insurance DECIMAL(12,2),
  other_taxes DECIMAL(12,2),

  -- === POST-TAX DEDUCTIONS ===
  roth_401k DECIMAL(12,2),
  after_tax_401k DECIMAL(12,2),    -- Mega backdoor Roth
  other_posttax DECIMAL(12,2),

  -- === NET PAY ===
  net_pay DECIMAL(12,2) NOT NULL,

  -- === SOURCE TRACKING ===
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'pdf_import'
  source_file_name TEXT,
  notes TEXT,

  -- === METADATA ===
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_paystubs_pay_date ON paystubs(pay_date DESC);
CREATE INDEX idx_paystubs_employer ON paystubs(employer_name);
