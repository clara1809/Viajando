// Prueba REAL manual de Nominatim + Wikidata. No escribe en Firestore.
import { crearHandler } from '../server/lugares.mjs'

const handler = crearHandler()
let fallos = 0
for (const destino of ['Tokio, Japón', 'Roma, Italia', 'Ámsterdam, Países Bajos', 'Buenos Aires, Argentina']) {
  const inicio = Date.now()
  const res = {
    setHeader() {},
    status(codigo) { this.codigo = codigo; return this },
    json(datos) {
      if (this.codigo !== 200 || !datos.ciudad || !datos.lugares?.length || datos.aviso) fallos++
      console.log(JSON.stringify({ busqueda: destino, http: this.codigo, duracionMs: Date.now() - inicio, ciudad: datos.ciudad, cantidad: datos.lugares?.length, ejemplos: datos.lugares?.slice(0, 3), estado: datos.estado, aviso: datos.aviso, error: datos.error }, null, 2))
    },
  }
  await handler({ method: 'GET', url: `/api/lugares?${new URLSearchParams({ destino })}` }, res)
  await new Promise(resolve => setTimeout(resolve, 1300))
}
process.exitCode = fallos ? 1 : 0
