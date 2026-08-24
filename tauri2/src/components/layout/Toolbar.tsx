import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FolderOpen,
  RefreshCw,
  Maximize,
  RotateCw,
  Layers,
  Sun,
  Moon,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  AppWindow,
  Monitor,
  Square,
  Download,
  Printer
} from 'lucide-react'

interface ToolbarProps {
  hasImage: boolean
  isDark: boolean
  sidebarOpen: boolean
  onOpen: () => void
  onConvert: () => void
  onResize: () => void
  onRotateFlip: () => void
  onBatchResize: () => void
  onCaptureFullScreen: () => void
  onCaptureWindow: () => void
  onCaptureRect: () => void
  onPrint: () => void
  onToggleTheme: () => void
  onToggleSidebar: () => void
  previewOpen: boolean
  onTogglePreview: () => void
  updateAvailable?: boolean
  onShowUpdate?: () => void
}

export function Toolbar({
  hasImage,
  isDark,
  sidebarOpen,
  onOpen,
  onConvert,
  onResize,
  onRotateFlip,
  onBatchResize,
  onCaptureFullScreen,
  onCaptureWindow,
  onCaptureRect,
  onPrint,
  onToggleTheme,
  onToggleSidebar,
  previewOpen,
  onTogglePreview,
  updateAvailable,
  onShowUpdate
}: ToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 py-1.5 pr-4 border-b bg-background" style={{ paddingLeft: 10 }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSidebar}>
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-3" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <FolderOpen className="h-4 w-4" />
            열기
          </Button>
        </TooltipTrigger>
        <TooltipContent>파일 열기 (Ctrl+O)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-3" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onConvert} disabled={!hasImage}>
            <RefreshCw className="h-4 w-4" />
            변환
          </Button>
        </TooltipTrigger>
        <TooltipContent>포맷 변환</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onResize} disabled={!hasImage}>
            <Maximize className="h-4 w-4" />
            크기조절
          </Button>
        </TooltipTrigger>
        <TooltipContent>크기 조절</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onRotateFlip} disabled={!hasImage}>
            <RotateCw className="h-4 w-4" />
            회전/반전
          </Button>
        </TooltipTrigger>
        <TooltipContent>회전/반전</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-3" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onBatchResize}>
            <Layers className="h-4 w-4" />
            일괄 크기줄이기
          </Button>
        </TooltipTrigger>
        <TooltipContent>여러 이미지 일괄 크기 줄이기</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-3" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onPrint} disabled={!hasImage}>
            <Printer className="h-4 w-4" />
            프린트
          </Button>
        </TooltipTrigger>
        <TooltipContent>현재 이미지 프린트</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-3" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureFullScreen}>
            <Monitor className="h-4 w-4" />
            전체화면캡쳐
          </Button>
        </TooltipTrigger>
        <TooltipContent>전체 화면 캡쳐</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureWindow}>
            <AppWindow className="h-4 w-4" />
            창캡쳐
          </Button>
        </TooltipTrigger>
        <TooltipContent>실행 중인 창 캡쳐</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureRect}>
            <Square className="h-4 w-4" />
            사각형캡쳐
          </Button>
        </TooltipTrigger>
        <TooltipContent>사각형 영역 캡쳐</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {updateAvailable && onShowUpdate && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onShowUpdate}>
                <Download className="h-4 w-4" />
                업데이트
              </Button>
            </TooltipTrigger>
            <TooltipContent>새 버전 변경 내역 보기</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-2" />
        </>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onTogglePreview}>
            {previewOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            미리보기
          </Button>
        </TooltipTrigger>
        <TooltipContent>{previewOpen ? '미리보기 닫기' : '미리보기 열기'}</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isDark ? '라이트 모드' : '다크 모드'}</TooltipContent>
      </Tooltip>
    </div>
  )
}
