import { useEffect, useState } from 'react'
import { DEFAULT_CENTER, type LatLng } from './data'

export const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`

/** Posição atual do GPS (null se negada/indisponível). */
export function getPosition(timeout = 8000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    )
  })
}

/** Endereço aproximado via Nominatim (OpenStreetMap, gratuito). Falha silenciosamente. */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=pt-BR&lat=${lat}&lon=${lng}`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return fallback
    const a = (await res.json()).address ?? {}
    const street = a.road ?? a.pedestrian ?? a.suburb
    const city = a.city ?? a.town ?? a.village ?? a.municipality
    return [street, city].filter(Boolean).join(', ') || fallback
  } catch {
    return fallback
  }
}

export const startPosition = DEFAULT_CENTER

/** Reduz a imagem (max 1024px, JPEG) para caber no localStorage. */
export function compressToDataUrl(source: CanvasImageSource, w: number, h: number, max = 1024, quality = 0.7): string {
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve(compressToDataUrl(img, img.naturalWidth, img.naturalHeight))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagem inválida'))
    }
    img.src = url
  })
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Botão "Instalar aplicativo" (Chrome/Edge/Android). No iPhone: Compartilhar > Adicionar à Tela de Início. */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as InstallEvent)
    }
    const done = () => setEvt(null)
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', on)
      window.removeEventListener('appinstalled', done)
    }
  }, [])
  return evt ? async () => { await evt.prompt(); setEvt(null) } : null
}

export function timeAgo(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const longDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
