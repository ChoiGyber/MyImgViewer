import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

function loadKeyboardShortcutsModule() {
  const source = fs.readFileSync('tauri2/src/hooks/useKeyboardShortcuts.ts', 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText

  const exports = {}
  let cleanup
  const listeners = new Map()

  class FakeInputElement {}
  class FakeTextAreaElement {}

  const context = {
    exports,
    module: { exports },
    HTMLInputElement: FakeInputElement,
    HTMLTextAreaElement: FakeTextAreaElement,
    window: {
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type, listener) => {
        if (listeners.get(type) === listener) listeners.delete(type)
      }
    },
    require: (id) => {
      if (id === 'react') {
        return {
          useEffect: (effect) => {
            cleanup = effect()
          }
        }
      }
      throw new Error(`Unexpected dependency while loading keyboard shortcuts: ${id}`)
    }
  }

  vm.runInNewContext(js, context, { filename: 'tauri2/src/hooks/useKeyboardShortcuts.ts' })

  return {
    module: context.module.exports,
    dispatchKeyDown: (event) => listeners.get('keydown')?.(event),
    inputTarget: () => new FakeInputElement(),
    cleanup: () => cleanup?.()
  }
}

function createActions(calls) {
  return {
    openFile: () => calls.push('openFile'),
    nextImage: () => calls.push('nextImage'),
    prevImage: () => calls.push('prevImage'),
    zoomIn: () => calls.push('zoomIn'),
    zoomOut: () => calls.push('zoomOut'),
    resetZoom: () => calls.push('resetZoom'),
    undo: () => calls.push('undo'),
    redo: () => calls.push('redo'),
    deleteImage: () => calls.push('deleteImage'),
    reload: () => calls.push('reload'),
    printImage: () => calls.push('printImage')
  }
}

const { module, dispatchKeyDown, inputTarget, cleanup } = loadKeyboardShortcutsModule()
const calls = []
let prevented = false

module.useKeyboardShortcuts(createActions(calls))

dispatchKeyDown({
  ctrlKey: true,
  key: 'p',
  target: {},
  preventDefault: () => {
    prevented = true
  }
})

assert.equal(prevented, true, 'Ctrl+P should prevent the browser print shortcut')
assert.deepEqual(calls, ['printImage'], 'Ctrl+P should open the image print dialog')

dispatchKeyDown({
  ctrlKey: true,
  key: 'p',
  target: inputTarget(),
  preventDefault: () => calls.push('preventedFromInput')
})

assert.deepEqual(calls, ['printImage'], 'Ctrl+P should not trigger while typing in inputs')

cleanup()

console.log('Tauri keyboard shortcuts verified.')
