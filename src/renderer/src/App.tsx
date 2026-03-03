import { useState, useMemo, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MainLayout } from '@/components/layout/MainLayout'
import { Toolbar } from '@/components/layout/Toolbar'
import { StatusBar } from '@/components/layout/StatusBar'
import { ImageCanvas } from '@/components/viewer/ImageCanvas'
import { DropZone } from '@/components/viewer/DropZone'
import { FolderBrowser } from '@/components/viewer/FolderBrowser'
import { ConvertDialog } from '@/components/dialogs/ConvertDialog'
import { ResizeDialog } from '@/components/dialogs/ResizeDialog'
import { BatchResizeDialog } from '@/components/dialogs/BatchResizeDialog'
import { RotateFlipPanel } from '@/components/dialogs/RotateFlipPanel'
import { useImageViewer } from '@/hooks/useImageViewer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTheme } from '@/hooks/useTheme'

function App(): React.JSX.Element {
  const viewer = useImageViewer()
  const { isDark, toggle: toggleTheme } = useTheme()

  const [convertOpen, setConvertOpen] = useState(false)
  const [resizeOpen, setResizeOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false)

  const shortcuts = useMemo(
    () => ({
      openFile: viewer.openFile,
      nextImage: viewer.nextImage,
      prevImage: viewer.prevImage,
      zoomIn: viewer.zoomIn,
      zoomOut: viewer.zoomOut,
      resetZoom: viewer.resetZoom
    }),
    [viewer.openFile, viewer.nextImage, viewer.prevImage, viewer.zoomIn, viewer.zoomOut, viewer.resetZoom]
  )
  useKeyboardShortcuts(shortcuts)

  // Get folder path from current image
  const folderPath = useMemo(() => {
    if (!viewer.image) return ''
    // Extract directory from file path
    const parts = viewer.image.filePath.replace(/\\/g, '/')
    const lastSlash = parts.lastIndexOf('/')
    return lastSlash >= 0 ? viewer.image.filePath.substring(0, lastSlash) : ''
  }, [viewer.image])

  const handleFolderSelect = useCallback(
    (filePath: string) => {
      viewer.loadImage(filePath)
    },
    [viewer.loadImage]
  )

  const handleDoubleClick = useCallback(() => {
    if (viewer.image) {
      setFolderBrowserOpen(true)
    }
  }, [viewer.image])

  return (
    <TooltipProvider delayDuration={300}>
      <MainLayout
        toolbar={
          <Toolbar
            hasImage={!!viewer.image}
            isDark={isDark}
            onOpen={viewer.openFile}
            onConvert={() => setConvertOpen(true)}
            onResize={() => setResizeOpen(true)}
            onRotateFlip={() => setRotateOpen(true)}
            onBatchResize={() => setBatchOpen(true)}
            onToggleTheme={toggleTheme}
          />
        }
        statusBar={
          <StatusBar
            image={viewer.image}
            folderImages={viewer.folderImages}
            zoom={viewer.zoom}
            onPrev={viewer.prevImage}
            onNext={viewer.nextImage}
            onZoomIn={viewer.zoomIn}
            onZoomOut={viewer.zoomOut}
            onResetZoom={viewer.resetZoom}
          />
        }
      >
        {viewer.image && (
          <ImageCanvas
            image={viewer.image}
            zoom={viewer.zoom}
            onZoomChange={viewer.setZoom}
            onDoubleClick={handleDoubleClick}
          />
        )}
        <DropZone
          hasImage={!!viewer.image}
          onDrop={viewer.loadImage}
          onOpen={viewer.openFile}
        />

        {/* Folder browser overlay */}
        <FolderBrowser
          open={folderBrowserOpen}
          onClose={() => setFolderBrowserOpen(false)}
          folderPath={folderPath}
          currentFilePath={viewer.image?.filePath || null}
          onSelect={handleFolderSelect}
        />

        {viewer.loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 40
            }}
          >
            <div className="text-sm text-muted-foreground">불러오는 중...</div>
          </div>
        )}
        {viewer.error && (
          <div
            className="text-sm"
            style={{
              position: 'absolute',
              bottom: 48,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--color-destructive)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 6,
              zIndex: 40
            }}
          >
            {viewer.error}
          </div>
        )}
      </MainLayout>

      {/* Dialogs */}
      {viewer.image && (
        <>
          <ConvertDialog
            open={convertOpen}
            onOpenChange={setConvertOpen}
            image={viewer.image}
            onReload={viewer.reloadCurrent}
          />
          <ResizeDialog
            open={resizeOpen}
            onOpenChange={setResizeOpen}
            image={viewer.image}
            onReload={viewer.reloadCurrent}
          />
          <RotateFlipPanel
            open={rotateOpen}
            onOpenChange={setRotateOpen}
            image={viewer.image}
            onReload={viewer.reloadCurrent}
          />
        </>
      )}
      <BatchResizeDialog open={batchOpen} onOpenChange={setBatchOpen} />
    </TooltipProvider>
  )
}

export default App
