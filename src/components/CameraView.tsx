import { useEffect, useRef, useState } from 'react'
import { compressToDataUrl, fileToDataUrl } from '../lib/device'

type Props = {
  onCapture: (dataUrl: string) => void
  onBack: () => void
}

/** Câmera real (getUserMedia). Se negada/indisponível, cai para o seletor de foto do aparelho. */
export default function CameraView({ onCapture, onBack }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador não permite acessar a câmera. Use o botão abaixo para escolher uma foto.')
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => undefined)
        }
        setReady(true)
      } catch {
        setError('Não foi possível acessar a câmera. Verifique a permissão do navegador ou escolha uma foto.')
      }
    }
    start()
    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [])

  const capture = () => {
    const v = video.current
    if (!v || !ready || !v.videoWidth) return file.current?.click()
    onCapture(compressToDataUrl(v, v.videoWidth, v.videoHeight))
  }

  const pickFile = async (f?: File) => {
    if (!f) return
    try {
      onCapture(await fileToDataUrl(f))
    } catch {
      setError('Não foi possível ler essa imagem.')
    }
  }

  return (
    <section className="camera-preview-screen">
      <div className="camera-viewfinder">
        <video ref={video} playsInline muted autoPlay />
        {error && <div className="camera-error" role="alert">{error}</div>}
        <div className="camera-shade camera-shade--top">
          <span>Câmera</span>
          {ready && <span className="camera-live"><i /> AO VIVO</span>}
        </div>
        <div className="camera-grid" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="camera-shade camera-shade--bottom">
          <div className="camera-capture"><button onClick={capture} aria-label="Tirar foto" /></div>
          <small>{ready ? 'Toque para capturar' : 'Ou escolha uma foto'}</small>
        </div>
      </div>
      <div className="camera-actions">
        <button type="button" className="button button--secondary" onClick={onBack}>Voltar</button>
        <button type="button" className="button button--primary" onClick={() => (ready ? capture() : file.current?.click())}>
          {ready ? 'Continuar' : 'Escolher foto'}
        </button>
      </div>
      <input ref={file} hidden type="file" accept="image/*" capture="environment" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
    </section>
  )
}
