import { app, ipcMain, shell } from 'electron'
import { createUpdateInfo, GITHUB_RELEASE_API } from '../update-info'

function isAllowedReleaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      parsed.pathname.startsWith('/ChoiGyber/MyImgViewer/releases')
    )
  } catch {
    return false
  }
}

export function registerAppUpdateHandlers(): void {
  ipcMain.handle('app:checkForUpdates', async () => {
    const response = await fetch(GITHUB_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MyImgViewer'
      }
    })
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`업데이트 확인 실패: ${response.status} ${response.statusText}`)
    }
    return createUpdateInfo(await response.json(), app.getVersion())
  })

  ipcMain.handle('app:openUpdateRelease', async (_event, releaseUrl: string) => {
    const url = isAllowedReleaseUrl(releaseUrl)
      ? releaseUrl
      : 'https://github.com/ChoiGyber/MyImgViewer/releases'
    await shell.openExternal(url)
  })
}
