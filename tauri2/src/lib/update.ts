export interface GitHubRelease {
  tag_name?: string
  name?: string | null
  body?: string | null
  html_url?: string
  published_at?: string | null
  draft?: boolean
  prerelease?: boolean
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  releaseUrl: string
  publishedAt: string | null
}

export const GITHUB_RELEASE_API =
  'https://api.github.com/repos/ChoiGyber/MyImgViewer/releases/latest'

function cleanVersion(version: string): string {
  return version.trim().replace(/^v/i, '').split('+')[0]
}

function parseVersion(version: string): { parts: number[]; prerelease: boolean } {
  const [core, prerelease] = cleanVersion(version).split('-', 2)
  const parts = core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  return {
    parts: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0],
    prerelease: Boolean(prerelease)
  }
}

export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const latest = parseVersion(latestVersion)
  if (latest.prerelease) return false

  const current = parseVersion(currentVersion)
  for (let i = 0; i < 3; i += 1) {
    if (latest.parts[i] > current.parts[i]) return true
    if (latest.parts[i] < current.parts[i]) return false
  }
  return false
}

export function normalizeReleaseNotes(body?: string | null): string {
  const text = (body ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return '릴리즈 노트가 없습니다.'
  return text
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').trimEnd())
    .join('\n')
    .trim()
}

export function createUpdateInfo(
  release: GitHubRelease,
  currentVersion: string
): UpdateInfo | null {
  if (release.draft || release.prerelease) return null
  const latestVersion = release.tag_name ?? ''
  if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) return null

  return {
    currentVersion,
    latestVersion,
    releaseName: release.name || latestVersion,
    releaseNotes: normalizeReleaseNotes(release.body),
    releaseUrl: release.html_url ?? 'https://github.com/ChoiGyber/MyImgViewer/releases',
    publishedAt: release.published_at ?? null
  }
}

export async function checkGitHubUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  const response = await fetch(GITHUB_RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' }
  })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`업데이트 확인 실패: ${response.status} ${response.statusText}`)
  }
  return createUpdateInfo((await response.json()) as GitHubRelease, currentVersion)
}
