import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home, Image, Download, FileText } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface TreeNode {
  name: string
  path: string
  children: TreeNode[] | null // null = not loaded yet
}

interface DirectoryTreeProps {
  rootPath: string | null
  currentPath: string | null
  onSelectFolder: (dirPath: string) => void
}

/** Parse a path into drive root segments, e.g. "E:\foo\bar" → ["E:\", "E:\foo", "E:\foo\bar"] */
function getAncestors(p: string): string[] {
  const normalized = p.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  const result: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const joined = parts.slice(0, i + 1).join('\\')
    result.push(i === 0 ? joined + '\\' : joined)
  }
  return result
}

/** Normalize path for comparison (lowercase, forward slashes, strip trailing slash) */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

export function DirectoryTree({
  rootPath,
  currentPath,
  onSelectFolder
}: DirectoryTreeProps): React.JSX.Element {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [childrenCache, setChildrenCache] = useState<Map<string, TreeNode[]>>(new Map())
  const [driveRoots, setDriveRoots] = useState<TreeNode[]>([])
  const [quickPaths, setQuickPaths] = useState<{
    home: string
    pictures: string
    downloads: string
    documents: string
  } | null>(null)
  const loadingRef = useRef<Set<string>>(new Set())

  // Load quick paths on mount
  useEffect(() => {
    window.api.getQuickPaths().then(setQuickPaths).catch(() => {})
  }, [])

  // Load drive roots on mount (Windows: list common drives)
  useEffect(() => {
    async function loadRoots(): Promise<void> {
      // Try common Windows drives
      const drives = ['C:\\', 'D:\\', 'E:\\', 'F:\\', 'G:\\']
      const available: TreeNode[] = []
      for (const d of drives) {
        try {
          const children = await window.api.listDirs(d)
          if (children !== null) {
            available.push({ name: d.replace('\\', ''), path: d, children: null })
          }
        } catch {
          // drive doesn't exist
        }
      }
      setDriveRoots(available)
    }
    loadRoots()
  }, [])

  // Auto-expand ancestors of currentPath
  useEffect(() => {
    if (!currentPath) return
    const ancestors = getAncestors(currentPath)
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const a of ancestors) {
        const key = normalizePath(a)
        if (!next.has(key)) {
          next.add(key)
          changed = true
        }
      }
      return changed ? next : prev
    })
    // Eagerly load children for each ancestor
    for (const a of ancestors) {
      loadChildren(a)
    }
  }, [currentPath])

  const loadChildren = useCallback(async (dirPath: string) => {
    const key = normalizePath(dirPath)
    if (loadingRef.current.has(key)) return
    loadingRef.current.add(key)
    try {
      const dirs = await window.api.listDirs(dirPath)
      const nodes: TreeNode[] = dirs.map((name: string) => ({
        name,
        path: dirPath.replace(/\\+$/, '') + '\\' + name,
        children: null
      }))
      setChildrenCache((prev) => {
        const next = new Map(prev)
        next.set(key, nodes)
        return next
      })
    } finally {
      loadingRef.current.delete(key)
    }
  }, [])

  const toggleExpand = useCallback(
    (dirPath: string) => {
      const key = normalizePath(dirPath)
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
          // Load children if not cached
          if (!childrenCache.has(key)) {
            loadChildren(dirPath)
          }
        }
        return next
      })
    },
    [childrenCache, loadChildren]
  )

  const handleClick = useCallback(
    (dirPath: string) => {
      onSelectFolder(dirPath)
    },
    [onSelectFolder]
  )

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element => {
    const key = normalizePath(node.path)
    const isExpanded = expandedDirs.has(key)
    const isActive = currentPath ? normalizePath(currentPath) === key : false
    const children = childrenCache.get(key)

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-0.5 cursor-pointer select-none hover:bg-accent rounded-sm ${
            isActive ? 'bg-accent text-accent-foreground font-medium' : ''
          }`}
          style={{ paddingLeft: depth * 16 + 4, paddingRight: 4, height: 28 }}
        >
          <button
            className="flex items-center justify-center w-5 h-5 shrink-0 hover:bg-accent rounded-sm"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand(node.path)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
            onClick={() => handleClick(node.path)}
            onDoubleClick={() => toggleExpand(node.path)}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span className="text-xs truncate">{node.name}</span>
          </button>
        </div>
        {isExpanded && children && (
          <div>
            {children.length === 0 ? (
              <div
                className="text-xs text-muted-foreground italic"
                style={{ paddingLeft: (depth + 1) * 16 + 24, height: 24, lineHeight: '24px' }}
              >
                (비어 있음)
              </div>
            ) : (
              children.map((child) => renderNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    )
  }

  const quickAccessItems = quickPaths
    ? [
        { icon: Home, label: '홈', path: quickPaths.home },
        { icon: Image, label: '갤러리', path: quickPaths.pictures },
        { icon: Download, label: '다운로드', path: quickPaths.downloads },
        { icon: FileText, label: '문서', path: quickPaths.documents }
      ]
    : []

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {/* Quick access */}
        {quickAccessItems.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">빠른 접근</div>
            {quickAccessItems.map((item) => (
              <button
                key={item.path}
                className="flex items-center gap-1.5 w-full text-left hover:bg-accent rounded-sm cursor-pointer"
                style={{ paddingLeft: 8, paddingRight: 4, height: 28 }}
                onClick={() => onSelectFolder(item.path)}
              >
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs truncate">{item.label}</span>
              </button>
            ))}
            <Separator className="my-1.5" />
          </>
        )}
        {driveRoots.map((root) => renderNode(root, 0))}
      </div>
    </ScrollArea>
  )
}
