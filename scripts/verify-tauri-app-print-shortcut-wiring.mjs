import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import React from 'react'
import jsxRuntime from 'react/jsx-runtime'
import ts from 'typescript'

const source = fs.readFileSync('tauri2/src/App.tsx', 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX
  }
}).outputText

let capturedShortcuts
const stateValues = []
const stateWrites = []

function useState(initialValue) {
  const index = stateValues.length
  stateValues.push(initialValue)
  return [
    initialValue,
    (nextValue) => {
      stateWrites.push({ index, nextValue })
      stateValues[index] =
        typeof nextValue === 'function' ? nextValue(stateValues[index]) : nextValue
    }
  ]
}

function componentStub() {
  return null
}

const viewer = {
  image: {
    dataUrl: 'data:image/png;base64,AAAA',
    fileName: 'sample.png',
    filePath: 'C:/sample.png',
    width: 100,
    height: 80
  },
  lastDir: 'C:/',
  folderImages: null,
  loading: false,
  error: null,
  zoom: 1,
  setZoom: () => undefined,
  openFile: () => undefined,
  nextImage: () => undefined,
  prevImage: () => undefined,
  zoomIn: () => undefined,
  zoomOut: () => undefined,
  resetZoom: () => undefined,
  loadImage: () => undefined,
  reloadCurrent: () => undefined,
  clearImage: () => undefined
}

const apiStubs = new Proxy(
  {},
  {
    get: () => async () => undefined
  }
)

const componentModules = new Proxy(
  {},
  {
    get: () => componentStub
  }
)

const exports = {}
const context = {
  exports,
  module: { exports },
  require: (id) => {
    if (id === 'react') {
      return {
        ...React,
        useState,
        useMemo: (factory) => factory(),
        useCallback: (callback) => callback,
        useEffect: () => undefined
      }
    }
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === '@/hooks/useImageViewer') return { useImageViewer: () => viewer }
    if (id === '@/hooks/useTheme')
      return { useTheme: () => ({ isDark: false, toggle: () => undefined }) }
    if (id === '@/hooks/useKeyboardShortcuts') {
      return {
        useKeyboardShortcuts: (actions) => {
          capturedShortcuts = actions
        }
      }
    }
    if (id === '@/lib/api') return apiStubs
    if (id === '@/lib/types') return {}
    if (id.startsWith('@/components/')) return componentModules
    throw new Error(`Unexpected dependency while loading App shortcut wiring: ${id}`)
  }
}

vm.runInNewContext(js, context, { filename: 'tauri2/src/App.tsx' })
context.module.exports.default()

assert.equal(
  typeof capturedShortcuts?.printImage,
  'function',
  'App should pass a printImage action to keyboard shortcuts'
)

capturedShortcuts.printImage()

assert.ok(
  stateWrites.some((write) => write.index === 4 && write.nextValue === true),
  'Ctrl+P print action should open the print dialog state'
)

console.log('Tauri App print shortcut wiring verified.')
