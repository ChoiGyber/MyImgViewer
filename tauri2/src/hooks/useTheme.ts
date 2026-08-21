import { useState, useEffect } from 'react'

export function useTheme(): { isDark: boolean; toggle: () => void } {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    return stored ? stored === 'dark' : true // default dark
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = (): void => setIsDark((prev) => !prev)

  return { isDark, toggle }
}
