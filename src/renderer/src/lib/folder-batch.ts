export type FolderBatchMode = 'resize' | 'transform' | 'convert'

export interface FolderBatchItem {
  filePath: string
  type: 'folder' | 'image' | 'pdf'
}

const LABELS: Record<FolderBatchMode, string> = {
  resize: '크기조절',
  transform: '회전/반전',
  convert: '포맷변환'
}

export function getFolderImagePaths(items: readonly FolderBatchItem[]): string[] {
  return items.filter((item) => item.type === 'image').map((item) => item.filePath)
}

export function getFolderBatchLabel(mode: FolderBatchMode, count: number): string {
  return `폴더 전체 ${LABELS[mode]} (${count}개)`
}
