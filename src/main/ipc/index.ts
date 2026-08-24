import { registerImageIOHandlers } from './image-io'
import { registerImageProcessHandlers } from './image-process'
import { registerBatchHandlers } from './image-batch'
import { registerFolderNavHandlers } from './folder-nav'
import { registerScreenCaptureHandlers } from './screen-capture'
import { registerImageHistoryHandlers } from './image-history'
import { registerAppUpdateHandlers } from './app-update'

export function registerAllHandlers(): void {
  registerImageIOHandlers()
  registerImageProcessHandlers()
  registerBatchHandlers()
  registerFolderNavHandlers()
  registerScreenCaptureHandlers()
  registerImageHistoryHandlers()
  registerAppUpdateHandlers()
}
