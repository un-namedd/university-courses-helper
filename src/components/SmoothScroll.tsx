import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

function shouldPreventSmoothScroll(node: HTMLElement): boolean {
  let el: HTMLElement | null = node
  while (el && el !== document.documentElement) {
    if (el.hasAttribute('data-lenis-prevent')) return true
    const { overflowY, overflowX } = window.getComputedStyle(el)
    const scrollableY =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 1
    const scrollableX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 1
    if (scrollableY || scrollableX) return true
    el = el.parentElement
  }
  return false
}

let lenisRef: Lenis | null = null

export function pauseSmoothScroll() {
  lenisRef?.stop()
}

export function resumeSmoothScroll() {
  lenisRef?.start()
}

/** Smooths wheel / trackpad scrolling on the main page. */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.5,
      prevent: (node) => shouldPreventSmoothScroll(node),
    })

    lenisRef = lenis
    document.documentElement.classList.add('lenis', 'lenis-smooth')

    const onReducedChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        lenis.destroy()
        lenisRef = null
        document.documentElement.classList.remove('lenis', 'lenis-smooth')
      }
    }
    reduced.addEventListener('change', onReducedChange)

    return () => {
      reduced.removeEventListener('change', onReducedChange)
      lenis.destroy()
      lenisRef = null
      document.documentElement.classList.remove('lenis', 'lenis-smooth')
    }
  }, [])

  return null
}
