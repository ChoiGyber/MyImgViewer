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
      throw new Error(`Unexpected dependency in folder batch logic: ${id}`)
    }
  }
  vm.runInNewContext(js, context, { filename: filePath })
  return context.module.exports
}

const items = [
  { filePath: 'C:/images', fileName: 'images', thumbnail: '', type: 'folder' },
  { filePath: 'C:/images/a.heic', fileName: 'a.heic', thumbnail: 'thumb', type: 'image' },
  { filePath: 'C:/images/b.png', fileName: 'b.png', thumbnail: 'thumb', type: 'image' },
  { filePath: 'C:/images/doc.pdf', fileName: 'doc.pdf', thumbnail: '', type: 'pdf' }
]

for (const filePath of ['src/renderer/src/lib/folder-batch.ts', 'tauri2/src/lib/folder-batch.ts']) {
  const mod = loadTsModule(filePath)
  assert.deepEqual(
    mod.getFolderImagePaths(items),
    ['C:/images/a.heic', 'C:/images/b.png'],
    `${filePath}: folder-wide batch should include only images`
  )
  assert.equal(
    mod.getFolderBatchLabel('convert', 2),
    '폴더 전체 포맷변환 (2개)',
    `${filePath}: convert label should describe whole-folder action`
  )
}

console.log('Folder-wide batch action logic verified.')
