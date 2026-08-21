import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronUp, FolderOpen, ChevronRight } from 'lucide-react'

interface DirectoryBarProps {
  currentPath: string
  onNavigate: (dirPath: string) => void
  onOpenFolder: () => void
}

function parseSegments(dirPath: string): { label: string; path: string }[] {
  const normalized = dirPath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)

  const segments: { label: string; path: string }[] = []
  for (let i = 0; i < parts.length; i++) {
    // On Windows, first part is drive like "E:" — rebuild with backslash paths
    const fullPath = parts.slice(0, i + 1).join('\\')
    segments.push({ label: parts[i], path: i === 0 ? fullPath + '\\' : fullPath })
  }
  return segments
}

function getParentDir(dirPath: string): string | null {
  const normalized = dirPath.replace(/\\/g, '/')
  const trimmed = normalized.replace(/\/+$/, '')
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash <= 0) return null
  // For "E:/foo" → "E:\"
  const parent = dirPath.substring(0, lastSlash)
  if (parent.match(/^[A-Za-z]:$/)) return parent + '\\'
  return parent
}

export function DirectoryBar({
  currentPath,
  onNavigate,
  onOpenFolder
}: DirectoryBarProps): React.JSX.Element | null {
  if (!currentPath) return null

  const segments = parseSegments(currentPath)
  const parentDir = getParentDir(currentPath)

  const handleParent = useCallback(() => {
    if (parentDir) onNavigate(parentDir)
  }, [parentDir, onNavigate])

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 text-sm"
      style={{ minHeight: 32 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleParent}
            disabled={!parentDir}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>상위 폴더</TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-0.5 flex-1 overflow-hidden">
        {segments.map((seg, i) => (
          <span key={seg.path} className="flex items-center gap-0.5 shrink-0">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            <button
              className="px-1.5 py-0.5 rounded hover:bg-accent text-xs font-medium truncate"
              onClick={() => onNavigate(seg.path)}
              title={seg.path}
            >
              {seg.label}
            </button>
          </span>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onOpenFolder}>
            <FolderOpen className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>폴더 열기</TooltipContent>
      </Tooltip>
    </div>
  )
}
