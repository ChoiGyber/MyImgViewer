import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'

// Dialog wrappers
export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    filters: [{ name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg'] }],
    multiple: false
  })
  return result as string | null
}

export async function openFilesDialog(): Promise<string[]> {
  const result = await open({
    filters: [{ name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg'] }],
    multiple: true
  })
  if (!result) return []
  return Array.isArray(result) ? result : [result]
}

export async function openFolderDialog(): Promise<string | null> {
  const result = await open({ directory: true })
  return result as string | null
}

export async function saveFileDialog(defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  const result = await save({ defaultPath: defaultName, filters })
  return result
}

// Image IO
export async function imageLoad(filePath: string) {
  return invoke<{
    filePath: string
    fileName: string
    width: number
    height: number
    format: string
    size: number
    dataUrl: string
  }>('image_load', { filePath })
}

export async function previewLoadPdf(filePath: string) {
  return invoke<string>('preview_load_pdf', { filePath })
}

export async function folderGetImages(filePath: string) {
  return invoke<{ files: string[]; currentIndex: number }>('folder_get_images', { filePath })
}

// Image Process
export async function imageConvert(options: { filePath: string; outputFormat: string; quality: number; outputPath: string }) {
  return invoke<{ success: boolean; outputPath: string }>('image_convert', { options })
}

export async function imageResize(options: { filePath: string; width?: number; height?: number; fit: string; outputPath: string }) {
  return invoke<{ success: boolean; outputPath: string }>('image_resize', { options })
}

export async function imageTransform(options: { filePath: string; rotate?: number; flipH?: boolean; flipV?: boolean; outputPath: string }) {
  return invoke<{ success: boolean; outputPath: string }>('image_transform', { options })
}

export async function imageCopyToClipboard(filePath: string) {
  return invoke<void>('image_copy_to_clipboard', { filePath })
}

export async function imageDelete(filePath: string) {
  return invoke<void>('image_delete', { filePath })
}

// Folder Nav
export async function folderListDirs(dirPath: string) {
  return invoke<string[]>('folder_list_dirs', { dirPath })
}

export async function folderList(dirPath: string) {
  return invoke<string[]>('folder_list', { dirPath })
}

export async function folderThumbnails(dirPath: string) {
  return invoke<{ filePath: string; fileName: string; thumbnail: string; type: 'folder' | 'image' | 'pdf' }[]>('folder_thumbnails', { dirPath })
}

export async function shellOpenPath(filePath: string) {
  return invoke<void>('shell_open_path', { filePath })
}

export async function getQuickPaths() {
  return invoke<{ home: string; pictures: string; downloads: string; documents: string }>('get_quick_paths')
}

export async function getScreenshotsDir() {
  return invoke<string>('get_screenshots_dir')
}

// Batch
export async function batchResize(options: {
  filePaths: string[]; width?: number; height?: number; percent?: number; fit: string; outputDir: string
}) {
  return invoke<{ file: string; success: boolean; error?: string }[]>('batch_resize', { options })
}

export async function batchTransform(options: {
  filePaths: string[]; rotate?: number; flipH?: boolean; flipV?: boolean; outputDir: string
}) {
  return invoke<{ file: string; success: boolean; error?: string }[]>('batch_transform', { options })
}

export async function batchConvert(options: {
  filePaths: string[]; outputFormat: string; quality: number; outputDir: string
}) {
  return invoke<{ file: string; success: boolean; error?: string }[]>('batch_convert', { options })
}

// History
export async function historyBeforeEdit(filePath: string) {
  return invoke<void>('history_before_edit', { filePath })
}

export async function historyUndo(filePath: string) {
  return invoke<boolean>('history_undo', { filePath })
}

export async function historyRedo(filePath: string) {
  return invoke<boolean>('history_redo', { filePath })
}

// Screen Capture
export async function captureGetSources() {
  return invoke<{ id: string; name: string; thumbnail: string; width: number; height: number }[]>('capture_get_sources')
}

export async function captureWindowAndSave(sourceId: string) {
  return invoke<{ filePath: string; screenshotsDir: string }>('capture_window_and_save', { sourceId })
}

export async function captureGetScreenSources() {
  return invoke<{ id: string; name: string; thumbnail: string; width: number; height: number }[]>('capture_get_screen_sources')
}

export async function captureFullScreenAndSave() {
  return invoke<{ filePath: string; screenshotsDir: string }>('capture_full_screen_and_save')
}

export async function captureScreen(screenIndex?: number) {
  return invoke<{ dataUrl: string; screenWidth: number; screenHeight: number; scaleFactor: number }>('capture_screen', { screenIndex })
}

export async function captureCropAndSave(dataUrl: string, x: number, y: number, width: number, height: number, folderPath: string) {
  return invoke<string>('capture_crop_and_save', { dataUrl, x, y, width, height, folderPath })
}

// Window control
export async function hideMainWindow() {
  await getCurrentWindow().hide()
}

export async function showMainWindow() {
  const win = getCurrentWindow()
  await win.show()
  await win.setFocus()
}

export async function enterFullscreen() {
  const win = getCurrentWindow()
  await win.setFullscreen(true)
  await win.show()
  await win.setFocus()
}

export async function exitFullscreen() {
  await getCurrentWindow().setFullscreen(false)
}

// File passed on first launch (file association / command line)
export async function getStartupFile() {
  return invoke<string | null>('get_startup_file')
}
