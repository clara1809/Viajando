import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function preparar(usuario = { uid: 'anonimo', isAnonymous: true }) {
  const llamadas = []
  let fallo = null
  const auth = { currentUser: usuario, authStateReady: async () => {} }
  const contexto = {
    auth, browserLocalPersistence: 'local',
    async setPersistence(_auth, modo) { llamadas.push(['persistencia', modo]) },
    EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
    async linkWithCredential(user, credential) {
      llamadas.push(['vincular', user.uid])
      if (fallo) throw fallo
      auth.currentUser = { uid: user.uid, isAnonymous: false, email: credential.email }
      return { user: auth.currentUser }
    },
    async createUserWithEmailAndPassword(_auth, email) {
      llamadas.push(['crear', email]); auth.currentUser = { uid: 'nueva', email, isAnonymous: false }; return { user: auth.currentUser }
    },
    async signInWithEmailAndPassword(_auth, email) {
      llamadas.push(['entrar', email]); if (fallo) throw fallo
      auth.currentUser = { uid: 'otra-cuenta', email, isAnonymous: false }; return { user: auth.currentUser }
    },
    async signInAnonymously() { llamadas.push(['anonimo']); auth.currentUser = { uid: 'nuevo-anonimo', isAnonymous: true } },
    async signOut() { llamadas.push(['salir']); auth.currentUser = null }
  }
  let codigo = fs.readFileSync(new URL('../src/services/sesion.js', import.meta.url), 'utf8')
    .replace(/^import .*\n/gm, '').replaceAll('export function ', 'function ')
  codigo += '\nthis.api = { registrarCuenta, entrarCuenta, salirCuenta, mensajeSesion }'
  vm.createContext(contexto); vm.runInContext(codigo, contexto)
  return { ...contexto.api, auth, llamadas, fallar: error => { fallo = error } }
}

test('Registro anónimo vincula el mismo UID sin crear otra cuenta', async () => {
  const sesion = preparar()
  await sesion.registrarCuenta(' persona@ejemplo.com ', 'clave-segura')
  assert.equal(sesion.auth.currentUser.uid, 'anonimo')
  assert.equal(sesion.auth.currentUser.email, 'persona@ejemplo.com')
  assert.equal(sesion.auth.currentUser.isAnonymous, false)
  assert.equal(sesion.llamadas.some(([tipo]) => tipo === 'crear'), false)
  assert.ok(sesion.llamadas.some(([tipo, modo]) => tipo === 'persistencia' && modo === 'local'))
})

test('Correo existente no cambia ni elimina la cuenta anónima', async () => {
  const sesion = preparar()
  sesion.fallar({ code: 'auth/email-already-in-use' })
  await assert.rejects(sesion.registrarCuenta('ocupado@ejemplo.com', 'clave-segura'))
  assert.equal(sesion.auth.currentUser.uid, 'anonimo')
  assert.match(sesion.mensajeSesion({ code: 'auth/email-already-in-use' }), /no se fusionarán/)
})

test('Login cambia de UID y logout permanece sin sesión sin crear anónimos', async () => {
  const sesion = preparar()
  await sesion.entrarCuenta('persona@ejemplo.com', 'clave-segura')
  assert.equal(sesion.auth.currentUser.uid, 'otra-cuenta')
  const salida = sesion.salirCuenta()
  const login = sesion.entrarCuenta('otra@ejemplo.com', 'clave-segura')
  await Promise.all([salida, login])
  assert.equal(sesion.auth.currentUser.email, 'otra@ejemplo.com')
  assert.equal(sesion.auth.currentUser.isAnonymous, false)
  await sesion.salirCuenta()
  assert.equal(sesion.auth.currentUser, null)
  assert.equal(sesion.llamadas.some(([tipo]) => tipo === 'anonimo'), false)
})

test('Login fallido conserva la identidad y muestra error comprensible', async () => {
  const sesion = preparar()
  sesion.fallar({ code: 'auth/invalid-credential' })
  await assert.rejects(sesion.entrarCuenta('persona@ejemplo.com', 'incorrecta'))
  assert.equal(sesion.auth.currentUser.uid, 'anonimo')
  assert.match(sesion.mensajeSesion({ code: 'auth/invalid-credential' }), /no son correctos/)
})


test('El registro sin sesión crea una cuenta de correo directamente', async () => {
  const sesion = preparar(null)
  await sesion.registrarCuenta('nueva@ejemplo.com', 'clave-segura')
  assert.equal(sesion.auth.currentUser.email, 'nueva@ejemplo.com')
  assert.equal(sesion.llamadas.some(([tipo]) => tipo === 'crear'), true)
  assert.equal(sesion.llamadas.some(([tipo]) => tipo === 'anonimo'), false)
})
