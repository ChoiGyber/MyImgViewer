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
  AppWindow,
  Square
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
  onCaptureWindow: () => void
  onCaptureRect: () => void
  onToggleTheme: () => void
  onToggleSidebar: () => void
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
  onCaptureWindow,
  onCaptureRect,
  onToggleTheme,
  onToggleSidebar
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

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <FolderOpen className="h-4 w-4 mr-1" />
            열기
          </Button>
        </TooltipTrigger>
        <TooltipContent>파일 열기 (Ctrl+O)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onConvert} disabled={!hasImage}>
            <RefreshCw className="h-4 w-4 mr-1" />
            변환
          </Button>
        </TooltipTrigger>
        <TooltipContent>포맷 변환</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onResize} disabled={!hasImage}>
            <Maximize className="h-4 w-4 mr-1" />
            크기조절
          </Button>
        </TooltipTrigger>
        <TooltipContent>크기 조절</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onRotateFlip} disabled={!hasImage}>
            <RotateCw className="h-4 w-4 mr-1" />
            회전/반전
          </Button>
        </TooltipTrigger>
        <TooltipContent>회전/반전</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onBatchResize}>
            <Layers className="h-4 w-4 mr-1" />
            일괄 크기줄이기
          </Button>
        </TooltipTrigger>
        <TooltipContent>여러 이미지 일괄 크기 줄이기</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureWindow}>
            <AppWindow className="h-4 w-4 mr-1" />
            창캡쳐
          </Button>
        </TooltipTrigger>
        <TooltipContent>창 캡쳐</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureRect}>
            <Square className="h-4 w-4 mr-1" />
            사각형캡쳐
          </Button>
        </TooltipTrigger>
        <TooltipContent>사각형 영역 캡쳐</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

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
