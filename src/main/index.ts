import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.myimgviewer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Handle file association - open file passed as argument
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()

    const filePath = commandLine.find((arg) => {
      const ext = arg.toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.gif', '.bmp'].some((e) =>
        ext.endsWith(e)
      )
    })
    if (filePath) {
      mainWindow.webContents.send('file:open', filePath)
    }
  }
})

// Handle file passed via command line on first launch
app.on('ready', () => {
  const filePath = process.argv.find((arg) => {
    const ext = arg.toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.gif', '.bmp'].some((e) =>
      ext.endsWith(e)
    )
  })
  if (filePath && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow!.webContents.send('file:open', filePath)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
