import { ipcMain } from 'electron'
import * as fs from 'fs'

// In-memory undo/redo stacks per file
const undoStacks = new Map<string, Buffer[]>()
const redoStacks = new Map<string, Buffer[]>()

const MAX_HISTORY = 20

export function registerImageHistoryHandlers(): void {
  // Save current file state before an edit
  ipcMain.handle('history:beforeEdit', async (_e, filePath: string) => {
    const buffer = fs.readFileSync(filePath)
    const key = filePath.toLowerCase()

    if (!undoStacks.has(key)) undoStacks.set(key, [])
    const stack = undoStacks.get(key)!
    stack.push(buffer)
    if (stack.length > MAX_HISTORY) stack.shift()

    // Clear redo on new edit
    redoStacks.set(key, [])
    return { success: true }
  })

  ipcMain.handle('history:undo', async (_e, filePath: string) => {
    const key = filePath.toLowerCase()
    const undoStack = undoStacks.get(key)
    if (!undoStack || undoStack.length === 0) return { success: false }

    // Save current state to redo
    const current = fs.readFileSync(filePath)
    if (!redoStacks.has(key)) redoStacks.set(key, [])
    redoStacks.get(key)!.push(current)

    // Restore previous state
    const prev = undoStack.pop()!
    fs.writeFileSync(filePath, prev)
    return { success: true }
  })

  ipcMain.handle('history:redo', async (_e, filePath: string) => {
    const key = filePath.toLowerCase()
    const redoStack = redoStacks.get(key)
    if (!redoStack || redoStack.length === 0) return { success: false }

    // Save current state to undo
    const current = fs.readFileSync(filePath)
    if (!undoStacks.has(key)) undoStacks.set(key, [])
    undoStacks.get(key)!.push(current)

    // Restore redo state
    const next = redoStack.pop()!
    fs.writeFileSync(filePath, next)
    return { success: true }
  })
}
