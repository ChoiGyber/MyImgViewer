import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { captureGetSources } from '@/lib/api'

interface CaptureSource {
  id: string
  name: string
  thumbnail: string
}

interface WindowPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (sourceId: string) => void
}

export function WindowPicker({
  open,
  onOpenChange,
  onCapture
}: WindowPickerProps): React.JSX.Element {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    captureGetSources()
      .then((s) => setSources(s))
      .catch(() => setSources([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleSelect = useCallback(
    (sourceId: string) => {
      onOpenChange(false)
      onCapture(sourceId)
    },
    [onOpenChange, onCapture]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 720, maxHeight: '80vh' }}>
        <DialogHeader>
          <DialogTitle>창 캡쳐</DialogTitle>
          <DialogDescription>캡쳐할 프로그램 창을 선택하세요</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            윈도우 목록 불러오는 중...
          </div>
        ) : sources.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            캡쳐 가능한 창이 없습니다
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: '4px 0'
            }}
          >
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className="flex flex-col items-center gap-2 p-2 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              >
                <img
                  src={s.thumbnail}
                  alt={s.name}
                  style={{
                    width: '100%',
                    height: 120,
                    objectFit: 'contain',
                    borderRadius: 4,
                    background: 'var(--color-muted)'
                  }}
                />
                <span className="text-xs truncate w-full text-center">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
