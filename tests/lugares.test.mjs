import test from 'node:test'
import assert from 'node:assert/strict'
import { crearHandler, normalizarCiudad, construirConsulta, normalizarAtracciones } from '../server/lugares.mjs'
import { crearConsultaLugares } from '../src/services/lugares.js'

async function llamar(handler, destino = 'Ciudad de prueba, País', method = 'GET') {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
  await handler({ method, url: `/api/lugares?${new URLSearchParams({ destino })}` }, res)
  return res
}
const geo = { name: 'Ciudad de prueba', display_name: 'Ciudad de prueba, País', lat: '35.67', lon: '139.76', osm_type: 'relation', osm_id: 123, address: { country: 'País' } }
const fila = (id = 'Q123', nombre = 'Museo de prueba', punto = 'Point(139.761 35.671)') => ({ item: { value: `http://www.wikidata.org/entity/${id}` }, itemLabel: { value: nombre }, categoria: { value: 'Museo' }, coord: { value: punto } })
const json = datos => ({ ok: true, json: async () => datos })
const sparql = filas => ({ results: { bindings: filas } })

test('Busca cualquier texto con Nominatim antes de consultar Wikidata y reutiliza caché', async () => {
  const llamadas = []
  const handler = crearHandler({ env: {}, solicitar: async (url, opciones) => {
    llamadas.push({ url, opciones })
    return json(String(url).includes('nominatim') ? [geo] : sparql([fila()]))
  } })
  const res = await llamar(handler, 'Una ciudad fuera del catálogo, País')
  assert.equal(res.code, 200)
  assert.equal(res.data.ciudad.osmId, 'relation-123')
  assert.equal(res.data.lugares[0].wikidataId, 'Q123')
  assert.equal(llamadas[0].url.searchParams.get('q'), 'Una ciudad fuera del catálogo, País')
  assert.equal(llamadas[0].url.searchParams.get('limit'), '1')
  assert.match(llamadas[0].opciones.headers['User-Agent'], /VIAJANDO/)
  assert.equal(llamadas[1].url.hostname, 'query.wikidata.org')
  assert.match(llamadas[1].url.searchParams.get('query'), /Point\(139.76 35.67\)/)
  await llamar(handler, 'Una ciudad fuera del catálogo, País')
  assert.equal(llamadas.length, 2)
})

test('SPARQL está acotado geográficamente y no interpola texto del usuario', () => {
  const query = construirConsulta(35.67, 139.76)
  assert.match(query, /radius "5"/)
  assert.match(query, /LIMIT 250/)
  assert.match(query, /LIMIT 36/)
  assert.match(query, /optimizer "None"/)
  assert.match(query, /Q33506/)
  assert.match(query, /Q4989906/)
  assert.throws(() => construirConsulta('0); DROP', 2), /coordenadas/)
  assert.throws(() => construirConsulta(91, 2), /coordenadas/)
})

test('Normaliza resultados reales, limita a 12 y omite IDs repetidos o mismo nombre/punto', () => {
  const ciudad = normalizarCiudad([geo])
  const filas = [fila(), fila(), fila('Q124'), fila('Q125', 'Q125'), fila('Q126', 'Sin ubicación', 'punto inválido'), ...Array.from({ length: 20 }, (_, i) => fila(`Q${200 + i}`, `Museo ${i}`))]
  const resultado = normalizarAtracciones(sparql(filas), ciudad)
  assert.equal(resultado.length, 12)
  assert.equal(resultado[0].lat, 35.671)
  assert.equal(resultado[0].url, 'https://www.wikidata.org/wiki/Q123')
  assert.equal(resultado.filter(lugar => lugar.nombre === 'Museo de prueba').length, 1)
  assert.equal(normalizarAtracciones(sparql([fila('Q301', '博物館'), fila('Q302', '美術館')]), ciudad).length, 2)
  assert.throws(() => normalizarAtracciones({}, ciudad), /inválida/)
})

test('Ciudad desconocida no consulta Wikidata y ciudad sin atracciones sigue disponible', async () => {
  let llamadas = 0
  const sinCiudad = crearHandler({ env: {}, solicitar: async () => { llamadas++; return json([]) } })
  const res = await llamar(sinCiudad)
  assert.equal(res.data.estado, 'DESTINO_NO_ENCONTRADO')
  assert.equal(llamadas, 1)
  const sinAtracciones = crearHandler({ env: {}, solicitar: async url => json(String(url).includes('nominatim') ? [geo] : sparql([])) })
  const vacio = await llamar(sinAtracciones)
  assert.equal(vacio.data.estado, 'SIN_ATRACCIONES')
  assert.equal(vacio.data.ciudad.osmId, 'relation-123')
})

test('Fallo Wikidata conserva ciudad y permite reintentar sin repetir Nominatim', async () => {
  let geollamadas = 0, fallar = true
  const handler = crearHandler({ env: {}, solicitar: async url => {
    if (String(url).includes('nominatim')) { geollamadas++; return json([geo]) }
    if (fallar) throw Object.assign(new Error(), { name: 'TimeoutError' })
    return json(sparql([fila()]))
  } })
  const fallo = await llamar(handler)
  assert.equal(fallo.code, 200)
  assert.equal(fallo.data.estado, 'ERROR_ATRACCIONES')
  assert.equal(fallo.data.codigoAviso, 'TIEMPO_AGOTADO')
  assert.equal(fallo.data.ciudad.osmId, 'relation-123')
  fallar = false
  assert.equal((await llamar(handler)).data.lugares.length, 1)
  assert.equal(geollamadas, 1)
})

test('Valida entrada, limita frecuencia y respeta pausa tras HTTP 429 de Wikidata', async () => {
  let reloj = 0, wdllamadas = 0
  const handler = crearHandler({ env: {}, ahora: () => reloj, solicitar: async url => {
    if (String(url).includes('nominatim')) return json([geo])
    wdllamadas++
    return { ok: false, status: 429 }
  } })
  assert.equal((await llamar(handler, '')).code, 400)
  assert.equal((await llamar(handler, 'Roma', 'POST')).code, 405)
  assert.equal((await llamar(handler)).data.estado, 'ERROR_ATRACCIONES')
  assert.equal((await llamar(handler)).data.codigoAviso, 'LIMITE_WIKIDATA')
  assert.equal(wdllamadas, 1)
  assert.equal((await llamar(handler, 'Otra ciudad')).code, 429)
  reloj = 61000
  await llamar(handler)
  assert.equal(wdllamadas, 2)
})

test('Nominatim distingue respuestas inválidas, conexión y saturación', async () => {
  assert.throws(() => normalizarCiudad([{ ...geo, lon: 'no-numero' }]), /verificar/)
  for (const [solicitar, codigo] of [
    [async () => ({ ok: false, status: 429 }), 'SERVICIO_NO_DISPONIBLE'],
    [async () => { throw new TypeError('fetch failed') }, 'CONEXION'],
    [async () => json({ inesperado: true }), 'RESPUESTA_INVALIDA'],
  ]) assert.equal((await llamar(crearHandler({ env: {}, solicitar }))).data.codigo, codigo)
})

test('Cliente cachea respuestas completas por destino, no cachea errores parciales', async () => {
  let llamadas = 0
  const consultar = crearConsultaLugares(async () => { llamadas++; return json({ ciudad: null, lugares: [], estado: 'DESTINO_NO_ENCONTRADO' }) })
  await Promise.all([consultar('Tokio'), consultar(' tokio ')])
  assert.equal(llamadas, 1)
  let parciales = 0
  const parcial = crearConsultaLugares(async () => { parciales++; return json({ ciudad: geo, lugares: [], estado: 'ERROR_ATRACCIONES' }) })
  await parcial('Tokio')
  await parcial('Tokio')
  assert.equal(parciales, 2)
  const desconectado = crearConsultaLugares(async () => { throw new TypeError('fetch failed') })
  await assert.rejects(desconectado('Tokio'), /conexión a internet/)
})
