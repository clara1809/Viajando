import { useRef, useState } from 'react'
import './LugaresTuristicos.css'

export default function LugaresTuristicos({ consultar, guardar, guardados, bloqueado }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const consultaEnCurso = useRef(false)

  async function buscar(evento) {
    evento.preventDefault()
    if (consultaEnCurso.current) return
    consultaEnCurso.current = true
    setCargando(true)
    setResultado(null)
    setError('')
    setMensaje('')
    try { setResultado(await consultar(busqueda)) } catch (fallo) { setError(fallo.message) }
    finally { consultaEnCurso.current = false; setCargando(false) }
  }

  async function agregar(lugar) {
    setMensaje('')
    if (await guardar(lugar)) setMensaje(`${lugar.nombre} ya está en tu lista Por conocer.`)
  }

  function estaGuardado(lugar) {
    return guardados.some(item => lugar.wikidataId
      ? item.wikidataId === lugar.wikidataId || item.id === `wikidata-${lugar.wikidataId}`
      : item.osmId === lugar.osmId || item.id === `osm-${lugar.osmId}`)
  }

  function botonGuardar(lugar) {
    const agregado = estaGuardado(lugar)
    return <button type="button" disabled={bloqueado || agregado} onClick={() => agregar(lugar)}>{agregado ? 'Agregado a Por conocer' : 'Agregar a Por conocer'}</button>
  }

  return <div className="descubrir-lugares">
    <form className="formulario" onSubmit={buscar} aria-busy={cargando}>
      <h2>Descubrir lugares</h2>
      <label htmlFor="buscar-lugares">Ciudad o destino</label>
      <input id="buscar-lugares" type="search" required minLength={2} maxLength={120} placeholder="Por ejemplo: Tokio, Japón" value={busqueda} onChange={e => setBusqueda(e.target.value)} disabled={cargando} />
      <p className="ayuda-foto">Buscá una ciudad de cualquier país. Incluí el país para precisar el destino.</p>
      <button type="submit" disabled={cargando}>{cargando ? 'Buscando…' : 'Buscar lugares'}</button>
    </form>
    {cargando && <p role="status">Localizando el destino en Nominatim y consultando atracciones en Wikidata…</p>}
    {error && <p role="alert">{error}</p>}
    {mensaje && <p role="status">{mensaje}</p>}
    {resultado && <div>
      {!resultado.ciudad ? <p role="status">No encontramos ese destino. Revisá su nombre o agregá el país.</p> : <>
        <article className="lugar-turistico"><div>
          <h3>{resultado.ciudad.nombre}</h3>
          <p>Destino encontrado por Nominatim: {resultado.ciudad.ubicacion}</p>
          <p>Coordenadas: {resultado.ciudad.lat.toFixed(5)}, {resultado.ciudad.lon.toFixed(5)}</p>
          <a href={resultado.ciudad.url} target="_blank" rel="noopener noreferrer">Ver destino en OpenStreetMap</a>
          {botonGuardar(resultado.ciudad)}
        </div></article>
        <h4>Lugares cerca de {resultado.ciudad.nombre}</h4>
        {resultado.estado === 'ERROR_ATRACCIONES' ? <p role="alert">{resultado.aviso} Podés guardar el destino encontrado o volver a buscar más tarde.</p> : resultado.lugares.length === 0 ? <p role="status">Wikidata no devolvió atracciones con nombre para esta búsqueda. Podés guardar igualmente el destino encontrado.</p> : <div className="lugares-cuadricula">{resultado.lugares.map(lugar => <article className="lugar-turistico" key={lugar.id}><div>
          <h3>{lugar.nombre}</h3>
          {lugar.categoria && <p>{lugar.categoria}</p>}
          <p>Cerca de {lugar.ciudad}{lugar.pais ? `, ${lugar.pais}` : ''}</p>
          <p>Coordenadas: {lugar.lat.toFixed(5)}, {lugar.lon.toFixed(5)}</p>
          <a href={lugar.url} target="_blank" rel="noopener noreferrer">Más información en Wikidata</a>
          {botonGuardar(lugar)}
        </div></article>)}</div>}
        <p className="lugares-creditos">Hasta 12 atracciones entre los 250 elementos más cercanos, dentro de 5 km del punto del destino. La proximidad no garantiza pertenencia administrativa ni popularidad. La cobertura depende de Wikidata.</p>
      </>}
    </div>}
    <p className="lugares-creditos">Ubicaciones: Nominatim · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">colaboradores de OpenStreetMap</a> · ODbL. Atracciones: <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">Wikidata</a> · CC0.</p>
  </div>
}
