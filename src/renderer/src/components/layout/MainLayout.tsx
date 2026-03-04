import { type ReactNode, useState, useCallback, useRef } from 'react'

interface MainLayoutProps {
  toolbar: ReactNode
  directoryBar?: ReactNode
  sidebar?: ReactNode
  sidebarOpen?: boolean
  children: ReactNode
  statusBar: ReactNode
}

const SIDEBAR_DEFAULT = 220
const SIDEBAR_MIN = 150
const SIDEBAR_MAX = 400

export function MainLayout({
  toolbar,
  directoryBar,
  sidebar,
  sidebarOpen = false,
  children,
  statusBar
}: MainLayoutProps): React.JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startW.current = sidebarWidth

      const onMouseMove = (ev: MouseEvent): void => {
        if (!dragging.current) return
        const delta = ev.clientX - startX.current
        const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current + delta))
        setSidebarWidth(newW)
      }

      const onMouseUp = (): void => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [sidebarWidth]
  )

  return (
    <div className="flex flex-col h-screen w-screen">
      {toolbar}
      {directoryBar}
      <div className="flex-1 overflow-hidden relative flex">
        {sidebar && sidebarOpen && (
          <>
            <div
              className="h-full border-r bg-background flex flex-col shrink-0"
              style={{ width: sidebarWidth }}
            >
              {sidebar}
            </div>
            <div
              className="h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 shrink-0"
              onMouseDown={onMouseDown}
            />
          </>
        )}
        <div className="flex-1 overflow-hidden relative">{children}</div>
      </div>
      {statusBar}
    </div>
  )
}
