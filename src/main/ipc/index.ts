import { registerImageIOHandlers } from './image-io'
import { registerImageProcessHandlers } from './image-process'
import { registerBatchHandlers } from './image-batch'
import { registerFolderNavHandlers } from './folder-nav'

export function registerAllHandlers(): void {
  registerImageIOHandlers()
  registerImageProcessHandlers()
  registerBatchHandlers()
  registerFolderNavHandlers()
}
