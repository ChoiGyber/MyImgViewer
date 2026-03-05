import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Loader2,
  Folder,
  RotateCw,
  RotateCcw,
  Minimize2,
  Copy,
  Trash2,
  Maximize,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThumbnailItem {
  filePath: string
  fileName: string
  thumbnail: string
  type: 'folder' | 'image' | 'pdf'
}

interface ContextMenuState {
  x: number
  y: number
  item: ThumbnailItem | null // null = batch context menu
}

type BatchMode = 'resize' | 'transform' | 'convert'

interface FolderBrowserProps {
  open: boolean
  onClose: () => void
  folderPath: string
  currentFilePath: string | null
  onSelect: (filePath: string) => void
  onNavigate: (dirPath: string) => void
  onRotateLeft: (filePath: string) => void
  onRotateRight: (filePath: string) => void
  onResize: (filePath: string) => void
  onCopy: (filePath: string) => void
  onDelete: (filePath: string) => void
  onBatchAction: (mode: BatchMode, files: string[]) => void
  previewOpen: boolean
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function FolderBrowser({
  open,
  onClose,
  folderPath,
  currentFilePath,
  onSelect,
  onNavigate,
  onRotateLeft,
  onRotateRight,
  onResize,
  onCopy,
  onDelete,
  onBatchAction,
  previewOpen
}: FolderBrowserProps): React.JSX.Element | null {
  const [items, setItems] = useState<ThumbnailItem[]>([])
  const [loading, setLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 })
  const [dragBaseSelection, setDragBaseSelection] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !folderPath) return
    setLoading(true)
    setSelectedFiles(new Set())
    window.api
      .getFolderThumbnails(folderPath)
      .then((result) => {
        setItems(result)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [open, folderPath])

  // Close context menu on click outside
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

  // Cleanup drag on mouse up anywhere
  useEffect(() => {
    if (!isDragging) return
    const handleUp = (): void => setIsDragging(false)
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [isDragging])

  const handleClick = useCallback(
    (item: ThumbnailItem, e: React.MouseEvent) => {
      if (item.type === 'folder') {
        setSelectedFiles(new Set())
        onNavigate(item.filePath)
        return
      }
      if (item.type === 'pdf') return

      // Ctrl+click: toggle selection
      if (e.ctrlKey || e.metaKey) {
        setSelectedFiles((prev) => {
          const next = new Set(prev)
          if (next.has(item.filePath)) {
            next.delete(item.filePath)
          } else {
            next.add(item.filePath)
          }
          return next
        })
        return
      }

      // Normal click: if items selected, clear selection
      if (selectedFiles.size > 0) {
        setSelectedFiles(new Set())
        return
      }

      // Normal click without selection: navigate to image
      onSelect(item.filePath)
      onClose()
    },
    [onSelect, onClose, onNavigate, selectedFiles.size]
  )

  const handleDoubleClick = useCallback((item: ThumbnailItem) => {
    if (item.type === 'pdf') {
      window.api.openPath(item.filePath)
    }
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: ThumbnailItem) => {
      if (item.type !== 'image') return
      e.preventDefault()
      e.stopPropagation()

      // If right-clicking a selected item, show batch menu
      if (selectedFiles.has(item.filePath) && selectedFiles.size > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY, item: null })
      } else {
        // Single item context menu
        setContextMenu({ x: e.clientX, y: e.clientY, item })
      }
    },
    [selectedFiles]
  )

  const handleMenuAction = useCallback(
    (action: (filePath: string) => void) => {
      if (!contextMenu || !contextMenu.item) return
      const filePath = contextMenu.item.filePath
      setContextMenu(null)
      action(filePath)
    },
    [contextMenu]
  )

  const handleBatchMenuAction = useCallback(
    (mode: BatchMode) => {
      setContextMenu(null)
      const files = Array.from(selectedFiles)
      if (files.length > 0) {
        onBatchAction(mode, files)
      }
    },
    [selectedFiles, onBatchAction]
  )

  // --- Drag selection handlers ---
  const handleGridMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag on left button and on empty space (not on items)
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('[data-item]')) return

      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setDragEnd({ x: e.clientX, y: e.clientY })

      // If Ctrl held, keep existing selection as base
      if (e.ctrlKey || e.metaKey) {
        setDragBaseSelection(new Set(selectedFiles))
      } else {
        setDragBaseSelection(new Set())
        setSelectedFiles(new Set())
      }
    },
    [selectedFiles]
  )

  const handleGridMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setDragEnd({ x: e.clientX, y: e.clientY })

      const selRect = {
        left: Math.min(dragStart.x, e.clientX),
        top: Math.min(dragStart.y, e.clientY),
        right: Math.max(dragStart.x, e.clientX),
        bottom: Math.max(dragStart.y, e.clientY)
      }

      const gridEl = gridRef.current
      if (!gridEl) return

      const itemEls = gridEl.querySelectorAll('[data-item="image"]')
      const newSelected = new Set(dragBaseSelection)

      itemEls.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const itemRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom
        }
        const fp = el.getAttribute('data-filepath')
        if (fp && rectsIntersect(selRect, itemRect)) {
          newSelected.add(fp)
        }
      })

      setSelectedFiles(newSelected)
    },
    [isDragging, dragStart, dragBaseSelection]
  )

  const handleGridMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Select all images with Ctrl+A
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const allImages = items.filter((i) => i.type === 'image').map((i) => i.filePath)
        setSelectedFiles(new Set(allImages))
      }
      if (e.key === 'Escape') {
        if (selectedFiles.size > 0) {
          setSelectedFiles(new Set())
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, items, selectedFiles.size, onClose])

  if (!open) return null

  const imageCount = items.filter((i) => i.type === 'image').length
  const pdfCount = items.filter((i) => i.type === 'pdf').length
  const folderCount = items.filter((i) => i.type === 'folder').length

  const footerParts: string[] = []
  if (folderCount > 0) footerParts.push(`${folderCount}개 폴더`)
  if (imageCount > 0) footerParts.push(`${imageCount}개 이미지`)
  if (pdfCount > 0) footerParts.push(`${pdfCount}개 PDF`)

  const singleMenuItems = [
    { label: '왼쪽 회전', icon: RotateCcw, action: onRotateLeft },
    { label: '오른쪽 회전', icon: RotateCw, action: onRotateRight },
    { label: '크기 줄이기', icon: Minimize2, action: onResize },
    { label: '포맷 변환', icon: RefreshCw, action: (fp: string) => onBatchAction('convert', [fp]) },
    { label: '복사하기', icon: Copy, action: onCopy },
    { label: '삭제', icon: Trash2, action: onDelete, danger: true }
  ]

  const batchMenuItems = [
    {
      label: `일괄 크기조절 (${selectedFiles.size}개)`,
      icon: Maximize,
      action: () => handleBatchMenuAction('resize')
    },
    {
      label: `일괄 회전/반전 (${selectedFiles.size}개)`,
      icon: RotateCw,
      action: () => handleBatchMenuAction('transform')
    },
    {
      label: `일괄 포맷변환 (${selectedFiles.size}개)`,
      icon: RefreshCw,
      action: () => handleBatchMenuAction('convert')
    }
  ]

  const renderContextMenu = (): React.JSX.Element | null => {
    if (!contextMenu) return null

    const isBatch = contextMenu.item === null
    const menuList = isBatch ? batchMenuItems : singleMenuItems
    const menuHeight = menuList.length * 36 + 8
    const menuWidth = isBatch ? 220 : 160
    const top =
      contextMenu.y + menuHeight > window.innerHeight
        ? contextMenu.y - menuHeight
        : contextMenu.y
    const left =
      contextMenu.x + menuWidth > window.innerWidth ? contextMenu.x - menuWidth : contextMenu.x

    return (
      <div
        style={{
          position: 'fixed',
          top,
          left,
          zIndex: 100,
          minWidth: menuWidth,
          background: 'var(--color-popover, #fff)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: '4px 0',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isBatch
          ? batchMenuItems.map((mi) => (
              <button
                key={mi.label}
                onClick={mi.action}
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
                  color: 'var(--color-foreground)',
                  textAlign: 'left'
                }}
                className="hover:bg-accent"
              >
                <mi.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {mi.label}
              </button>
            ))
          : singleMenuItems.map((mi) => (
              <button
                key={mi.label}
                onClick={() => handleMenuAction(mi.action)}
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
                  color: mi.danger ? '#dc2626' : 'var(--color-foreground)',
                  textAlign: 'left'
                }}
                className="hover:bg-accent"
              >
                <mi.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {mi.label}
              </button>
            ))}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0
        }}
      >
        <span
          className="text-sm font-medium"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {folderPath}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} style={{ flexShrink: 0 }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnail grid */}
      {loading ? (
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground" style={{ marginLeft: 8 }}>
            불러오는 중...
          </span>
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
            alignContent: 'start',
            position: 'relative',
            userSelect: 'none'
          }}
          onMouseDown={handleGridMouseDown}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
        >
          {items.map((item) => {
            const isActive = item.filePath === currentFilePath
            const isSelected = selectedFiles.has(item.filePath)
            return (
              <button
                key={item.filePath}
                data-item={item.type}
                data-filepath={item.filePath}
                onClick={(e) => handleClick(item, e)}
                onDoubleClick={() => handleDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: 6,
                  borderRadius: 8,
                  border: isSelected
                    ? '2px solid #3b82f6'
                    : isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.15)'
                    : isActive
                      ? 'var(--color-accent)'
                      : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                className="hover:bg-accent"
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--color-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative'
                  }}
                >
                  {item.type === 'folder' ? (
                    <Folder
                      className="h-10 w-10 text-muted-foreground"
                      style={{ color: '#f59e0b' }}
                    />
                  ) : item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.fileName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      draggable={false}
                    />
                  ) : item.type === 'pdf' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      <span style={{ fontSize: 28, fontWeight: 700, color: '#9ca3af' }}>PDF</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">?</span>
                  )}

                  {/* PDF badge */}
                  {item.type === 'pdf' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: 3,
                        lineHeight: '14px',
                        letterSpacing: 0.5
                      }}
                    >
                      PDF
                    </div>
                  )}

                  {/* Selection check */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isSelected
                      ? '#3b82f6'
                      : isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-foreground)'
                  }}
                  title={item.fileName}
                >
                  {item.fileName}
                </span>
              </button>
            )
          })}

          {/* Rubber band selection visual */}
          {isDragging &&
            Math.abs(dragEnd.x - dragStart.x) + Math.abs(dragEnd.y - dragStart.y) > 5 && (
              <div
                style={{
                  position: 'fixed',
                  left: Math.min(dragStart.x, dragEnd.x),
                  top: Math.min(dragStart.y, dragEnd.y),
                  width: Math.abs(dragEnd.x - dragStart.x),
                  height: Math.abs(dragEnd.y - dragStart.y),
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                  zIndex: 50
                }}
              />
            )}
        </div>
      )}

      {/* Selection action bar */}
      {selectedFiles.size > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            background: 'var(--color-muted)'
          }}
        >
          <span className="text-sm font-medium" style={{ marginRight: 4 }}>
            {selectedFiles.size}개 선택
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBatchAction('resize', Array.from(selectedFiles))}
          >
            <Maximize className="h-3.5 w-3.5 mr-1" />
            크기조절
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBatchAction('transform', Array.from(selectedFiles))}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            회전/반전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBatchAction('convert', Array.from(selectedFiles))}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            포맷변환
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set())}>
            선택 해제
          </Button>
        </div>
      )}

      {/* Footer */}
      <div
        className="text-xs text-muted-foreground"
        style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0
        }}
      >
        {footerParts.length > 0 ? footerParts.join(', ') : '비어 있음'}
        {selectedFiles.size > 0 && (
          <span style={{ marginLeft: 8, color: '#3b82f6' }}>
            | 드래그 또는 Ctrl+클릭으로 선택 · Ctrl+A 전체 선택
          </span>
        )}
      </div>

      {/* Context menu */}
      {renderContextMenu()}
    </div>
  )
}
