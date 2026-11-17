import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import MapView from './components/MapView'
import CameraView from './components/CameraView'
import Sidebar from './components/Sidebar'
import { Button, Field, Icon, Logo, TopBar } from './components/ui'
import { CATEGORIES, DEFAULT_CENTER, categoryOf, type Certainty, type LatLng, type Report, type User } from './lib/data'
import { asset, getPosition, longDate, reverseGeocode, useInstallPrompt, useMediaQuery } from './lib/device'
import { addReport, getReports, getSessionId, getUsers, loginUser, registerUser, removeReport, setSessionId, uid, updateReport } from './lib/storage'
import { DISPATCH_LABEL, dispatchReport } from './lib/dispatch'

type Screen =
  | 'login' | 'signup' | 'cameraPermission' | 'locationPermission'
  | 'home' | 'camera' | 'reportForm' | 'thanks'
  | 'map' | 'profile' | 'myReports' | 'reportDetail'

const AUTHED: Screen[] = ['home', 'camera', 'reportForm', 'thanks', 'map', 'profile', 'myReports', 'reportDetail']

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const id = getSessionId()
    return id ? getUsers().find((u) => u.id === id) ?? null : null
  })
  const [screen, setScreen] = useState<Screen>(() => (getSessionId() && getUsers().some((u) => u.id === getSessionId()) ? 'home' : 'login'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [reports, setReports] = useState<Report[]>(() => getReports())
  const [userPos, setUserPos] = useState<LatLng | null>(null)
  const [locateSignal, setLocateSignal] = useState(0)

  // formulário de denúncia
  const [photo, setPhoto] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [certainty, setCertainty] = useState<Certainty>('confirmed')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const desktop = useMediaQuery('(min-width: 900px)')
  const install = useInstallPrompt()
  const wide = desktop && !!user && AUTHED.includes(screen)

  const myReports = useMemo(() => reports.filter((r) => user && r.ownerId === user.id), [reports, user])
  const detail = reports.find((r) => r.id === detailId) ?? null

  const go = useCallback((s: Screen) => {
    setScreen(s)
    setMenuOpen(false)
    setAuthError(null)
  }, [])

  const refresh = () => setReports(getReports())

  const locate = useCallback(async () => {
    const p = await getPosition()
    if (p) {
      setUserPos(p)
      setLocateSignal((n) => n + 1)
    }
    return p
  }, [])

  // posição ao abrir o mapa / formulário
  useEffect(() => {
    if ((screen === 'map' || screen === 'reportForm') && !userPos) getPosition().then((p) => p && setUserPos(p))
  }, [screen, userPos])

  const resetForm = () => {
    setPhoto(null); setCategory(null); setCertainty('confirmed'); setDescription(''); setFormError(null)
  }

  // ---------- autenticação ----------
  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setAuthError(null)
    try {
      const u = await loginUser(String(f.get('identifier')), String(f.get('password')))
      setSessionId(u.id); setUser(u); go('home')
    } catch (err) {
      setAuthError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password'))
    if (password.length < 6) return setAuthError('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== String(f.get('confirm'))) return setAuthError('As senhas não coincidem.')
    setBusy(true); setAuthError(null)
    try {
      const u = await registerUser({ name: String(f.get('name')), email: String(f.get('email')), phone: String(f.get('phone')), password })
      setSessionId(u.id); setUser(u); go('cameraPermission')
    } catch (err) {
      setAuthError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const logout = () => {
    setSessionId(null); setUser(null); resetForm(); go('login')
  }

  // ---------- permissões ----------
  const allowCamera = async () => {
    try {
      const s = await navigator.mediaDevices?.getUserMedia({ video: true })
      s?.getTracks().forEach((t) => t.stop())
    } catch { /* usuário negou: seguimos */ }
    go('locationPermission')
  }

  const allowLocation = async () => {
    const p = await getPosition()
    if (p) setUserPos(p)
    go('home')
  }

  // ---------- denúncia ----------
  const submitReport = async () => {
    if (!user) return
    if (!category) return setFormError('Escolha o tipo de ocorrência.')
    setSaving(true); setFormError(null)
    const pos = userPos ?? (await getPosition()) ?? null
    const at = pos ?? DEFAULT_CENTER
    const address = pos ? await reverseGeocode(pos) : 'Localização aproximada (GPS indisponível)'
    const report: Report = {
      id: uid(), ownerId: user.id, category, certainty, description: description.trim(),
      photo, lat: at.lat, lng: at.lng, address, createdAt: new Date().toISOString(),
      dispatch: { status: 'pending' },
    }
    const ok = addReport(report)
    setSaving(false)
    if (!ok) return setFormError('Armazenamento do navegador cheio. Exclua denúncias antigas e tente de novo.')
    refresh(); resetForm(); go('thanks')
    // análise por IA + e-mail ao órgão responsável (em segundo plano)
    dispatchReport(report, user.name.split(' ')[0]).then((info) => { updateReport(report.id, { dispatch: info }); refresh() })
  }

  const deleteReport = (r: Report) => {
    if (!window.confirm(`Excluir a denúncia "${categoryOf(r.category).label}"?`)) return
    removeReport(r.id); refresh()
  }

  const sidebar = (permanent: boolean) =>
    user && (
      <Sidebar
        user={user} active={screen} permanent={permanent} onClose={() => setMenuOpen(false)}
        onHome={() => go('home')} onMap={() => go('map')} onProfile={() => go('profile')} onLogout={logout} onInstall={install}
      />
    )

  const HomeBar = ({ title }: { title: string }) => (
    <header className="home-header">
      <button className="icon-button light menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button>
      <strong className="section-title">{title}</strong>
      <button className="avatar" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">{user?.name.charAt(0).toUpperCase()}</button>
    </header>
  )

  return (
    <main className="app-shell">
      <div className={`phone ${wide ? 'phone--desktop' : ''}`}>
        {wide && sidebar(true)}
        <div className="stage">
          {screen === 'login' && (
            <section className="auth-screen">
              <div className="auth-hero"><Logo /><div className="road-lines" /></div>
              <form className="auth-card" onSubmit={onLogin}>
                <div className="eyebrow">Bem-vindo de volta</div>
                <h1>Acesse sua conta</h1>
                <p>Entre para ajudar a construir caminhos mais seguros.</p>
                <Field label="E-mail ou telefone" name="identifier" placeholder="seu@email.com" autoComplete="username" />
                <Field label="Senha" name="password" type="password" placeholder="Sua senha" autoComplete="current-password" />
                {authError && <p className="form-error" role="alert">{authError}</p>}
                <button type="button" className="text-link align-right" onClick={() => setAuthError('Recuperar senha por e-mail exige servidor e não está disponível na versão gratuita. Você pode criar uma nova conta.')}>Esqueci minha senha</button>
                <Button type="submit" className="login-submit" disabled={busy}>Entrar <Icon name="arrow" size={20} /></Button>
                <div className="auth-switch">Ainda não tem uma conta? <button type="button" onClick={() => go('signup')}>Cadastre-se</button></div>
              </form>
            </section>
          )}

          {screen === 'signup' && (
            <section className="page">
              <TopBar title="Criar conta" onBack={() => go('login')} />
              <div className="page-content signup-content">
                <div className="step-row"><span>Seus dados</span><b>1 de 3</b></div>
                <div className="progress"><i style={{ width: '33.33%' }} /></div>
                <h2>Vamos começar</h2>
                <p className="muted">Preencha seus dados para criar sua conta.</p>
                <form className="field-stack" onSubmit={onSignup}>
                  <Field label="Nome completo" name="name" placeholder="Como você gostaria de ser chamado?" autoComplete="name" />
                  <Field label="E-mail" name="email" type="email" placeholder="seu@email.com" autoComplete="email" />
                  <Field label="Telefone" name="phone" type="tel" placeholder="(00) 00000-0000" autoComplete="tel" />
                  <Field label="Senha" name="password" type="password" placeholder="Crie uma senha segura" autoComplete="new-password" minLength={6} />
                  <Field label="Confirmar senha" name="confirm" type="password" placeholder="Digite sua senha novamente" autoComplete="new-password" />
                  {authError && <p className="form-error" role="alert">{authError}</p>}
                  <div className="form-actions">
                    <Button variant="secondary" onClick={() => go('login')}>Voltar</Button>
                    <Button type="submit" disabled={busy}>Prosseguir</Button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {(screen === 'cameraPermission' || screen === 'locationPermission') && (
            <section className="page permission-page">
              <TopBar title="Criar conta" onBack={() => go(screen === 'cameraPermission' ? 'signup' : 'cameraPermission')} />
              <div className="page-content">
                <div className="step-row"><span>Permissões</span><b>{screen === 'cameraPermission' ? '2' : '3'} de 3</b></div>
                <div className="progress"><i style={{ width: screen === 'cameraPermission' ? '66.66%' : '100%' }} /></div>
                <div className="permission-visual">
                  <span className="permission-pulse" />
                  <div className="permission-icon"><Icon name={screen === 'cameraPermission' ? 'camera' : 'location'} size={42} /></div>
                </div>
                <h2>{screen === 'cameraPermission' ? 'Registre o que encontrar' : 'Encontre ocorrências próximas'}</h2>
                <p className="muted">
                  {screen === 'cameraPermission'
                    ? 'Precisamos acessar sua câmera para que você possa fotografar e informar situações na via.'
                    : 'Com sua localização, mostramos alertas relevantes ao seu redor e posicionamos sua denúncia no mapa.'}
                </p>
                <div className="privacy-note"><Icon name="shield" size={22} /><span><b>Sua privacidade importa</b>Usaremos este acesso somente quando você solicitar.</span></div>
              </div>
              <div className="sticky-actions">
                <Button onClick={screen === 'cameraPermission' ? allowCamera : allowLocation}>
                  {screen === 'cameraPermission' ? 'Permitir câmera' : 'Permitir localização'}
                </Button>
                <button className="text-link" onClick={() => go(screen === 'cameraPermission' ? 'locationPermission' : 'home')}>Agora não</button>
              </div>
            </section>
          )}

          {screen === 'home' && user && (
            <section className="home-screen">
              <HomeBar title="Denúncia" />
              <div className="capture-area">
                <button className="giant-camera-button" onClick={() => { resetForm(); go('camera') }}>
                  <span className="giant-camera-icon"><Icon name="camera" size={58} /></span>
                  <strong>Tirar uma foto</strong>
                  <small>Toque para registrar uma ocorrência</small>
                </button>
              </div>
              <div className="home-sheet">
                <div className="sheet-handle" />
                <div>
                  <span className="eyebrow">Olá, {user.name.split(' ')[0]}</span>
                  <h1>O que aconteceu?</h1>
                  <p>Fotografe a situação para iniciar sua denúncia.</p>
                </div>
              </div>
            </section>
          )}

          {screen === 'camera' && (
            <CameraView onBack={() => go('home')} onCapture={(data) => { setPhoto(data); go('reportForm') }} />
          )}

          {screen === 'reportForm' && (
            <section className="alert-form-screen">
              <TopBar title="Reportar alerta" onBack={() => go('camera')} />
              <div className="alert-form-content">
                <div className="photo-tray">
                  {photo ? <img src={photo} alt="Foto da ocorrência" /> : <img src={asset('camera-road.jpg')} alt="" style={{ opacity: .35 }} />}
                  <button onClick={() => go('camera')} aria-label="Tirar outra foto"><Icon name="plus" size={30} /><span>Outra foto</span></button>
                </div>
                <div className="location-chip"><Icon name="location" size={17} /> {userPos ? 'Localização atual' : 'Obtendo localização…'}</div>

                <div className="alert-section">
                  <h2>Tipo de ocorrência</h2>
                  <div className="category-chips">
                    {CATEGORIES.map((c) => (
                      <button key={c.key} className={category === c.key ? 'selected' : ''} onClick={() => setCategory(c.key)}>
                        <span>{c.emoji}</span>{c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="certainty-card">
                  <h3>Você tem certeza?</h3>
                  <div>
                    <button className={certainty === 'confirmed' ? 'active' : ''} onClick={() => setCertainty('confirmed')}><Icon name="check" size={18} /> Confirmado</button>
                    <button className={certainty === 'possible' ? 'active' : ''} onClick={() => setCertainty('possible')}>? Possível</button>
                  </div>
                  <p>Não tem certeza? Marque “Possível” — outro usuário poderá validar.</p>
                </div>

                <label className="alert-description">
                  <span>Descrição <small>(opcional)</small></span>
                  <textarea placeholder="Ex.: árvore caída bloqueando toda a pista..." maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} />
                  <i>{description.length}/200</i>
                </label>
                {formError && <p className="form-error" role="alert">{formError}</p>}
              </div>
              <div className="alert-form-actions">
                <Button variant="secondary" onClick={() => { resetForm(); go('home') }}>Cancelar</Button>
                <Button onClick={submitReport} disabled={saving}>{saving ? 'Enviando…' : 'Reportar'}</Button>
              </div>
            </section>
          )}

          {screen === 'thanks' && (
            <section className="success-screen">
              <div className="success-art">
                <span className="spark spark-one" /><span className="spark spark-two" /><span className="spark spark-three" />
                <div className="success-circle"><Icon name="check" size={54} /></div>
              </div>
              <span className="eyebrow">Ocorrência enviada</span>
              <h1>Obrigado por ajudar!</h1>
              <p>Seu alerta já está disponível. Com a sua colaboração, todos chegam mais seguros.</p>
              <div className="impact-card"><img src={asset('cone.png')} alt="" /><span><b>Você fez a diferença</b><small>Informação compartilhada é caminho protegido.</small></span></div>
              <div className="thanks-actions">
                <Button onClick={() => go('home')}>Voltar para o início</Button>
                <Button variant="secondary" onClick={() => go('map')}>Ver no mapa</Button>
              </div>
            </section>
          )}

          {screen === 'map' && user && (
            <section className="map-screen">
              <HomeBar title="Mapa" />
              <div className="map-canvas map-canvas--full">
                <MapView reports={reports} userPos={userPos} locateSignal={locateSignal} />
                <button className="locate-button" onClick={locate} aria-label="Minha localização"><Icon name="location" /></button>
                <div className="map-legend">
                  <div className="map-legend-heading"><b>Tipos de ocorrência</b><small>Toque em um alerta para ver os detalhes</small></div>
                  <div className="map-legend-list">
                    <span><i className="legend-dot legend-dot--flood" />Alagamento</span>
                    <span><i className="legend-dot legend-dot--accident" />Acidente</span>
                    <span><i className="legend-dot legend-dot--roadwork" />Reformas</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {screen === 'profile' && user && (
            <section className="page profile-page">
              <TopBar title="Meu perfil" onBack={() => go('home')} />
              <div className="profile-page-content">
                <div className="profile-photo-wrap">
                  <div className="profile-photo-ring"><div className="profile-initial">{user.name.charAt(0).toUpperCase()}</div></div>
                  <span className="profile-status" aria-label="Conta ativa"><Icon name="check" size={17} /></span>
                </div>
                <div className="profile-heading">
                  <span className="eyebrow">Minha conta</span>
                  <h1>{user.name}</h1>
                  <p>Membro da comunidade Alerta+</p>
                </div>
                <div className="profile-details">
                  <div><span>E-mail</span><b>{user.email}</b></div>
                  <div><span>Telefone</span><b>{user.phone}</b></div>
                  <div><span>Membro desde</span><b>{longDate(user.createdAt)}</b></div>
                </div>
                <Button className="profile-reports-button" onClick={() => go('myReports')}>
                  Minhas Denúncias <Icon name="chevron" size={19} />
                </Button>
              </div>
            </section>
          )}

          {screen === 'myReports' && (
            <section className="page my-reports-page">
              <TopBar title="Minhas Denúncias" onBack={() => go('profile')} />
              <div className="my-reports-content">
                <div className="my-reports-heading">
                  <span className="eyebrow">Seu histórico</span>
                  <h1>Denúncias realizadas</h1>
                  <p>Acompanhe e gerencie os alertas que você enviou.</p>
                </div>
                {myReports.length > 0 ? (
                  <div className="my-reports-list">
                    {myReports.map((r) => {
                      const cat = categoryOf(r.category)
                      return (
                        <article className="report-history-card" key={r.id}>
                          <img src={r.photo ?? asset('camera-road.jpg')} alt={`Foto da denúncia: ${cat.label}`} />
                          <div className="report-history-info">
                            <span>Denúncia</span>
                            <h2>{cat.emoji} {cat.label}</h2>
                            <p className="report-history-location"><Icon name="location" size={13} /> {r.address}</p>
                            <time dateTime={r.createdAt}>{longDate(r.createdAt)}</time>
                            {r.dispatch && <small>{DISPATCH_LABEL[r.dispatch.status]}</small>}
                          </div>
                          <div className="report-history-actions">
                            <button className="view-report-button" onClick={() => { setDetailId(r.id); go('reportDetail') }}><Icon name="chevron" size={16} /> Ver denúncia</button>
                            <button className="delete-report-button" onClick={() => deleteReport(r)} aria-label={`Excluir denúncia ${cat.label}`}><Icon name="trash" size={17} /> Excluir</button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="my-reports-empty">
                    <div><Icon name="check" size={30} /></div>
                    <h2>Nenhuma denúncia por aqui</h2>
                    <p>As denúncias que você enviar aparecerão nesta página.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {screen === 'reportDetail' && (
            <section className="page report-detail-page">
              <TopBar title="Detalhes da denúncia" onBack={() => go('myReports')} />
              {detail ? (
                <div className="report-detail-content">
                  <div className="report-detail-photo">
                    <img src={detail.photo ?? asset('camera-road.jpg')} alt={`Foto da denúncia: ${categoryOf(detail.category).label}`} />
                    <span>{detail.certainty === 'confirmed' ? 'Confirmado' : 'Possível'}</span>
                  </div>
                  <span className="eyebrow">Denúncia registrada</span>
                  <h1>{categoryOf(detail.category).label}</h1>
                  <div className="report-detail-meta">
                    <div><Icon name="location" size={20} /><span><small>Local da denúncia</small><b>{detail.address}</b></span></div>
                    <div><Icon name="camera" size={20} /><span><small>Data do envio</small><b>{longDate(detail.createdAt)}</b></span></div>
                  </div>
                  <div className="report-detail-note">
                    <b>Encaminhamento</b>
                    <p>{detail.dispatch ? DISPATCH_LABEL[detail.dispatch.status] : 'Sem encaminhamento.'}
                      {detail.dispatch?.authority ? ` Órgão: ${detail.dispatch.authority}.` : ''}
                      {detail.dispatch?.severity ? ` Gravidade: ${detail.dispatch.severity}.` : ''}</p>
                    {detail.dispatch?.summary && <p>{detail.dispatch.summary}</p>}
                  </div>
                  <div className="report-detail-note">
                    <b>Descrição</b>
                    <p>{detail.description || 'Sem descrição.'}</p>
                  </div>
                </div>
              ) : (
                <div className="report-detail-content"><p>Denúncia não encontrada.</p></div>
              )}
            </section>
          )}
        </div>

        {!wide && menuOpen && user && (
          <div className="drawer-layer">
            <button className="drawer-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
            {sidebar(false)}
          </div>
        )}
      </div>
    </main>
  )
}

export default App
