import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { captureGetScreenSources } from '@/lib/api'

interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  width: number
  height: number
}

interface ScreenPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (sourceId: string) => void
}

export function ScreenPicker({
  open,
  onOpenChange,
  onSelect
}: ScreenPickerProps): React.JSX.Element {
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    captureGetScreenSources()
      .then((s) => {
        setSources(s)
        // If only one screen, auto-select it
        if (s.length === 1) {
          onOpenChange(false)
          onSelect(s[0].id)
        }
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false))
  }, [open, onOpenChange, onSelect])

  const handleSelect = useCallback(
    (sourceId: string) => {
      onOpenChange(false)
      onSelect(sourceId)
    },
    [onOpenChange, onSelect]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 600 }}>
        <DialogHeader>
          <DialogTitle>모니터 선택</DialogTitle>
          <DialogDescription>캡쳐할 모니터를 선택하세요</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            모니터 목록 불러오는 중...
          </div>
        ) : sources.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            사용 가능한 모니터가 없습니다
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(sources.length, 3)}, 1fr)`,
              gap: 12,
              padding: '4px 0'
            }}
          >
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              >
                <img
                  src={s.thumbnail}
                  alt={s.name}
                  style={{
                    width: '100%',
                    height: 100,
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
