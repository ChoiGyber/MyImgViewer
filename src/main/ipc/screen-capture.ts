import { ipcMain, desktopCapturer, clipboard, nativeImage, BrowserWindow, screen, app } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

function randomFileName(): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).substring(2, 6)
  return `capture_${ts}_${rand}.jpg`
}

export function registerScreenCaptureHandlers(): void {
  // Get window sources for window picker
  ipcMain.handle('capture:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 300, height: 200 }
    })
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL()
    }))
  })

  // Get screen sources for multi-monitor support
  ipcMain.handle('capture:getScreenSources', async () => {
    const displays = screen.getAllDisplays()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 }
    })
    return sources.map((s, i) => {
      const display = displays[i]
      return {
        id: s.id,
        name: display ? `모니터 ${i + 1} (${display.size.width}x${display.size.height})` : s.name,
        thumbnail: s.thumbnail.toDataURL(),
        displayId: display?.id,
        width: display?.size.width || 1920,
        height: display?.size.height || 1080,
        scaleFactor: display?.scaleFactor || 1
      }
    })
  })

  // Capture a specific window and save directly (uses desktopCapturer thumbnail at full resolution)
  ipcMain.handle('capture:captureWindowAndSave', async (_e, sourceId: string) => {
    // Re-fetch the source at high resolution
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 3840, height: 2160 }
    })
    const source = sources.find((s) => s.id === sourceId)
    if (!source) throw new Error('캡쳐할 창을 찾을 수 없습니다')

    const pngBuf = source.thumbnail.toPNG()
    const jpegBuf = await sharp(pngBuf).jpeg({ quality: 92 }).toBuffer()

    // Save to Screenshots folder
    const screenshotsDir = path.join(app.getPath('pictures'), 'Screenshots')
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
    const fileName = randomFileName()
    const filePath = path.join(screenshotsDir, fileName)
    fs.writeFileSync(filePath, jpegBuf)

    // Copy to clipboard
    const img = nativeImage.createFromBuffer(jpegBuf)
    clipboard.writeImage(img)

    return { filePath, screenshotsDir }
  })

  // Capture full screen and save directly
  ipcMain.handle('capture:captureFullScreenAndSave', async () => {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    const scaleFactor = primaryDisplay.scaleFactor

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.floor(width * scaleFactor),
        height: Math.floor(height * scaleFactor)
      }
    })
    if (sources.length === 0) throw new Error('스크린 소스를 찾을 수 없습니다')

    const pngBuf = sources[0].thumbnail.toPNG()
    const jpegBuf = await sharp(pngBuf).jpeg({ quality: 92 }).toBuffer()

    const screenshotsDir = path.join(app.getPath('pictures'), 'Screenshots')
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
    const fileName = randomFileName()
    const filePath = path.join(screenshotsDir, fileName)
    fs.writeFileSync(filePath, jpegBuf)

    const img = nativeImage.createFromBuffer(jpegBuf)
    clipboard.writeImage(img)

    return { filePath, screenshotsDir }
  })

  // Capture a specific screen for rectangle selection (supports multi-monitor)
  ipcMain.handle('capture:captureScreen', async (_e, screenSourceId?: string) => {
    const displays = screen.getAllDisplays()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 3840, height: 2160 }
    })

    if (sources.length === 0) throw new Error('스크린 소스를 찾을 수 없습니다')

    // Find the requested source or use primary
    let source = sources[0]
    let display = displays[0] || screen.getPrimaryDisplay()

    if (screenSourceId) {
      const found = sources.find((s) => s.id === screenSourceId)
      if (found) {
        source = found
        const idx = sources.indexOf(found)
        if (displays[idx]) display = displays[idx]
      }
    }

    const { width, height } = display.size
    const scaleFactor = display.scaleFactor

    // Re-fetch at exact resolution for the selected screen
    const hiResSources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.floor(width * scaleFactor),
        height: Math.floor(height * scaleFactor)
      }
    })

    const hiResSource = hiResSources.find((s) => s.id === source.id) || hiResSources[0]
    const dataUrl = hiResSource.thumbnail.toDataURL()

    return { dataUrl, screenWidth: width, screenHeight: height, scaleFactor }
  })

  // Save capture buffer to folder and copy to clipboard
  ipcMain.handle(
    'capture:saveAndCopy',
    async (
      _e,
      bufferData: { type: 'Buffer'; data: number[] } | number[],
      folderPath: string
    ) => {
      const buf = Buffer.from(
        Array.isArray(bufferData) ? bufferData : bufferData.data
      )

      // Ensure JPEG output via sharp
      const jpegBuf = await sharp(buf).jpeg({ quality: 92 }).toBuffer()

      // Save to folder
      const fileName = randomFileName()
      const filePath = path.join(folderPath, fileName)
      fs.writeFileSync(filePath, jpegBuf)

      // Copy to clipboard
      const img = nativeImage.createFromBuffer(jpegBuf)
      clipboard.writeImage(img)

      return filePath
    }
  )

  // Crop a region from a full-screen capture
  ipcMain.handle(
    'capture:cropAndSave',
    async (
      _e,
      dataUrl: string,
      rect: { x: number; y: number; width: number; height: number },
      folderPath: string
    ) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buf = Buffer.from(base64, 'base64')

      const cropped = await sharp(buf)
        .extract({
          left: Math.round(rect.x),
          top: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
        .jpeg({ quality: 92 })
        .toBuffer()

      const fileName = randomFileName()
      const filePath = path.join(folderPath, fileName)
      fs.writeFileSync(filePath, cropped)

      const img = nativeImage.createFromBuffer(cropped)
      clipboard.writeImage(img)

      return filePath
    }
  )

  // Get default screenshots folder (Windows: Pictures/Screenshots)
  ipcMain.handle('capture:getScreenshotsDir', () => {
    const screenshotsDir = path.join(app.getPath('pictures'), 'Screenshots')
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
    return screenshotsDir
  })

  // Quick access paths
  ipcMain.handle('capture:getQuickPaths', () => {
    return {
      home: app.getPath('home'),
      pictures: app.getPath('pictures'),
      downloads: app.getPath('downloads'),
      documents: app.getPath('documents')
    }
  })

  // Hide/show main window for rect capture
  ipcMain.handle('capture:hideMainWindow', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) win.hide()
  })

  ipcMain.handle('capture:showMainWindow', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.show()
      win.focus()
    }
  })

  // Fullscreen for rectangle capture overlay
  ipcMain.handle('capture:enterFullscreen', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.setFullScreen(true)
      win.show()
      win.focus()
    }
  })

  ipcMain.handle('capture:exitFullscreen', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.setFullScreen(false)
    }
  })
}
