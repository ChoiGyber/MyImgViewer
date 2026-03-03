import { ipcMain } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.gif', '.bmp', '.svg']

const mimeMap: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', avif: 'image/avif', tiff: 'image/tiff',
  tif: 'image/tiff', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp'
}

export function registerFolderNavHandlers(): void {
  ipcMain.handle('folder:list', async (_e, dirPath: string) => {
    try {
      const allFiles = fs.readdirSync(dirPath)
      const imageFiles = allFiles
        .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => path.join(dirPath, f))
      return imageFiles
    } catch {
      return []
    }
  })

  // Return folder images with small thumbnails
  ipcMain.handle('folder:thumbnails', async (_e, dirPath: string) => {
    try {
      const allFiles = fs.readdirSync(dirPath)
      const imageFiles = allFiles
        .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

      const results: { filePath: string; fileName: string; thumbnail: string }[] = []

      for (const f of imageFiles) {
        const filePath = path.join(dirPath, f)
        try {
          const buffer = fs.readFileSync(filePath)
          const thumbBuf = await sharp(buffer)
            .resize(120, 120, { fit: 'cover' })
            .jpeg({ quality: 60 })
            .toBuffer()
          const thumbnail = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`
          results.push({ filePath, fileName: f, thumbnail })
        } catch {
          // If sharp fails, use a placeholder based on extension
          const ext = path.extname(f).slice(1).toLowerCase()
          const mime = mimeMap[ext] || 'image/png'
          try {
            const raw = fs.readFileSync(filePath)
            const thumbnail = `data:${mime};base64,${raw.toString('base64').slice(0, 200)}`
            results.push({ filePath, fileName: f, thumbnail: '' })
          } catch {
            results.push({ filePath, fileName: f, thumbnail: '' })
          }
        }
      }

      return results
    } catch {
      return []
    }
  })
}
