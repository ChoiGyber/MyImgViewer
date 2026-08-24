import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

function assertJsonEqual(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)
}

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
      throw new Error(`Unexpected dependency in print layout logic: ${id}`)
    }
  }
  vm.runInNewContext(js, context, { filename: filePath })
  return context.module.exports
}

const image = {
  dataUrl: 'data:image/png;base64,AAAA',
  fileName: 'print <sample>.png',
  width: 600,
  height: 400
}

for (const filePath of ['src/renderer/src/lib/print-layout.ts', 'tauri2/src/lib/print-layout.ts']) {
  const mod = loadTsModule(filePath)
  assertJsonEqual(
    mod.normalizePrintOptions({ rotation: 91, scaleMode: 'bad', copies: 0 }),
    { rotation: 0, scaleMode: 'fitRatio', copies: 1 },
    `${filePath}: invalid print options should fall back to safe defaults`
  )
  assertJsonEqual(
    mod.normalizePrintOptions({ rotation: 270, scaleMode: 'actualSize', copies: 120 }),
    { rotation: 270, scaleMode: 'actualSize', copies: 99 },
    `${filePath}: copies should be clamped and valid options preserved`
  )

  const fitHtml = mod.buildPrintHtml(image, {
    rotation: 90,
    scaleMode: 'fitRatio',
    copies: 3
  })
  assert.equal(
    (fitHtml.match(/class="print-page/g) ?? []).length,
    3,
    `${filePath}: requested copies should create repeated print pages`
  )
  assert.ok(fitHtml.includes('rotate(90deg)'), `${filePath}: rotation should be applied`)
  assert.ok(fitHtml.includes('object-fit: contain'), `${filePath}: fitRatio should preserve aspect ratio`)
  assert.ok(fitHtml.includes('print &lt;sample&gt;.png'), `${filePath}: filename should be escaped`)

  const fillHtml = mod.buildPrintHtml(image, {
    rotation: 0,
    scaleMode: 'fillPaper',
    copies: 1
  })
  assert.ok(fillHtml.includes('object-fit: fill'), `${filePath}: fillPaper should fill the paper`)

  const actualHtml = mod.buildPrintHtml(image, {
    rotation: 0,
    scaleMode: 'actualSize',
    copies: 1
  })
  assert.ok(actualHtml.includes('width: 600px'), `${filePath}: actual size should use image pixel width`)
  assert.ok(actualHtml.includes('height: 400px'), `${filePath}: actual size should use image pixel height`)
}

console.log('Print layout logic verified.')
