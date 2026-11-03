import { browserLocalPersistence, createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'

// Serializa las operaciones de registro, inicio y cierre de sesión.
let cola = Promise.resolve()
function ejecutarSesion(operacion) {
  const resultado = cola.then(async () => {
    await auth.authStateReady()
    await setPersistence(auth, browserLocalPersistence)
    return operacion()
  })
  cola = resultado.catch(() => {})
  return resultado
}

export function registrarCuenta(correo, clave) {
  return ejecutarSesion(() => {
    if (auth.currentUser?.isAnonymous) {
      return linkWithCredential(auth.currentUser, EmailAuthProvider.credential(correo.trim(), clave))
    }
    if (auth.currentUser) throw new Error('Cerrá la sesión actual antes de crear otra cuenta.')
    return createUserWithEmailAndPassword(auth, correo.trim(), clave)
  })
}

export function entrarCuenta(correo, clave) {
  return ejecutarSesion(() => signInWithEmailAndPassword(auth, correo.trim(), clave))
}

export function salirCuenta() {
  return ejecutarSesion(() => signOut(auth))
}

export function mensajeSesion(error) {
  const mensajes = {
    'auth/invalid-email': 'Ingresá un correo electrónico válido.',
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Iniciá sesión; tus datos anónimos no se fusionarán con esa cuenta.',
    'auth/credential-already-in-use': 'Estas credenciales ya pertenecen a otra cuenta. Iniciá sesión con ella.',
    'auth/weak-password': 'La contraseña no cumple los requisitos de seguridad del proyecto. Usá al menos 6 caracteres.',
    'auth/password-does-not-meet-requirements': 'La contraseña no cumple la política de seguridad configurada en Firebase.',
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/wrong-password': 'El correo o la contraseña no son correctos.',
    'auth/user-not-found': 'El correo o la contraseña no son correctos.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/too-many-requests': 'Hubo demasiados intentos. Esperá unos minutos antes de reintentar.',
    'auth/network-request-failed': 'No pudimos conectar. Revisá tu conexión a internet.',
    'auth/operation-not-allowed': 'El acceso con correo y contraseña no está habilitado en Firebase.',
    'auth/requires-recent-login': 'Volvé a iniciar sesión para completar esta operación.'
  }
  return mensajes[error.code] || (!error.code && error.message) || 'No pudimos completar la operación. Intentá nuevamente.'
}
