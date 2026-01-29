export interface Paystub {
  id: string
  pay_date: string
  pay_period_start: string | null
  pay_period_end: string | null
  employer_name: string | null

  // Earnings
  gross_pay: number
  regular_pay: number | null
  overtime_pay: number | null
  bonus_pay: number | null
  commission: number | null
  pto_payout: number | null
  dividend_equivalent: number | null    // RSU dividend equivalents
  taxable_gift_cards: number | null     // Spotlight GC type income
  other_earnings: number | null

  // Pre-tax deductions
  traditional_401k: number | null
  health_insurance: number | null
  dental_insurance: number | null
  vision_insurance: number | null
  hsa_contribution: number | null
  fsa_contribution: number | null
  espp_contribution: number | null
  life_insurance: number | null
  ad_and_d_insurance: number | null     // AD&D Buy Up
  other_pretax: number | null

  // Taxes
  federal_income_tax: number | null
  state_income_tax: number | null
  social_security_tax: number | null
  medicare_tax: number | null
  local_tax: number | null
  state_disability_insurance: number | null
  other_taxes: number | null

  // Post-tax deductions
  roth_401k: number | null
  after_tax_401k: number | null
  other_posttax: number | null

  // Net
  net_pay: number

  // Employer contributions (informational)
  employer_401k_match: number | null    // Employer's 401k match
  employer_life_insurance: number | null // Group term life imputed

  // Source
  source: 'manual' | 'pdf_import'
  source_file_name: string | null
  notes: string | null
  hours_worked: number | null           // Total hours for pay period

  // Metadata
  created_at: string
  updated_at: string
}

export type PaystubInsert = Omit<Paystub, 'id' | 'created_at' | 'updated_at'>
