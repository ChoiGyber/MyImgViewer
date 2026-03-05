import { useState, useMemo, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MainLayout } from '@/components/layout/MainLayout'
import { Toolbar } from '@/components/layout/Toolbar'
import { DirectoryBar } from '@/components/layout/DirectoryBar'
import { DirectoryTree } from '@/components/layout/DirectoryTree'
import { StatusBar } from '@/components/layout/StatusBar'
import { ImageCanvas } from '@/components/viewer/ImageCanvas'
import { DropZone } from '@/components/viewer/DropZone'
import { FolderBrowser } from '@/components/viewer/FolderBrowser'
import { ConvertDialog } from '@/components/dialogs/ConvertDialog'
import { ResizeDialog } from '@/components/dialogs/ResizeDialog'
import { BatchResizeDialog } from '@/components/dialogs/BatchResizeDialog'
import { RotateFlipPanel } from '@/components/dialogs/RotateFlipPanel'
import { WindowPicker } from '@/components/capture/WindowPicker'
import { RectangleCapture } from '@/components/capture/RectangleCapture'
import { useImageViewer } from '@/hooks/useImageViewer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTheme } from '@/hooks/useTheme'

function App(): React.JSX.Element {
  const viewer = useImageViewer()
  const { isDark, toggle: toggleTheme } = useTheme()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [convertOpen, setConvertOpen] = useState(false)
  const [resizeOpen, setResizeOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false)
  const [windowPickerOpen, setWindowPickerOpen] = useState(false)
  const [rectCaptureData, setRectCaptureData] = useState<{
    dataUrl: string
    screenWidth: number
    screenHeight: number
    scaleFactor: number
  } | null>(null)

  // Use current image dir, or fall back to lastDir from localStorage
  const folderPath = useMemo(() => {
    if (viewer.image) {
      const parts = viewer.image.filePath.replace(/\\/g, '/')
      const lastSlash = parts.lastIndexOf('/')
      return lastSlash >= 0 ? viewer.image.filePath.substring(0, lastSlash) : ''
    }
    return viewer.lastDir
  }, [viewer.image, viewer.lastDir])

  const handleFolderSelect = useCallback(
    (filePath: string) => {
      viewer.loadImage(filePath)
    },
    [viewer.loadImage]
  )

  const [folderBrowserDir, setFolderBrowserDir] = useState<string | null>(null)

  const handleBreadcrumbNavigate = useCallback(
    (dirPath: string) => {
      setFolderBrowserDir(dirPath)
      setFolderBrowserOpen(true)
    },
    []
  )

  const handleOpenFolderDialog = useCallback(async () => {
    const dir = await window.api.openFolder()
    if (dir) {
      setFolderBrowserDir(dir)
      setFolderBrowserOpen(true)
    }
  }, [])

  const handleDoubleClick = useCallback(() => {
    setFolderBrowserDir(null)
    setFolderBrowserOpen(true)
  }, [])

  const handleTreeSelect = useCallback(
    (dirPath: string) => {
      setFolderBrowserDir(dirPath)
      setFolderBrowserOpen(true)
    },
    []
  )

  const getSaveFolder = useCallback((): string => {
    if (folderPath) return folderPath
    return viewer.lastDir || ''
  }, [folderPath, viewer.lastDir])

  const handleCaptureWindow = useCallback(
    async (sourceId: string) => {
      try {
        const result = await window.api.captureWindow(sourceId)
        const saveDir = getSaveFolder()
        if (!saveDir) {
          alert('저장할 폴더가 없습니다. 먼저 폴더를 열어주세요.')
          return
        }
        const savedPath = await window.api.saveCaptureToFolder(result.buffer.data, saveDir)
        await viewer.loadImage(savedPath)
      } catch (err) {
        alert(`캡쳐 실패: ${(err as Error).message}`)
      }
    },
    [getSaveFolder, viewer.loadImage]
  )

  const handleStartRectCapture = useCallback(async () => {
    try {
      await window.api.hideMainWindow()
      // Small delay to let the window fully hide
      await new Promise((r) => setTimeout(r, 300))
      const screenData = await window.api.captureScreen()
      await window.api.showMainWindow()
      setRectCaptureData(screenData)
    } catch (err) {
      await window.api.showMainWindow()
      alert(`캡쳐 실패: ${(err as Error).message}`)
    }
  }, [])

  const handleRectCapture = useCallback(
    async (rect: { x: number; y: number; width: number; height: number }) => {
      if (!rectCaptureData) return
      try {
        const saveDir = getSaveFolder()
        if (!saveDir) {
          alert('저장할 폴더가 없습니다. 먼저 폴더를 열어주세요.')
          setRectCaptureData(null)
          return
        }
        const savedPath = await window.api.cropAndSave(rectCaptureData.dataUrl, rect, saveDir)
        setRectCaptureData(null)
        await viewer.loadImage(savedPath)
      } catch (err) {
        setRectCaptureData(null)
        alert(`캡쳐 저장 실패: ${(err as Error).message}`)
      }
    },
    [rectCaptureData, getSaveFolder, viewer.loadImage]
  )

  const handleRectCancel = useCallback(() => {
    setRectCaptureData(null)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  const handleRotateLeft = useCallback(async () => {
    if (!viewer.image) return
    try {
      await window.api.historyBeforeEdit(viewer.image.filePath)
      await window.api.transform({
        filePath: viewer.image.filePath,
        rotate: 270,
        outputPath: viewer.image.filePath
      })
      await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [viewer.image, viewer.reloadCurrent])

  const handleRotateRight = useCallback(async () => {
    if (!viewer.image) return
    try {
      await window.api.historyBeforeEdit(viewer.image.filePath)
      await window.api.transform({
        filePath: viewer.image.filePath,
        rotate: 90,
        outputPath: viewer.image.filePath
      })
      await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [viewer.image, viewer.reloadCurrent])

  const handleQuickResize = useCallback(async () => {
    if (!viewer.image) return
    try {
      await window.api.historyBeforeEdit(viewer.image.filePath)
      const newWidth = Math.round(viewer.image.width / 2)
      const newHeight = Math.round(viewer.image.height / 2)
      await window.api.resize({
        filePath: viewer.image.filePath,
        width: newWidth,
        height: newHeight,
        fit: 'inside',
        outputPath: viewer.image.filePath
      })
      await viewer.reloadCurrent()
    } catch (err) {
      alert(`크기 줄이기 실패: ${(err as Error).message}`)
    }
  }, [viewer.image, viewer.reloadCurrent])

  const handleUndo = useCallback(async () => {
    if (!viewer.image) return
    const result = await window.api.historyUndo(viewer.image.filePath)
    if (result.success) await viewer.reloadCurrent()
  }, [viewer.image, viewer.reloadCurrent])

  const handleRedo = useCallback(async () => {
    if (!viewer.image) return
    const result = await window.api.historyRedo(viewer.image.filePath)
    if (result.success) await viewer.reloadCurrent()
  }, [viewer.image, viewer.reloadCurrent])

  const handleCopyImage = useCallback(async () => {
    if (!viewer.image) return
    try {
      await window.api.copyImageToClipboard(viewer.image.filePath)
    } catch (err) {
      alert(`복사 실패: ${(err as Error).message}`)
    }
  }, [viewer.image])

  const handleDeleteImage = useCallback(async () => {
    if (!viewer.image) return
    const ok = confirm(`"${viewer.image.fileName}"을(를) 휴지통으로 이동하시겠습니까?`)
    if (!ok) return
    try {
      await window.api.deleteImage(viewer.image.filePath)
      // Load next or previous image, or clear
      if (viewer.folderImages && viewer.folderImages.files.length > 1) {
        const idx = viewer.folderImages.currentIndex
        const nextIdx = idx < viewer.folderImages.files.length - 1 ? idx + 1 : idx - 1
        const nextFile = viewer.folderImages.files[nextIdx]
        await viewer.loadImage(nextFile)
      } else {
        viewer.clearImage()
      }
    } catch (err) {
      alert(`삭제 실패: ${(err as Error).message}`)
    }
  }, [viewer.image, viewer.folderImages, viewer.loadImage, viewer.clearImage])

  const shortcuts = useMemo(
    () => ({
      openFile: viewer.openFile,
      nextImage: viewer.nextImage,
      prevImage: viewer.prevImage,
      zoomIn: viewer.zoomIn,
      zoomOut: viewer.zoomOut,
      resetZoom: viewer.resetZoom,
      undo: handleUndo,
      redo: handleRedo,
      deleteImage: handleDeleteImage
    }),
    [viewer.openFile, viewer.nextImage, viewer.prevImage, viewer.zoomIn, viewer.zoomOut, viewer.resetZoom, handleUndo, handleRedo, handleDeleteImage]
  )
  useKeyboardShortcuts(shortcuts)

  // FolderBrowser context menu: refresh counter to trigger re-fetch
  const [folderRefreshKey, setFolderRefreshKey] = useState(0)
  const refreshFolderBrowser = useCallback(() => setFolderRefreshKey((k) => k + 1), [])

  const handleListRotateLeft = useCallback(async (filePath: string) => {
    try {
      await window.api.historyBeforeEdit(filePath)
      await window.api.transform({ filePath, rotate: 270, outputPath: filePath })
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.reloadCurrent])

  const handleListRotateRight = useCallback(async (filePath: string) => {
    try {
      await window.api.historyBeforeEdit(filePath)
      await window.api.transform({ filePath, rotate: 90, outputPath: filePath })
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.reloadCurrent])

  const handleListResize = useCallback(async (filePath: string) => {
    try {
      await window.api.historyBeforeEdit(filePath)
      const info = await window.api.loadImage(filePath)
      await window.api.resize({
        filePath,
        width: Math.round(info.width / 2),
        height: Math.round(info.height / 2),
        fit: 'inside',
        outputPath: filePath
      })
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) await viewer.reloadCurrent()
    } catch (err) {
      alert(`크기 줄이기 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.reloadCurrent])

  const handleListCopy = useCallback(async (filePath: string) => {
    try {
      await window.api.copyImageToClipboard(filePath)
    } catch (err) {
      alert(`복사 실패: ${(err as Error).message}`)
    }
  }, [])

  const handleListDelete = useCallback(async (filePath: string) => {
    const fileName = filePath.replace(/\\/g, '/').split('/').pop() || filePath
    const ok = confirm(`"${fileName}"을(를) 휴지통으로 이동하시겠습니까?`)
    if (!ok) return
    try {
      await window.api.deleteImage(filePath)
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) {
        if (viewer.folderImages && viewer.folderImages.files.length > 1) {
          const idx = viewer.folderImages.currentIndex
          const nextIdx = idx < viewer.folderImages.files.length - 1 ? idx + 1 : idx - 1
          await viewer.loadImage(viewer.folderImages.files[nextIdx])
        } else {
          viewer.clearImage()
        }
      }
    } catch (err) {
      alert(`삭제 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.folderImages, viewer.loadImage])

  return (
    <TooltipProvider delayDuration={300}>
      <MainLayout
        toolbar={
          <Toolbar
            hasImage={!!viewer.image}
            isDark={isDark}
            sidebarOpen={sidebarOpen}
            onOpen={viewer.openFile}
            onConvert={() => setConvertOpen(true)}
            onResize={() => setResizeOpen(true)}
            onRotateFlip={() => setRotateOpen(true)}
            onBatchResize={() => setBatchOpen(true)}
            onCaptureWindow={() => setWindowPickerOpen(true)}
            onCaptureRect={handleStartRectCapture}
            onToggleTheme={toggleTheme}
            onToggleSidebar={toggleSidebar}
          />
        }
        directoryBar={
          folderPath ? (
            <DirectoryBar
              currentPath={folderPath}
              onNavigate={handleBreadcrumbNavigate}
              onOpenFolder={handleOpenFolderDialog}
            />
          ) : undefined
        }
        sidebar={
          <DirectoryTree
            rootPath={folderPath}
            currentPath={folderPath}
            onSelectFolder={handleTreeSelect}
          />
        }
        sidebarOpen={sidebarOpen}
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
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onResize={handleQuickResize}
            onCopy={handleCopyImage}
            onDelete={handleDeleteImage}
          />
        )}
        <DropZone
          hasImage={!!viewer.image}
          hasLastDir={!!viewer.lastDir}
          onDrop={viewer.loadImage}
          onOpen={viewer.openFile}
          onShowFolder={() => {
            setFolderBrowserDir(null)
            setFolderBrowserOpen(true)
          }}
        />

        {/* Folder browser overlay */}
        <FolderBrowser
          key={folderRefreshKey}
          open={folderBrowserOpen}
          onClose={() => {
            setFolderBrowserOpen(false)
            setFolderBrowserDir(null)
          }}
          folderPath={folderBrowserDir || folderPath}
          currentFilePath={viewer.image?.filePath || null}
          onSelect={handleFolderSelect}
          onNavigate={(dirPath) => setFolderBrowserDir(dirPath)}
          onRotateLeft={handleListRotateLeft}
          onRotateRight={handleListRotateRight}
          onResize={handleListResize}
          onCopy={handleListCopy}
          onDelete={handleListDelete}
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

      {/* Capture dialogs */}
      <WindowPicker
        open={windowPickerOpen}
        onOpenChange={setWindowPickerOpen}
        onCapture={handleCaptureWindow}
      />
      {rectCaptureData && (
        <RectangleCapture
          screenData={rectCaptureData}
          onCapture={handleRectCapture}
          onCancel={handleRectCancel}
        />
      )}
    </TooltipProvider>
  )
}

export default App
