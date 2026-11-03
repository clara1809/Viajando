import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { obtenerFotos, filtrarViajes, validarViaje } from '../src/utils/viajes.js'

const leer = ruta => fs.readFileSync(new URL(ruta, import.meta.url), 'utf8')
const mapa = JSON.parse(leer('../src/data/mapaMundial.json'))
const continentes = JSON.parse(leer('../src/data/continentes.json'))
const catalogo = JSON.parse(leer('../src/data/paises.json'))
const codigoPaises = leer('../src/utils/paises.js').replace("import paises from '../data/paises.json'", 'const paises = ' + JSON.stringify(catalogo))
const { obtenerPaisesVisitados, obtenerContinentesVisitados } = await import('data:text/javascript;base64,' + Buffer.from(codigoPaises).toString('base64'))

test('El catálogo liviano conserva los países del mapa sin incluir geometrías', () => {
  assert.deepEqual(catalogo, mapa.map(({ id, iso2, iso3, nombres }) => ({ id, iso2, iso3, nombres })))
  assert.ok(catalogo.every(pais => !('trazado' in pais)))
})

test('Las fotos antiguas se conservan y las nuevas no se duplican', () => {
  const antiguo = { foto: 'https://ejemplo.com/antigua.jpg', campoExistente: 'conservar' }
  assert.deepEqual(obtenerFotos(antiguo), [antiguo.foto])
  assert.deepEqual(obtenerFotos({ ...antiguo, fotos: [antiguo.foto, 'https://ejemplo.com/nueva.jpg'] }), [antiguo.foto, 'https://ejemplo.com/nueva.jpg'])
  assert.equal(antiguo.campoExistente, 'conservar')
  assert.deepEqual(obtenerFotos({}), [])
})

test('Fecha válida, obligatorios, futuras y URLs incorrectas', () => {
  const viaje = { destino: 'París', pais: 'Francia', fecha: '2024-02-29', foto: '', fotosAdicionales: '' }
  const hoy = new Date(2026, 10, 2)
  assert.deepEqual(validarViaje(viaje, hoy), {})
  assert.ok(validarViaje({ ...viaje, fecha: '2025-02-29' }, hoy).fecha)
  assert.ok(validarViaje({ ...viaje, fecha: '2027-01-01' }, hoy).fecha)
  assert.ok(validarViaje({ ...viaje, destino: ' ' }, hoy).destino)
  assert.ok(validarViaje({ ...viaje, pais: '' }, hoy).pais)
  assert.ok(validarViaje({ ...viaje, foto: 'javascript:alert(1)' }, hoy).foto)
  assert.ok(validarViaje({ ...viaje, fotosAdicionales: 'https://ejemplo.com/a.jpg\nenlace incorrecto' }, hoy).fotosAdicionales)
})

test('Buscador sin tildes y orden por fecha sin mutar datos originales', () => {
  const viajes = [{ destino: 'París', pais: 'Francia', fecha: '2024-01-01' }, { destino: 'Roma', pais: 'Italia', fecha: '2025-01-01' }]
  assert.equal(filtrarViajes(viajes, 'PARIS', 'recientes').length, 1)
  assert.equal(filtrarViajes(viajes, 'italia', 'recientes')[0].destino, 'Roma')
  assert.equal(filtrarViajes(viajes, '', 'recientes')[0].destino, 'Roma')
  assert.equal(filtrarViajes(viajes, '', 'antiguos')[0].destino, 'París')
  assert.equal(viajes[0].destino, 'París')
})

test('Países y continentes únicos, excluyendo nombres desconocidos', () => {
  const viajes = [{ pais: 'EE. UU.' }, { pais: 'Estados Unidos' }, { pais: 'USA' }, { pais: 'Francia' }, { pais: 'Japón' }, { pais: 'País desconocido' }]
  assert.equal(obtenerPaisesVisitados(viajes).size, 3)
  assert.equal(obtenerContinentesVisitados(viajes, continentes).size, 3)
  assert.equal(obtenerPaisesVisitados([]).size, 0)
  assert.equal(obtenerContinentesVisitados([{ pais: 'País desconocido' }], continentes).size, 0)
})

function crearHookSimulado() {
  let cursor = 0, refCursor = 0, efecto, observarAuth
  let fallar = false
  const estado = [], referencias = [], escuchas = []
  const documentos = new Map()
  const auth = { currentUser: { uid: 'prueba' }, authStateReady: async () => {} }
  const contexto = {
    useState(inicial) {
      const i = cursor++
      if (!(i in estado)) estado[i] = inicial
      return [estado[i], valor => { estado[i] = typeof valor === 'function' ? valor(estado[i]) : valor }]
    },
    useRef(inicial) { return referencias[refCursor++] ||= { current: inicial } },
    useEffect(callback) { efecto = callback },
    auth, db: {}, browserLocalPersistence: {},
    setPersistence: async () => {}, signInAnonymously: async () => {},
    onAuthStateChanged(_auth, callback) { observarAuth = callback; return () => {} },
    collection: (_db, ...ruta) => ruta.join('/'),
    doc: (_db, ...ruta) => ruta.join('/'),
    onSnapshot(ruta, actualizar) { escuchas.push({ ruta, actualizar }); return () => {} },
    async addDoc(ruta, datos) { await Promise.resolve(); if (fallar) throw { code: 'permission-denied' }; documentos.set(ruta + '/nuevo', datos) },
    async updateDoc(ruta, datos) { if (fallar) throw { code: 'permission-denied' }; documentos.set(ruta, { ...documentos.get(ruta), ...datos }) },
    async deleteDoc(ruta) { if (fallar) throw { code: 'permission-denied' }; documentos.delete(ruta) },
    async runTransaction(_db, callback) {
      const pendientes = []
      await callback({
        get: async ruta => ({ exists: () => documentos.has(ruta) }),
        set: (ruta, datos) => pendientes.push(() => documentos.set(ruta, datos)),
        delete: ruta => pendientes.push(() => documentos.delete(ruta))
      })
      if (fallar) throw { code: 'permission-denied' }
      pendientes.forEach(aplicar => aplicar())
    }
  }
  let codigo = leer('../src/hooks/useDatosUsuario.js').replace(/^import .*\n/gm, '').replace('export default function useDatosUsuario', 'function useDatosUsuario')
  codigo += '\nthis.usarDatos = useDatosUsuario'
  vm.createContext(contexto)
  vm.runInContext(codigo, contexto)
  const render = () => { cursor = 0; refCursor = 0; return contexto.usarDatos() }
  render(); efecto(); observarAuth(auth.currentUser)
  escuchas.forEach(escucha => escucha.actualizar({ docs: [] }))
  return { render, documentos, escuchas, fallar: valor => { fallar = valor } }
}

test('CRUD privado, protección de doble envío y edición compatible', async () => {
  const prueba = crearHookSimulado()
  const hook = prueba.render()
  assert.equal(prueba.escuchas[0].ruta, 'usuarios/prueba/viajes')
  assert.equal(prueba.escuchas[1].ruta, 'usuarios/prueba/porConocer')
  const primero = hook.guardarRegistro('viajes', { destino: 'Roma' })
  const segundo = hook.guardarRegistro('viajes', { destino: 'Roma' })
  assert.equal(await primero, true)
  assert.equal(await segundo, false)
  assert.equal(prueba.documentos.size, 1)
  prueba.documentos.set('usuarios/prueba/viajes/antiguo', { foto: 'antigua', campoExtra: 'conservar' })
  await hook.guardarRegistro('viajes', { descripcion: 'editada' }, 'antiguo')
  assert.equal(prueba.documentos.get('usuarios/prueba/viajes/antiguo').campoExtra, 'conservar')
  assert.equal(prueba.documentos.get('usuarios/prueba/viajes/antiguo').foto, 'antigua')
  await hook.eliminarRegistro('viajes', 'antiguo')
  assert.equal(prueba.documentos.has('usuarios/prueba/viajes/antiguo'), false)
})

test('¡Ya lo conocí!: falla sin borrar, éxito atómico y reintento sin duplicar', async () => {
  const prueba = crearHookSimulado()
  const hook = prueba.render()
  const rutaPendiente = 'usuarios/prueba/porConocer/destino1'
  const rutaViaje = 'usuarios/prueba/viajes/desde-pendiente-destino1'
  prueba.documentos.set(rutaPendiente, { nombre: 'Kioto' })
  prueba.fallar(true)
  assert.equal(await hook.convertirLugarEnViaje('destino1', { destino: 'Kioto' }), false)
  assert.equal(prueba.documentos.has(rutaPendiente), true)
  assert.equal(prueba.documentos.has(rutaViaje), false)
  assert.match(prueba.render().errores.operacion, /permiso/)
  prueba.fallar(false)
  assert.equal(await prueba.render().convertirLugarEnViaje('destino1', { destino: 'Kioto' }), true)
  assert.equal(prueba.documentos.has(rutaPendiente), false)
  assert.equal(prueba.documentos.has(rutaViaje), true)
  assert.equal(await prueba.render().convertirLugarEnViaje('destino1', { destino: 'No sobrescribir' }), true)
  assert.equal(prueba.documentos.size, 1)
  assert.equal(prueba.documentos.get(rutaViaje).destino, 'Kioto')
})
