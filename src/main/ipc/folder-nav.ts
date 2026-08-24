import { ipcMain, shell } from 'electron'
import sharp from 'sharp'
import heicConvert from 'heic-convert'
import * as path from 'path'
import * as fs from 'fs'
import { imageExtension, isHeifExtension, isImageFile } from '../image-formats'


export function registerFolderNavHandlers(): void {
  ipcMain.handle('folder:listDirs', async (_e, dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    } catch {
      return []
    }
  })

  ipcMain.handle('folder:list', async (_e, dirPath: string) => {
    try {
      const allFiles = fs.readdirSync(dirPath)
      const imageFiles = allFiles
        .filter((f) => isImageFile(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => path.join(dirPath, f))
      return imageFiles
    } catch {
      return []
    }
  })

  // Return folder contents with thumbnails (directories + images + PDFs)
  ipcMain.handle('folder:thumbnails', async (_e, dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      const results: { filePath: string; fileName: string; thumbnail: string; type: 'folder' | 'image' | 'pdf' }[] = []

      // 1) Subdirectories first
      const dirs = entries
        .filter((e) => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      for (const d of dirs) {
        results.push({
          filePath: path.join(dirPath, d.name),
          fileName: d.name,
          thumbnail: '',
          type: 'folder'
        })
      }

      // 2) Images + PDFs
      const files = entries
        .filter((e) => e.isFile())
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

      for (const f of files) {
        const ext = path.extname(f.name).toLowerCase()
        const filePath = path.join(dirPath, f.name)

        if (ext === '.pdf') {
          results.push({ filePath, fileName: f.name, thumbnail: '', type: 'pdf' })
        } else if (isImageFile(f.name)) {
          try {
            const buffer = fs.readFileSync(filePath)
            const input = isHeifExtension(imageExtension(filePath))
              ? Buffer.from(await heicConvert({ buffer, format: 'PNG' }))
              : buffer
            const thumbBuf = await sharp(input)
              .resize(120, 120, { fit: 'cover' })
              .jpeg({ quality: 60 })
              .toBuffer()
            const thumbnail = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`
            results.push({ filePath, fileName: f.name, thumbnail, type: 'image' })
          } catch {
            results.push({ filePath, fileName: f.name, thumbnail: '', type: 'image' })
          }
        }
      }

      return results
    } catch {
      return []
    }
  })

  ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
    await shell.openPath(filePath)
  })
}
