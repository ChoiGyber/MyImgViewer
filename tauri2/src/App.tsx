import { useState, useMemo, useCallback, useEffect } from 'react'
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
import { BatchProcessDialog } from '@/components/dialogs/BatchProcessDialog'
import { RotateFlipPanel } from '@/components/dialogs/RotateFlipPanel'
import { PrintDialog } from '@/components/dialogs/PrintDialog'
import { UpdateDialog } from '@/components/dialogs/UpdateDialog'
import { WindowPicker } from '@/components/capture/WindowPicker'
import { ScreenPicker } from '@/components/capture/ScreenPicker'
import { RectangleCapture } from '@/components/capture/RectangleCapture'
import { useImageViewer } from '@/hooks/useImageViewer'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTheme } from '@/hooks/useTheme'
import {
  openFolderDialog,
  imageTransform,
  imageResize,
  imageLoad,
  imageCopyToClipboard,
  imageDelete,
  historyBeforeEdit,
  historyUndo,
  historyRedo,
  captureFullScreenAndSave,
  captureWindowAndSave,
  captureScreen,
  captureCropAndSave,
  getScreenshotsDir,
  hideMainWindow,
  showMainWindow,
  enterFullscreen,
  exitFullscreen,
  checkForUpdates,
  openUpdateRelease
} from '@/lib/api'
import type { UpdateInfo } from '@/lib/types'

function App(): React.JSX.Element {
  const viewer = useImageViewer()
  const { isDark, toggle: toggleTheme } = useTheme()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [convertOpen, setConvertOpen] = useState(false)
  const [resizeOpen, setResizeOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [batchProcessOpen, setBatchProcessOpen] = useState(false)
  const [batchProcessMode, setBatchProcessMode] = useState<'resize' | 'transform' | 'convert'>('resize')
  const [batchProcessFiles, setBatchProcessFiles] = useState<string[]>([])
  const [windowPickerOpen, setWindowPickerOpen] = useState(false)
  const [screenPickerOpen, setScreenPickerOpen] = useState(false)
  const [rectCaptureData, setRectCaptureData] = useState<{
    dataUrl: string
    screenWidth: number
    screenHeight: number
    scaleFactor: number
  } | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateOpen, setUpdateOpen] = useState(false)

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

  const handleBreadcrumbNavigate = useCallback((dirPath: string) => {
    setFolderBrowserDir(dirPath)
    setFolderBrowserOpen(true)
  }, [])

  const handleOpenFolderDialog = useCallback(async () => {
    const dir = await openFolderDialog()
    if (dir) {
      setFolderBrowserDir(dir)
      setFolderBrowserOpen(true)
    }
  }, [])

  const handleDoubleClick = useCallback(() => {
    setFolderBrowserDir(null)
    setFolderBrowserOpen(true)
  }, [])

  const handleTreeSelect = useCallback((dirPath: string) => {
    setFolderBrowserDir(dirPath)
    setFolderBrowserOpen(true)
  }, [])

  const handleCaptureWindow = useCallback(
    async (sourceId: string) => {
      try {
        const result = await captureWindowAndSave(sourceId)
        await viewer.loadImage(result.filePath)
        setFolderBrowserDir(result.screenshotsDir)
        setFolderBrowserOpen(true)
      } catch (err) {
        alert(`캡쳐 실패: ${typeof err === 'string' ? err : (err as Error).message}`)
      }
    },
    [viewer.loadImage]
  )

  const handleCaptureFullScreen = useCallback(async () => {
    try {
      await hideMainWindow()
      await new Promise((r) => setTimeout(r, 300))
      const result = await captureFullScreenAndSave()
      await showMainWindow()
      await viewer.loadImage(result.filePath)
      setFolderBrowserDir(result.screenshotsDir)
      setFolderBrowserOpen(true)
    } catch (err) {
      await showMainWindow()
      alert(`캡쳐 실패: ${(err as Error).message}`)
    }
  }, [viewer.loadImage])

  const handleStartRectCapture = useCallback(() => {
    setScreenPickerOpen(true)
  }, [])

  const handleScreenSelected = useCallback(async (screenSourceId: string) => {
    try {
      await hideMainWindow()
      await new Promise((r) => setTimeout(r, 300))
      // Extract screen index from id like "screen:123"
      const idx = parseInt(screenSourceId.split(':')[1]) || 0
      const screenData = await captureScreen(idx)
      await enterFullscreen()
      await new Promise((r) => setTimeout(r, 200))
      setRectCaptureData(screenData)
    } catch (err) {
      await showMainWindow()
      alert(`캡쳐 실패: ${(err as Error).message}`)
    }
  }, [])

  const handleRectCapture = useCallback(
    async (rect: { x: number; y: number; width: number; height: number }) => {
      if (!rectCaptureData) return
      try {
        await exitFullscreen()
        const saveDir = await getScreenshotsDir()
        const savedPath = await captureCropAndSave(
          rectCaptureData.dataUrl,
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.width),
          Math.round(rect.height),
          saveDir
        )
        setRectCaptureData(null)
        await viewer.loadImage(savedPath)
        setFolderBrowserDir(saveDir)
        setFolderBrowserOpen(true)
      } catch (err) {
        await exitFullscreen()
        setRectCaptureData(null)
        alert(`캡쳐 저장 실패: ${(err as Error).message}`)
      }
    },
    [rectCaptureData, viewer.loadImage]
  )

  const handleRectCancel = useCallback(async () => {
    await exitFullscreen()
    setRectCaptureData(null)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  const handleRotateLeft = useCallback(async () => {
    if (!viewer.image) return
    try {
      await historyBeforeEdit(viewer.image.filePath)
      await imageTransform({
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
      await historyBeforeEdit(viewer.image.filePath)
      await imageTransform({
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
      await historyBeforeEdit(viewer.image.filePath)
      const newWidth = Math.round(viewer.image.width / 2)
      const newHeight = Math.round(viewer.image.height / 2)
      await imageResize({
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
    const result = await historyUndo(viewer.image.filePath)
    if (result) await viewer.reloadCurrent()
  }, [viewer.image, viewer.reloadCurrent])

  const handleRedo = useCallback(async () => {
    if (!viewer.image) return
    const result = await historyRedo(viewer.image.filePath)
    if (result) await viewer.reloadCurrent()
  }, [viewer.image, viewer.reloadCurrent])

  const handleCopyImage = useCallback(async () => {
    if (!viewer.image) return
    try {
      await imageCopyToClipboard(viewer.image.filePath)
    } catch (err) {
      alert(`복사 실패: ${(err as Error).message}`)
    }
  }, [viewer.image])

  const handleDeleteImage = useCallback(async () => {
    if (!viewer.image) return
    const ok = confirm(`"${viewer.image.fileName}"을(를) 휴지통으로 이동하시겠습니까?`)
    if (!ok) return
    try {
      await imageDelete(viewer.image.filePath)
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

  const handleReload = useCallback(async () => {
    const result = await viewer.reloadCurrent()
    if (result.fallbackDir) {
      // File was deleted - open folder browser at that directory
      setFolderBrowserDir(result.fallbackDir)
      setFolderBrowserOpen(true)
    }
  }, [viewer.reloadCurrent])

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
      deleteImage: handleDeleteImage,
      reload: handleReload
    }),
    [viewer.openFile, viewer.nextImage, viewer.prevImage, viewer.zoomIn, viewer.zoomOut, viewer.resetZoom, handleUndo, handleRedo, handleDeleteImage, handleReload]
  )
  useKeyboardShortcuts(shortcuts)

  useEffect(() => {
    let cancelled = false
    checkForUpdates()
      .then((info) => {
        if (cancelled || !info) return
        setUpdateInfo(info)
        setUpdateOpen(true)
      })
      .catch((err) => {
        console.warn('[update] check failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleOpenUpdateRelease = useCallback(async () => {
    if (!updateInfo) return
    await openUpdateRelease(updateInfo.releaseUrl)
  }, [updateInfo])

  const [folderRefreshKey, setFolderRefreshKey] = useState(0)
  const refreshFolderBrowser = useCallback(() => setFolderRefreshKey((k) => k + 1), [])

  const handleListRotateLeft = useCallback(async (filePath: string) => {
    try {
      await historyBeforeEdit(filePath)
      await imageTransform({ filePath, rotate: 270, outputPath: filePath })
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.reloadCurrent])

  const handleListRotateRight = useCallback(async (filePath: string) => {
    try {
      await historyBeforeEdit(filePath)
      await imageTransform({ filePath, rotate: 90, outputPath: filePath })
      refreshFolderBrowser()
      if (viewer.image?.filePath === filePath) await viewer.reloadCurrent()
    } catch (err) {
      alert(`회전 실패: ${(err as Error).message}`)
    }
  }, [refreshFolderBrowser, viewer.image, viewer.reloadCurrent])

  const handleListResize = useCallback(async (filePath: string) => {
    try {
      await historyBeforeEdit(filePath)
      const info = await imageLoad(filePath)
      await imageResize({
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

  const handleBatchAction = useCallback(
    (mode: 'resize' | 'transform' | 'convert', files: string[]) => {
      setBatchProcessMode(mode)
      setBatchProcessFiles(files)
      setBatchProcessOpen(true)
    },
    []
  )

  const handleListCopy = useCallback(async (filePath: string) => {
    try {
      await imageCopyToClipboard(filePath)
    } catch (err) {
      alert(`복사 실패: ${(err as Error).message}`)
    }
  }, [])

  const handleListDelete = useCallback(async (filePath: string) => {
    const fileName = filePath.replace(/\\/g, '/').split('/').pop() || filePath
    const ok = confirm(`"${fileName}"을(를) 휴지통으로 이동하시겠습니까?`)
    if (!ok) return
    try {
      await imageDelete(filePath)
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
            onCaptureFullScreen={handleCaptureFullScreen}
            onCaptureWindow={() => setWindowPickerOpen(true)}
            onCaptureRect={handleStartRectCapture}
            onPrint={() => setPrintOpen(true)}
            onToggleTheme={toggleTheme}
            onToggleSidebar={toggleSidebar}
            previewOpen={previewOpen}
            onTogglePreview={() => setPreviewOpen((v) => !v)}
            updateAvailable={!!updateInfo}
            onShowUpdate={() => setUpdateOpen(true)}
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
            onResize={() => setResizeOpen(true)}
            onCopy={handleCopyImage}
            onDelete={handleDeleteImage}
            onConvert={() => setConvertOpen(true)}
            onPrint={() => setPrintOpen(true)}
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
          onBatchAction={handleBatchAction}
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
          <PrintDialog
            open={printOpen}
            onOpenChange={setPrintOpen}
            image={viewer.image}
          />
        </>
      )}
      <BatchResizeDialog open={batchOpen} onOpenChange={setBatchOpen} />
      <BatchProcessDialog
        open={batchProcessOpen}
        onOpenChange={setBatchProcessOpen}
        mode={batchProcessMode}
        filePaths={batchProcessFiles}
        sourceDir={folderBrowserDir || folderPath}
        onComplete={refreshFolderBrowser}
      />
      <UpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        update={updateInfo}
        onOpenRelease={handleOpenUpdateRelease}
      />

      <WindowPicker
        open={windowPickerOpen}
        onOpenChange={setWindowPickerOpen}
        onCapture={handleCaptureWindow}
      />
      <ScreenPicker
        open={screenPickerOpen}
        onOpenChange={setScreenPickerOpen}
        onSelect={handleScreenSelected}
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
