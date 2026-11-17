import type { DispatchInfo, Report } from './data'

const ENDPOINT = import.meta.env.VITE_DISPATCH_URL || `${window.location.origin}/.netlify/functions/dispatch-report`

/** Envia a denúncia para análise (IA) e encaminhamento por e-mail. Nunca lança erro. */
export async function dispatchReport(r: Report, reporter: string): Promise<DispatchInfo> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: r.category, certainty: r.certainty, description: r.description, address: r.address,
        lat: r.lat, lng: r.lng, photo: r.photo, createdAt: r.createdAt, reporter,
      }),
    })
    if (res.status === 429) return { status: 'limited' }
    if (res.status === 404 || res.status === 503 || res.status === 405) return { status: 'unavailable' }
    if (!res.ok) return { status: 'failed' }
    const d = await res.json()
    return { status: d.status === 'rejected' ? 'rejected' : 'sent', authority: d.authority, severity: d.severity, summary: d.summary }
  } catch {
    return { status: 'unavailable' }
  }
}

export const DISPATCH_LABEL: Record<DispatchInfo['status'], string> = {
  pending: 'Analisando e encaminhando…',
  sent: 'Encaminhada',
  rejected: 'Não encaminhada (não parece uma ocorrência viária)',
  failed: 'Falha ao encaminhar',
  limited: 'Limite de envios por hora atingido',
  unavailable: 'Encaminhamento indisponível neste ambiente',
}
