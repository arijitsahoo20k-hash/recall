import { useEffect, useCallback } from 'react'

export function useKeyboard(keyMap) {
  const handler = useCallback((e) => {
    const key = [
      e.ctrlKey && 'ctrl',
      e.metaKey && 'meta',
      e.altKey && 'alt',
      e.shiftKey && 'shift',
      e.key.toLowerCase()
    ].filter(Boolean).join('+')

    const callback = keyMap[key] || keyMap[e.key.toLowerCase()]
    if (callback) {
      e.preventDefault()
      callback(e)
    }
  }, [keyMap])

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
