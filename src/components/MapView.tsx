import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_CENTER, categoryOf, type LatLng, type Report } from '../lib/data'
import { timeAgo } from '../lib/device'

type Props = { reports: Report[]; userPos: LatLng | null; locateSignal: number }

function popupEl(r: Report): HTMLElement {
  const cat = categoryOf(r.category)
  const box = document.createElement('div')
  box.className = 'map-popup'
  const add = (tag: string, text: string, cls?: string) => {
    const el = document.createElement(tag)
    el.textContent = text // textContent: nunca interpreta HTML digitado por usuários
    if (cls) el.className = cls
    box.appendChild(el)
  }
  if (r.photo && r.photo.startsWith('data:image/')) {
    const img = document.createElement('img')
    img.src = r.photo
    img.alt = ''
    box.appendChild(img)
  }
  add('strong', `${cat.emoji} ${cat.label}`)
  add('span', r.certainty === 'confirmed' ? 'Confirmado' : 'Possível', 'map-popup-tag')
  if (r.description) add('p', r.description)
  add('small', `${r.address} · ${timeAgo(r.createdAt)}`)
  return box
}

export default function MapView({ reports, userPos, locateSignal }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const me = useRef<L.Marker | null>(null)
  const firstFix = useRef(true)

  useEffect(() => {
    if (!host.current) return
    const m = L.map(host.current, { zoomControl: false, attributionControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    markers.current = L.layerGroup().addTo(m)
    map.current = m

    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(host.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      markers.current = null
      me.current = null
      firstFix.current = true
    }
  }, [])

  useEffect(() => {
    const layer = markers.current
    if (!layer) return
    layer.clearLayers()
    reports.forEach((r) => {
      const cat = categoryOf(r.category)
      const icon = L.divIcon({
        className: 'map-pin-wrap',
        html: `<span class="map-pin" style="--pin:${cat.color}"><b>${cat.emoji}</b></span>`,
        iconSize: [38, 44],
        iconAnchor: [19, 42],
        popupAnchor: [0, -38],
      })
      L.marker([r.lat, r.lng], { icon, title: cat.label }).bindPopup(popupEl(r), { maxWidth: 240 }).addTo(layer)
    })
  }, [reports])

  useEffect(() => {
    const m = map.current
    if (!m || !userPos) return
    const ll: L.LatLngExpression = [userPos.lat, userPos.lng]
    if (!me.current) {
      me.current = L.marker(ll, {
        icon: L.divIcon({ className: 'map-pin-wrap', html: '<span class="map-me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(m)
    } else {
      me.current.setLatLng(ll)
    }
    if (firstFix.current) {
      firstFix.current = false
      m.setView(ll, 15)
    }
  }, [userPos])

  useEffect(() => {
    if (locateSignal > 0 && userPos) map.current?.flyTo([userPos.lat, userPos.lng], 16)
  }, [locateSignal, userPos])

  return <div ref={host} className="leaflet-host" role="application" aria-label="Mapa de ocorrências" />
}
