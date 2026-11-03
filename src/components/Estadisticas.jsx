import { obtenerContinentesVisitados, obtenerPaisesVisitados } from '../utils/paises'
import continentes from '../data/continentes.json'

export default function Estadisticas({ viajes, lugares, cargando, error }) {
  const indicadores = [
    ['Viajes realizados', viajes.length],
    ['Países visitados', obtenerPaisesVisitados(viajes).size],
    ['Destinos por conocer', lugares.length],
    ['Continentes recorridos', obtenerContinentesVisitados(viajes, continentes).size]
  ]
  return (
    <section className="inicio-estadisticas" aria-labelledby="titulo-estadisticas" aria-busy={cargando}>
      <h2 id="titulo-estadisticas">Tu mundo en números</h2>
      <dl className="lista-estadisticas" aria-live="polite">
        {indicadores.map(([nombre, valor]) => (
          <div key={nombre}><dt>{nombre}</dt><dd>{cargando || error ? '—' : valor}</dd></div>
        ))}
      </dl>
      {error && <p>No pudimos cargar tus estadísticas. Reintentá la conexión.</p>}
      {cargando && <p role="status">Cargando tus estadísticas…</p>}
    </section>
  )
}
