import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { ImageInfo, FolderImages } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'

interface StatusBarProps {
  image: ImageInfo | null
  folderImages: FolderImages | null
  zoom: number
  onPrev: () => void
  onNext: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
}

export function StatusBar({
  image,
  folderImages,
  zoom,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom
}: StatusBarProps): React.JSX.Element {
  const hasPrev = folderImages ? folderImages.currentIndex > 0 : false
  const hasNext = folderImages ? folderImages.currentIndex < folderImages.files.length - 1 : false
  const positionText = folderImages
    ? `${folderImages.currentIndex + 1} / ${folderImages.files.length}`
    : ''

  return (
    <div className="flex items-center gap-2 py-1 border-t bg-background text-xs text-muted-foreground" style={{ paddingLeft: 12, paddingRight: 12 }}>
      {image ? (
        <>
          <span className="truncate max-w-[300px]" title={image.filePath}>
            {image.fileName}
          </span>
          <span className="text-border">|</span>
          <span>
            {image.width} x {image.height}
          </span>
          <span className="text-border">|</span>
          <span>{image.format.toUpperCase()}</span>
          <span className="text-border">|</span>
          <span>{formatFileSize(image.size)}</span>
        </>
      ) : (
        <span>이미지를 열어주세요</span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomOut}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <button
          className="text-xs min-w-[40px] text-center hover:text-foreground cursor-pointer bg-transparent border-none"
          onClick={onResetZoom}
        >
          {zoom}%
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomIn}>
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {folderImages && folderImages.files.length > 1 && (
        <>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onPrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="min-w-[50px] text-center">{positionText}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNext}
              disabled={!hasNext}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
