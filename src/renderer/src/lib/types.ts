export interface ImageInfo {
  filePath: string
  fileName: string
  width: number
  height: number
  format: string
  size: number // bytes
  dataUrl: string
}

export interface ConvertOptions {
  filePath: string
  outputFormat: string
  quality: number
  outputPath: string
}

export interface ResizeOptions {
  filePath: string
  width?: number
  height?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  outputPath: string
}

export interface TransformOptions {
  filePath: string
  rotate?: number // 0, 90, 180, 270
  flipH?: boolean
  flipV?: boolean
  outputPath: string
}

export interface BatchResizeOptions {
  filePaths: string[]
  width?: number
  height?: number
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  outputDir: string
}

export interface BatchProgress {
  current: number
  total: number
  currentFile: string
}

export interface FolderImages {
  files: string[]
  currentIndex: number
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  releaseUrl: string
  publishedAt: string | null
}
