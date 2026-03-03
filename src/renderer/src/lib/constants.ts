export const OUTPUT_FORMATS = [
  { value: 'jpeg', label: 'JPEG (.jpg)' },
  { value: 'png', label: 'PNG (.png)' },
  { value: 'webp', label: 'WebP (.webp)' },
  { value: 'avif', label: 'AVIF (.avif)' },
  { value: 'tiff', label: 'TIFF (.tiff)' }
] as const

export const LOSSY_FORMATS = ['jpeg', 'webp', 'avif'] as const

export const RESIZE_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 }
] as const

export const FIT_OPTIONS = [
  { value: 'cover', label: '채우기 (Cover)' },
  { value: 'contain', label: '맞추기 (Contain)' },
  { value: 'fill', label: '늘리기 (Fill)' },
  { value: 'inside', label: '안쪽 (Inside)' },
  { value: 'outside', label: '바깥쪽 (Outside)' }
] as const

export const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.gif', '.bmp', '.svg'
]

export const IMAGE_FILTER = {
  name: '이미지 파일',
  extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg']
}
