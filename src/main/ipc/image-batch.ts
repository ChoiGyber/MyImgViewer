import { ipcMain, BrowserWindow } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

interface BatchResizeOptions {
  filePaths: string[]
  width?: number
  height?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  outputDir: string
}

export function registerBatchHandlers(): void {
  ipcMain.handle('batch:resize', async (event, options: BatchResizeOptions) => {
    const { filePaths, width, height, fit, outputDir } = options

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const win = BrowserWindow.fromWebContents(event.sender)
    const total = filePaths.length
    const results: { file: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = path.basename(filePath)

      win?.webContents.send('batch:progress', {
        current: i + 1,
        total,
        currentFile: fileName
      })

      try {
        const buffer = fs.readFileSync(filePath)
        const output = await sharp(buffer)
          .resize({
            width: width || undefined,
            height: height || undefined,
            fit
          })
          .toBuffer()

        const outputPath = path.join(outputDir, fileName)
        fs.writeFileSync(outputPath, output)
        results.push({ file: fileName, success: true })
      } catch (err) {
        results.push({ file: fileName, success: false, error: (err as Error).message })
      }
    }

    return results
  })
}
