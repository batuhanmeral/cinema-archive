import { useEffect, type RefObject } from 'react'

const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

// "/" sayfanın her yerinden aramayı açar; yazı alanındayken dokunmaz. Gizli hedef (öbür kırılım) yok sayılır.
export function useSlashFocus(ref: RefObject<HTMLElement | null>, onActivate?: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof Element && target.closest(TYPING)) return
      const element = ref.current
      if (!element) return
      if (element.checkVisibility && !element.checkVisibility()) return
      event.preventDefault()
      if (onActivate) onActivate()
      else element.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [ref, onActivate])
}
