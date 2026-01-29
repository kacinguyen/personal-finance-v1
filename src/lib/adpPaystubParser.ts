/**
 * ADP Paystub Parser
 *
 * Extracts financial data from ADP paystub PDF text using regex patterns.
 * All amounts are processed as cents (integers) internally to avoid floating-point errors,
 * then converted to decimal at the end for database storage.
 */

export interface ParsedField<T> {
  value: T
  confidence: 'high' | 'medium' | 'low'
  rawMatch?: string
}

export interface ParsedPaystub {
  // Dates
  payDate: ParsedField<string> | null
  payPeriodStart: ParsedField<string> | null
  payPeriodEnd: ParsedField<string> | null
  employerName: ParsedField<string> | null

  // Earnings
  grossPay: ParsedField<number> | null
  regularPay: ParsedField<number> | null
  overtimePay: ParsedField<number> | null
  bonusPay: ParsedField<number> | null
  commission: ParsedField<number> | null
  ptoPayout: ParsedField<number> | null
  otherEarnings: ParsedField<number> | null

  // Pre-tax deductions
  traditional401k: ParsedField<number> | null
  healthInsurance: ParsedField<number> | null
  dentalInsurance: ParsedField<number> | null
  visionInsurance: ParsedField<number> | null
  hsaContribution: ParsedField<number> | null
  fsaContribution: ParsedField<number> | null
  esppContribution: ParsedField<number> | null
  lifeInsurance: ParsedField<number> | null
  otherPretax: ParsedField<number> | null

  // Taxes
  federalIncomeTax: ParsedField<number> | null
  stateIncomeTax: ParsedField<number> | null
  socialSecurityTax: ParsedField<number> | null
  medicareTax: ParsedField<number> | null
  localTax: ParsedField<number> | null
  stateDisabilityInsurance: ParsedField<number> | null
  otherTaxes: ParsedField<number> | null

  // Post-tax deductions
  roth401k: ParsedField<number> | null
  afterTax401k: ParsedField<number> | null
  otherPosttax: ParsedField<number> | null

  // Net
  netPay: ParsedField<number> | null

  // Metadata
  overallConfidence: 'high' | 'medium' | 'low'
  extractedFieldCount: number
  totalFieldCount: number
}

/**
 * Parse a currency amount string to cents (integer)
 * Handles formats like: $1,234.56, 1234.56, (1,234.56), 1234.56-
 */
function parseCurrencyToCents(value: string): number {
  let cleaned = value
    .replace(/[$,\s]/g, '')
    .replace(/^\((.+)\)$/, '-$1') // Handle parentheses as negative
    .replace(/^(.+)-$/, '-$1')    // Handle trailing minus sign (e.g., "782.12-")

  const amount = parseFloat(cleaned)
  if (isNaN(amount)) return 0

  // Return absolute value since we're extracting deductions (always positive for storage)
  return Math.round(Math.abs(amount) * 100)
}

/**
 * Convert cents to decimal for database storage
 */
function centsToDecimal(cents: number): number {
  return cents / 100
}

/**
 * Extract a currency value from text using a pattern
 * Returns the value in decimal format (for DB storage)
 */
function extractCurrency(
  text: string,
  patterns: RegExp[],
  confidence: 'high' | 'medium' | 'low' = 'medium'
): ParsedField<number> | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const cents = parseCurrencyToCents(match[1])
      if (cents > 0) {
        return {
          value: centsToDecimal(cents),
          confidence,
          rawMatch: match[0],
        }
      }
    }
  }
  return null
}

/**
 * Extract a date from text using patterns
 * Returns date in YYYY-MM-DD format
 */
function extractDate(
  text: string,
  patterns: RegExp[],
  confidence: 'high' | 'medium' | 'low' = 'medium'
): ParsedField<string> | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const dateStr = match[1] || match[0]
      const normalized = normalizeDate(dateStr)
      if (normalized) {
        return {
          value: normalized,
          confidence,
          rawMatch: match[0],
        }
      }
    }
  }
  return null
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string | null {
  // Clean the string
  const cleaned = dateStr.trim()

  // Try MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = cleaned.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try YYYY-MM-DD (already correct format)
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return isoMatch[0]
  }

  // Try Month DD, YYYY (e.g., "January 15, 2024")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ]
  const longMatch = cleaned.toLowerCase().match(
    /(\w+)\s+(\d{1,2}),?\s*(\d{4})/
  )
  if (longMatch) {
    const monthIndex = monthNames.indexOf(longMatch[1].toLowerCase())
    if (monthIndex >= 0) {
      const month = String(monthIndex + 1).padStart(2, '0')
      const day = longMatch[2].padStart(2, '0')
      return `${longMatch[3]}-${month}-${day}`
    }
  }

  return null
}

/**
 * Extract employer name from ADP paystub text
 */
function extractEmployerName(text: string): ParsedField<string> | null {
  // ADP often shows company name near the top or after "Employer:" label
  const patterns = [
    /Employer[:\s]+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\n|$)/,
    /Company[:\s]+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:\n|$)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      if (name.length > 2 && name.length < 100) {
        return {
          value: name,
          confidence: 'medium',
          rawMatch: match[0],
        }
      }
    }
  }

  return null
}

/**
 * Main parser function for ADP paystubs
 */
export function parseADPPaystub(text: string): ParsedPaystub {
  let extractedFieldCount = 0
  const totalFieldCount = 24 // Total number of fields we try to extract

  // === DATE PATTERNS ===
  const payDatePatterns = [
    /Pay\s*Date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
    /Payment\s*Date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
    /Check\s*Date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  ]

  const payPeriodPatterns = [
    /Pay\s*Period[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*[-–to]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
    /Period[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*[-–to]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  ]

  // Separate patterns for Period Beginning/Ending format
  const periodBeginningPatterns = [
    /Period\s*Beginning[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  ]
  const periodEndingPatterns = [
    /Period\s*Ending[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  ]

  // === EARNINGS PATTERNS ===
  const grossPayPatterns = [
    /Gross\s*Pay[:\s]*\$?([\d,]+\.\d{2})/i,
    /Total\s*Gross[:\s]*\$?([\d,]+\.\d{2})/i,
    /Gross\s*Earnings[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  const regularPayPatterns = [
    /Regular[:\s]*\$?([\d,]+\.\d{2})/i,
    /Salary[:\s]*\$?([\d,]+\.\d{2})/i,
    /Base\s*Pay[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  const overtimePatterns = [
    /Overtime[:\s]*\$?([\d,]+\.\d{2})/i,
    /OT[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  const bonusPatterns = [
    /Bonus[:\s]*\$?([\d,]+\.\d{2})/i,
    /Sign[- ]?On\s*Bonus[:\s]*\$?([\d,]+\.\d{2})/i,
    /Performance\s*Bonus[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  const commissionPatterns = [
    /Commission[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  const ptoPatterns = [
    /PTO\s*(?:Pay(?:out)?)?[:\s]*\$?([\d,]+\.\d{2})/i,
    /Vacation\s*Pay[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  // === PRE-TAX DEDUCTION PATTERNS ===
  // Note: patterns handle trailing minus and asterisk prefixes
  const traditional401kPatterns = [
    /401\s*\(?k\)?\s*Pre[\s-]*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /\*?401\s*\(?k\)?(?:\s*Pre[\s-]*Tax)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Traditional\s*401k?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Pre[\s-]*Tax\s*401k?[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const healthInsurancePatterns = [
    /\*?(?:Medical|Health)\s*(?:Insurance)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Medical\s*Pre[\s-]*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const dentalPatterns = [
    /\*?Dental[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const visionPatterns = [
    /\*?Vision[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const hsaPatterns = [
    /\*?HSA[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Health\s*Savings[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const fsaPatterns = [
    /\*?FSA[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Flex(?:ible)?\s*Spending[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const esppPatterns = [
    /ESPP\s*Purchase[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /\*?ESPP[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Employee\s*Stock\s*Purchase[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const lifeInsurancePatterns = [
    /\*?Life(?:\s*Buy\s*Up)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Life\s*(?:Insurance)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Group\s*Term\s*Life[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  // === TAX PATTERNS ===
  // Note: patterns handle both "Amount" and "Amount-" (trailing minus) formats
  const federalTaxPatterns = [
    /Federal\s*(?:Income\s*)?(?:Tax|Withholding)[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Fed\s*(?:Income\s*)?Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /FIT[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Tax\s*Deductions:\s*Federal[\s\S]*?Withholding\s*Tax\s*([\d,]+\.\d{2})-?/i,
  ]

  const stateTaxPatterns = [
    /State\s*(?:Income\s*)?(?:Tax|Withholding)[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /\bSIT\b[:\s]*\$?([\d,]+\.\d{2})-?/i,  // Word boundary to avoid matching "DepoSIT"
    // Match state tax after "Tax Deductions: [State]" section - look for Withholding Tax nearby
    /Tax\s*Deductions:\s*(?:California|CA|New York|NY|Texas|TX|Illinois|IL|Pennsylvania|PA|Ohio|OH|Georgia|GA|Massachusetts|MA|Washington|WA|Florida|FL)[\s\S]*?Withholding\s*Tax\s*([\d,]+\.\d{2})-?/i,
  ]

  const socialSecurityPatterns = [
    /Social\s*Security(?:\s*Tax)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /EE\s*Social\s*Security(?:\s*Tax)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /FICA[\s-]*OASDI[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /OASDI[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /SS\s*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const medicarePatterns = [
    /Medicare(?:\s*Tax)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /EE\s*Medicare(?:\s*Tax)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /FICA[\s-]*Med[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const localTaxPatterns = [
    /Local\s*(?:Income\s*)?Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /City\s*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /County\s*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const sdiPatterns = [
    /(?:State\s*)?Disability(?:\s*Insurance)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /EE\s*(?:Voluntary\s*)?Disabilit(?:y)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /SDI[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /CA[\s-]*SDI[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  // === POST-TAX DEDUCTION PATTERNS ===
  const roth401kPatterns = [
    /Roth\s*401\s*\(?k\)?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /401k?\s*Roth[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  const afterTax401kPatterns = [
    /401\s*\(?k\)?\s*After[\s-]*Tax[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /After[\s-]*Tax\s*401k?[:\s]*\$?([\d,]+\.\d{2})-?/i,
    /Post[\s-]*Tax\s*401k?[:\s]*\$?([\d,]+\.\d{2})-?/i,
  ]

  // === NET PAY PATTERNS ===
  const netPayPatterns = [
    /Total\s*Net\s*Pay[:\s]*\$?([\d,]+\.\d{2})/i,
    /Net\s*Pay[:\s]*\$?([\d,]+\.\d{2})/i,
    /Take[\s-]*Home[:\s]*\$?([\d,]+\.\d{2})/i,
    /Net\s*Amount[:\s]*\$?([\d,]+\.\d{2})/i,
  ]

  // === EXTRACT ALL FIELDS ===
  const payDate = extractDate(text, payDatePatterns, 'high')
  if (payDate) extractedFieldCount++

  // Extract pay period (special handling for start/end)
  let payPeriodStart: ParsedField<string> | null = null
  let payPeriodEnd: ParsedField<string> | null = null

  // Try combined pattern first (e.g., "Pay Period: 01/01/2024 - 01/15/2024")
  for (const pattern of payPeriodPatterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[2]) {
      const start = normalizeDate(match[1])
      const end = normalizeDate(match[2])
      if (start && end) {
        payPeriodStart = { value: start, confidence: 'high', rawMatch: match[0] }
        payPeriodEnd = { value: end, confidence: 'high', rawMatch: match[0] }
        extractedFieldCount += 2
        break
      }
    }
  }

  // Try separate "Period Beginning" / "Period Ending" patterns as fallback
  if (!payPeriodStart) {
    payPeriodStart = extractDate(text, periodBeginningPatterns, 'high')
    if (payPeriodStart) extractedFieldCount++
  }
  if (!payPeriodEnd) {
    payPeriodEnd = extractDate(text, periodEndingPatterns, 'high')
    if (payPeriodEnd) extractedFieldCount++
  }

  const employerName = extractEmployerName(text)
  if (employerName) extractedFieldCount++

  // Earnings
  const grossPay = extractCurrency(text, grossPayPatterns, 'high')
  if (grossPay) extractedFieldCount++

  const regularPay = extractCurrency(text, regularPayPatterns)
  if (regularPay) extractedFieldCount++

  const overtimePay = extractCurrency(text, overtimePatterns)
  if (overtimePay) extractedFieldCount++

  const bonusPay = extractCurrency(text, bonusPatterns)
  if (bonusPay) extractedFieldCount++

  const commission = extractCurrency(text, commissionPatterns)
  if (commission) extractedFieldCount++

  const ptoPayout = extractCurrency(text, ptoPatterns)
  if (ptoPayout) extractedFieldCount++

  // Pre-tax deductions
  const traditional401k = extractCurrency(text, traditional401kPatterns)
  if (traditional401k) extractedFieldCount++

  const healthInsurance = extractCurrency(text, healthInsurancePatterns)
  if (healthInsurance) extractedFieldCount++

  const dentalInsurance = extractCurrency(text, dentalPatterns)
  if (dentalInsurance) extractedFieldCount++

  const visionInsurance = extractCurrency(text, visionPatterns)
  if (visionInsurance) extractedFieldCount++

  const hsaContribution = extractCurrency(text, hsaPatterns)
  if (hsaContribution) extractedFieldCount++

  const fsaContribution = extractCurrency(text, fsaPatterns)
  if (fsaContribution) extractedFieldCount++

  const esppContribution = extractCurrency(text, esppPatterns)
  if (esppContribution) extractedFieldCount++

  const lifeInsurance = extractCurrency(text, lifeInsurancePatterns)
  if (lifeInsurance) extractedFieldCount++

  // Taxes
  const federalIncomeTax = extractCurrency(text, federalTaxPatterns, 'high')
  if (federalIncomeTax) extractedFieldCount++

  const stateIncomeTax = extractCurrency(text, stateTaxPatterns, 'high')
  if (stateIncomeTax) extractedFieldCount++

  const socialSecurityTax = extractCurrency(text, socialSecurityPatterns, 'high')
  if (socialSecurityTax) extractedFieldCount++

  const medicareTax = extractCurrency(text, medicarePatterns, 'high')
  if (medicareTax) extractedFieldCount++

  const localTax = extractCurrency(text, localTaxPatterns)
  if (localTax) extractedFieldCount++

  const stateDisabilityInsurance = extractCurrency(text, sdiPatterns)
  if (stateDisabilityInsurance) extractedFieldCount++

  // Post-tax deductions
  const roth401k = extractCurrency(text, roth401kPatterns)
  if (roth401k) extractedFieldCount++

  const afterTax401k = extractCurrency(text, afterTax401kPatterns)
  if (afterTax401k) extractedFieldCount++

  // Net pay
  const netPay = extractCurrency(text, netPayPatterns, 'high')
  if (netPay) extractedFieldCount++

  // Calculate overall confidence based on extraction success
  let overallConfidence: 'high' | 'medium' | 'low'
  const extractionRate = extractedFieldCount / totalFieldCount

  // Must have at least gross pay and net pay for medium/high confidence
  if (!grossPay || !netPay) {
    overallConfidence = 'low'
  } else if (extractionRate >= 0.5 && payDate) {
    overallConfidence = 'high'
  } else if (extractionRate >= 0.25) {
    overallConfidence = 'medium'
  } else {
    overallConfidence = 'low'
  }

  return {
    payDate,
    payPeriodStart,
    payPeriodEnd,
    employerName,

    grossPay,
    regularPay,
    overtimePay,
    bonusPay,
    commission,
    ptoPayout,
    otherEarnings: null,

    traditional401k,
    healthInsurance,
    dentalInsurance,
    visionInsurance,
    hsaContribution,
    fsaContribution,
    esppContribution,
    lifeInsurance,
    otherPretax: null,

    federalIncomeTax,
    stateIncomeTax,
    socialSecurityTax,
    medicareTax,
    localTax,
    stateDisabilityInsurance,
    otherTaxes: null,

    roth401k,
    afterTax401k,
    otherPosttax: null,

    netPay,

    overallConfidence,
    extractedFieldCount,
    totalFieldCount,
  }
}
