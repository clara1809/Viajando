import { useRef, useState } from 'react'
import { entrarCuenta, mensajeSesion, registrarCuenta, salirCuenta } from '../services/sesion'
import './AccesoCuenta.css'

function IconoUsuario() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" /><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
  </svg>
}

export default function AccesoCuenta({ usuario, bloqueado = false, actualizarUsuario }) {
  const enCurso = useRef(false)
  const [modo, setModo] = useState('ingresar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  async function enviar(evento) {
    evento.preventDefault()
    if (enCurso.current || bloqueado) return
    setError('')
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) { setError('Ingresá un correo electrónico válido.'); return }
    if (!clave) { setError('Ingresá tu contraseña.'); return }
    if (modo === 'registrar' && clave.length < 6) { setError('Usá una contraseña de al menos 6 caracteres.'); return }
    if (modo === 'registrar' && clave !== repetida) { setError('Las contraseñas no coinciden.'); return }
    enCurso.current = true; setOcupado(true)
    try {
      if (modo === 'registrar') await registrarCuenta(correo, clave)
      else await entrarCuenta(correo, clave)
      setClave(''); setRepetida('')
      actualizarUsuario()
    } catch (fallo) { setError(mensajeSesion(fallo)) }
    finally { enCurso.current = false; setOcupado(false) }
  }

  async function cerrarSesion() {
    if (enCurso.current || bloqueado) return
    enCurso.current = true; setOcupado(true); setError('')
    try { await salirCuenta(); actualizarUsuario() }
    catch (fallo) { setError(mensajeSesion(fallo)) }
    finally { enCurso.current = false; setOcupado(false) }
  }

  if (usuario && !usuario.isAnonymous) return (
    <div className="acceso-cuenta">
      <button type="button" onClick={cerrarSesion} disabled={bloqueado || ocupado}>{ocupado ? 'Cerrando…' : 'Cerrar sesión'}</button>
      {error && <span role="alert" className="error-cuenta">{error}</span>}
    </div>
  )

  return (
    <main className="pantalla-acceso">
      <header className="bienvenida-acceso"><img className="logo-acceso" src="/viajando.logo.svg" alt="" width="72" height="72" /><h1 translate="no">VIAJANDO</h1><h2>Tu mundo, tus historias</h2></header>
      <section className="panel-acceso" aria-labelledby="titulo-cuenta">
        <h2 id="titulo-cuenta"><IconoUsuario />{modo === 'registrar' ? 'Creá tu cuenta' : 'Iniciar sesión'}</h2>
        <p>{modo === 'registrar' ? 'Un lugar para guardar tus próximas historias.' : 'Volvé a tus viajes y a los lugares que soñás conocer.'}</p>
        {usuario?.isAnonymous && <p className="nota-cuenta">Para conservar los recuerdos de tu sesión anónima, creá una cuenta con un correo nuevo. Al iniciar sesión con otra cuenta, los datos no se fusionan.</p>}
        <form onSubmit={enviar} noValidate aria-busy={ocupado} aria-describedby={error ? 'error-acceso' : undefined}>
          <label htmlFor="cuenta-correo">Correo electrónico</label>
          <input id="cuenta-correo" type="email" autoComplete="username" required value={correo} disabled={ocupado} onChange={e => setCorreo(e.target.value)} />
          <label htmlFor="cuenta-clave">Contraseña{modo === 'registrar' ? ' (mínimo 6 caracteres)' : ''}</label>
          <input id="cuenta-clave" type="password" autoComplete={modo === 'registrar' ? 'new-password' : 'current-password'} required value={clave} disabled={ocupado} onChange={e => setClave(e.target.value)} />
          {modo === 'registrar' && <><label htmlFor="cuenta-repetida">Repetí la contraseña</label>
            <input id="cuenta-repetida" type="password" autoComplete="new-password" required value={repetida} disabled={ocupado} onChange={e => setRepetida(e.target.value)} /></>}
          {error && <p id="error-acceso" role="alert" className="error-cuenta">{error}</p>}
          <button type="submit" disabled={ocupado || bloqueado}>{ocupado ? 'Procesando…' : modo === 'registrar' ? 'Crear cuenta' : 'Iniciar sesión'}</button>
          <button type="button" className="alternar-cuenta" disabled={ocupado} onClick={() => { setModo(modo === 'registrar' ? 'ingresar' : 'registrar'); setError(''); setClave(''); setRepetida('') }}>
            {modo === 'registrar' ? 'Ya tengo una cuenta' : '¿Todavía no tenés cuenta? Creá una'}
          </button>
        </form>
      </section>
    </main>
  )
}
