import { useState, useEffect, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThumbnailItem {
  filePath: string
  fileName: string
  thumbnail: string
}

interface FolderBrowserProps {
  open: boolean
  onClose: () => void
  folderPath: string
  currentFilePath: string | null
  onSelect: (filePath: string) => void
}

export function FolderBrowser({
  open,
  onClose,
  folderPath,
  currentFilePath,
  onSelect
}: FolderBrowserProps): React.JSX.Element | null {
  const [items, setItems] = useState<ThumbnailItem[]>([])
  const [loading, setLoading] = useState(false)

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

  const handleSelect = useCallback((filePath: string) => {
    onSelect(filePath)
    onClose()
  }, [onSelect, onClose])

  if (!open) return null

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
            이미지 불러오는 중...
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
                onClick={() => handleSelect(item.filePath)}
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
                  }}
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.fileName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      draggable={false}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">?</span>
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
        {items.length}개 이미지
      </div>
    </div>
  )
}
