import { contextBridge, ipcRenderer } from 'electron'

export type Api = typeof api

const api = {
  // Dialogs
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (
    defaultName: string,
    filters: { name: string; extensions: string[] }[]
  ): Promise<string | null> => ipcRenderer.invoke('dialog:saveFile', defaultName, filters),

  // Image loading
  loadImage: (filePath: string) => ipcRenderer.invoke('image:load', filePath),

  // Folder navigation
  getImages: (filePath: string) => ipcRenderer.invoke('folder:getImages', filePath),
  listFolder: (dirPath: string) => ipcRenderer.invoke('folder:list', dirPath),
  getFolderThumbnails: (dirPath: string) => ipcRenderer.invoke('folder:thumbnails', dirPath),
  listDirs: (dirPath: string): Promise<string[]> => ipcRenderer.invoke('folder:listDirs', dirPath),

  // Preview
  loadPdf: (filePath: string): Promise<string> => ipcRenderer.invoke('preview:loadPdf', filePath),

  // Shell
  openPath: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:openPath', filePath),

  // History (undo/redo)
  historyBeforeEdit: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('history:beforeEdit', filePath),
  historyUndo: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('history:undo', filePath),
  historyRedo: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('history:redo', filePath),

  // Image actions
  copyImageToClipboard: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('image:copyToClipboard', filePath),
  deleteImage: (filePath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('image:delete', filePath),

  // Image processing
  convert: (options: {
    filePath: string
    outputFormat: string
    quality: number
    outputPath: string
  }) => ipcRenderer.invoke('image:convert', options),

  resize: (options: {
    filePath: string
    width?: number
    height?: number
    fit: string
    outputPath: string
  }) => ipcRenderer.invoke('image:resize', options),

  transform: (options: {
    filePath: string
    rotate?: number
    flipH?: boolean
    flipV?: boolean
    outputPath: string
  }) => ipcRenderer.invoke('image:transform', options),

  // Batch
  batchResize: (options: {
    filePaths: string[]
    width?: number
    height?: number
    percent?: number
    fit: string
    outputDir: string
  }) => ipcRenderer.invoke('batch:resize', options),

  batchTransform: (options: {
    filePaths: string[]
    rotate?: number
    flipH?: boolean
    flipV?: boolean
    outputDir: string
  }) => ipcRenderer.invoke('batch:transform', options),

  batchConvert: (options: {
    filePaths: string[]
    outputFormat: string
    quality: number
    outputDir: string
  }) => ipcRenderer.invoke('batch:convert', options),

  onBatchProgress: (
    callback: (progress: { current: number; total: number; currentFile: string }) => void
  ) => {
    const handler = (_e: Electron.IpcRendererEvent, progress: { current: number; total: number; currentFile: string }): void => {
      callback(progress)
    }
    ipcRenderer.on('batch:progress', handler)
    return (): void => {
      ipcRenderer.removeListener('batch:progress', handler)
    }
  },

  // Screen capture
  getCaptureSources: (): Promise<{ id: string; name: string; thumbnail: string }[]> =>
    ipcRenderer.invoke('capture:getSources'),
  getScreenSources: (): Promise<{ id: string; name: string; thumbnail: string; displayId: number; width: number; height: number; scaleFactor: number }[]> =>
    ipcRenderer.invoke('capture:getScreenSources'),
  captureWindowAndSave: (sourceId: string): Promise<{ filePath: string; screenshotsDir: string }> =>
    ipcRenderer.invoke('capture:captureWindowAndSave', sourceId),
  captureFullScreenAndSave: (): Promise<{ filePath: string; screenshotsDir: string }> =>
    ipcRenderer.invoke('capture:captureFullScreenAndSave'),
  captureScreen: (screenSourceId?: string): Promise<{ dataUrl: string; screenWidth: number; screenHeight: number; scaleFactor: number }> =>
    ipcRenderer.invoke('capture:captureScreen', screenSourceId),
  saveCaptureToFolder: (buffer: number[], folderPath: string): Promise<string> =>
    ipcRenderer.invoke('capture:saveAndCopy', buffer, folderPath),
  cropAndSave: (
    dataUrl: string,
    rect: { x: number; y: number; width: number; height: number },
    folderPath: string
  ): Promise<string> => ipcRenderer.invoke('capture:cropAndSave', dataUrl, rect, folderPath),
  getScreenshotsDir: (): Promise<string> =>
    ipcRenderer.invoke('capture:getScreenshotsDir'),
  getQuickPaths: (): Promise<{ home: string; pictures: string; downloads: string; documents: string }> =>
    ipcRenderer.invoke('capture:getQuickPaths'),
  hideMainWindow: (): Promise<void> => ipcRenderer.invoke('capture:hideMainWindow'),
  showMainWindow: (): Promise<void> => ipcRenderer.invoke('capture:showMainWindow'),
  enterFullscreen: (): Promise<void> => ipcRenderer.invoke('capture:enterFullscreen'),
  exitFullscreen: (): Promise<void> => ipcRenderer.invoke('capture:exitFullscreen'),

  // File association
  onFileOpen: (callback: (filePath: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, filePath: string): void => {
      callback(filePath)
    }
    ipcRenderer.on('file:open', handler)
    return (): void => {
      ipcRenderer.removeListener('file:open', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
