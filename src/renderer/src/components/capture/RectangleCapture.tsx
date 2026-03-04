import { useState, useRef, useCallback, useEffect } from 'react'

interface RectangleCaptureProps {
  screenData: {
    dataUrl: string
    screenWidth: number
    screenHeight: number
    scaleFactor: number
  }
  onCapture: (rect: { x: number; y: number; width: number; height: number }) => void
  onCancel: () => void
}

export function RectangleCapture({
  screenData,
  onCapture,
  onCancel
}: RectangleCaptureProps): React.JSX.Element {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      const el = containerRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const pos = getRelativePos(e)
      setStart(pos)
      setCurrent(pos)
      setIsDragging(true)
    },
    [getRelativePos]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setCurrent(getRelativePos(e))
    },
    [isDragging, getRelativePos]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !start || !current) return
    setIsDragging(false)

    const el = containerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const { scaleFactor } = screenData

    // Calculate selection in screen pixels (scaled to actual capture resolution)
    const scaleX = (screenData.screenWidth * scaleFactor) / rect.width
    const scaleY = (screenData.screenHeight * scaleFactor) / rect.height

    const x1 = Math.min(start.x, current.x)
    const y1 = Math.min(start.y, current.y)
    const x2 = Math.max(start.x, current.x)
    const y2 = Math.max(start.y, current.y)

    const w = x2 - x1
    const h = y2 - y1

    // Minimum selection size
    if (w < 5 || h < 5) {
      setStart(null)
      setCurrent(null)
      return
    }

    onCapture({
      x: x1 * scaleX,
      y: y1 * scaleY,
      width: w * scaleX,
      height: h * scaleY
    })
  }, [isDragging, start, current, screenData, onCapture])

  // ESC to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  // Selection rect in CSS pixels
  const selRect =
    start && current
      ? {
          left: Math.min(start.x, current.x),
          top: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y)
        }
      : null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'crosshair',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Screenshot background */}
      <img
        src={screenData.dataUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none'
        }}
        draggable={false}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          pointerEvents: 'none'
        }}
      />

      {/* Selection highlight */}
      {selRect && selRect.width > 0 && selRect.height > 0 && (
        <>
          {/* Clear area (shows screenshot without dark overlay) */}
          <div
            style={{
              position: 'absolute',
              left: selRect.left,
              top: selRect.top,
              width: selRect.width,
              height: selRect.height,
              overflow: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <img
              src={screenData.dataUrl}
              alt=""
              style={{
                position: 'absolute',
                left: -selRect.left,
                top: -selRect.top,
                width: containerRef.current?.clientWidth || '100%',
                height: containerRef.current?.clientHeight || '100%',
                objectFit: 'fill',
                pointerEvents: 'none'
              }}
              draggable={false}
            />
          </div>
          {/* Border */}
          <div
            style={{
              position: 'absolute',
              left: selRect.left,
              top: selRect.top,
              width: selRect.width,
              height: selRect.height,
              border: '2px solid #3b82f6',
              pointerEvents: 'none'
            }}
          />
          {/* Size label */}
          <div
            style={{
              position: 'absolute',
              left: selRect.left,
              top: selRect.top + selRect.height + 4,
              background: '#3b82f6',
              color: 'white',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 3,
              pointerEvents: 'none'
            }}
          >
            {Math.round(selRect.width * screenData.scaleFactor)} x{' '}
            {Math.round(selRect.height * screenData.scaleFactor)}
          </div>
        </>
      )}

      {/* Instructions */}
      {!isDragging && !selRect && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            pointerEvents: 'none'
          }}
        >
          드래그하여 영역을 선택하세요 (ESC: 취소)
        </div>
      )}
    </div>
  )
}
