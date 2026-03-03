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
    fit: string
    outputDir: string
  }) => ipcRenderer.invoke('batch:resize', options),

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
