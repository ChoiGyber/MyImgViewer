import fs from 'node:fs'
import assert from 'node:assert/strict'
import { load } from 'js-yaml'

const electronConfig = load(fs.readFileSync('electron-builder.yml', 'utf8'))
const tauriConfig = JSON.parse(fs.readFileSync('tauri2/src-tauri/tauri.conf.json', 'utf8'))

const electronGroups = [
  ['jpg', 'jpeg', 'jpe', 'jfif', 'pjpeg', 'pjp'],
  ['png', 'apng'],
  ['webp'],
  ['avif'],
  ['tiff', 'tif'],
  ['gif'],
  ['bmp', 'dib'],
  ['svg'],
  ['ico'],
  ['heic', 'heics'],
  ['heif', 'heifs', 'hif']
]

const tauriGroups = [
  ...electronGroups,
  ['tga', 'targa'],
  ['pnm', 'pbm', 'pgm', 'ppm', 'pam'],
  ['qoi'],
  ['dds'],
  ['hdr'],
  ['exr'],
  ['ff', 'farbfeld']
]

function extSet(associations) {
  return new Set(
    associations.flatMap((association) =>
      Array.isArray(association.ext) ? association.ext : [association.ext]
    )
  )
}

function assertIncludesAll(actual, groups, label) {
  for (const group of groups) {
    for (const ext of group) {
      assert.ok(actual.has(ext), `${label} is missing .${ext}`)
    }
  }
}

assert.ok(Array.isArray(electronConfig.fileAssociations), 'Electron fileAssociations must be top-level/global')
assert.equal(electronConfig.win?.fileAssociations, undefined, 'Electron fileAssociations should not be Windows-only')
assert.equal(electronConfig.nsis?.perMachine, true, 'Electron NSIS install must be per-machine/global')
assertIncludesAll(extSet(electronConfig.fileAssociations), electronGroups, 'Electron file association')

const tauriAssociations = tauriConfig.bundle?.fileAssociations
assert.ok(Array.isArray(tauriAssociations), 'Tauri bundle.fileAssociations must be configured')
assert.equal(
  tauriConfig.bundle?.windows?.nsis?.installMode,
  'perMachine',
  'Tauri NSIS install must be per-machine/global'
)
assertIncludesAll(extSet(tauriAssociations), tauriGroups, 'Tauri file association')

console.log('File association configuration is global for Electron and Tauri.')
