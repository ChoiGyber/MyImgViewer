import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Printer } from 'lucide-react'
import type { ImageInfo } from '@/lib/types'
import {
  DEFAULT_PRINT_OPTIONS,
  PRINT_PAPER_SIZES,
  PRINT_ROTATIONS,
  PRINT_SCALE_MODES,
  getPrintPaperSize,
  printImage,
  type PrintOptions,
  type PrintPaperSize,
  type PrintRotation,
  type PrintScaleMode
} from '@/lib/print-layout'

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageInfo
}

export function PrintDialog({ open, onOpenChange, image }: PrintDialogProps): React.JSX.Element {
  const [paperSize, setPaperSize] = useState<PrintPaperSize>(DEFAULT_PRINT_OPTIONS.paperSize)
  const [rotation, setRotation] = useState<PrintRotation>(DEFAULT_PRINT_OPTIONS.rotation)
  const [scaleMode, setScaleMode] = useState<PrintScaleMode>(DEFAULT_PRINT_OPTIONS.scaleMode)
  const [copies, setCopies] = useState(DEFAULT_PRINT_OPTIONS.copies)
  const [printing, setPrinting] = useState(false)
  const selectedPaper = getPrintPaperSize(paperSize)
  const paperAspectRatio = `${selectedPaper.widthMm} / ${selectedPaper.heightMm}`

  useEffect(() => {
    if (!open) return
    setPaperSize(DEFAULT_PRINT_OPTIONS.paperSize)
    setRotation(DEFAULT_PRINT_OPTIONS.rotation)
    setScaleMode(DEFAULT_PRINT_OPTIONS.scaleMode)
    setCopies(DEFAULT_PRINT_OPTIONS.copies)
    setPrinting(false)
  }, [open, image.filePath])

  const handlePrint = useCallback(async () => {
    const options: PrintOptions = {
      rotation,
      scaleMode,
      paperSize,
      copies
    }
    setPrinting(true)
    try {
      await printImage(image, options)
      onOpenChange(false)
    } finally {
      setPrinting(false)
    }
  }, [image, rotation, scaleMode, paperSize, copies, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={(next) => !printing && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>프린트</DialogTitle>
          <DialogDescription>{image.fileName}</DialogDescription>
        </DialogHeader>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: 12,
            alignItems: 'center'
          }}
        >
          <Label>용지</Label>
          <Select
            value={paperSize}
            onValueChange={(value) => setPaperSize(value as PrintPaperSize)}
            disabled={printing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRINT_PAPER_SIZES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>회전</Label>
          <Select
            value={String(rotation)}
            onValueChange={(value) => setRotation(Number(value) as PrintRotation)}
            disabled={printing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRINT_ROTATIONS.map((item) => (
                <SelectItem key={item.value} value={String(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>출력 방식</Label>
          <Select
            value={scaleMode}
            onValueChange={(value) => setScaleMode(value as PrintScaleMode)}
            disabled={printing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRINT_SCALE_MODES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>매수</Label>
          <Input
            type="number"
            min={1}
            max={99}
            value={copies}
            onChange={(event) => {
              const next = Math.min(99, Math.max(1, Number.parseInt(event.target.value, 10) || 1))
              setCopies(next)
            }}
            disabled={printing}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 240,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-muted)',
            padding: 16,
            overflow: 'hidden'
          }}
        >
          <div
            aria-label={`${selectedPaper.label} 미리보기`}
            style={{
              aspectRatio: paperAspectRatio,
              height: '100%',
              maxWidth: '100%',
              background: '#fff',
              border: '1px solid var(--color-border)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img
              src={image.dataUrl}
              alt={image.fileName}
              style={{
                maxWidth: scaleMode === 'actualSize' ? '65%' : '100%',
                maxHeight: scaleMode === 'actualSize' ? '65%' : '100%',
                width: scaleMode === 'fillPaper' ? '100%' : 'auto',
                height: scaleMode === 'fillPaper' ? '100%' : 'auto',
                objectFit: scaleMode === 'fillPaper' ? 'fill' : 'contain',
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={printing}
            style={{ paddingLeft: 5, paddingRight: 5 }}
          >
            취소
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            style={{ paddingLeft: 5, paddingRight: 5 }}
          >
            <Printer className="h-4 w-4" />
            {printing ? '준비 중...' : '프린트'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
