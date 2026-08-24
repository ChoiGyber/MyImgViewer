import sharp from 'sharp'
import * as path from 'path'

export type HeicDecodeFormat = 'PNG'
export type HeicDecoder = (buffer: Buffer, format: HeicDecodeFormat) => Promise<Buffer | Uint8Array>

const HEIC_EXTENSIONS = new Set(['heic', 'heif', 'hif', 'heics', 'heifs'])

export function isHeicPath(filePath: string): boolean {
  return HEIC_EXTENSIONS.has(path.extname(filePath).slice(1).toLowerCase())
}

export async function prepareSharpInputBuffer(
  filePath: string,
  input: Buffer,
  decodeHeic: HeicDecoder
): Promise<Buffer> {
  if (!isHeicPath(filePath)) return input
  return Buffer.from(await decodeHeic(input, 'PNG'))
}

export function applyOutputFormat(
  pipeline: sharp.Sharp,
  outputFormat: string,
  quality: number
): sharp.Sharp {
  switch (outputFormat) {
    case 'jpeg':
      return pipeline.jpeg({ quality })
    case 'png':
      return pipeline.png()
    case 'webp':
      return pipeline.webp({ quality })
    case 'avif':
      return pipeline.avif({ quality })
    case 'tiff':
      return pipeline.tiff()
    default:
      return pipeline
  }
}

export async function convertImageBuffer(options: {
  filePath: string
  input: Buffer
  outputFormat: string
  quality: number
  decodeHeic: HeicDecoder
}): Promise<Buffer> {
  const input = await prepareSharpInputBuffer(options.filePath, options.input, options.decodeHeic)
  return applyOutputFormat(sharp(input), options.outputFormat, options.quality).toBuffer()
}

export function outputExtensionForFormat(outputFormat: string): string {
  return outputFormat === 'jpeg' ? 'jpg' : outputFormat
}
