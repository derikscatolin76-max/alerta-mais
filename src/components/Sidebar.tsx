import type { User } from '../lib/data'
import { Icon, Logo } from './ui'

type Props = {
  user: User
  active: string
  permanent?: boolean
  onClose?: () => void
  onHome: () => void
  onMap: () => void
  onProfile: () => void
  onLogout: () => void
  onInstall: (() => void) | null
}

export default function Sidebar({ user, active, permanent, onClose, onHome, onMap, onProfile, onLogout, onInstall }: Props) {
  const item = (icon: 'camera' | 'map' | 'user' | 'download', title: string, sub: string, fn: () => void, on = false) => (
    <button className={on ? 'active' : ''} onClick={fn}>
      <Icon name={icon} /><span><b>{title}</b><small>{sub}</small></span><Icon name="chevron" size={18} />
    </button>
  )
  return (
    <aside className={`drawer ${permanent ? 'drawer--fixed' : ''}`}>
      <div className="drawer-header">
        <Logo compact />
        {!permanent && <button className="icon-button" onClick={onClose} aria-label="Fechar menu"><Icon name="x" /></button>}
      </div>
      <div className="profile-card">
        <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
        <div><b>{user.name}</b><span>{user.email}</span></div>
      </div>
      <nav>
        {item('camera', 'Denúncia', 'Registre um problema na via', onHome, active === 'home')}
        {item('map', 'Mapa perto de você', 'Ocorrências na sua região', onMap, active === 'map')}
        {item('user', 'Minha conta', 'Dados e preferências', onProfile, ['profile', 'myReports', 'reportDetail'].includes(active))}
        {onInstall && item('download', 'Instalar aplicativo', 'Use como app no aparelho', onInstall)}
      </nav>
      <button className="logout" onClick={onLogout}>Sair da conta</button>
      <small className="version">ALERTA+ • versão 1.0</small>
    </aside>
  )
}
