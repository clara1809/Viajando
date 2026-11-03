// Convierte el GeoJSON de Natural Earth 1:50m en trazados SVG locales.
// Uso: node scripts/generar-mapa.mjs /ruta/ne_50m_admin_0_countries.geojson
import fs from 'node:fs'

const archivo = process.argv[2]
if (!archivo) throw new Error('Indicá la ruta al GeoJSON de Natural Earth.')
const geojson = JSON.parse(fs.readFileSync(archivo, 'utf8'))
const proyectar = ([longitud, latitud]) => [
  ((longitud + 180) * 3).toFixed(2),
  ((90 - latitud) * 3).toFixed(2)
].join(',')

const paises = geojson.features.map(({ properties: p, geometry }) => {
  const poligonos = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return {
    id: p.ADM0_A3,
    iso2: p.ISO_A2_EH === '-99' ? null : p.ISO_A2_EH,
    iso3: p.ISO_A3_EH === '-99' ? null : p.ISO_A3_EH,
    nombres: [...new Set([p.NAME_ES, p.NAME_EN, p.ADMIN, p.NAME_LONG].filter(Boolean))],
    trazado: poligonos.flatMap(poligono => poligono.map(anillo =>
      'M' + anillo.map(proyectar).join('L') + 'Z'
    )).join('')
  }
})
fs.writeFileSync(new URL('../src/data/mapaMundial.json', import.meta.url), JSON.stringify(paises))
// Catálogo liviano para los conteos: no necesita las geometrías del mapa.
fs.writeFileSync(new URL('../src/data/paises.json', import.meta.url), JSON.stringify(
  paises.map(({ id, iso2, iso3, nombres }) => ({ id, iso2, iso3, nombres }))
) + '\n')
const nombresContinentes = {
  Africa: 'África', Asia: 'Asia', Europe: 'Europa',
  'North America': 'América del Norte', 'South America': 'América del Sur',
  Oceania: 'Oceanía', Antarctica: 'Antártida'
}
const continentes = Object.fromEntries(geojson.features
  .filter(({ properties }) => nombresContinentes[properties.CONTINENT])
  .map(({ properties }) => [properties.ADM0_A3, nombresContinentes[properties.CONTINENT]]))
fs.writeFileSync(new URL('../src/data/continentes.json', import.meta.url), JSON.stringify(continentes, null, 2) + '\n')
console.log(`Mapa generado: ${paises.length} países y territorios.`)
