export function crearConsultaLugares(solicitar = fetch) {
  const cache = new Map()
  return function consultar(destino) {
    const key = destino.trim().replace(/\s+/g, ' ').toLowerCase()
    const anterior = cache.get(key)
    if (anterior && anterior.hasta > Date.now()) return anterior.promesa
    const promesa = (async () => {
      let respuesta
      try {
        respuesta = await solicitar(`/api/lugares?${new URLSearchParams({ destino: destino.trim() })}`, { signal: AbortSignal.timeout(27000) })
      } catch (error) {
        throw new Error(error.name === 'TimeoutError' ? 'La búsqueda tardó demasiado. Intentá nuevamente.' : 'No pudimos conectar con VIAJANDO. Revisá tu conexión a internet.', { cause: error })
      }
      let datos
      try { datos = await respuesta.json() } catch { throw new Error('El servidor no devolvió una respuesta válida para la búsqueda.') }
      if (!respuesta.ok) throw new Error(datos.error || 'No pudimos consultar el destino.')
      if (!Object.hasOwn(datos, 'ciudad') || !Array.isArray(datos.lugares)) throw new Error('La respuesta de búsqueda no es válida.')
      if (datos.estado === 'ERROR_ATRACCIONES') cache.delete(key)
      return datos
    })().catch(error => { cache.delete(key); throw error })
    if (cache.size >= 100) cache.delete(cache.keys().next().value)
    cache.set(key, { promesa, hasta: Date.now() + 86400000 })
    return promesa
  }
}
