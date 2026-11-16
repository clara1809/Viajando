
import { lazy, Suspense, useRef, useState } from 'react'
import Inicio from './components/Inicio'
import TarjetaDestino from './components/TarjetaDestino'
import LugaresTuristicos from './components/LugaresTuristicos'
import { crearConsultaLugares } from './services/lugares'
import AccesoCuenta from './components/AccesoCuenta'
import useDatosUsuario from './hooks/useDatosUsuario'
import FotoRecuerdo from './components/FotoRecuerdo'
import { FotosDelViaje } from './components/GaleriaRecuerdos'
import { fechaLocal, filtrarViajes, obtenerFotos, separarLineas, validarViaje } from './utils/viajes'
import './App.css'

const MapaRecuerdos = lazy(() => import('./components/MapaRecuerdos'))

function Aplicacion({ datos }) {
  const [seccion, setSeccion] = useState('inicio')
  const [consultarLugares] = useState(() => crearConsultaLugares())

  const { usuario, actualizarUsuario, viajes, lugares, cargando, errores, guardando, guardarRegistro, eliminarRegistro, guardarLugarTuristico, convertirLugarEnViaje, reintentar } = datos
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('recientes')
  const viajesOrdenados = filtrarViajes(viajes, busqueda, orden)
  const [fotosAdicionales, setFotosAdicionales] = useState('')
  const [destacados, setDestacados] = useState('')
  const [erroresFormulario, setErroresFormulario] = useState({})
  const [erroresLugar, setErroresLugar] = useState({})
  const [confirmacion, setConfirmacion] = useState('')
  const [origenPendiente, setOrigenPendiente] = useState(null)
  const ocupadoViajes = guardando || cargando.viajes || Boolean(errores.sesion || errores.viajes) || Boolean(origenPendiente && (cargando.porConocer || errores.porConocer))
  const ocupadoLugares = guardando || cargando.porConocer || Boolean(errores.sesion || errores.porConocer)
  const [lugar, setLugar] = useState('')
  const [paisLugar, setPaisLugar] = useState('')
  const [motivo, setMotivo] = useState('')
  const [viajeEditando, setViajeEditando] = useState(null)

  const [destino, setDestino] = useState('')
  const [pais, setPais] = useState('')
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [foto, setFoto] = useState('')
  const [recuerdoSeleccionado, setRecuerdoSeleccionado] = useState(null)
  const carruselRef = useRef(null)
  const arrastreRef = useRef(null)


function navegarA(nuevaSeccion) {
  setSeccion(nuevaSeccion)
  window.scrollTo({ top: 0, behavior: 'instant' })
}

async function agregarViaje(evento) {
  evento.preventDefault()

  setConfirmacion('')
  const validacion = validarViaje({ destino, pais, fecha, foto, fotosAdicionales })
  setErroresFormulario(validacion)
  if (Object.keys(validacion).length) {
    requestAnimationFrame(() => document.getElementById(Object.keys(validacion)[0] === 'fotosAdicionales' ? 'fotos-adicionales' : 'viaje-' + Object.keys(validacion)[0])?.focus())
    return
  }

  const fotos = [...new Set([foto.trim(), ...separarLineas(fotosAdicionales)].filter(Boolean))]
  const datosViaje = {
    destino: destino.trim(), pais: pais.trim(), fecha,
    descripcion: descripcion.trim(), foto: foto.trim(), fotos,
    destacados: separarLineas(destacados)
  }
  const editando = viajeEditando !== null
  const convirtiendo = origenPendiente !== null
  const guardado = convirtiendo
    ? await convertirLugarEnViaje(origenPendiente, datosViaje)
    : await guardarRegistro('viajes', datosViaje, viajeEditando)
  if (!guardado) return
  limpiarFormularioViaje()
  setBusqueda('')
  setConfirmacion(convirtiendo ? '¡Un destino soñado se convirtió en recuerdo! El viaje se guardó y se quitó de Por conocer.' : editando ? 'Los cambios del viaje se guardaron correctamente.' : 'Tu viaje se guardó correctamente.')
  navegarA('recuerdos')
}


async function eliminarViaje(id) {
  if (!window.confirm('¿Querés eliminar este viaje y sus recuerdos? Esta acción no se puede deshacer.')) return
  setConfirmacion('')
  const eliminado = await eliminarRegistro('viajes', id)
  if (!eliminado) return
  setConfirmacion('El viaje se eliminó correctamente.')
  if (viajeEditando === id) limpiarFormularioViaje()
  if (recuerdoSeleccionado === id) setRecuerdoSeleccionado(null)
}


function editarViaje(viaje) {
  setViajeEditando(viaje.id)
  setDestino(viaje.destino)
  setPais(viaje.pais)
  setFecha(viaje.fecha)
  setDescripcion(viaje.descripcion || '')
  setFoto(viaje.foto || '')
  setFotosAdicionales(obtenerFotos(viaje).filter(url => url !== viaje.foto).join('\n'))
  setDestacados(Array.isArray(viaje.destacados) ? viaje.destacados.join('\n') : '')
  setOrigenPendiente(null)
  setErroresFormulario({})
  setConfirmacion('')
  navegarA('viajes')
}

function limpiarFormularioViaje() {
  setDestino('')
  setPais('')
  setFecha('')
  setDescripcion('')
  setFoto('')
  setFotosAdicionales('')
  setDestacados('')
  setOrigenPendiente(null)
  setErroresFormulario({})
  setViajeEditando(null)
}

function iniciarArrastre(evento) {
  arrastreRef.current = null
  if (evento.target.closest('.fotos-del-viaje, .acciones-recuerdo, .acciones-destino, .edicion-destino')) return
  if (evento.pointerType !== 'mouse' || evento.button !== 0) return
  arrastreRef.current = {
    inicioX: evento.clientX,
    scrollInicial: evento.currentTarget.scrollLeft,
    activo: true,
    movido: false
  }
}

function moverArrastre(evento) {
  const arrastre = arrastreRef.current
  if (!arrastre?.activo) return
  const distancia = evento.clientX - arrastre.inicioX
  if (!arrastre.movido && Math.abs(distancia) < 6) return
  const carrusel = evento.currentTarget
  if (!arrastre.movido) {
    arrastre.movido = true
    carrusel.setPointerCapture(evento.pointerId)
    carrusel.classList.add('arrastrando')
    carrusel.focus({ preventScroll: true })
  }
  evento.preventDefault()
  carrusel.scrollLeft = arrastre.scrollInicial - distancia
}

function terminarArrastre(evento) {
  const arrastre = arrastreRef.current
  if (!arrastre?.activo) return
  arrastre.activo = false
  const carrusel = evento.currentTarget
  carrusel.classList.remove('arrastrando')
  if (carrusel.hasPointerCapture(evento.pointerId)) {
    carrusel.releasePointerCapture(evento.pointerId)
  }
  if (arrastre.movido) {
    const tarjetas = [...carrusel.querySelectorAll('.tarjeta-recuerdo, .tarjeta-viaje')]
    const posiciones = tarjetas.map((tarjeta) => tarjeta.offsetLeft - tarjetas[0].offsetLeft)
    const masCercana = posiciones.reduce((anterior, actual) =>
      Math.abs(actual - carrusel.scrollLeft) < Math.abs(anterior - carrusel.scrollLeft) ? actual : anterior
    , 0)
    carrusel.scrollTo({ left: masCercana, behavior: movimientoSuave() })
  }
}

function movimientoSuave() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
}

function navegarRecuerdos(evento) {
  if (evento.target !== evento.currentTarget) return
  const carrusel = evento.currentTarget
  const tarjeta = carrusel.querySelector('.tarjeta-recuerdo, .tarjeta-viaje')
  if (!tarjeta) return
  const paso = tarjeta.getBoundingClientRect().width + 24
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
    evento.preventDefault()
    carrusel.scrollBy({ left: evento.key === 'ArrowRight' ? paso : -paso, behavior: movimientoSuave() })
  }
}

async function agregarLugar(evento) {
  evento.preventDefault()

  setConfirmacion('')
  const validacion = {}
  if (!lugar.trim()) validacion.nombre = 'Ingresá el lugar que querés conocer.'
  if (!paisLugar.trim()) validacion.pais = 'Ingresá el país del destino.'
  setErroresLugar(validacion)
  if (Object.keys(validacion).length) {
    requestAnimationFrame(() => document.getElementById(!lugar.trim() ? 'lugar-nombre' : 'lugar-pais')?.focus())
    return
  }

  const nuevoLugar = {
    nombre: lugar.trim(),
    pais: paisLugar.trim(),
    motivo: motivo.trim()
  }

  const guardado = await guardarRegistro('porConocer', nuevoLugar)
  if (!guardado) return
  setConfirmacion('El destino se guardó en Por conocer.')
  limpiarFormularioLugar()
}

function limpiarFormularioLugar() {
  setErroresLugar({})

  setLugar('')
  setPaisLugar('')
  setMotivo('')
}

async function eliminarLugar(id) {
  if (!window.confirm('¿Querés eliminar este destino de Por conocer?')) return
  setConfirmacion('')
  const eliminado = await eliminarRegistro('porConocer', id)
  if (eliminado) setConfirmacion('El destino se eliminó correctamente.')
}


function iniciarViajeDesdeLugar(destinoPendiente) {
  if (guardando) return
  limpiarFormularioViaje()
  setDestino(destinoPendiente.nombre)
  setPais(destinoPendiente.pais)
  setOrigenPendiente(destinoPendiente.id)
  setConfirmacion('')
  navegarA('viajes')
}



  return (
    <div>
      <nav className="navegacion" aria-label="Navegación principal">
        <h3>
          <button className="marca-inicio" translate="no" type="button" aria-label="VIAJANDO: volver a Inicio" onClick={() => navegarA('inicio')}>
            <img className="logo-viajando" src="/viajando.logo.svg" alt="VIAJANDO" width="80" height="80" />
          </button>
        </h3>

        <div>
          <button aria-current={seccion === 'viajes' ? 'page' : undefined} onClick={() => navegarA('viajes')}>
            Mis viajes
          </button>

          <button aria-current={seccion === 'recuerdos' ? 'page' : undefined} onClick={() => navegarA('recuerdos')}>
            Mis recuerdos
          </button>

          <button aria-current={seccion === 'destinos' ? 'page' : undefined} onClick={() => navegarA('destinos')}>
            Por conocer
          </button>
        </div>
        <AccesoCuenta usuario={usuario} bloqueado={guardando} actualizarUsuario={actualizarUsuario} />
      </nav>

      <main>
        {confirmacion && <p className="mensaje-confirmacion" role="status">{confirmacion}</p>}
        {(cargando.viajes || cargando.porConocer) && <p role="status">Conectando y cargando tus datos…</p>}
        {guardando && <p role="status">Guardando cambios… Si estás sin conexión, se confirmarán cuando vuelva internet.</p>}
        {Object.values(errores).filter(Boolean).map((mensaje) => <p role="alert" key={mensaje}>{mensaje}</p>)}
        {Object.values(errores).some(Boolean) && (
          <button type="button" disabled={guardando} onClick={reintentar}>Reintentar conexión</button>
        )}
        {seccion === 'inicio' && <Inicio explorarRecuerdos={() => navegarA('recuerdos')} viajes={viajes} lugares={lugares} cargando={cargando.viajes || cargando.porConocer} error={Boolean(errores.sesion || errores.viajes || errores.porConocer)} />}

        {seccion === 'viajes' && (
          <section className="seccion-viajes">
            <h1>Mis viajes</h1>
            <p>Guardá tus aventuras y recuerdos.</p>

            <form onSubmit={agregarViaje} className="formulario formulario-viaje" noValidate aria-busy={guardando}>
              <h2>{viajeEditando !== null ? 'Editar viaje' : origenPendiente ? '¡Ya lo conocí!' : 'Agregar un viaje'}</h2>
              {origenPendiente && <p className="ayuda-foto">Completá tu experiencia. El destino se quitará de Por conocer únicamente cuando se guarde el viaje.</p>}
              <div className="campo-viaje">
              <label htmlFor="viaje-destino">Ciudad o destino *</label>
              <input id="viaje-destino" type="text" placeholder="Ciudad o destino" required value={destino} disabled={guardando}
                aria-invalid={Boolean(erroresFormulario.destino)} aria-describedby={erroresFormulario.destino ? 'error-destino' : undefined}
                onChange={e => setDestino(e.target.value)} />
              {erroresFormulario.destino && <p id="error-destino" className="error-campo" role="alert">{erroresFormulario.destino}</p>}
              </div>
              <div className="campo-viaje">
              <label htmlFor="viaje-pais">País *</label>
              <input id="viaje-pais" type="text" placeholder="País" required value={pais} disabled={guardando}
                aria-invalid={Boolean(erroresFormulario.pais)} aria-describedby={erroresFormulario.pais ? 'error-pais' : undefined}
                onChange={e => setPais(e.target.value)} />
              {erroresFormulario.pais && <p id="error-pais" className="error-campo" role="alert">{erroresFormulario.pais}</p>}
              </div>
              <div className="campo-viaje">
              <label htmlFor="viaje-fecha">Fecha del viaje *</label>
              <input id="viaje-fecha" type="date" required max={fechaLocal()} value={fecha} disabled={guardando}
                aria-invalid={Boolean(erroresFormulario.fecha)} aria-describedby={erroresFormulario.fecha ? 'error-fecha' : undefined}
                onChange={e => setFecha(e.target.value)} />
              {erroresFormulario.fecha && <p id="error-fecha" className="error-campo" role="alert">{erroresFormulario.fecha}</p>}
              </div>
              <div className="campo-viaje campo-completo">
              <label htmlFor="viaje-descripcion">Tu experiencia</label>
              <textarea id="viaje-descripcion" rows={3} placeholder="Contá tu experiencia, los momentos que querés recordar…" value={descripcion}
                disabled={guardando} onChange={e => setDescripcion(e.target.value)} />
              </div>
              <details className="extras-viaje" open={Boolean(viajeEditando !== null || erroresFormulario.foto || erroresFormulario.fotosAdicionales) || undefined}>
                <summary>Fotografías y lugares destacados (opcional)</summary>
              <div className="campo-viaje campo-completo">
              <label htmlFor="viaje-destacados">Lugares destacados (opcional)</label>
              <textarea id="viaje-destacados" placeholder="Un lugar por línea" value={destacados} disabled={guardando}
                onChange={e => setDestacados(e.target.value)} />
              </div>
              <div className="campo-viaje campo-completo">
              <label htmlFor="viaje-foto">URL de la fotografía principal (opcional)</label>
              <input id="viaje-foto" type="url" placeholder="https://ejemplo.com/mi-viaje.jpg" value={foto} disabled={guardando}
                aria-invalid={Boolean(erroresFormulario.foto)} aria-describedby="ayuda-foto error-foto"
                onChange={e => setFoto(e.target.value)} />
              <p id="ayuda-foto" className="ayuda-foto">Usá enlaces directos a imágenes públicas. Si una imagen no puede cargarse, mostraremos un reemplazo.</p>
              <p id="error-foto" className="error-campo" role="alert">{erroresFormulario.foto}</p>
              </div>
              <div className="campo-viaje campo-completo">
              <label htmlFor="fotos-adicionales">Más fotografías (opcional)</label>
              <textarea id="fotos-adicionales" placeholder="Una URL de imagen por línea" value={fotosAdicionales} disabled={guardando}
                aria-invalid={Boolean(erroresFormulario.fotosAdicionales)} aria-describedby="error-fotos-adicionales"
                onChange={e => setFotosAdicionales(e.target.value)} />
              <p id="error-fotos-adicionales" className="error-campo" role="alert">{erroresFormulario.fotosAdicionales}</p>
              </div>
              </details>
              <p className="ayuda-foto">* Campos obligatorios</p>
              <button type="submit" disabled={ocupadoViajes}>{guardando ? 'Guardando…' : viajeEditando !== null ? 'Guardar cambios' : 'Guardar viaje'}</button>
            </form>

            {(viajeEditando !== null || origenPendiente !== null) && (
              <button type="button" disabled={guardando} onClick={limpiarFormularioViaje}>{origenPendiente ? 'Cancelar conversión' : 'Cancelar edición'}</button>
            )}
          </section>
        )}

        {seccion === 'recuerdos' && (
          <section className="seccion-recuerdos">
            <h1>Mis recuerdos</h1>
            <div className="filtros-recuerdos">
              <div><label htmlFor="buscar-recuerdo">Buscar destino o país</label>
                <input id="buscar-recuerdo" type="search" placeholder="¿Qué viaje querés recordar?" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
              <div><label htmlFor="orden-recuerdos">Ordenar por fecha</label>
                <select id="orden-recuerdos" value={orden} onChange={e => setOrden(e.target.value)}>
                  <option value="recientes">Más recientes primero</option><option value="antiguos">Más antiguos primero</option>
                </select></div>
            </div>
          
            {cargando.viajes ? (
              <p role="status">Cargando tus recuerdos…</p>
            ) : errores.viajes || errores.sesion ? (
              <p>No se pudieron recuperar tus recuerdos.</p>
            ) : viajes.length === 0 ? (
              <div className="estado-vacio"><p>Todavía no guardaste ningún recuerdo. Tu próxima historia empieza con un viaje.</p>
                <button onClick={() => navegarA('viajes')}>Registrar mi primer viaje</button></div>
            ) : viajesOrdenados.length === 0 ? (
              <div className="estado-vacio"><p>No encontramos recuerdos para esa búsqueda.</p><button onClick={() => setBusqueda('')}>Ver todos mis recuerdos</button></div>
            ) : (
              <>
                <div id="carrusel-recuerdos" className={'carrusel-recuerdos' + (viajesOrdenados.length === 1 ? ' recuerdo-unico' : '')} ref={carruselRef}
                  role="region" aria-label="Viajes guardados. Usá las flechas del teclado para desplazarte." tabIndex={0}
                  onPointerDown={iniciarArrastre}
                  onPointerMove={moverArrastre}
                  onPointerUp={terminarArrastre}
                  onPointerCancel={terminarArrastre}
                  onLostPointerCapture={terminarArrastre}
                  onPointerLeave={(evento) => {
                    if (arrastreRef.current?.activo && !arrastreRef.current.movido) terminarArrastre(evento)
                  }}
                  onDragStart={(evento) => evento.preventDefault()}
                  onClickCapture={(evento) => {
                    if (evento.detail > 0 && arrastreRef.current?.movido) {
                      evento.preventDefault()
                      evento.stopPropagation()
                    }
                  }}
                  onKeyDown={navegarRecuerdos}>
                  {viajesOrdenados.map((viaje) => (
                    <article className="tarjeta-recuerdo" key={viaje.id}>
                      <button className="abrir-recuerdo" id={'recuerdo-' + viaje.id}
                        onClick={() => setRecuerdoSeleccionado(recuerdoSeleccionado === viaje.id ? null : viaje.id)}
                        aria-expanded={recuerdoSeleccionado === viaje.id}
                        aria-controls={`experiencia-${viaje.id}`}>
                        <FotoRecuerdo key={obtenerFotos(viaje)[0] || 'sin-foto'} foto={obtenerFotos(viaje)[0]} destino={viaje.destino} />
                        <span className="datos-recuerdo">
                          <span className="destino-recuerdo">{viaje.destino}</span>
                          <span>{viaje.pais}</span>
                          <time dateTime={viaje.fecha}>{viaje.fecha ? viaje.fecha.split('-').reverse().join('/') : 'Sin fecha'}</time>
                          <span className="enlace-experiencia">{recuerdoSeleccionado === viaje.id ? 'Cerrar recuerdo' : 'Ver recuerdo'}</span>
                        </span>
                      </button>
                      <div id={`experiencia-${viaje.id}`} className="experiencia-recuerdo" hidden={recuerdoSeleccionado !== viaje.id}>
                        <h2>Mi experiencia</h2>
                        <p>{viaje.descripcion || 'No agregaste una descripción de este viaje.'}</p>
                        {Array.isArray(viaje.destacados) && viaje.destacados.length > 0 && <><h2>Lugares destacados</h2><ul>{viaje.destacados.map((nombre, indice) => <li key={indice}>{nombre}</li>)}</ul></>}
                        <FotosDelViaje viaje={viaje} />
                      <div className="acciones-recuerdo">
                        <button disabled={ocupadoViajes} onClick={() => editarViaje(viaje)} aria-label={`Editar viaje a ${viaje.destino}`}>Editar</button>
                        <button disabled={ocupadoViajes} onClick={() => eliminarViaje(viaje.id)} aria-label={`Eliminar viaje a ${viaje.destino}`}>Eliminar</button>
                      </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            <Suspense fallback={<p role="status">Cargando tu mapa…</p>}>
              <MapaRecuerdos viajes={viajes} />
            </Suspense>
          </section>
        )}


{seccion === 'destinos' && (
  <section className="seccion-destinos">
    <h1>Por conocer</h1>

    <form onSubmit={agregarLugar} className="formulario" noValidate aria-busy={guardando}>
      <h2>Agregar un destino</h2>

      <label htmlFor="lugar-nombre">Destino *</label>
      <input
        id="lugar-nombre" required aria-invalid={Boolean(erroresLugar.nombre)} aria-describedby="error-lugar-nombre"
        type="text"
        placeholder="Lugar que quiero conocer"
        value={lugar}
        disabled={guardando}
                onChange={(e) => setLugar(e.target.value)}
      />

      <p id="error-lugar-nombre" className="error-campo" role="alert">{erroresLugar.nombre}</p>
      <label htmlFor="lugar-pais">País *</label>
      <input
        id="lugar-pais" required aria-invalid={Boolean(erroresLugar.pais)} aria-describedby="error-lugar-pais"
        type="text"
        placeholder="País"
        value={paisLugar}
        disabled={guardando}
                onChange={(e) => setPaisLugar(e.target.value)}
      />

      <p id="error-lugar-pais" className="error-campo" role="alert">{erroresLugar.pais}</p>
      <label htmlFor="lugar-motivo">¿Por qué querés conocerlo?</label>
      <textarea
        id="lugar-motivo"
        placeholder="¿Por qué quiero conocer este lugar?"
        value={motivo}
        disabled={guardando}
                onChange={(e) => setMotivo(e.target.value)}
      />

      <button type="submit" disabled={ocupadoLugares}>{guardando ? 'Guardando…' : 'Guardar destino'}</button>
    </form>

    <LugaresTuristicos consultar={consultarLugares} guardar={guardarLugarTuristico} guardados={lugares} bloqueado={ocupadoLugares} />

    <div className="lista-viajes">
      <h2>Mis destinos pendientes</h2>

      {!cargando.porConocer && !errores.porConocer && !errores.sesion && lugares.length === 0 && (
        <div className="estado-vacio"><p>Todos los grandes viajes empiezan con un destino soñado.</p><button type="button" onClick={() => document.getElementById('lugar-nombre')?.focus()}>Guardá tu primer destino</button></div>
      )}

      {lugares.length > 0 && (
        <div className={'carrusel-recuerdos carrusel-destinos' + (lugares.length === 1 ? ' destino-unico' : '')}
          role="region" aria-label="Destinos pendientes. Usá las flechas del teclado para desplazarte." tabIndex={0}
          onPointerDown={iniciarArrastre} onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre} onPointerCancel={terminarArrastre}
          onLostPointerCapture={terminarArrastre}
          onPointerLeave={evento => {
            if (arrastreRef.current?.activo && !arrastreRef.current.movido) terminarArrastre(evento)
          }}
          onDragStart={evento => {
            if (!evento.target.closest('.edicion-destino')) evento.preventDefault()
          }}
          onClickCapture={evento => {
            if (evento.detail > 0 && arrastreRef.current?.movido) {
              evento.preventDefault()
              evento.stopPropagation()
            }
          }}
          onKeyDown={navegarRecuerdos}>
      {lugares.map((lugar) => (
        <TarjetaDestino key={lugar.id} lugar={lugar} bloqueado={ocupadoLugares || ocupadoViajes}
          guardar={datos => guardarRegistro('porConocer', datos, lugar.id)}
          eliminar={() => eliminarLugar(lugar.id)} convertir={() => iniciarViajeDesdeLugar(lugar)} />
      ))}
        </div>
      )}
    </div>
  </section>
)}

        <footer className="pie-aplicacion"><span translate="no">VIAJANDO</span><p>Tu mundo, tus historias.</p></footer>
      </main>
    </div>
  )
}

function App() {
  const datos = useDatosUsuario()
  if (datos.comprobandoSesion) return <main className="pantalla-acceso"><header className="bienvenida-acceso"><img className="logo-acceso" src="/viajando.logo.svg" alt="" width="72" height="72" /><h1 translate="no">VIAJANDO</h1><h2>Tu mundo, tus historias</h2></header><p role="status">Comprobando tu sesión…</p></main>
  if (!datos.usuario || datos.usuario.isAnonymous) return <AccesoCuenta key={datos.usuario?.uid || 'acceso'} usuario={datos.usuario} actualizarUsuario={datos.actualizarUsuario} />
  // Un cambio de UID descarta borradores y selecciones de la cuenta anterior.
  return <Aplicacion key={datos.usuario?.uid || 'sin-sesion'} datos={datos} />
}

export default App
