import * as path from 'path'

export const IMAGE_FILE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'pjpeg',
  'pjp',
  'png',
  'apng',
  'webp',
  'avif',
  'tiff',
  'tif',
  'gif',
  'bmp',
  'dib',
  'svg',
  'ico',
  'heic',
  'heif',
  'hif',
  'heics',
  'heifs'
] as const

export const IMAGE_EXTENSIONS = IMAGE_FILE_EXTENSIONS.map((ext) => `.${ext}`)

export const IMAGE_FILTER = {
  name: '이미지 파일',
  extensions: [...IMAGE_FILE_EXTENSIONS]
}

export const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  pjp: 'image/jpeg',
  png: 'image/png',
  apng: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  gif: 'image/gif',
  bmp: 'image/bmp',
  dib: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  heic: 'image/heic',
  heics: 'image/heic',
  heif: 'image/heif',
  heifs: 'image/heif',
  hif: 'image/heif'
}

export function imageExtension(filePath: string): string {
  return path.extname(filePath).slice(1).toLowerCase()
}

export function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())
}

export function isHeifExtension(ext: string): boolean {
  return ['heic', 'heif', 'hif', 'heics', 'heifs'].includes(ext.toLowerCase())
}

export function shouldTranscodeForDisplay(ext: string): boolean {
  return ['tiff', 'tif', 'heic', 'heif', 'hif', 'heics', 'heifs'].includes(ext.toLowerCase())
}
