import { ipcMain, BrowserWindow } from 'electron'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

interface BatchResizeOptions {
  filePaths: string[]
  width?: number
  height?: number
  percent?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  outputDir: string
}

interface BatchTransformOptions {
  filePaths: string[]
  rotate?: number
  flipH?: boolean
  flipV?: boolean
  outputDir: string
}

interface BatchConvertOptions {
  filePaths: string[]
  outputFormat: string
  quality: number
  outputDir: string
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function sendProgress(
  event: Electron.IpcMainInvokeEvent,
  current: number,
  total: number,
  currentFile: string
): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.webContents.send('batch:progress', { current, total, currentFile })
}

export function registerBatchHandlers(): void {
  ipcMain.handle('batch:resize', async (event, options: BatchResizeOptions) => {
    const { filePaths, width, height, percent, fit, outputDir } = options
    ensureDir(outputDir)

    const total = filePaths.length
    const results: { file: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = path.basename(filePath)
      sendProgress(event, i + 1, total, fileName)

      try {
        const buffer = fs.readFileSync(filePath)
        let resizeOpts: sharp.ResizeOptions

        if (percent && percent > 0) {
          const meta = await sharp(buffer).metadata()
          const origW = meta.width || 100
          const origH = meta.height || 100
          resizeOpts = {
            width: Math.round(origW * percent / 100),
            height: Math.round(origH * percent / 100),
            fit
          }
        } else {
          resizeOpts = {
            width: width || undefined,
            height: height || undefined,
            fit
          }
        }

        const output = await sharp(buffer).resize(resizeOpts).toBuffer()
        const outputPath = path.join(outputDir, fileName)
        fs.writeFileSync(outputPath, output)
        results.push({ file: fileName, success: true })
      } catch (err) {
        results.push({ file: fileName, success: false, error: (err as Error).message })
      }
    }

    return results
  })

  ipcMain.handle('batch:transform', async (event, options: BatchTransformOptions) => {
    const { filePaths, rotate, flipH, flipV, outputDir } = options
    ensureDir(outputDir)

    const total = filePaths.length
    const results: { file: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = path.basename(filePath)
      sendProgress(event, i + 1, total, fileName)

      try {
        const buffer = fs.readFileSync(filePath)
        let pipeline = sharp(buffer)
        if (rotate && rotate !== 0) pipeline = pipeline.rotate(rotate)
        if (flipH) pipeline = pipeline.flop()
        if (flipV) pipeline = pipeline.flip()

        const output = await pipeline.toBuffer()
        const outputPath = path.join(outputDir, fileName)
        fs.writeFileSync(outputPath, output)
        results.push({ file: fileName, success: true })
      } catch (err) {
        results.push({ file: fileName, success: false, error: (err as Error).message })
      }
    }

    return results
  })

  ipcMain.handle('batch:convert', async (event, options: BatchConvertOptions) => {
    const { filePaths, outputFormat, quality, outputDir } = options
    ensureDir(outputDir)

    const total = filePaths.length
    const results: { file: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const baseName = path.basename(filePath, path.extname(filePath))
      const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat
      const outputFileName = `${baseName}.${ext}`
      sendProgress(event, i + 1, total, outputFileName)

      try {
        const buffer = fs.readFileSync(filePath)
        let pipeline = sharp(buffer)

        switch (outputFormat) {
          case 'jpeg':
            pipeline = pipeline.jpeg({ quality })
            break
          case 'png':
            pipeline = pipeline.png()
            break
          case 'webp':
            pipeline = pipeline.webp({ quality })
            break
          case 'avif':
            pipeline = pipeline.avif({ quality })
            break
          case 'tiff':
            pipeline = pipeline.tiff()
            break
        }

        const output = await pipeline.toBuffer()
        const outputPath = path.join(outputDir, outputFileName)
        fs.writeFileSync(outputPath, output)
        results.push({ file: outputFileName, success: true })
      } catch (err) {
        results.push({
          file: path.basename(filePath),
          success: false,
          error: (err as Error).message
        })
      }
    }

    return results
  })
}
