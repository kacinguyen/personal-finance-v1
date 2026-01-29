import { extractText } from 'unpdf'

export interface PDFExtractionResult {
  text: string
  pageCount: number
  isNativeText: boolean
}

/**
 * Extract text from a PDF file using unpdf
 * Returns raw text and metadata about the extraction
 *
 * Note: This only handles native PDFs with embedded text.
 * Scanned PDFs require OCR (tesseract.js) which is out of scope for now.
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer()

  const result = await extractText(new Uint8Array(arrayBuffer), {
    mergePages: true,
  })

  // unpdf returns text as string when mergePages is true, or string[] otherwise
  const text = typeof result.text === 'string'
    ? result.text
    : (result.text as string[]).join('\n\n')

  // Check if we got meaningful text (native PDF vs scanned)
  // A typical paystub should have at least 100 characters of extractable text
  const isNativeText = text.trim().length > 100

  return {
    text,
    pageCount: result.totalPages,
    isNativeText,
  }
}

/**
 * Check if a file is a valid PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Validate PDF file size (max 10MB)
 */
export function validatePDFSize(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed (10MB)`,
    }
  }

  return { valid: true }
}
