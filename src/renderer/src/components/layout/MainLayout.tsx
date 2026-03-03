import type { ReactNode } from 'react'

interface MainLayoutProps {
  toolbar: ReactNode
  children: ReactNode
  statusBar: ReactNode
}

export function MainLayout({ toolbar, children, statusBar }: MainLayoutProps): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen w-screen">
      {toolbar}
      <div className="flex-1 overflow-hidden relative">{children}</div>
      {statusBar}
    </div>
  )
}
