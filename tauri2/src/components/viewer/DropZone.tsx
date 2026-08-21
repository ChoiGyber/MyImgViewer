import { useState, useCallback, useRef } from 'react'
import { ImageIcon, FolderOpen } from 'lucide-react'

interface DropZoneProps {
  hasImage: boolean
  hasLastDir: boolean
  onDrop: (filePath: string) => void
  onOpen: () => void
  onShowFolder: () => void
}

export function DropZone({ hasImage, hasLastDir, onDrop, onOpen, onShowFolder }: DropZoneProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        const filePath = (file as File & { path: string }).path
        if (!filePath) return
        const ext = file.name.toLowerCase().split('.').pop()
        const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg']
        if (ext && imageExts.includes(ext)) {
          onDrop(filePath)
        }
      }
    },
    [onDrop]
  )

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: hasImage && !isDragging ? 'none' : 'auto' }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(59,130,246,0.08)',
            border: '2px dashed var(--color-primary)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <ImageIcon style={{ width: 48, height: 48, margin: '0 auto 8px', color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-primary)' }}>여기에 이미지를 놓으세요</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasImage && !isDragging && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-muted-foreground)' }}>
            <ImageIcon style={{ width: 64, height: 64, margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 18, marginBottom: 8 }}>이미지를 열어주세요</p>
            <p style={{ fontSize: 14, marginBottom: 16 }}>파일을 드래그하거나 열기 버튼을 클릭하세요</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                style={{
                  fontSize: 14, color: 'var(--color-primary)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={onOpen}
              >
                파일 열기 (Ctrl+O)
              </button>
              {hasLastDir && (
                <button
                  style={{
                    fontSize: 14, color: 'var(--color-primary)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    textDecoration: 'underline',
                  }}
                  onClick={onShowFolder}
                >
                  <FolderOpen style={{ width: 14, height: 14 }} />
                  최근 폴더 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
