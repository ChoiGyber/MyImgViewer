import { useRef, useState, useCallback, useEffect } from 'react'
import type { ImageInfo } from '@/lib/types'

interface ImageCanvasProps {
  image: ImageInfo | null
  zoom: number
  onZoomChange: (zoom: number) => void
  onDoubleClick?: () => void
}

export function ImageCanvas({ image, zoom, onZoomChange, onDoubleClick }: ImageCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 })

  // Reset pan when image changes
  useEffect(() => {
    setPan({ x: 0, y: 0 })
  }, [image?.filePath])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      const newZoom = Math.max(10, Math.min(500, zoom + delta))
      onZoomChange(newZoom)
    },
    [zoom, onZoomChange]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsPanning(true)
        setStartPan(pan)
        setStartMouse({ x: e.clientX, y: e.clientY })
      }
    },
    [pan]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      setPan({
        x: startPan.x + (e.clientX - startMouse.x),
        y: startPan.y + (e.clientY - startMouse.y)
      })
    },
    [isPanning, startPan, startMouse]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) onDoubleClick()
  }, [onDoubleClick])

  if (!image) return <div />

  const scale = zoom / 100

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-muted/30"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <img
        src={image.dataUrl}
        alt={image.fileName}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          maxWidth: 'none',
          maxHeight: 'none',
          pointerEvents: 'none'
        }}
        draggable={false}
      />
    </div>
  )
}
