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

  // Capture a specific window by source ID
  ipcMain.handle('capture:captureWindow', async (_e, sourceId: string) => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    const source = sources.find((s) => s.id === sourceId)
    if (!source) throw new Error('소스를 찾을 수 없습니다')

    // Get high-res capture via a hidden window
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!win) throw new Error('윈도우를 찾을 수 없습니다')

    // Use the main window's webContents to capture the source via getUserMedia
    const image = await win.webContents.executeJavaScript(`
      (async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: '${sourceId}',
              maxWidth: 3840,
              maxHeight: 2160
            }
          }
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        stream.getTracks().forEach(t => t.stop());
        return canvas.toDataURL('image/jpeg', 0.95);
      })()
    `)

    // Convert data URL to buffer
    const base64 = image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    return { buffer: buffer.toJSON(), width: 0, height: 0 }
  })

  // Capture entire screen for rectangle selection
  ipcMain.handle('capture:captureScreen', async () => {
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

    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!win) throw new Error('윈도우를 찾을 수 없습니다')

    const sourceId = sources[0].id
    const dataUrl: string = await win.webContents.executeJavaScript(`
      (async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: '${sourceId}',
              maxWidth: ${Math.floor(width * scaleFactor)},
              maxHeight: ${Math.floor(height * scaleFactor)}
            }
          }
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        stream.getTracks().forEach(t => t.stop());
        return canvas.toDataURL('image/png');
      })()
    `)

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
}
