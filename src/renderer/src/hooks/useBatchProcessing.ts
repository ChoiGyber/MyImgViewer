import { useState, useEffect, useCallback } from 'react'
import type { BatchProgress } from '@/lib/types'

interface BatchResult {
  file: string
  success: boolean
  error?: string
}

interface BatchProcessingState {
  isProcessing: boolean
  progress: BatchProgress | null
  results: BatchResult[] | null
}

interface BatchProcessingActions {
  startBatchResize: (options: {
    filePaths: string[]
    width?: number
    height?: number
    fit: string
    outputDir: string
  }) => Promise<void>
  reset: () => void
}

export function useBatchProcessing(): BatchProcessingState & BatchProcessingActions {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  useEffect(() => {
    const cleanup = window.api.onBatchProgress((p: BatchProgress) => {
      setProgress(p)
    })
    return cleanup
  }, [])

  const startBatchResize = useCallback(
    async (options: {
      filePaths: string[]
      width?: number
      height?: number
      fit: string
      outputDir: string
    }) => {
      setIsProcessing(true)
      setProgress(null)
      setResults(null)
      try {
        const res = await window.api.batchResize(options)
        setResults(res)
      } catch (err) {
        setResults([{ file: 'error', success: false, error: (err as Error).message }])
      } finally {
        setIsProcessing(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setIsProcessing(false)
    setProgress(null)
    setResults(null)
  }, [])

  return { isProcessing, progress, results, startBatchResize, reset }
}
