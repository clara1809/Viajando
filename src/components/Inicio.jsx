import { useRef } from 'react'
import Estadisticas from './Estadisticas'
import './Inicio.css'

// Contenido editorial de Inicio; no se guarda en las colecciones del usuario.
const destinos = [
  { ciudad: 'París', pais: 'Francia', foto: '1499856871958-5b9627545d1a', alt: 'París junto al río Sena' },
  { ciudad: 'Nueva York', pais: 'Estados Unidos', foto: '1485871981521-5b1fd3805eee', alt: 'Edificios de Nueva York' },
  { ciudad: 'Roma', pais: 'Italia', foto: '1552832230-c0197dd311b5', alt: 'El Coliseo de Roma' },
  { ciudad: 'Tokio', pais: 'Japón', foto: '1540959733332-eab4deabeeaf', alt: 'Vista urbana de Tokio' },
  { ciudad: 'Santorini', pais: 'Grecia', foto: '1613395877344-13d4a8e0d49e', alt: 'Casas blancas junto al mar en Santorini' },
  { ciudad: 'Río de Janeiro', pais: 'Brasil', foto: '1483729558449-99ef09a8c325', alt: 'Costa y montañas de Río de Janeiro' }
]

function usarImagenReemplazo(evento) {
  if (evento.currentTarget.getAttribute('src') !== '/recuerdo.svg') {
    evento.currentTarget.src = '/recuerdo.svg'
  }
}

export default function Inicio({ explorarRecuerdos, viajes, lugares, cargando, error }) {
  const carruselRef = useRef(null)
  const arrastreRef = useRef(null)

  function desplazar(direccion) {
    const carrusel = carruselRef.current
    const tarjeta = carrusel.querySelector('article')
    carrusel.scrollBy({
      left: direccion * (tarjeta.getBoundingClientRect().width + 24),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    })
  }

  function iniciarArrastre(evento) {
    if (evento.pointerType !== 'mouse' || evento.button !== 0) return
    arrastreRef.current = { x: evento.clientX, scroll: evento.currentTarget.scrollLeft, movido: false }
  }

  function moverArrastre(evento) {
    const arrastre = arrastreRef.current
    if (!arrastre) return
    const distancia = evento.clientX - arrastre.x
    if (!arrastre.movido && Math.abs(distancia) < 6) return
    arrastre.movido = true
    evento.currentTarget.setPointerCapture(evento.pointerId)
    evento.currentTarget.classList.add('inicio-arrastrando')
    evento.preventDefault()
    evento.currentTarget.scrollLeft = arrastre.scroll - distancia
  }

  function terminarArrastre(evento) {
    arrastreRef.current = null
    evento.currentTarget.classList.remove('inicio-arrastrando')
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    }
  }

  return (
    <div className="inicio-pagina">
      <section className="inicio-hero" aria-labelledby="titulo-inicio">
        <div className="inicio-presentacion">
          <p className="inicio-antetitulo">Un diario para tu próxima historia</p>
          <h1 id="titulo-inicio">VIAJANDO</h1>
          <h2>Tu mundo, tus historias</h2>
          <p className="inicio-descripcion">Guardá tus viajes, reviví tus recuerdos y dale un lugar a todo eso que todavía soñás conocer.</p>
          <button type="button" onClick={explorarRecuerdos}>Explorá mis recuerdos <span aria-hidden="true">↗</span></button>
        </div>
        <figure className="inicio-panoramica">
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1800&q=85"
            alt="Un lago entre montañas y un pueblo junto a la costa"
            fetchPriority="high" onError={usarImagenReemplazo}
          />
          <figcaption>Hay lugares que se quedan con vos.</figcaption>
        </figure>
      </section>

      <section className="inicio-inspiracion" aria-labelledby="titulo-inspiracion">
        <div className="inicio-cabecera">
          <div>
            <p className="inicio-antetitulo">El próximo viaje empieza con una idea</p>
            <h2 id="titulo-inspiracion">Lugares que inspiran</h2>
          </div>
          <div className="inicio-controles" aria-label="Controles de destinos">
            <button type="button" onClick={() => desplazar(-1)} aria-label="Ver destinos anteriores" aria-controls="destinos-inspiracion">←</button>
            <button type="button" onClick={() => desplazar(1)} aria-label="Ver destinos siguientes" aria-controls="destinos-inspiracion">→</button>
          </div>
        </div>
        <div id="destinos-inspiracion" className="inicio-destinos" ref={carruselRef}
          role="region" aria-label="Destinos para inspirarte" tabIndex={0}
          onPointerDown={iniciarArrastre} onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre} onPointerCancel={terminarArrastre}
          onLostPointerCapture={terminarArrastre}
          onPointerLeave={(evento) => {
            if (!arrastreRef.current?.movido) terminarArrastre(evento)
          }}
          onDragStart={(evento) => evento.preventDefault()}
          onKeyDown={(evento) => {
            if (evento.target !== evento.currentTarget) return
            if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
              evento.preventDefault()
              desplazar(evento.key === 'ArrowLeft' ? -1 : 1)
            }
          }}>
          {destinos.map((destino, indice) => (
            <article className="inicio-destino" key={destino.ciudad}>
              <div className="inicio-foto-destino">
                <img src={`https://images.unsplash.com/photo-${destino.foto}?auto=format&fit=crop&w=900&q=80`}
                  alt={destino.alt} loading="lazy" draggable={false} onError={usarImagenReemplazo} />
              </div>
              <div className="inicio-pie-destino">
                <div><h3>{destino.ciudad}</h3><p>{destino.pais}</p></div>
                <span className="inicio-numero" aria-hidden="true">{String(indice + 1).padStart(2, '0')}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Estadisticas viajes={viajes} lugares={lugares} cargando={cargando} error={error} />

      <section className="inicio-preguntas" aria-labelledby="titulo-preguntas">
        <p className="inicio-antetitulo">Antes de empezar</p>
        <h2 id="titulo-preguntas">Preguntas frecuentes</h2>
        <div className="inicio-lista-preguntas">
          <details>
            <summary>¿Cómo registro un viaje?</summary>
            <p>Entrá a «Mis viajes», completá el destino, el país y la fecha. Podés agregar una descripción y una fotografía mediante su URL. Después, seleccioná «Guardar viaje».</p>
          </details>
          <details>
            <summary>¿Dónde puedo ver y editar mis recuerdos?</summary>
            <p>En «Mis recuerdos» aparecen los viajes que registraste. Abrí «Ver recuerdo» para leer la experiencia completa y acceder a las opciones de editar o eliminar.</p>
          </details>
          <details>
            <summary>¿Puedo guardar lugares que todavía no visité?</summary>
            <p>Sí. En «Por conocer» podés guardar el destino, el país y el motivo por el que querés visitarlo. También podés editarlo, eliminarlo o seleccionar «¡Ya lo conocí!» para convertirlo en un viaje realizado.</p>
          </details>
          <details>
            <summary>¿Cómo agrego una fotografía?</summary>
            <p>Pegá el enlace directo a una imagen pública en el campo de fotografía principal. Podés agregar más enlaces en «Más fotografías», uno por línea. Si no agregás una fotografía o no puede cargarse, se mostrará una imagen de reemplazo.</p>
          </details>
          <details>
            <summary>¿Mis viajes se conservan al cerrar la página?</summary>
            <p>Sí, una vez confirmado el guardado, tus viajes y destinos quedan almacenados. Volvé desde el mismo navegador para recuperarlos. Si borrás sus datos o usás otro navegador, la sesión anónima será diferente y no verás los mismos registros.</p>
          </details>
          <details>
            <summary>¿Cómo se actualiza mi mapa de países visitados?</summary>
            <p>El mapa utiliza el país de cada viaje registrado. Los países se cuentan una sola vez, aunque tengas varios viajes al mismo lugar. Si eliminás todos los viajes de un país, deja de aparecer como visitado.</p>
          </details>
        </div>
      </section>
    </div>
  )
}
