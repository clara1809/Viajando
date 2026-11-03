import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import paises from '../data/mapaMundial.json'
import { obtenerCodigoPais, obtenerPaisesVisitados } from '../utils/paises'
import './MapaRecuerdos.css'

const paisesDelMapa = paises.filter(pais => pais.iso2 !== 'AQ' && pais.id !== 'ATA')

export default function MapaRecuerdos({ viajes }) {
  const [etiqueta, setEtiqueta] = useState({ nombre: '', paisId: null, x: 0, y: 0, visible: false })
  const etiquetaRef = useRef(null)
  const mapaRef = useRef(null)
  const toqueRef = useRef(null)
  const etiquetaId = useId()

  function mostrarEtiqueta(evento, pais) {
    setEtiqueta({ nombre: pais.nombres[0], paisId: pais.id, x: evento.clientX, y: evento.clientY, visible: true })
  }

  function ocultarEtiqueta() {
    setEtiqueta(anterior => anterior.visible ? { ...anterior, visible: false } : anterior)
  }

  // Mide el texto real y cambia de lado si el cursor está cerca de un borde.
  useLayoutEffect(() => {
    if (!etiqueta.visible || !etiquetaRef.current) return
    const elemento = etiquetaRef.current
    const { width, height } = elemento.getBoundingClientRect()
    const margen = 8
    const distancia = 16
    const ancho = document.documentElement.clientWidth
    const alto = window.innerHeight
    const x = etiqueta.x + distancia + width <= ancho - margen
      ? etiqueta.x + distancia : etiqueta.x - width - distancia
    const y = etiqueta.y + distancia + height <= alto - margen
      ? etiqueta.y + distancia : etiqueta.y - height - distancia
    elemento.style.left = `${Math.max(margen, Math.min(x, ancho - width - margen))}px`
    elemento.style.top = `${Math.max(margen, Math.min(y, alto - height - margen))}px`
  }, [etiqueta])

  useEffect(() => {
    function cerrar() {
      toqueRef.current = null
      setEtiqueta(anterior => anterior.visible ? { ...anterior, visible: false } : anterior)
    }
    function cerrarFuera(evento) {
      if (!mapaRef.current?.contains(evento.target)) cerrar()
    }
    function cerrarConTeclado(evento) {
      if (evento.key === 'Escape') cerrar()
    }
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarConTeclado)
    return () => {
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConTeclado)
    }
  }, [])

  // Se deriva de los viajes: agregar, editar o eliminar actualiza mapa y contador.
  const visitados = obtenerPaisesVisitados(viajes)
  const sinReconocer = [...new Set(viajes
    .filter(viaje => !obtenerCodigoPais(viaje.pais))
    .map(viaje => viaje.pais))]

  return (
    <section className="mapa-recuerdos" aria-label="Países recorridos">
      <h2>Mi mundo recorrido</h2>
      <svg ref={mapaRef} viewBox="0 6 1080 450" role="img" aria-labelledby="titulo-mapa descripcion-mapa"
        onPointerLeave={(evento) => { if (evento.pointerType === 'mouse') ocultarEtiqueta() }}>
        <title id="titulo-mapa">Mapa de tus viajes</title>
        <desc id="descripcion-mapa">
          Países visitados en marrón oscuro y países pendientes en gris claro.
          Mapa sin Antártida. Pasá el mouse o tocá un país para consultar su nombre.
        </desc>
        {paisesDelMapa.map(pais => (
          <path key={pais.id} d={pais.trazado}
            className={visitados.has(pais.id) ? 'pais-mapa pais-visitado' : 'pais-mapa'}
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" fillRule="evenodd"
            aria-label={pais.nombres[0]}
            aria-describedby={etiqueta.visible && etiqueta.paisId === pais.id ? etiquetaId : undefined}
            onPointerEnter={(evento) => { if (evento.pointerType === 'mouse') mostrarEtiqueta(evento, pais) }}
            onPointerMove={(evento) => {
              if (evento.pointerType === 'mouse') mostrarEtiqueta(evento, pais)
              else if (toqueRef.current && Math.hypot(evento.clientX - toqueRef.current.x, evento.clientY - toqueRef.current.y) > 8) {
                toqueRef.current = null
                ocultarEtiqueta()
              }
            }}
            onPointerLeave={(evento) => { if (evento.pointerType === 'mouse') ocultarEtiqueta() }}
            onPointerDown={(evento) => {
              if (evento.pointerType !== 'mouse') {
                ocultarEtiqueta()
                toqueRef.current = { id: evento.pointerId, paisId: pais.id, x: evento.clientX, y: evento.clientY }
              }
            }}
            onPointerUp={(evento) => {
              const toque = toqueRef.current
              if (toque?.id === evento.pointerId && toque.paisId === pais.id && Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) <= 8) {
                mostrarEtiqueta(evento, pais)
              }
              toqueRef.current = null
            }}
            onPointerCancel={() => { toqueRef.current = null; ocultarEtiqueta() }} />
        ))}
      </svg>
      {createPortal(
        <div ref={etiquetaRef} id={etiquetaId} role="tooltip" aria-hidden={!etiqueta.visible}
          className={`mapa-etiqueta${etiqueta.visible ? ' mapa-etiqueta-visible' : ''}`}>
          {etiqueta.nombre}
        </div>,
        document.body
      )}
      <p className="contador-paises" aria-live="polite">
        {visitados.size === 1 ? '1 país visitado' : `${visitados.size} países visitados`}
      </p>
      {sinReconocer.length > 0 && (
        <p className="aviso-paises" role="status">
          No pudimos ubicar estos países: {sinReconocer.join(', ')}.
          Revisá el campo País de esos viajes; podés usar el nombre en español o su código ISO.
        </p>
      )}
    </section>
  )
}
