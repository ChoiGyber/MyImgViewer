import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OUTPUT_FORMATS, LOSSY_FORMATS } from '@/lib/constants'
import type { ImageInfo } from '@/lib/types'

interface ConvertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageInfo
  onReload: () => void
}

export function ConvertDialog({
  open,
  onOpenChange,
  image,
  onReload
}: ConvertDialogProps): React.JSX.Element {
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(85)
  const [saving, setSaving] = useState(false)

  const isLossy = (LOSSY_FORMATS as readonly string[]).includes(format)

  const handleSave = async (): Promise<void> => {
    const ext = format === 'jpeg' ? 'jpg' : format
    const defaultName = image.fileName.replace(/\.[^.]+$/, `.${ext}`)
    const outputPath = await window.api.saveFile(defaultName, [
      { name: `${format.toUpperCase()} 파일`, extensions: [ext] }
    ])
    if (!outputPath) return

    setSaving(true)
    try {
      await window.api.convert({
        filePath: image.filePath,
        outputFormat: format,
        quality,
        outputPath
      })
      onOpenChange(false)
      // If saved to same directory, reload
      onReload()
    } catch (err) {
      alert(`변환 실패: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>포맷 변환</DialogTitle>
          <DialogDescription>
            {image.fileName} ({image.format.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>출력 포맷</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLossy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>
                품질: {quality}%
              </Label>
              <Slider
                value={[quality]}
                onValueChange={(v) => setQuality(v[0])}
                min={1}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '변환 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
