import { ipcMain, dialog } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.gif', '.bmp', '.svg', '.heic', '.heif']

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())
}

export function registerImageIOHandlers(): void {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg', 'heic', 'heif'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg', 'heic', 'heif'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (_e, defaultName: string, filters: Electron.FileFilter[]) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('image:load', async (_e, filePath: string) => {
    try {
      // Normalize path for Windows
      const normalizedPath = path.normalize(filePath)
      console.log('[image:load] Loading:', normalizedPath)

      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`파일이 존재하지 않습니다: ${normalizedPath}`)
      }

      const buffer = fs.readFileSync(normalizedPath)
      const stats = fs.statSync(normalizedPath)
      const ext = path.extname(normalizedPath).slice(1).toLowerCase()

      // Determine MIME type from extension
      const mimeMap: Record<string, string> = {
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        avif: 'image/avif',
        tiff: 'image/tiff',
        tif: 'image/tiff',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        heic: 'image/heic',
        heif: 'image/heif'
      }

      let width = 0
      let height = 0
      let format = ext

      try {
        const metadata = await sharp(buffer).metadata()
        width = metadata.width || 0
        height = metadata.height || 0
        format = metadata.format || ext
      } catch (sharpErr) {
        console.log('[image:load] Sharp metadata failed, using extension:', (sharpErr as Error).message)
      }

      // HEIC/HEIF: convert to JPEG for browser display
      const isHeic = ext === 'heic' || ext === 'heif'
      let dataUrl: string
      if (isHeic) {
        const jpegBuf = await sharp(buffer).jpeg({ quality: 92 }).toBuffer()
        dataUrl = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`
      } else {
        const mime = mimeMap[ext] || mimeMap[format] || 'image/png'
        dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
      }

      return {
        filePath: normalizedPath,
        fileName: path.basename(normalizedPath),
        width,
        height,
        format,
        size: stats.size,
        dataUrl
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[image:load] Error:', msg)
      throw new Error(`이미지를 불러올 수 없습니다: ${msg}`)
    }
  })

  ipcMain.handle('preview:loadPdf', async (_e, filePath: string) => {
    const normalizedPath = path.normalize(filePath)
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`파일이 존재하지 않습니다: ${normalizedPath}`)
    }
    const buffer = fs.readFileSync(normalizedPath)
    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  })

  ipcMain.handle('folder:getImages', async (_e, filePath: string) => {
    const dir = path.dirname(filePath)
    const allFiles = fs.readdirSync(dir)
    const imageFiles = allFiles
      .filter((f) => isImageFile(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => path.join(dir, f))

    // Windows paths are case-insensitive and may arrive with mixed separators
    const normalize = (p: string): string => path.normalize(p).toLowerCase()
    const target = normalize(filePath)
    const currentIndex = imageFiles.findIndex((f) => normalize(f) === target)
    return {
      files: imageFiles,
      currentIndex: currentIndex >= 0 ? currentIndex : 0
    }
  })
}
