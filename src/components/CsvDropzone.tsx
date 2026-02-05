import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'

type CsvDropzoneProps = {
  onFilesAdded: (files: File[]) => Promise<void>
}

export function CsvDropzone({ onFilesAdded }: CsvDropzoneProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      const csvFiles = files.filter(
        (file) => file.name.endsWith('.csv') || file.type === 'text/csv'
      )

      if (csvFiles.length > 0) {
        setStatus('loading')
        setMessage(csvFiles[0].name)

        try {
          await onFilesAdded(csvFiles)
          setStatus('success')
          setMessage('Imported!')
          setTimeout(() => {
            setStatus('idle')
            setMessage(null)
          }, 2500)
        } catch (error) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : 'Import failed')
          setTimeout(() => {
            setStatus('idle')
            setMessage(null)
          }, 3000)
        }
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (status !== 'loading') {
      fileInputRef.current?.click()
    }
  }

  const getButtonContent = () => {
    switch (status) {
      case 'loading':
        return (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-[#FF6B6B] border-t-transparent rounded-full"
            />
            <span>Importing...</span>
          </motion.div>
        )
      case 'success':
        return (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span className="text-[#10B981]">{message}</span>
          </motion.div>
        )
      case 'error':
        return (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
            <span className="text-[#FF6B6B]">{message}</span>
          </motion.div>
        )
      default:
        return (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
            title="Import CSV"
          >
            <Upload className="w-4 h-4" />
          </motion.div>
        )
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="flex items-center gap-1.5 px-2 py-2 text-sm text-[#1F1410]/40 hover:text-[#1F1410]/70 transition-colors disabled:cursor-not-allowed"
      >
        <AnimatePresence mode="wait">
          {getButtonContent()}
        </AnimatePresence>
      </button>
    </div>
  )
}
