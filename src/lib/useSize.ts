import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useSize(target: Ref<HTMLElement | null>, fallback = 720) {
  const width = ref(fallback)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const element = target.value
    if (!element || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0) width.value = Math.max(280, Math.round(rect.width))
    })
    observer.observe(element)
    width.value = Math.max(280, Math.round(element.getBoundingClientRect().width) || fallback)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return width
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
