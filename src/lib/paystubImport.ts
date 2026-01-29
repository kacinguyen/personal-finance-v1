/**
 * Paystub Import Orchestrator
 *
 * Orchestrates the full flow of PDF upload, text extraction, parsing, validation,
 * and database insertion for paystub data.
 */

import { supabase } from './supabase'
import { extractTextFromPDF, isPDFFile, validatePDFSize } from './pdfExtractor'
import { parseADPPaystub, type ParsedPaystub, type ParsedField } from './adpPaystubParser'
import type { PaystubInsert } from '../types/paystub'

export interface ImportResult {
  success: boolean
  parsedData: ParsedPaystub | null
  validation: ValidationResult | null
  error?: string
}

export interface ValidationResult {
  isValid: boolean
  calculatedNet: number
  expectedNet: number
  difference: number
  differencePercent: number
  warnings: string[]
}

/**
 * Validate that the parsed paystub data is internally consistent
 * Checks that: gross_pay - all_deductions ≈ net_pay
 *
 * Allows for a 1% tolerance to account for rounding differences
 */
function validatePaystub(parsed: ParsedPaystub): ValidationResult {
  const warnings: string[] = []

  // Get values or 0 for null fields
  const getValue = (field: ParsedField<number> | null): number =>
    field?.value ?? 0

  const grossPay = getValue(parsed.grossPay)
  const netPay = getValue(parsed.netPay)

  // Sum all deductions
  const preTaxDeductions =
    getValue(parsed.traditional401k) +
    getValue(parsed.healthInsurance) +
    getValue(parsed.dentalInsurance) +
    getValue(parsed.visionInsurance) +
    getValue(parsed.hsaContribution) +
    getValue(parsed.fsaContribution) +
    getValue(parsed.esppContribution) +
    getValue(parsed.lifeInsurance) +
    getValue(parsed.otherPretax)

  const taxes =
    getValue(parsed.federalIncomeTax) +
    getValue(parsed.stateIncomeTax) +
    getValue(parsed.socialSecurityTax) +
    getValue(parsed.medicareTax) +
    getValue(parsed.localTax) +
    getValue(parsed.stateDisabilityInsurance) +
    getValue(parsed.otherTaxes)

  const postTaxDeductions =
    getValue(parsed.roth401k) +
    getValue(parsed.afterTax401k) +
    getValue(parsed.otherPosttax)

  const totalDeductions = preTaxDeductions + taxes + postTaxDeductions
  const calculatedNet = grossPay - totalDeductions

  // Calculate difference
  const difference = Math.abs(calculatedNet - netPay)
  const differencePercent = netPay > 0 ? (difference / netPay) * 100 : 0

  // Allow 1% tolerance for rounding
  const isValid = differencePercent <= 1

  // Add warnings for potential issues
  if (!parsed.grossPay) {
    warnings.push('Gross pay was not extracted')
  }
  if (!parsed.netPay) {
    warnings.push('Net pay was not extracted')
  }
  if (!parsed.payDate) {
    warnings.push('Pay date was not extracted')
  }
  if (!isValid && grossPay > 0 && netPay > 0) {
    warnings.push(
      `Calculated net ($${calculatedNet.toFixed(2)}) differs from extracted net ($${netPay.toFixed(2)}) by ${differencePercent.toFixed(1)}%`
    )
  }
  if (parsed.overallConfidence === 'low') {
    warnings.push('Low extraction confidence - please verify all values')
  }

  return {
    isValid,
    calculatedNet,
    expectedNet: netPay,
    difference,
    differencePercent,
    warnings,
  }
}

/**
 * Process a PDF file and extract paystub data
 * Does not save to database - returns parsed data for user review
 */
export async function processPaystubPDF(file: File): Promise<ImportResult> {
  // Validate file type
  if (!isPDFFile(file)) {
    return {
      success: false,
      parsedData: null,
      validation: null,
      error: 'File must be a PDF',
    }
  }

  // Validate file size
  const sizeCheck = validatePDFSize(file)
  if (!sizeCheck.valid) {
    return {
      success: false,
      parsedData: null,
      validation: null,
      error: sizeCheck.error,
    }
  }

  try {
    // Extract text from PDF
    const extraction = await extractTextFromPDF(file)

    if (!extraction.isNativeText) {
      return {
        success: false,
        parsedData: null,
        validation: null,
        error:
          'PDF appears to be scanned or image-based. Text extraction requires a native PDF with embedded text.',
      }
    }

    // Parse the extracted text
    const parsed = parseADPPaystub(extraction.text)

    // Validate the parsed data
    const validation = validatePaystub(parsed)

    // Log only non-PII metadata (per CLAUDE.md security guidelines)
    console.info('Paystub PDF processed:', {
      fileName: file.name,
      fileSize: file.size,
      pageCount: extraction.pageCount,
      extractedFieldCount: parsed.extractedFieldCount,
      overallConfidence: parsed.overallConfidence,
      validationPassed: validation.isValid,
    })

    return {
      success: true,
      parsedData: parsed,
      validation,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing PDF'
    return {
      success: false,
      parsedData: null,
      validation: null,
      error: message,
    }
  }
}

/**
 * Convert parsed paystub data to database insert format
 */
export function parsedToInsert(
  parsed: ParsedPaystub,
  sourceFileName: string
): PaystubInsert {
  const getValue = <T>(field: ParsedField<T> | null): T | null =>
    field?.value ?? null

  return {
    pay_date: getValue(parsed.payDate) || new Date().toISOString().split('T')[0],
    pay_period_start: getValue(parsed.payPeriodStart),
    pay_period_end: getValue(parsed.payPeriodEnd),
    employer_name: getValue(parsed.employerName),

    gross_pay: getValue(parsed.grossPay) || 0,
    regular_pay: getValue(parsed.regularPay),
    overtime_pay: getValue(parsed.overtimePay),
    bonus_pay: getValue(parsed.bonusPay),
    commission: getValue(parsed.commission),
    pto_payout: getValue(parsed.ptoPayout),
    dividend_equivalent: null,
    taxable_gift_cards: null,
    other_earnings: getValue(parsed.otherEarnings),

    traditional_401k: getValue(parsed.traditional401k),
    health_insurance: getValue(parsed.healthInsurance),
    dental_insurance: getValue(parsed.dentalInsurance),
    vision_insurance: getValue(parsed.visionInsurance),
    hsa_contribution: getValue(parsed.hsaContribution),
    fsa_contribution: getValue(parsed.fsaContribution),
    espp_contribution: getValue(parsed.esppContribution),
    life_insurance: getValue(parsed.lifeInsurance),
    ad_and_d_insurance: null,
    other_pretax: getValue(parsed.otherPretax),

    federal_income_tax: getValue(parsed.federalIncomeTax),
    state_income_tax: getValue(parsed.stateIncomeTax),
    social_security_tax: getValue(parsed.socialSecurityTax),
    medicare_tax: getValue(parsed.medicareTax),
    local_tax: getValue(parsed.localTax),
    state_disability_insurance: getValue(parsed.stateDisabilityInsurance),
    other_taxes: getValue(parsed.otherTaxes),

    roth_401k: getValue(parsed.roth401k),
    after_tax_401k: getValue(parsed.afterTax401k),
    other_posttax: getValue(parsed.otherPosttax),

    net_pay: getValue(parsed.netPay) || 0,

    employer_401k_match: null,
    employer_life_insurance: null,

    source: 'pdf_import',
    source_file_name: sourceFileName,
    notes: null,
    hours_worked: null,
  }
}

/**
 * Save a paystub to the database
 */
export async function savePaystub(
  data: PaystubInsert
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data: inserted, error } = await supabase
    .from('paystubs')
    .insert(data)
    .select('id')
    .single()

  if (error) {
    return {
      success: false,
      error: `Failed to save paystub: ${error.message}`,
    }
  }

  return {
    success: true,
    id: inserted.id,
  }
}
