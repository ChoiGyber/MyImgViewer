import { ipcMain, clipboard, nativeImage, shell } from 'electron'
import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

interface ConvertOptions {
  filePath: string
  outputFormat: string
  quality: number
  outputPath: string
}

interface ResizeOptions {
  filePath: string
  width?: number
  height?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  outputPath: string
}

interface TransformOptions {
  filePath: string
  rotate?: number
  flipH?: boolean
  flipV?: boolean
  outputPath: string
}

export function registerImageProcessHandlers(): void {
  ipcMain.handle('image:convert', async (_e, options: ConvertOptions) => {
    const { filePath, outputFormat, quality, outputPath } = options
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
    fs.writeFileSync(outputPath, output)
    return { success: true, outputPath }
  })

  ipcMain.handle('image:resize', async (_e, options: ResizeOptions) => {
    const { filePath, width, height, fit, outputPath } = options
    const buffer = fs.readFileSync(filePath)

    const output = await sharp(buffer)
      .resize({
        width: width || undefined,
        height: height || undefined,
        fit
      })
      .toBuffer()

    fs.writeFileSync(outputPath, output)
    return { success: true, outputPath }
  })

  ipcMain.handle('image:transform', async (_e, options: TransformOptions) => {
    const { filePath, rotate, flipH, flipV, outputPath } = options
    const buffer = fs.readFileSync(filePath)
    let pipeline = sharp(buffer)

    if (rotate && rotate !== 0) {
      pipeline = pipeline.rotate(rotate)
    }
    if (flipH) {
      pipeline = pipeline.flop()
    }
    if (flipV) {
      pipeline = pipeline.flip()
    }

    const output = await pipeline.toBuffer()
    fs.writeFileSync(outputPath, output)
    return { success: true, outputPath }
  })

  // Copy image to clipboard
  ipcMain.handle('image:copyToClipboard', async (_e, filePath: string) => {
    const buffer = fs.readFileSync(filePath)
    const img = nativeImage.createFromBuffer(buffer)
    clipboard.writeImage(img)
    return { success: true }
  })

  // Delete image file (move to trash)
  ipcMain.handle('image:delete', async (_e, filePath: string) => {
    const normalizedPath = path.resolve(filePath)
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`파일이 존재하지 않습니다: ${normalizedPath}`)
    }
    try {
      await shell.trashItem(normalizedPath)
    } catch {
      // Fallback: permanently delete if trash fails
      fs.unlinkSync(normalizedPath)
    }
    return { success: true }
  })
}
