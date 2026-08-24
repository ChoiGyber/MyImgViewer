import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import type { UpdateInfo } from '@/lib/types'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: UpdateInfo | null
  onOpenRelease: () => void
}

export function UpdateDialog({
  open,
  onOpenChange,
  update,
  onOpenRelease
}: UpdateDialogProps): React.JSX.Element | null {
  if (!update) return null

  const publishedAt = update.publishedAt
    ? new Date(update.publishedAt).toLocaleDateString('ko-KR')
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>새 버전 {update.latestVersion} 사용 가능</DialogTitle>
          <DialogDescription>
            현재 버전 {update.currentVersion}
            {publishedAt ? ` · 릴리즈 ${publishedAt}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="text-sm font-medium">{update.releaseName}</div>
          <div
            className="text-sm"
            style={{
              maxHeight: 260,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
              padding: 12,
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              background: 'var(--color-muted)'
            }}
          >
            {update.releaseNotes}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            나중에
          </Button>
          <Button onClick={onOpenRelease}>
            <ExternalLink className="h-4 w-4" />
            다운로드 페이지 열기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
