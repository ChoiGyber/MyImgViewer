import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link, Unlink } from 'lucide-react'
import { RESIZE_PRESETS, FIT_OPTIONS } from '@/lib/constants'
import type { ImageInfo } from '@/lib/types'

interface ResizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageInfo
  onReload: () => void
}

export function ResizeDialog({
  open,
  onOpenChange,
  image,
  onReload
}: ResizeDialogProps): React.JSX.Element {
  const [width, setWidth] = useState(image.width)
  const [height, setHeight] = useState(image.height)
  const [lockRatio, setLockRatio] = useState(true)
  const [fit, setFit] = useState<string>('inside')
  const [saving, setSaving] = useState(false)

  const aspectRatio = image.width / image.height

  useEffect(() => {
    setWidth(image.width)
    setHeight(image.height)
  }, [image])

  const handleWidthChange = (val: string): void => {
    const w = parseInt(val) || 0
    setWidth(w)
    if (lockRatio && w > 0) {
      setHeight(Math.round(w / aspectRatio))
    }
  }

  const handleHeightChange = (val: string): void => {
    const h = parseInt(val) || 0
    setHeight(h)
    if (lockRatio && h > 0) {
      setWidth(Math.round(h * aspectRatio))
    }
  }

  const applyPreset = (factor: number): void => {
    const w = Math.round(image.width * factor)
    const h = Math.round(image.height * factor)
    setWidth(w)
    setHeight(h)
  }

  const handleSave = async (): Promise<void> => {
    const ext = image.fileName.split('.').pop() || 'png'
    const defaultName = image.fileName.replace(/\.[^.]+$/, `_resized.${ext}`)
    const outputPath = await window.api.saveFile(defaultName, [
      { name: '이미지 파일', extensions: [ext] }
    ])
    if (!outputPath) return

    setSaving(true)
    try {
      await window.api.resize({
        filePath: image.filePath,
        width: width || undefined,
        height: height || undefined,
        fit,
        outputPath
      })
      onOpenChange(false)
      onReload()
    } catch (err) {
      alert(`크기 조절 실패: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>크기 조절</DialogTitle>
          <DialogDescription>
            원본: {image.width} x {image.height}
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {RESIZE_PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.value)}>
                {p.label}
              </Button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>가로 (px)</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                min={1}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              style={{ marginBottom: 2 }}
              onClick={() => setLockRatio(!lockRatio)}
            >
              {lockRatio ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
            </Button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>세로 (px)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                min={1}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Label>맞춤 방식</Label>
            <Select value={fit} onValueChange={setFit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || (width <= 0 && height <= 0)}>
            {saving ? '처리 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
