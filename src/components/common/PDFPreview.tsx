import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertCircle } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Use CDN-hosted worker per user preference
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFPreviewProps {
  file: File | null
  fileName: string
}

export function PDFPreview({ file, fileName }: PDFPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  // Create blob URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setBlobUrl(url)
      setPageNumber(1)
      setNumPages(null)
      setError(null)

      // Cleanup on unmount or file change
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setBlobUrl(null)
      setNumPages(null)
      setPageNumber(1)
      setError(null)
    }
  }, [file])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err)
    setError('Failed to load PDF. The file may be corrupted or invalid.')
    setIsLoading(false)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1))
  }

  // Fallback placeholder when no file provided
  if (!file || !blobUrl) {
    return (
      <div className="bg-[#1F1410]/[0.02] rounded-xl p-8 border border-[#1F1410]/10 aspect-[8.5/11] flex flex-col items-center justify-center">
        <FileText className="w-16 h-16 text-[#1F1410]/20 mb-4" />
        <p className="text-sm font-medium text-[#1F1410]/40">{fileName}</p>
        <p className="text-xs text-[#1F1410]/30 mt-1">Pay Slip Document</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* PDF Container */}
      <div className="bg-[#1F1410]/[0.02] rounded-xl border border-[#1F1410]/10 overflow-hidden">
        <div className="relative aspect-[8.5/11] flex items-center justify-center">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
                <p className="text-sm text-[#1F1410]/50">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-4 z-10">
              <AlertCircle className="w-12 h-12 text-[#FF6B6B] mb-3" />
              <p className="text-sm text-[#FF6B6B] text-center">{error}</p>
            </div>
          )}

          {/* PDF Document */}
          {!error && (
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadStart={() => setIsLoading(true)}
              loading={null}
              className="flex items-center justify-center"
            >
              <Page
                pageNumber={pageNumber}
                width={350}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={null}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Page navigation */}
      {numPages && numPages > 1 && !error && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-[#1F1410]/60" />
          </button>
          <span className="text-sm text-[#1F1410]/60">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-[#1F1410]/60" />
          </button>
        </div>
      )}
    </div>
  )
}
