// Mantiene la foto anterior y suma fotos nuevas sin duplicarlas.
export function obtenerFotos(viaje) {
  return [...new Set([viaje.foto, ...(Array.isArray(viaje.fotos) ? viaje.fotos : [])]
    .filter(foto => typeof foto === 'string' && foto.trim()).map(foto => foto.trim()))]
}

export function separarLineas(texto) {
  return [...new Set(texto.split('\n').map(linea => linea.trim()).filter(Boolean))]
}

export function validarViaje(datos, hoy = new Date()) {
  const errores = {}
  if (!datos.destino.trim()) errores.destino = 'Ingresá la ciudad o el destino.'
  if (!datos.pais.trim()) errores.pais = 'Ingresá el país del viaje.'
  const fecha = new Date(`${datos.fecha}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) || Number.isNaN(fecha.getTime()) ||
      fecha.getFullYear() !== Number(datos.fecha.slice(0, 4)) ||
      fecha.getMonth() + 1 !== Number(datos.fecha.slice(5, 7)) ||
      fecha.getDate() !== Number(datos.fecha.slice(8, 10))) {
    errores.fecha = 'Ingresá una fecha válida.'
  } else if (datos.fecha > fechaLocal(hoy)) {
    errores.fecha = 'La fecha de un viaje realizado no puede ser futura.'
  }
  for (const campo of ['foto', 'fotosAdicionales']) {
    const fotos = campo === 'foto' ? [datos.foto.trim()].filter(Boolean) : separarLineas(datos.fotosAdicionales)
    if (fotos.some(foto => {
      try { return !['http:', 'https:'].includes(new URL(foto).protocol) }
      catch { return true }
    })) errores[campo] = 'Usá enlaces completos que comiencen con https:// o http://. Una URL por línea.'
  }
  return errores
}

export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export function filtrarViajes(viajes, busqueda, orden) {
  const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const consulta = normalizar(busqueda.trim())
  return viajes.filter(viaje => normalizar(`${viaje.destino} ${viaje.pais}`).includes(consulta))
    .sort((a, b) => {
      if (!a.fecha) return b.fecha ? 1 : 0
      if (!b.fecha) return -1
      return orden === 'antiguos' ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)
    })
}
