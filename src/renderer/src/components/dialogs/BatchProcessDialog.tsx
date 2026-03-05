import { useState, useEffect, useCallback } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  AlertTriangle
} from 'lucide-react'
import { FIT_OPTIONS, OUTPUT_FORMATS, LOSSY_FORMATS } from '@/lib/constants'
import type { BatchProgress } from '@/lib/types'

type BatchMode = 'resize' | 'transform' | 'convert'
type SaveMode = 'subfolder' | 'overwrite'

interface BatchResult {
  file: string
  success: boolean
  error?: string
}

interface BatchProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: BatchMode
  filePaths: string[]
  sourceDir: string
  onComplete?: () => void
}

const MODE_TITLES: Record<BatchMode, string> = {
  resize: '일괄 크기조절',
  transform: '일괄 회전/반전',
  convert: '일괄 포맷변환'
}

const DEFAULT_SUBFOLDER: Record<BatchMode, string> = {
  resize: 'resized',
  transform: 'transformed',
  convert: 'converted'
}

export function BatchProcessDialog({
  open,
  onOpenChange,
  mode,
  filePaths,
  sourceDir,
  onComplete
}: BatchProcessDialogProps): React.JSX.Element {
  // Save mode
  const [saveMode, setSaveMode] = useState<SaveMode>('subfolder')
  const [subfolderName, setSubfolderName] = useState(DEFAULT_SUBFOLDER[mode])

  // Resize options
  const [resizeMode, setResizeMode] = useState<'percent' | 'pixel'>('percent')
  const [percent, setPercent] = useState(50)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [fit, setFit] = useState('inside')

  // Transform options
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)

  // Convert options
  const [format, setFormat] = useState('jpeg')
  const [quality, setQuality] = useState(85)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchResult[] | null>(null)

  // Reset state when mode or open changes
  useEffect(() => {
    if (open) {
      setSubfolderName(DEFAULT_SUBFOLDER[mode])
      setSaveMode('subfolder')
      setRotate(0)
      setFlipH(false)
      setFlipV(false)
      setResults(null)
      setProgress(null)
      setIsProcessing(false)
    }
  }, [open, mode])

  // Listen for batch progress
  useEffect(() => {
    const cleanup = window.api.onBatchProgress((p: BatchProgress) => {
      setProgress(p)
    })
    return cleanup
  }, [])

  const getOutputDir = useCallback((): string => {
    if (saveMode === 'overwrite') return sourceDir
    const name = subfolderName.trim() || DEFAULT_SUBFOLDER[mode]
    return sourceDir.replace(/\\/g, '/') + '/' + name
  }, [saveMode, subfolderName, sourceDir, mode])

  const handleStart = useCallback(async () => {
    if (filePaths.length === 0) return
    const outputDir = getOutputDir()

    setIsProcessing(true)
    setProgress(null)
    setResults(null)

    try {
      let res: BatchResult[]
      switch (mode) {
        case 'resize':
          res = await window.api.batchResize({
            filePaths,
            ...(resizeMode === 'percent'
              ? { percent }
              : { width: width || undefined, height: height || undefined }),
            fit,
            outputDir
          })
          break
        case 'transform':
          res = await window.api.batchTransform({
            filePaths,
            rotate: rotate || undefined,
            flipH: flipH || undefined,
            flipV: flipV || undefined,
            outputDir
          })
          break
        case 'convert':
          res = await window.api.batchConvert({
            filePaths,
            outputFormat: format,
            quality,
            outputDir
          })
          break
      }
      setResults(res)
      onComplete?.()
    } catch (err) {
      setResults([{ file: 'error', success: false, error: (err as Error).message }])
    } finally {
      setIsProcessing(false)
    }
  }, [filePaths, mode, getOutputDir, resizeMode, percent, width, height, fit, rotate, flipH, flipV, format, quality, onComplete])

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onOpenChange(false)
    }
  }, [isProcessing, onOpenChange])

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0
  const isLossy = (LOSSY_FORMATS as readonly string[]).includes(format)
  const hasTransformOption = rotate !== 0 || flipH || flipV

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{MODE_TITLES[mode]}</DialogTitle>
          <DialogDescription>{filePaths.length}개 이미지 선택됨</DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          {/* Mode-specific controls */}
          {mode === 'resize' && (
            <>
              {/* Resize mode tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  variant={resizeMode === 'percent' ? 'default' : 'outline'}
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={() => setResizeMode('percent')}
                  disabled={isProcessing}
                >
                  비율 (%)
                </Button>
                <Button
                  variant={resizeMode === 'pixel' ? 'default' : 'outline'}
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={() => setResizeMode('pixel')}
                  disabled={isProcessing}
                >
                  픽셀 (px)
                </Button>
              </div>

              {resizeMode === 'percent' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Label>크기 비율: {percent}%</Label>
                    <Slider
                      value={[percent]}
                      onValueChange={(v) => setPercent(v[0])}
                      min={5}
                      max={200}
                      step={5}
                      disabled={isProcessing}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[25, 50, 75, 100, 150].map((p) => (
                        <Button
                          key={p}
                          variant={percent === p ? 'default' : 'outline'}
                          size="sm"
                          style={{ flex: 1 }}
                          onClick={() => setPercent(p)}
                          disabled={isProcessing}
                        >
                          {p}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Label>가로 (px)</Label>
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                        min={1}
                        disabled={isProcessing}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Label>세로 (px)</Label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                        min={1}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>맞춤 방식</Label>
                <Select value={fit} onValueChange={setFit} disabled={isProcessing}>
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
            </>
          )}

          {mode === 'transform' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>회전</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { angle: 90, label: '90°', icon: RotateCw },
                    { angle: 180, label: '180°', icon: RotateCw },
                    { angle: 270, label: '270°', icon: RotateCcw }
                  ].map(({ angle, label, icon: Icon }) => (
                    <Button
                      key={angle}
                      variant={rotate === angle ? 'default' : 'outline'}
                      size="sm"
                      style={{ flex: 1 }}
                      onClick={() => setRotate(rotate === angle ? 0 : angle)}
                      disabled={isProcessing}
                    >
                      <Icon className="h-4 w-4" style={{ marginRight: 4 }} />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>반전</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    variant={flipH ? 'default' : 'outline'}
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => setFlipH(!flipH)}
                    disabled={isProcessing}
                  >
                    <FlipHorizontal className="h-4 w-4" style={{ marginRight: 4 }} />
                    좌우 반전
                  </Button>
                  <Button
                    variant={flipV ? 'default' : 'outline'}
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => setFlipV(!flipV)}
                    disabled={isProcessing}
                  >
                    <FlipVertical className="h-4 w-4" style={{ marginRight: 4 }} />
                    상하 반전
                  </Button>
                </div>
              </div>
            </>
          )}

          {mode === 'convert' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>출력 포맷</Label>
                <Select value={format} onValueChange={setFormat} disabled={isProcessing}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Label>품질: {quality}%</Label>
                  <Slider
                    value={[quality]}
                    onValueChange={(v) => setQuality(v[0])}
                    min={1}
                    max={100}
                    step={1}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </>
          )}

          {/* Save mode */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-muted)'
            }}
          >
            <Label style={{ fontWeight: 600 }}>저장 위치</Label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <input
                type="radio"
                checked={saveMode === 'subfolder'}
                onChange={() => setSaveMode('subfolder')}
                disabled={isProcessing}
              />
              <span className="text-sm">하위 폴더에 저장</span>
            </label>
            {saveMode === 'subfolder' && (
              <Input
                value={subfolderName}
                onChange={(e) => setSubfolderName(e.target.value)}
                placeholder="폴더 이름"
                disabled={isProcessing}
                style={{ marginLeft: 24 }}
              />
            )}
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <input
                type="radio"
                checked={saveMode === 'overwrite'}
                onChange={() => setSaveMode('overwrite')}
                disabled={isProcessing}
              />
              <span className="text-sm">원본 덮어쓰기</span>
            </label>
            {saveMode === 'overwrite' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: 24,
                  color: '#f59e0b'
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14 }} />
                <span className="text-xs">원본 파일이 덮어씌워집니다</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {isProcessing && progress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Progress value={progressPercent} />
              <p className="text-xs text-muted-foreground" style={{ textAlign: 'center' }}>
                {progress.current} / {progress.total} - {progress.currentFile}
              </p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 120,
                overflowY: 'auto'
              }}
            >
              <p className="text-sm font-medium">
                완료: {results.filter((r) => r.success).length}/{results.length} 성공
              </p>
              {results
                .filter((r) => !r.success)
                .map((r, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {r.file}: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing} style={{ whiteSpace: 'nowrap' }}>
            {results ? '닫기' : '취소'}
          </Button>
          {!results && (
            <Button
              onClick={handleStart}
              disabled={
                isProcessing ||
                filePaths.length === 0 ||
                (mode === 'transform' && !hasTransformOption)
              }
              style={{ whiteSpace: 'nowrap' }}
            >
              {isProcessing ? '처리 중...' : '시작'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
