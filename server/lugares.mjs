const fallo = (status, codigo, mensaje) => Object.assign(new Error(mensaje), { status, codigo })
const dia = 86400000

function coordenadas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

export function normalizarCiudad(datos) {
  if (!Array.isArray(datos)) throw fallo(502, 'RESPUESTA_INVALIDA', 'Nominatim devolvió una respuesta inválida.')
  if (!datos.length) return null
  const lugar = datos[0]
  const lat = Number(lugar?.lat), lon = Number(lugar?.lon)
  if (!lugar?.lat || !lugar?.lon || !coordenadas(lat, lon) || !['node', 'way', 'relation'].includes(lugar.osm_type) || !Number.isSafeInteger(lugar.osm_id)) throw fallo(502, 'RESPUESTA_INVALIDA', 'No pudimos verificar la ubicación devuelta por Nominatim.')
  return {
    id: `${lugar.osm_type}-${lugar.osm_id}`, osmId: `${lugar.osm_type}-${lugar.osm_id}`,
    nombre: lugar.name || lugar.display_name?.split(',')[0] || 'Destino encontrado',
    ciudad: lugar.name || lugar.address?.city || lugar.address?.town || '', pais: lugar.address?.country || '',
    categoria: 'Ciudad o destino', lat, lon, ubicacion: lugar.display_name || '',
    url: `https://www.openstreetmap.org/${lugar.osm_type}/${lugar.osm_id}`, origen: 'nominatim',
  }
}

export function construirConsulta(lat, lon) {
  if (!coordenadas(lat, lon)) throw fallo(400, 'COORDENADAS_INVALIDAS', 'Las coordenadas de la búsqueda no son válidas.')
  // Solo se interpolan números validados, nunca texto libre del usuario.
  // El orden explícito evita comenzar por todas las subclases del grafo mundial.
  return `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX hint: <http://www.bigdata.com/queryHints#>
SELECT ?item ?itemLabel ?categoria ?coord WHERE {
  hint:Query hint:optimizer "None" .
  { SELECT ?item (SAMPLE(?etiqueta) AS ?categoria) (SAMPLE(?punto) AS ?coord) WHERE {
    { SELECT ?item ?punto ?distancia WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?punto .
        bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "5" .
        bd:serviceParam wikibase:distance ?distancia .
      }
    } ORDER BY ?distancia LIMIT 250 }
    VALUES (?tipo ?etiqueta) {
      (wd:Q33506 "Museo") (wd:Q4989906 "Monumento")
      (wd:Q839954 "Sitio arqueológico") (wd:Q1081138 "Sitio histórico")
      (wd:Q570116 "Atracción turística")
    }
    ?item wdt:P31 ?clase .
    ?clase wdt:P279* ?tipo .
  } GROUP BY ?item LIMIT 36 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,mul" . }
} LIMIT 36`
}

export function normalizarAtracciones(datos, ciudad) {
  if (!Array.isArray(datos?.results?.bindings)) throw fallo(502, 'RESPUESTA_INVALIDA', 'Wikidata devolvió una respuesta inválida.')
  const vistos = new Set(), puntosVistos = new Set()
  return datos.results.bindings.flatMap(fila => {
    const id = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/.exec(fila.item?.value)?.[1]
    const nombre = fila.itemLabel?.value?.trim()
    const punto = /^Point\(\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s*\)$/.exec(fila.coord?.value || '')
    if (!id || !nombre || nombre === id || !punto || vistos.has(id)) return []
    const lon = Number(punto[1]), lat = Number(punto[2])
    if (!coordenadas(lat, lon)) return []
    const firma = `${nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}|${lat.toFixed(4)}|${lon.toFixed(4)}`
    if (puntosVistos.has(firma)) return []
    vistos.add(id)
    puntosVistos.add(firma)
    return [{ id, wikidataId: id, nombre, categoria: fila.categoria?.value || '', ciudad: ciudad.nombre, pais: ciudad.pais, lat, lon, url: `https://www.wikidata.org/wiki/${id}`, origen: 'wikidata' }]
  }).slice(0, 12)
}

async function pedirJSON(solicitar, url, headers, servicio, tiempo) {
  try {
    const respuesta = await solicitar(url, { headers, signal: AbortSignal.timeout(tiempo) })
    if (!respuesta.ok) throw fallo(respuesta.status === 429 ? 429 : 503, 'SERVICIO_NO_DISPONIBLE', `${servicio} está ocupado o no está disponible. Intentá nuevamente más tarde.`)
    try { return await respuesta.json() } catch (error) {
      if (['TimeoutError', 'AbortError'].includes(error.name)) throw error
      throw fallo(502, 'RESPUESTA_INVALIDA', `${servicio} no devolvió una respuesta JSON válida.`)
    }
  } catch (error) {
    if (error.status) throw error
    const tiempoAgotado = ['TimeoutError', 'AbortError'].includes(error.name)
    throw fallo(tiempoAgotado ? 504 : 502, tiempoAgotado ? 'TIEMPO_AGOTADO' : 'CONEXION', tiempoAgotado ? `${servicio} tardó demasiado en responder. Intentá nuevamente más tarde.` : `No pudimos conectar con ${servicio}. Intentá nuevamente más tarde.`)
  }
}

export function crearHandler({ solicitar = fetch, env = process.env, ahora = Date.now } = {}) {
  const geocache = new Map(), cache = new Map(), pendientes = new Map()
  let proximaConsulta = 0, wikidataBloqueadoHasta = 0
  const guardarCache = (mapa, key, datos) => {
    if (mapa.size >= 100) mapa.delete(mapa.keys().next().value)
    mapa.set(key, { datos, hasta: ahora() + dia })
  }
  async function consultar(destino) {
    const contacto = env.OSM_APP_CONTACT || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    if (env.VERCEL && !contacto) throw fallo(503, 'CONFIGURACION', 'Configurá OSM_APP_CONTACT con la URL pública de VIAJANDO.')
    const headers = { 'User-Agent': `VIAJANDO/1.0 (${contacto || 'trabajo practico; desarrollo local'})`, Accept: 'application/json' }
    const key = destino.toLowerCase()
    let ciudad = geocache.get(key)?.hasta > ahora() ? geocache.get(key).datos : undefined
    if (ciudad === undefined) {
      if (ahora() < proximaConsulta) throw fallo(429, 'LIMITE_LOCAL', 'Esperá unos segundos antes de buscar otro destino.')
      proximaConsulta = ahora() + 1200
      const url = new URL(env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search')
      url.search = new URLSearchParams({ q: destino, format: 'jsonv2', addressdetails: '1', extratags: '1', limit: '1', 'accept-language': 'es' })
      ciudad = normalizarCiudad(await pedirJSON(solicitar, url, headers, 'Nominatim', 8000))
      guardarCache(geocache, key, ciudad)
    }
    if (!ciudad) return { ciudad: null, lugares: [], estado: 'DESTINO_NO_ENCONTRADO' }
    const ciudadCache = cache.get(ciudad.id)
    if (ciudadCache?.hasta > ahora()) return { ciudad, ...ciudadCache.datos }
    try {
      if (ahora() < wikidataBloqueadoHasta) throw fallo(429, 'LIMITE_WIKIDATA', 'Wikidata pidió una pausa. Esperá un minuto antes de volver a buscar atracciones.')
      const url = new URL(env.WIKIDATA_SPARQL_URL || 'https://query.wikidata.org/sparql')
      url.search = new URLSearchParams({ query: construirConsulta(ciudad.lat, ciudad.lon), format: 'json' })
      const datos = await pedirJSON(solicitar, url, { ...headers, Accept: 'application/sparql-results+json' }, 'Wikidata', 16000)
      const lugares = normalizarAtracciones(datos, ciudad)
      const resultado = { lugares, estado: lugares.length ? 'OK' : 'SIN_ATRACCIONES' }
      guardarCache(cache, ciudad.id, resultado)
      return { ciudad, ...resultado }
    } catch (error) {
      if (error.status === 429) wikidataBloqueadoHasta = ahora() + 60000
      // La ciudad sigue disponible para guardar aunque falle la segunda API.
      return { ciudad, lugares: [], estado: 'ERROR_ATRACCIONES', aviso: error.status ? error.message : 'No pudimos consultar las atracciones de Wikidata.', codigoAviso: error.codigo || 'ERROR_WIKIDATA' }
    }
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Método no permitido.' }) }
    const destino = new URL(req.url, 'http://localhost').searchParams.get('destino')?.trim().replace(/\s+/g, ' ')
    if (!destino || destino.length < 2 || destino.length > 120) return res.status(400).json({ error: 'Ingresá una ciudad o destino de entre 2 y 120 caracteres. Podés incluir el país.', codigo: 'DESTINO_INVALIDO' })
    const key = destino.toLowerCase()
    try {
      if (!pendientes.has(key)) pendientes.set(key, consultar(destino).finally(() => pendientes.delete(key)))
      return res.status(200).json(await pendientes.get(key))
    } catch (error) {
      if (error.status === 429) res.setHeader('Retry-After', '3')
      return res.status(error.status || 502).json({ error: error.status ? error.message : 'No pudimos completar la búsqueda del destino.', codigo: error.codigo || 'ERROR_SERVIDOR' })
    }
  }
}
