import FotoRecuerdo from './FotoRecuerdo'
import { obtenerFotos } from '../utils/viajes'

export function FotosDelViaje({ viaje }) {
  const fotos = obtenerFotos(viaje)
  if (!fotos.length) return null
  return (
    <div className="fotos-del-viaje" role="region" aria-label={`Fotografías de ${viaje.destino}`} tabIndex={0}>
      {fotos.map((foto, indice) => (
        <figure key={foto}>
          <FotoRecuerdo key={foto} foto={foto} destino={`${viaje.destino}, fotografía ${indice + 1}`} />
          <figcaption>{indice + 1} / {fotos.length}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export default function GaleriaRecuerdos({ viajes, abrirRecuerdo }) {
  const fotos = viajes.flatMap(viaje => obtenerFotos(viaje).map((foto, indice) => ({ viaje, foto, indice })))
  if (!fotos.length) return null
  return (
    <section className="galeria-recuerdos" aria-labelledby="titulo-galeria">
      <h2 id="titulo-galeria">Instantes de tus viajes</h2>
      <div className="cuadricula-fotos">
        {fotos.map(({ viaje, foto, indice }) => (
          <button type="button" key={`${viaje.id}-${indice}`} onClick={() => abrirRecuerdo(viaje.id)}
            aria-label={`Abrir recuerdo de ${viaje.destino}, fotografía ${indice + 1}`}>
            <FotoRecuerdo key={foto} foto={foto} destino={viaje.destino} />
            <span>{viaje.destino}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
