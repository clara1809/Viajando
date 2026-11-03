import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

function mensajeError(error) {
  if (!error.code && error.message) return error.message
  if (['permission-denied', 'unauthenticated'].includes(error.code)) {
    return 'No tenés permiso para acceder a estos datos. Revisá la sesión y las reglas de Firestore.'
  }
  if (error.code === 'auth/operation-not-allowed') return 'Habilitá el proveedor Anónimo en Firebase Authentication.'
  if (['unavailable', 'auth/network-request-failed'].includes(error.code)) return 'No pudimos conectar con Firebase. Revisá tu conexión a internet.'
  return `Firebase no pudo completar la operación (${error.code || 'error desconocido'}). Intentá nuevamente.`
}

export default function useDatosUsuario() {
  const [uid, setUid] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [comprobandoSesion, setComprobandoSesion] = useState(true)
  const [viajes, setViajes] = useState([])
  const [lugares, setLugares] = useState([])
  const [cargando, setCargando] = useState({ viajes: true, porConocer: true })
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [intento, setIntento] = useState(0)
  const operacionEnCurso = useRef(false)

  useEffect(() => {
    let activo = true
    let cancelarListas = []
    const cancelarAuth = onAuthStateChanged(auth, (usuario) => {
      cancelarListas.forEach(cancelar => cancelar())
      cancelarListas = []
      if (!activo) return
      setComprobandoSesion(false)
      setUsuario(usuario ? { uid: usuario.uid, email: usuario.email, isAnonymous: usuario.isAnonymous } : null)
      setUid(usuario?.uid || null)
      setViajes([])
      setLugares([])
      setCargando({ viajes: true, porConocer: true })
      setErrores({})
      if (!usuario || usuario.isAnonymous) {
        setCargando({ viajes: false, porConocer: false })
        return
      }
      for (const [nombre, actualizar] of [['viajes', setViajes], ['porConocer', setLugares]]) {
        cancelarListas.push(onSnapshot(collection(db, 'usuarios', usuario.uid, nombre), (resultado) => {
          if (!activo || auth.currentUser?.uid !== usuario.uid) return
          actualizar(resultado.docs.map(documento => ({ ...documento.data(), id: documento.id })))
          setCargando(anterior => ({ ...anterior, [nombre]: false }))
          setErrores(anterior => ({ ...anterior, [nombre]: '' }))
        }, (error) => {
          if (!activo || auth.currentUser?.uid !== usuario.uid) return
          setCargando(anterior => ({ ...anterior, [nombre]: false }))
          setErrores(anterior => ({ ...anterior, [nombre]: `No pudimos cargar ${nombre === 'viajes' ? 'los viajes' : 'los destinos pendientes'}. ${mensajeError(error)}` }))
        }))
      }
    })
    return () => {
      activo = false
      cancelarAuth()
      cancelarListas.forEach(cancelar => cancelar())
    }
  }, [intento])

  async function guardarRegistro(nombre, datos, id = null) {
    return ejecutarOperacion(nombre, async usuarioId => {
      if (id) await updateDoc(doc(db, 'usuarios', usuarioId, nombre, id), datos)
      else await addDoc(collection(db, 'usuarios', usuarioId, nombre), datos)
    })
  }

  async function eliminarRegistro(nombre, id) {
    return ejecutarOperacion(nombre, usuarioId => deleteDoc(doc(db, 'usuarios', usuarioId, nombre, id)))
  }

  async function convertirLugarEnViaje(lugarId, datos) {
    if (cargando.viajes || errores.viajes) return false
    return ejecutarOperacion('porConocer', async usuarioId => {
      const pendiente = doc(db, 'usuarios', usuarioId, 'porConocer', lugarId)
      // ID estable: reintentos o dos pestañas no crean dos viajes del mismo destino.
      const viaje = doc(db, 'usuarios', usuarioId, 'viajes', `desde-pendiente-${lugarId}`)
      await runTransaction(db, async transaccion => {
        const destino = await transaccion.get(pendiente)
        const viajeExistente = await transaccion.get(viaje)
        if (!destino.exists()) {
          if (viajeExistente.exists()) return
          throw new Error('El destino ya no está en tu lista. Actualizá la página.')
        }
        if (viajeExistente.exists()) throw new Error('Ya existe un viaje para este destino. Revisá tus recuerdos.')
        transaccion.set(viaje, datos)
        transaccion.delete(pendiente)
      })
    })
  }

  async function ejecutarOperacion(nombre, operacion) {
    if (operacionEnCurso.current) return false
    if (!uid || auth.currentUser?.isAnonymous || auth.currentUser?.uid !== uid || cargando[nombre] || errores[nombre]) {
      setErrores(anterior => ({ ...anterior, operacion: 'Esperá a que se carguen los datos. Si hubo un error, usá Reintentar conexión.' }))
      return false
    }
    operacionEnCurso.current = true
    setGuardando(true)
    setErrores(anterior => ({ ...anterior, operacion: '' }))
    try {
      await operacion(uid)
      return true
    } catch (error) {
      setErrores(anterior => ({ ...anterior, operacion: `No pudimos guardar el cambio. ${mensajeError(error)}` }))
      return false
    } finally {
      operacionEnCurso.current = false
      setGuardando(false)
    }
  }

  function reintentar() {
    setCargando({ viajes: true, porConocer: true })
    setErrores({})
    setIntento(anterior => anterior + 1)
  }

  function actualizarUsuario() {
    const actual = auth.currentUser
    setUsuario(actual ? { uid: actual.uid, email: actual.email, isAnonymous: actual.isAnonymous } : null)
    setIntento(anterior => anterior + 1)
  }

  const mismaCuenta = (usuario?.uid || null) === uid
  return { usuario, comprobandoSesion, actualizarUsuario, viajes: mismaCuenta ? viajes : [], lugares: mismaCuenta ? lugares : [], cargando: mismaCuenta ? cargando : { viajes: true, porConocer: true }, errores, guardando, guardarRegistro, eliminarRegistro, convertirLugarEnViaje, reintentar }
}
