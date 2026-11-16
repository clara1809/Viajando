import { useRef, useState } from 'react'

export default function TarjetaDestino({ lugar, bloqueado, guardar, eliminar, convertir }) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({ nombre: '', pais: '', motivo: '' })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const enCurso = useRef(false)
  const botonEditar = useRef(null)

  function editar() {
    setBorrador({ nombre: lugar.nombre || '', pais: lugar.pais || '', motivo: lugar.motivo || '' })
    setMensaje('')
    setError('')
    setEditando(true)
  }

  function cerrar() {
    setEditando(false)
    setError('')
    requestAnimationFrame(() => botonEditar.current?.focus({ preventScroll: true }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (bloqueado || enCurso.current) return
    if (!borrador.nombre.trim() || !borrador.pais.trim()) {
      setError('Completá el destino y el país.')
      return
    }
    enCurso.current = true
    setError('')
    try {
      const guardado = await guardar(Object.fromEntries(Object.entries(borrador).map(([campo, valor]) => [campo, valor.trim()])))
      if (!guardado) { setError('No se pudieron guardar los cambios. Intentá nuevamente.'); return }
      setMensaje('Los cambios se guardaron correctamente.')
      cerrar()
    } finally { enCurso.current = false }
  }

  const campo = nombre => ({ value: borrador[nombre], disabled: bloqueado, onChange: evento => setBorrador({ ...borrador, [nombre]: evento.target.value }) })

  return (
    <article className="tarjeta-viaje">
      {editando ? (
        <form className="formulario edicion-destino" onSubmit={enviar} noValidate aria-busy={bloqueado}>
          <h3>Editar destino</h3>
          <label htmlFor={`nombre-${lugar.id}`}>Destino *</label>
          <input id={`nombre-${lugar.id}`} required autoFocus {...campo('nombre')} />
          <label htmlFor={`pais-${lugar.id}`}>País *</label>
          <input id={`pais-${lugar.id}`} required {...campo('pais')} />
          <label htmlFor={`motivo-${lugar.id}`}>¿Por qué querés conocerlo?</label>
          <textarea id={`motivo-${lugar.id}`} rows={3} {...campo('motivo')} />
          {error && <p className="error-campo" role="alert">{error}</p>}
          <div className="acciones-destino">
            <button type="submit" disabled={bloqueado}>{bloqueado ? 'Guardando…' : 'Guardar cambios'}</button>
            <button type="button" disabled={bloqueado} onClick={cerrar}>Cancelar</button>
          </div>
        </form>
      ) : (
        <>
          <h3>{lugar.nombre}</h3>
          <p>{lugar.pais}</p>
          <p>{lugar.motivo}</p>
          {lugar.categoria && <p>{lugar.categoria}</p>}
          {lugar.catalogoId && <p>{lugar.ciudad} · Selección local de VIAJANDO</p>}
          {lugar.ubicacion && <p>{lugar.ubicacion}</p>}
          <div className="acciones-destino">
            <button disabled={bloqueado} onClick={convertir}>¡Ya lo conocí!</button>
            <button ref={botonEditar} disabled={bloqueado} onClick={editar}>Editar</button>
            <button disabled={bloqueado} onClick={eliminar}>Eliminar</button>
            {mensaje && <p className="confirmacion-destino" role="status">{mensaje}</p>}
          </div>
        </>
      )}
    </article>
  )
}
