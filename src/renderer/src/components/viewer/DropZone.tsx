import { useState, useCallback } from 'react'
import { ImageIcon } from 'lucide-react'

interface DropZoneProps {
  hasImage: boolean
  onDrop: (filePath: string) => void
  onOpen: () => void
}

export function DropZone({ hasImage, onDrop, onOpen }: DropZoneProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        // Electron adds .path property to File objects
        const filePath = (file as File & { path: string }).path
        if (!filePath) {
          console.error('file.path is not available')
          return
        }
        const ext = file.name.toLowerCase().split('.').pop()
        const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg']
        if (ext && imageExts.includes(ext)) {
          onDrop(filePath)
        }
      }
    },
    [onDrop]
  )

  // When image is loaded, only show drag overlay (pointer-events: none to not block canvas)
  if (hasImage && !isDragging) {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ pointerEvents: 'none' }}
      >
        {/* Invisible layer - drag events handled by parent */}
        <div
          className="absolute inset-0"
          style={{ pointerEvents: 'auto' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 z-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium text-primary">여기에 이미지를 놓으세요</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasImage && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">이미지를 열어주세요</p>
            <p className="text-sm mb-4">파일을 드래그하거나 열기 버튼을 클릭하세요</p>
            <button
              className="text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
              onClick={onOpen}
            >
              파일 열기 (Ctrl+O)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
