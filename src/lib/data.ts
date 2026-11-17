export type LatLng = { lat: number; lng: number }

export type User = {
  id: string
  name: string
  email: string
  phone: string
  passHash: string
  createdAt: string
}

export type Certainty = 'confirmed' | 'possible'

export type DispatchInfo = {
  status: 'pending' | 'sent' | 'rejected' | 'failed' | 'limited' | 'unavailable'
  authority?: string
  severity?: string
  summary?: string
}

export type Report = {
  id: string
  ownerId: string | null // null = exemplo (demo)
  category: string
  certainty: Certainty
  description: string
  photo: string | null
  lat: number
  lng: number
  address: string
  createdAt: string
  dispatch?: DispatchInfo
}

export type Category = { key: string; emoji: string; label: string; color: string }

export const CATEGORIES: Category[] = [
  { key: 'congestion', emoji: '🚗', label: 'Congestionamento', color: '#f08a24' },
  { key: 'hazard', emoji: '⚠', label: 'Perigo na via', color: '#e24a4a' },
  { key: 'accident', emoji: '🚙', label: 'Acidente', color: '#e24a4a' },
  { key: 'police', emoji: '👮', label: 'Blitz policial', color: '#5b6bd6' },
  { key: 'flood', emoji: '🌊', label: 'Alagamento', color: '#3185dc' },
  { key: 'closure', emoji: '⛔', label: 'Interdição', color: '#8a3ffc' },
  { key: 'roadwork', emoji: '🚧', label: 'Obras', color: '#e3c300' },
  { key: 'radar', emoji: '📷', label: 'Radar', color: '#4a4a46' },
]

export const categoryOf = (key: string): Category => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[1]

export const DEFAULT_CENTER: LatLng = { lat: -23.5614, lng: -46.6559 } // Av. Paulista, São Paulo

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

/** Ocorrências de exemplo, para o mapa não começar vazio. */
export const DEMO_REPORTS: Report[] = [
  { id: 'demo-1', ownerId: null, category: 'flood', certainty: 'confirmed', description: 'Água acumulada na faixa da direita. (exemplo)', photo: null, lat: -23.5575, lng: -46.662, address: 'Av. Central (exemplo)', createdAt: ago(25) },
  { id: 'demo-2', ownerId: null, category: 'roadwork', certainty: 'confirmed', description: 'Reforma do asfalto, uma faixa interditada. (exemplo)', photo: null, lat: -23.565, lng: -46.648, address: 'Rua das Flores (exemplo)', createdAt: ago(180) },
  { id: 'demo-3', ownerId: null, category: 'accident', certainty: 'possible', description: 'Colisão leve, trânsito lento. (exemplo)', photo: null, lat: -23.57, lng: -46.66, address: 'Av. Brigadeiro (exemplo)', createdAt: ago(8) },
]
