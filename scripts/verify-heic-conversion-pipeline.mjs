import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import path from 'node:path'
import ts from 'typescript'
import sharp from 'sharp'

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText

  const exports = {}
  const context = {
    exports,
    module: { exports },
    require: (id) => {
      if (id === 'sharp') return sharp
      if (id === 'path') return path
      throw new Error(`Unexpected dependency in HEIC conversion logic: ${id}`)
    },
    Buffer
  }
  vm.runInNewContext(js, context, { filename: filePath })
  return context.module.exports
}

const mod = loadTsModule('src/main/image-conversion.ts')
const sourceHeic = Buffer.from('not-a-real-heic')
const pngFixture = await sharp({
  create: {
    width: 1,
    height: 1,
    channels: 4,
    background: { r: 20, g: 80, b: 160, alpha: 1 }
  }
}).png().toBuffer()

let decodeCalls = 0
const input = await mod.prepareSharpInputBuffer('photo.heic', sourceHeic, async (buffer, format) => {
  decodeCalls += 1
  assert.equal(buffer, sourceHeic)
  assert.equal(format, 'PNG')
  return pngFixture
})

assert.equal(decodeCalls, 1, 'HEIC inputs must be decoded before passing to sharp')
assert.deepEqual(input, pngFixture, 'HEIC input should become the decoded PNG buffer')
assert.equal(
  await mod.prepareSharpInputBuffer('photo.png', pngFixture, async () => {
    throw new Error('PNG input should not use the HEIC decoder')
  }),
  pngFixture,
  'non-HEIC input should pass through unchanged'
)

const jpg = await mod.convertImageBuffer({
  filePath: 'photo.heic',
  input: sourceHeic,
  outputFormat: 'jpeg',
  quality: 82,
  decodeHeic: async () => pngFixture
})
const png = await mod.convertImageBuffer({
  filePath: 'photo.heic',
  input: sourceHeic,
  outputFormat: 'png',
  quality: 82,
  decodeHeic: async () => pngFixture
})

assert.equal((await sharp(jpg).metadata()).format, 'jpeg', 'HEIC should convert to JPEG output')
assert.equal((await sharp(png).metadata()).format, 'png', 'HEIC should convert to PNG output')

console.log('Electron HEIC conversion pipeline verified.')
