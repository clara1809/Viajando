import { useState } from 'react'

export default function FotoRecuerdo({ foto, destino }) {
  const [errorImagen, setErrorImagen] = useState(false)
  const mostrarReemplazo = !foto || errorImagen
  return (
    <>
      <img draggable={false} loading="lazy" src={mostrarReemplazo ? '/recuerdo.svg' : foto}
        alt={mostrarReemplazo ? `Imagen de reemplazo para ${destino}` : `Recuerdo de ${destino}`}
        onError={mostrarReemplazo ? undefined : () => setErrorImagen(true)} />
      {errorImagen && <span className="error-foto" role="status">No pudimos cargar la fotografía. Revisá su enlace al editar el viaje.</span>}
    </>
  )
}
