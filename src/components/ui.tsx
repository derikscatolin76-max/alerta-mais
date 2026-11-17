import type { ReactNode } from 'react'
import { asset } from '../lib/device'

export type IconName = 'arrow' | 'camera' | 'check' | 'chevron' | 'image' | 'location' | 'map' | 'menu' | 'plus' | 'shield' | 'trash' | 'user' | 'x' | 'download'

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    camera: <><path d="M14.5 6 13 4h-2L9.5 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 15-5-5L5 20" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z" /><path d="m9 12 2 2 4-5" /></>,
    trash: <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    download: <><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M5 20h14" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? 'logo--compact' : ''}`}>
      <div className="logo-mark"><img src={asset('cone.png')} alt="" /></div>
      <div>
        <strong>ALERTA+</strong>
        {!compact && <span>O caminho fica melhor com você</span>}
      </div>
    </div>
  )
}

export function Field({ label, name, type = 'text', placeholder, autoComplete, required = true, minLength }: {
  label: string; name: string; type?: string; placeholder: string; autoComplete?: string; required?: boolean; minLength?: number
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} required={required} minLength={minLength} />
    </label>
  )
}

export function Button({ children, variant = 'primary', onClick, type = 'button', className, disabled }: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}) {
  return <button type={type} disabled={disabled} className={`button button--${variant} ${className ?? ''}`} onClick={onClick}>{children}</button>
}

export function TopBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="icon-button" onClick={onBack} aria-label="Voltar"><Icon name="arrow" /></button>
      <h1>{title}</h1>
      <div className="topbar-action">{action}</div>
    </header>
  )
}
