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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderOpen } from 'lucide-react'
import { FIT_OPTIONS } from '@/lib/constants'
import { useBatchProcessing } from '@/hooks/useBatchProcessing'

interface BatchResizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchResizeDialog({
  open,
  onOpenChange
}: BatchResizeDialogProps): React.JSX.Element {
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [outputDir, setOutputDir] = useState('')
  const [width, setWidth] = useState<number>(800)
  const [height, setHeight] = useState<number>(600)
  const [fit, setFit] = useState<string>('inside')

  const { isProcessing, progress, results, startBatchResize, reset } = useBatchProcessing()

  const handleSelectFiles = async (): Promise<void> => {
    const files = await window.api.openFiles()
    if (files.length > 0) {
      setFilePaths(files)
    }
  }

  const handleSelectOutput = async (): Promise<void> => {
    const dir = await window.api.openFolder()
    if (dir) {
      setOutputDir(dir)
    }
  }

  const handleStart = async (): Promise<void> => {
    if (filePaths.length === 0 || !outputDir) return
    await startBatchResize({
      filePaths,
      width: width || undefined,
      height: height || undefined,
      fit,
      outputDir
    })
  }

  const handleClose = (): void => {
    if (!isProcessing) {
      reset()
      setFilePaths([])
      setOutputDir('')
      onOpenChange(false)
    }
  }

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>일괄 크기 줄이기</DialogTitle>
          <DialogDescription>여러 이미지의 크기를 한 번에 줄입니다</DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          {/* File selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>이미지 파일</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="outline" size="sm" onClick={handleSelectFiles} disabled={isProcessing}>
                <FolderOpen className="h-4 w-4" style={{ marginRight: 4 }} />
                파일 선택
              </Button>
              <span className="text-sm text-muted-foreground">
                {filePaths.length > 0 ? `${filePaths.length}개 선택됨` : '선택된 파일 없음'}
              </span>
            </div>
          </div>

          {/* Output folder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>출력 폴더</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="outline" size="sm" onClick={handleSelectOutput} disabled={isProcessing}>
                <FolderOpen className="h-4 w-4" style={{ marginRight: 4 }} />
                폴더 선택
              </Button>
              <span className="text-sm text-muted-foreground" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {outputDir || '선택된 폴더 없음'}
              </span>
            </div>
          </div>

          {/* Size settings */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {results ? '닫기' : '취소'}
          </Button>
          {!results && (
            <Button
              onClick={handleStart}
              disabled={isProcessing || filePaths.length === 0 || !outputDir}
            >
              {isProcessing ? '처리 중...' : '시작'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
