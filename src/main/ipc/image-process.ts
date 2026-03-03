import { ipcMain } from 'electron'
import sharp from 'sharp'
import * as fs from 'fs'

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
}
