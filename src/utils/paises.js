import paises from '../data/paises.json'

function normalizarPais(nombre) {
  return String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '')
}

const codigosPorNombre = new Map()
const nombresEnEspanol = new Intl.DisplayNames(['es'], { type: 'region' })

for (const pais of paises) {
  const nombres = [...pais.nombres, pais.iso2, pais.iso3]
  if (pais.iso2) nombres.push(nombresEnEspanol.of(pais.iso2))
  for (const nombre of nombres.filter(Boolean)) {
    codigosPorNombre.set(normalizarPais(nombre), pais.id)
  }
}

const alias = {
  'EE. UU.': 'US', EEUU: 'US', EUA: 'US', USA: 'US',
  'Estados Unidos de América': 'US', 'Rep. Dominicana': 'DO',
  'Republica dominicana': 'DO', Inglaterra: 'GB', 'Gran Bretaña': 'GB',
  Holanda: 'NL', Chequia: 'CZ', 'Corea del Sur': 'KR',
  'Corea del Norte': 'KP', Rusia: 'RU', 'Costa de Marfil': 'CI'
}

for (const [nombre, codigo] of Object.entries(alias)) {
  codigosPorNombre.set(normalizarPais(nombre), codigosPorNombre.get(normalizarPais(codigo)))
}

export function obtenerCodigoPais(nombre) {
  return codigosPorNombre.get(normalizarPais(nombre)) || null
}

export function obtenerPaisesVisitados(viajes) {
  return new Set(viajes.map(viaje => obtenerCodigoPais(viaje.pais)).filter(Boolean))
}

export function obtenerContinentesVisitados(viajes, continentes) {
  return new Set([...obtenerPaisesVisitados(viajes)].map(codigo => continentes[codigo]).filter(Boolean))
}
