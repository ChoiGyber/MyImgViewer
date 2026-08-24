import { ipcMain, clipboard, nativeImage, shell } from 'electron'
import heicConvert from 'heic-convert'
import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { convertImageBuffer, prepareSharpInputBuffer } from '../image-conversion'

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

async function decodeHeic(buffer: Buffer, format: 'PNG'): Promise<Buffer> {
  return Buffer.from(await heicConvert({ buffer, format }))
}

export function registerImageProcessHandlers(): void {
  ipcMain.handle('image:convert', async (_e, options: ConvertOptions) => {
    const { filePath, outputFormat, quality, outputPath } = options
    const buffer = fs.readFileSync(filePath)
    const output = await convertImageBuffer({
      filePath,
      input: buffer,
      outputFormat,
      quality,
      decodeHeic
    })
    fs.writeFileSync(outputPath, output)
    return { success: true, outputPath }
  })

  ipcMain.handle('image:resize', async (_e, options: ResizeOptions) => {
    const { filePath, width, height, fit, outputPath } = options
    const buffer = fs.readFileSync(filePath)
    const input = await prepareSharpInputBuffer(filePath, buffer, decodeHeic)

    const output = await sharp(input)
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
    const input = await prepareSharpInputBuffer(filePath, buffer, decodeHeic)
    let pipeline = sharp(input)

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
    const input = await prepareSharpInputBuffer(filePath, buffer, decodeHeic)
    const png = await sharp(input).png().toBuffer()
    const img = nativeImage.createFromBuffer(png)
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
