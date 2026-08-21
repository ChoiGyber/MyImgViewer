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
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react'
import { saveFileDialog, imageTransform } from '@/lib/api'
import type { ImageInfo } from '@/lib/types'

interface RotateFlipPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageInfo
  onReload: () => void
}

export function RotateFlipPanel({
  open,
  onOpenChange,
  image,
  onReload
}: RotateFlipPanelProps): React.JSX.Element {
  const [processing, setProcessing] = useState(false)

  const handleTransform = async (options: {
    rotate?: number
    flipH?: boolean
    flipV?: boolean
  }): Promise<void> => {
    const ext = image.fileName.split('.').pop() || 'png'
    const suffix = options.rotate
      ? `_rot${options.rotate}`
      : options.flipH
        ? '_flipH'
        : '_flipV'
    const defaultName = image.fileName.replace(/\.[^.]+$/, `${suffix}.${ext}`)
    const outputPath = await saveFileDialog(defaultName, [
      { name: '이미지 파일', extensions: [ext] }
    ])
    if (!outputPath) return

    setProcessing(true)
    try {
      await imageTransform({
        filePath: image.filePath,
        ...options,
        outputPath
      })
      onReload()
    } catch (err) {
      alert(`변환 실패: ${(err as Error).message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>회전 / 반전</DialogTitle>
          <DialogDescription>{image.fileName}</DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="text-sm font-medium">회전</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => handleTransform({ rotate: 90 })}
                disabled={processing}
              >
                <RotateCw className="h-4 w-4" style={{ marginRight: 4 }} />
                90°
              </Button>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => handleTransform({ rotate: 180 })}
                disabled={processing}
              >
                <RotateCw className="h-4 w-4" style={{ marginRight: 4 }} />
                180°
              </Button>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => handleTransform({ rotate: 270 })}
                disabled={processing}
              >
                <RotateCcw className="h-4 w-4" style={{ marginRight: 4 }} />
                270°
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="text-sm font-medium">반전</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => handleTransform({ flipH: true })}
                disabled={processing}
              >
                <FlipHorizontal className="h-4 w-4" style={{ marginRight: 4 }} />
                좌우 반전
              </Button>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onClick={() => handleTransform({ flipV: true })}
                disabled={processing}
              >
                <FlipVertical className="h-4 w-4" style={{ marginRight: 4 }} />
                상하 반전
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
