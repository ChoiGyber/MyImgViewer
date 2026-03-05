import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Folder, RotateCw, RotateCcw, Minimize2, Copy, Trash2 } from 'lucide-react'
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
  item: ThumbnailItem
}

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
  onDelete
}: FolderBrowserProps): React.JSX.Element | null {
  const [items, setItems] = useState<ThumbnailItem[]>([])
  const [loading, setLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (!open || !folderPath) return

    setLoading(true)
    window.api.getFolderThumbnails(folderPath).then((result) => {
      setItems(result)
      setLoading(false)
    }).catch(() => {
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

  const handleClick = useCallback((item: ThumbnailItem) => {
    if (item.type === 'folder') {
      onNavigate(item.filePath)
    } else if (item.type === 'pdf') {
      // PDF는 단일 클릭 무시, 더블클릭으로만 열기
    } else {
      onSelect(item.filePath)
      onClose()
    }
  }, [onSelect, onClose, onNavigate])

  const handleDoubleClick = useCallback((item: ThumbnailItem) => {
    if (item.type === 'pdf') {
      window.api.openPath(item.filePath)
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, item: ThumbnailItem) => {
    if (item.type !== 'image') return
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }, [])

  const handleMenuAction = useCallback((action: (filePath: string) => void) => {
    if (!contextMenu) return
    const filePath = contextMenu.item.filePath
    setContextMenu(null)
    action(filePath)
  }, [contextMenu])

  if (!open) return null

  const imageCount = items.filter((i) => i.type === 'image').length
  const pdfCount = items.filter((i) => i.type === 'pdf').length
  const folderCount = items.filter((i) => i.type === 'folder').length

  const footerParts: string[] = []
  if (folderCount > 0) footerParts.push(`${folderCount}개 폴더`)
  if (imageCount > 0) footerParts.push(`${imageCount}개 이미지`)
  if (pdfCount > 0) footerParts.push(`${pdfCount}개 PDF`)

  const menuItems = [
    { label: '왼쪽 회전', icon: RotateCcw, action: onRotateLeft },
    { label: '오른쪽 회전', icon: RotateCw, action: onRotateRight },
    { label: '크기 줄이기', icon: Minimize2, action: onResize },
    { label: '복사하기', icon: Copy, action: onCopy },
    { label: '삭제', icon: Trash2, action: onDelete, danger: true }
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background)',
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
          flexShrink: 0,
        }}
      >
        <span className="text-sm font-medium" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folderPath}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} style={{ flexShrink: 0 }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Thumbnail grid */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground" style={{ marginLeft: 8 }}>
            불러오는 중...
          </span>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
            alignContent: 'start',
          }}
        >
          {items.map((item) => {
            const isActive = item.filePath === currentFilePath
            return (
              <button
                key={item.filePath}
                onClick={() => handleClick(item)}
                onDoubleClick={() => handleDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: 6,
                  borderRadius: 8,
                  border: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  background: isActive ? 'var(--color-accent)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
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
                    position: 'relative',
                  }}
                >
                  {item.type === 'folder' ? (
                    <Folder className="h-10 w-10 text-muted-foreground" style={{ color: '#f59e0b' }} />
                  ) : item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.fileName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      draggable={false}
                    />
                  ) : item.type === 'pdf' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
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
                        letterSpacing: 0.5,
                      }}
                    >
                      PDF
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
                    color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                  }}
                  title={item.fileName}
                >
                  {item.fileName}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div
        className="text-xs text-muted-foreground"
        style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        {footerParts.length > 0 ? footerParts.join(', ') : '비어 있음'}
      </div>

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
          {menuItems.map((mi) => (
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
                textAlign: 'left',
              }}
              className="hover:bg-accent"
            >
              <mi.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {mi.label}
            </button>
          ))}
        </div>
        )
      })()}
    </div>
  )
}
