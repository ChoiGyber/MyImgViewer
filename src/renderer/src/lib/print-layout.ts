export type PrintRotation = 0 | 90 | 180 | 270
export type PrintScaleMode = 'fitRatio' | 'fillPaper' | 'actualSize'

export interface PrintImage {
  dataUrl: string
  fileName: string
  width: number
  height: number
}

export interface PrintOptions {
  rotation: PrintRotation
  scaleMode: PrintScaleMode
  copies: number
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  rotation: 0,
  scaleMode: 'fitRatio',
  copies: 1
}

export const PRINT_ROTATIONS: { value: PrintRotation; label: string }[] = [
  { value: 0, label: '회전 없음' },
  { value: 90, label: '오른쪽 90도' },
  { value: 180, label: '180도' },
  { value: 270, label: '왼쪽 90도' }
]

export const PRINT_SCALE_MODES: { value: PrintScaleMode; label: string }[] = [
  { value: 'fitRatio', label: '비율채우기' },
  { value: 'fillPaper', label: '용지 꽉 채우기' },
  { value: 'actualSize', label: '실제사이즈' }
]

function isPrintRotation(value: unknown): value is PrintRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

function isPrintScaleMode(value: unknown): value is PrintScaleMode {
  return value === 'fitRatio' || value === 'fillPaper' || value === 'actualSize'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function normalizePrintOptions(options: Partial<PrintOptions>): PrintOptions {
  const copies = Math.min(99, Math.max(1, Math.floor(Number(options.copies) || 1)))
  return {
    rotation: isPrintRotation(options.rotation) ? options.rotation : DEFAULT_PRINT_OPTIONS.rotation,
    scaleMode: isPrintScaleMode(options.scaleMode)
      ? options.scaleMode
      : DEFAULT_PRINT_OPTIONS.scaleMode,
    copies
  }
}

export function buildPrintHtml(image: PrintImage, rawOptions: Partial<PrintOptions>): string {
  const options = normalizePrintOptions(rawOptions)
  const title = escapeHtml(image.fileName)
  const dataUrl = escapeHtml(image.dataUrl)
  const pages = Array.from(
    { length: options.copies },
    () => `<section class="print-page mode-${options.scaleMode}">
      <img class="print-image" src="${dataUrl}" alt="${title}" />
    </section>`
  ).join('\n')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: auto; margin: 0; }
    html, body { margin: 0; width: 100%; min-height: 100%; background: #fff; }
    body { overflow: hidden; }
    .print-page {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      break-after: page;
      page-break-after: always;
    }
    .print-page:last-child { break-after: auto; page-break-after: auto; }
    .print-image {
      display: block;
      transform: rotate(${options.rotation}deg);
      transform-origin: center center;
    }
    .mode-fitRatio .print-image {
      max-width: 100vw;
      max-height: 100vh;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .mode-fillPaper .print-image {
      width: 100vw;
      height: 100vh;
      object-fit: fill;
    }
    .mode-actualSize .print-image {
      width: ${Math.max(1, Math.round(image.width))}px;
      height: ${Math.max(1, Math.round(image.height))}px;
      max-width: none;
      max-height: none;
      object-fit: contain;
    }
  </style>
</head>
<body>
${pages}
</body>
</html>`
}

export async function printImage(
  image: PrintImage,
  options: Partial<PrintOptions>
): Promise<void> {
  const iframe = document.createElement('iframe')
  iframe.title = 'print'
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '100vw'
  iframe.style.height = '100vh'
  iframe.style.border = '0'
  iframe.style.opacity = '0'

  document.body.appendChild(iframe)

  await new Promise<void>((resolve, reject) => {
    const printWindow = iframe.contentWindow
    const doc = printWindow?.document
    if (!printWindow || !doc) {
      reject(new Error('프린트 창을 만들 수 없습니다.'))
      return
    }

    iframe.onload = () => resolve()
    doc.open()
    doc.write(buildPrintHtml(image, options))
    doc.close()
  })

  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  window.setTimeout(() => iframe.remove(), 1000)
}
