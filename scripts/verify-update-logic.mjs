import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText

  const exports = {}
  const context = {
    exports,
    module: { exports },
    require: (id) => {
      throw new Error(`Unexpected dependency in update logic: ${id}`)
    }
  }
  vm.runInNewContext(js, context, { filename: filePath })
  return context.module.exports
}

for (const filePath of ['src/main/update-info.ts', 'tauri2/src/lib/update.ts']) {
  const mod = loadTsModule(filePath)
  assert.equal(mod.isNewerVersion('1.2.1', '1.2.0'), true, `${filePath}: patch update`)
  assert.equal(mod.isNewerVersion('v2.0.0', '1.9.9'), true, `${filePath}: v-prefixed major update`)
  assert.equal(mod.isNewerVersion('1.2.0', '1.2.0'), false, `${filePath}: same version`)
  assert.equal(mod.isNewerVersion('1.2.0-beta.1', '1.2.0'), false, `${filePath}: prerelease is not newer`)
  assert.equal(
    mod.normalizeReleaseNotes('## 변경\n\n- SVG 지원\n- HEIC 지원'),
    '변경\n\n- SVG 지원\n- HEIC 지원',
    `${filePath}: markdown heading cleanup`
  )
}

console.log('Update version and release-note logic verified.')
