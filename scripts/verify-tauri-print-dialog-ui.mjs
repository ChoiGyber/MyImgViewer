import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import jsxRuntime from 'react/jsx-runtime'
import ts from 'typescript'

function loadTsModule(filePath, extraRequire = {}) {
  const source = fs.readFileSync(filePath, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText

  const exports = {}
  const context = {
    exports,
    module: { exports },
    require: (id) => {
      if (id in extraRequire) return extraRequire[id]
      throw new Error(`Unexpected dependency while rendering PrintDialog: ${id}`)
    }
  }
  vm.runInNewContext(js, context, { filename: filePath })
  return context.module.exports
}

function passthroughElement(tag) {
  return ({ children, ...props }) => React.createElement(tag, props, children)
}

function passthroughFragment({ children }) {
  return React.createElement(React.Fragment, null, children)
}

const printLayout = loadTsModule('tauri2/src/lib/print-layout.ts', {
  react: React,
  'react/jsx-runtime': jsxRuntime
})

const dialogStubs = {
  Dialog: ({ open, children }) =>
    open ? React.createElement(React.Fragment, null, children) : null,
  DialogContent: passthroughElement('section'),
  DialogDescription: passthroughElement('p'),
  DialogHeader: passthroughElement('header'),
  DialogTitle: passthroughElement('h2')
}

const selectStubs = {
  Select: passthroughFragment,
  SelectContent: passthroughElement('div'),
  SelectItem: passthroughElement('div'),
  SelectTrigger: passthroughElement('button'),
  SelectValue: () => React.createElement('span', null)
}

const { PrintDialog } = loadTsModule('tauri2/src/components/dialogs/PrintDialog.tsx', {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@/components/ui/dialog': dialogStubs,
  '@/components/ui/button': {
    Button: ({ children, variant, ...props }) =>
      React.createElement('button', { ...props, 'data-variant': variant ?? 'default' }, children)
  },
  '@/components/ui/input': {
    Input: (props) => React.createElement('input', props)
  },
  '@/components/ui/label': {
    Label: passthroughElement('label')
  },
  '@/components/ui/select': selectStubs,
  'lucide-react': {
    Printer: (props) => React.createElement('svg', props)
  },
  '@/lib/print-layout': printLayout
})

const html = renderToStaticMarkup(
  React.createElement(PrintDialog, {
    open: true,
    onOpenChange: () => undefined,
    image: {
      dataUrl: 'data:image/png;base64,AAAA',
      fileName: 'sample.png',
      filePath: 'C:/sample.png',
      width: 100,
      height: 80
    }
  })
)

function stripTags(value) {
  return value.replace(/<[^>]+>/g, '').trim()
}

function assertActionButtonHasHorizontalPadding(label) {
  const button = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)].find((match) =>
    stripTags(match[2]).includes(label)
  )
  assert.ok(button, `Print dialog should render a "${label}" button`)
  const attributes = button[1]
  assert.match(
    attributes,
    /style="[^"]*padding-left:5px[^"]*padding-right:5px/,
    `"${label}" button content should have 5px horizontal padding`
  )
}

assertActionButtonHasHorizontalPadding('취소')
assertActionButtonHasHorizontalPadding('프린트')

console.log('Tauri print dialog UI verified.')
