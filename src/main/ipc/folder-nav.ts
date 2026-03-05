import { ipcMain, shell } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.gif', '.bmp', '.svg', '.heic', '.heif']


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
        .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
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
        } else if (IMAGE_EXTENSIONS.includes(ext)) {
          try {
            const buffer = fs.readFileSync(filePath)
            const thumbBuf = await sharp(buffer)
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
