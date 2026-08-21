import { useState, useCallback, useEffect } from 'react'
import type { ImageInfo, FolderImages } from '@/lib/types'

interface ImageViewerState {
  image: ImageInfo | null
  folderImages: FolderImages | null
  zoom: number
  loading: boolean
  error: string | null
  lastDir: string
}

interface ImageViewerActions {
  openFile: () => Promise<void>
  loadImage: (filePath: string) => Promise<void>
  nextImage: () => Promise<void>
  prevImage: () => Promise<void>
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  reloadCurrent: () => Promise<{ fallbackDir?: string }>
  clearImage: () => void
}

function extractDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
}

export function useImageViewer(): ImageViewerState & ImageViewerActions {
  const [image, setImage] = useState<ImageInfo | null>(null)
  const [folderImages, setFolderImages] = useState<FolderImages | null>(null)
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDir, setLastDir] = useState(() => localStorage.getItem('lastDir') || '')

  const saveLastDir = useCallback((dir: string) => {
    setLastDir(dir)
    localStorage.setItem('lastDir', dir)
  }, [])

  const loadImage = useCallback(async (filePath: string) => {
    setLoading(true)
    setError(null)
    try {
      const info = await window.api.loadImage(filePath)
      setImage(info)
      setZoom(100)

      const dir = extractDir(filePath)
      if (dir) saveLastDir(dir)

      const folder = await window.api.getImages(filePath)
      setFolderImages(folder)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [saveLastDir])

  const openFile = useCallback(async () => {
    const filePath = await window.api.openFile()
    if (filePath) {
      await loadImage(filePath)
    }
  }, [loadImage])

  const navigateImage = useCallback(
    async (index: number) => {
      if (!folderImages || index < 0 || index >= folderImages.files.length) return
      const filePath = folderImages.files[index]
      setLoading(true)
      setError(null)
      try {
        const info = await window.api.loadImage(filePath)
        setImage(info)
        setZoom(100)
        setFolderImages({ ...folderImages, currentIndex: index })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [folderImages]
  )

  const nextImage = useCallback(async () => {
    if (!folderImages) return
    const next = folderImages.currentIndex + 1
    if (next < folderImages.files.length) {
      await navigateImage(next)
    }
  }, [folderImages, navigateImage])

  const prevImage = useCallback(async () => {
    if (!folderImages) return
    const prev = folderImages.currentIndex - 1
    if (prev >= 0) {
      await navigateImage(prev)
    }
  }, [folderImages, navigateImage])

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 10, 500))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 10, 10))
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(100)
  }, [])

  const reloadCurrent = useCallback(async (): Promise<{ fallbackDir?: string }> => {
    if (!image) return {}
    const dir = extractDir(image.filePath)
    try {
      // Check if the file still exists before full reload
      await window.api.loadImage(image.filePath)
      await loadImage(image.filePath)
      return {}
    } catch {
      // File no longer exists (deleted externally) - return dir for fallback
      setImage(null)
      setFolderImages(null)
      setZoom(100)
      return { fallbackDir: dir }
    }
  }, [image, loadImage])

  // Listen for file:open event (file association)
  useEffect(() => {
    const cleanup = window.api.onFileOpen((filePath: string) => {
      loadImage(filePath)
    })
    return cleanup
  }, [loadImage])

  const clearImage = useCallback(() => {
    setImage(null)
    setFolderImages(null)
    setZoom(100)
  }, [])

  return {
    image,
    folderImages,
    zoom,
    loading,
    error,
    lastDir,
    openFile,
    loadImage,
    nextImage,
    prevImage,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    reloadCurrent,
    clearImage
  }
}
