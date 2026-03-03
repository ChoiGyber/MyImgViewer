import { useEffect } from 'react'

interface ShortcutActions {
  openFile: () => void
  nextImage: () => void
  prevImage: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        actions.openFile()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        actions.nextImage()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        actions.prevImage()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        actions.zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        actions.zoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        actions.resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [actions])
}
