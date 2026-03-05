import { useRef, useState, useCallback, useEffect } from 'react'
import { RotateCw, RotateCcw, Minimize2, Copy, Trash2 } from 'lucide-react'
import type { ImageInfo } from '@/lib/types'

interface ContextMenuState {
  x: number
  y: number
}

interface ImageCanvasProps {
  image: ImageInfo | null
  zoom: number
  onZoomChange: (zoom: number) => void
  onDoubleClick?: () => void
  onRotateLeft?: () => void
  onRotateRight?: () => void
  onResize?: () => void
  onCopy?: () => void
  onDelete?: () => void
}

export function ImageCanvas({
  image,
  zoom,
  onZoomChange,
  onDoubleClick,
  onRotateLeft,
  onRotateRight,
  onResize,
  onCopy,
  onDelete
}: ImageCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Reset pan when image changes
  useEffect(() => {
    setPan({ x: 0, y: 0 })
  }, [image?.filePath])

  // Close context menu on click outside or scroll
  useEffect(() => {
    if (!contextMenu) return
    const close = (): void => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

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

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && e.button === 0) {
        const dx = e.clientX - startMouse.x
        const dy = e.clientY - startMouse.y
        // Click without drag → go back to list
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && onDoubleClick) {
          onDoubleClick()
        }
      }
      setIsPanning(false)
    },
    [isPanning, startMouse, onDoubleClick]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMenuAction = useCallback(
    (action: (() => void) | undefined) => {
      setContextMenu(null)
      if (action) action()
    },
    []
  )

  if (!image) return <div />

  const scale = zoom / 100

  const menuItems = [
    { label: '왼쪽 회전', icon: RotateCcw, action: onRotateLeft },
    { label: '오른쪽 회전', icon: RotateCw, action: onRotateRight },
    { label: '크기 줄이기', icon: Minimize2, action: onResize },
    { label: '복사하기', icon: Copy, action: onCopy },
    { label: '삭제', icon: Trash2, action: onDelete, danger: true }
  ]

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-muted/30"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPanning(false)}
      onContextMenu={handleContextMenu}
      style={{ cursor: isPanning ? 'grabbing' : 'grab', position: 'relative' }}
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

      {/* Context menu */}
      {contextMenu && (() => {
        const menuHeight = menuItems.length * 36 + 8
        const menuWidth = 160
        const top = contextMenu.y + menuHeight > window.innerHeight
          ? contextMenu.y - menuHeight
          : contextMenu.y
        const left = contextMenu.x + menuWidth > window.innerWidth
          ? contextMenu.x - menuWidth
          : contextMenu.x
        return (
        <div
          style={{
            position: 'fixed',
            top,
            left,
            zIndex: 100,
            minWidth: 160,
            background: 'var(--color-popover, #fff)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            padding: '4px 0',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleMenuAction(item.action)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                color: item.danger ? '#dc2626' : 'var(--color-foreground)',
                textAlign: 'left',
              }}
              className="hover:bg-accent"
            >
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {item.label}
            </button>
          ))}
        </div>
        )
      })()}
    </div>
  )
}
