# Descubrir lugares: búsqueda mundial — VIAJANDO

## APIs utilizadas

Se eliminó el catálogo local de atracciones. No hay una lista fija de ciudades ni se completan búsquedas con monumentos inventados.

1. **Nominatim / OpenStreetMap** busca el texto del usuario (ciudad y país, si se incluye) y devuelve la primera coincidencia con nombre, coordenadas, país y dirección completa disponible. La pantalla muestra ese destino para que el usuario pueda comprobarlo y precisar el texto si hay ambigüedad.
2. **Wikidata Query Service, mediante SPARQL**, obtiene entidades turísticas próximas a las coordenadas de Nominatim. Sus nombres, tipos y coordenadas proceden de la respuesta real de Wikidata. El código solo define las clases de interés y sus traducciones: museo, monumento, sitio arqueológico, sitio histórico y atracción turística. Esas categorías no son un catálogo de lugares.

Se conserva el buscador dentro de Por conocer, sin añadir páginas ni cambiar el menú. No se utiliza OpenTripMap, Overpass, Redis, claves API ni servicios pagos.

Referencias:

- Nominatim Search: https://nominatim.org/release-docs/latest/api/Search/
- Política de Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Geoconsultas y SPARQL: https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual
- Acceso a datos Wikidata: https://www.wikidata.org/wiki/Wikidata:Data_access

## Cómo se realiza una búsqueda

El formulario envía una solicitud únicamente al pulsar Buscar lugares. No hay autocompletado ni consultas por cada letra. El navegador solicita GET `/api/lugares?destino=Tokio%2C+Japón` y la función del servidor realiza las dos consultas externas. Esto permite identificar la aplicación, controlar límites y tiempos, y evitar depender de CORS desde el navegador.

Nominatim se consulta con `q`, `format=jsonv2`, `addressdetails=1`, `extratags=1`, `limit=1` y preferencia por español. Se validan las coordenadas y la identidad OSM. No se cambia el texto a una ciudad de una selección predefinida.

La consulta SPARQL usa las coordenadas reales como `Point(longitud latitud)` y `SERVICE wikibase:around`. Interpola exclusivamente números validados; el texto libre del usuario no se inserta en SPARQL.

Para limitar el costo:

- Se buscan elementos con coordenadas en un radio de **5 km**.
- Una subconsulta selecciona como máximo **250 candidatos cercanos**, ordenados por distancia al punto encontrado.
- Después se filtran instancias y subclases turísticas mediante P31/P279.
- Se indica al optimizador de Blazegraph que respete el orden para evitar empezar por todas las subclases del mundo. La primera consulta sin ese orden superaba el tiempo de espera; la versión optimizada respondió con resultados reales.
- Se agrupan las categorías por entidad y se solicitan como máximo **36 filas**, para poder quitar datos repetidos y mostrar **hasta 12 tarjetas**.
- Los nombres se solicitan en español, inglés y multilingüe. Se omiten entidades que solo tengan el código Q como nombre o coordenadas inválidas.
- Se eliminan IDs repetidos y filas de igual nombre normalizado y coordenadas redondeadas a cuatro decimales.

**Alcance geográfico:** se muestran lugares cerca del punto del destino, no necesariamente dentro de su frontera administrativa. El país y ciudad que acompañan la tarjeta son el contexto del destino localizado por Nominatim. Las coordenadas de cada atracción sí son de Wikidata. No se inventan direcciones postales. La selección no es un ranking turístico ni garantiza que aparezcan los monumentos más famosos. El límite de candidatos puede excluir lugares más alejados y hay entidades históricas o desaparecidas en Wikidata: consultar la fuente antes de planificar una visita.

## HTTP, fetch, JSON y React

Una petición HTTP es un mensaje que solicita datos a una dirección web. Se utiliza `fetch()` tanto en el navegador (al endpoint propio) como en el servidor (a Nominatim y Wikidata).

`await fetch()` espera la respuesta. `await respuesta.json()` convierte el texto JSON en objetos JavaScript. Se comprueba `respuesta.ok`, porque los estados HTTP 4xx/5xx no lanzan automáticamente una excepción de fetch.

Nominatim devuelve una lista con campos como `name`, `display_name`, `lat`, `lon`, `osm_type`, `osm_id` y `address`. Wikidata devuelve `results.bindings`: cada fila contiene valores para la entidad, nombre, categoría y coordenadas WKT.

El servidor normaliza la respuesta como:

```json
{
  "ciudad": { "nombre": "...", "osmId": "relation-...", "lat": 0, "lon": 0 },
  "lugares": [],
  "estado": "OK"
}
```

El ejemplo solo ilustra la estructura; los valores de la aplicación siempre proceden de los servicios. Cada atracción incluye `wikidataId`, `nombre`, `categoria`, `lat`, `lon`, enlace a Wikidata y el contexto de la ciudad buscada.

React usa useState para cargar, mostrar errores, actualizar resultados y confirmar guardados. Las tarjetas se crean con `map()`. Los datos externos se muestran como texto y no se inserta HTML del proveedor.

## Carga, errores y resultados vacíos

- Si Nominatim no encuentra el texto: mensaje de destino no encontrado, sin consultar Wikidata.
- Si Nominatim encuentra la ciudad pero no hay atracciones: se muestra la ciudad con su botón de guardado y el aviso de ausencia de atracciones.
- Si Wikidata falla, responde 429, devuelve JSON inválido o agota el tiempo: se conserva la ciudad, se informa que falló Wikidata y se permite guardar la ciudad. Un fallo no se presenta como una búsqueda correcta sin resultados.
- Si falla Nominatim o el backend: mensaje de conexión, tiempo agotado o servicio no disponible, según corresponda.
- El navegador permite repetir manualmente una búsqueda. No hay cadenas de reintentos automáticos que aumenten la carga de los servicios.

## Caché, tiempos y uso responsable

La ubicación del destino y sus atracciones se cachean por separado durante 24 horas en memoria. Hay hasta 100 entradas por caché de servidor; el cliente también limita su caché a 100 destinos. Las solicitudes simultáneas del mismo texto comparten una promesa. Si Wikidata falla, no se cachea como respuesta completa, pero se conserva la ciudad de Nominatim para que reintentar no repita innecesariamente la geocodificación.

Nominatim tiene un límite local de una consulta cada 1200 ms. Tras un HTTP 429 de Wikidata, el proceso evita volver a consultarlo durante un minuto. Se identifica VIAJANDO con User-Agent y una URL/contacto configurable. Los tiempos máximos son 8 segundos para Nominatim, 16 para Wikidata y 27 para el cliente; la función Vercel declara hasta 30 segundos.

La política pública de Nominatim exige un máximo de **una petición por segundo sumando todos los usuarios**, identificación, atribución y uso moderado. Prohíbe autocompletado y extracción sistemática. Wikidata también tiene cuotas de tiempo y concurrencia: las consultas deben ser pequeñas, cacheadas y respetar las respuestas 429.

**Límite de esta implementación:** la caché y pausa en memoria no se comparten entre instancias de Vercel y se pierden al reiniciar. Por tanto, no garantizan un límite global distribuido con múltiples usuarios simultáneos. Esta solución sin servicios adicionales está orientada al uso reducido del trabajo práctico. Para tráfico mayor se debe centralizar el acceso a geocodificación o cambiar a un proveedor apropiado. No se añadió ningún servicio para ello.

Se muestra atribución a colaboradores de OpenStreetMap con enlace ODbL y a Wikidata, cuyos datos estructurados son CC0.

## Guardado y duplicados en Firestore

Se reutiliza `usuarios/{uid}/porConocer`, el control de sesión y las reglas existentes. Una atracción se guarda en `wikidata-{QID}` y una ciudad en `osm-{tipo}-{id}`. Una transacción comprueba si el documento existe antes de escribir. Repetir el clic o guardar desde dos pestañas no crea otro documento de la misma identidad ni sobrescribe ediciones previas.

Los datos guardados mantienen `nombre`, `pais` y `motivo`, y agregan metadatos de categoría, contexto, coordenadas y fuente. Las atracciones llevan `wikidataId`, `origen: wikidata` y `fuenteUbicacion: Wikidata`; las ciudades llevan su identidad OSM y `origen: nominatim`.

Los registros históricos del catálogo y los registros OSM previos siguen funcionando y no se migran ni eliminan. La deduplicación por ID no fusiona automáticamente un registro manual o del catálogo con uno Wikidata que represente el mismo lugar. El filtro por nombre/punto elimina repeticiones evidentes de la respuesta actual, sin prometer resolver todas las duplicaciones o cambios de identidad del proveedor.

No se modificaron Firebase, credenciales, autenticación, reglas, viajes, recuerdos, mapa ni carruseles.

## Archivos de esta versión

- Eliminado `src/data/atracciones.js`: deja de existir el catálogo local de atracciones.
- `server/lugares.mjs`: búsqueda mundial con Nominatim, SPARQL geográfico, normalización, caché y errores parciales.
- `src/services/lugares.js`: fetch por texto de destino y caché de respuestas completas.
- `src/components/LugaresTuristicos.jsx`: formulario, ciudad guardable, hasta 12 atracciones y estados; reutiliza el CSS existente.
- `src/hooks/useDatosUsuario.js`: agrega identidad Wikidata al guardado transaccional y mantiene compatibilidad con registros anteriores.
- `.env.example`: documenta la URL SPARQL opcional.
- `tests/lugares.test.mjs` y `tests/datos.test.mjs`: pruebas de búsqueda, consulta, normalización, errores, caché y guardado.
- `scripts/probar-lugares.mjs`: prueba real de las cuatro ciudades solicitadas, sin escribir en Firestore.

Se reutilizan `api/lugares.js`, la configuración del endpoint local en `vite.config.js` y la integración dentro de Por conocer en App.

## Configuración y prueba manual

1. Mantener las variables Firebase de `.env`, que no se modificó.
2. Identificar la aplicación con `OSM_APP_CONTACT`, usando una URL pública real o contacto del responsable. En Vercel también se usa `VERCEL_PROJECT_PRODUCTION_URL` si está disponible. No se necesitan claves turísticas.
3. Opcionalmente se pueden cambiar `NOMINATIM_URL` y `WIKIDATA_SPARQL_URL` en el servidor sin editar código. Por defecto son `https://nominatim.openstreetmap.org/search` y `https://query.wikidata.org/sparql`.
4. Ejecutar `npm run dev` e iniciar sesión con una cuenta de prueba. `npm run preview` no ejecuta la función serverless; para pruebas locales completas usar dev.
5. En Por conocer buscar Tokio, Japón; Roma, Italia; Ámsterdam, Países Bajos; y Buenos Aires, Argentina. Revisar el nombre completo de la ciudad y las coordenadas. Network debe mostrar una solicitud por búsqueda, no por letra.
6. Agregar una atracción; recargar y buscar de nuevo: debe persistir y su botón debe indicar que ya está agregada.
7. Agregar la ciudad encontrada. Este botón también está disponible si no hay atracciones o falla Wikidata.
8. Probar un texto inexistente y un fallo de conexión para verificar los mensajes. Las respuestas cacheadas no necesitan otra consulta durante su vigencia.
9. Cambiar de cuenta y comprobar que los pendientes son solo de la cuenta actual. Verificar las funciones anteriores de viajes, recuerdos y destinos manuales.
10. Ejecutar `npm test`, `npm run lint` y `npm run build`.
11. Para repetir la prueba real de las APIs: `node scripts/probar-lugares.mjs`. Realiza cuatro búsquedas espaciadas y sale con código 1 si alguna no obtiene atracciones. No ejecutarlo periódicamente ni como parte del test automático.

No se subieron cambios ni se desplegó automáticamente a Vercel.

## Verificación realizada

Se ejecutó la versión final de `scripts/probar-lugares.mjs` con acceso real a las dos APIs, secuencialmente y con pausas. Terminó con código 0: todas las búsquedas encontraron una ciudad y atracciones, sin avisos de error.

| Búsqueda real | HTTP | Atracciones mostrables | Tiempo total aproximado |
| --- | --- | --- | --- |
| Tokio, Japón | 200 | 11 | 10,7 s |
| Roma, Italia | 200 | 12 | 6,3 s |
| Ámsterdam, Países Bajos | 200 | 7 | 2,4 s |
| Buenos Aires, Argentina | 200 | 12 | 5,0 s |

Entre las entidades devueltas están Mitsuo Aida Museum y Mitsubishi Ichigokan Museum (Tokio), Arco de Septimio Severo (Roma), Nieuwe Kerk y Madame Tussauds Amsterdam (Ámsterdam) y Homenaje al Milenio de Polonia (Buenos Aires). Son ejemplos de las respuestas reales, no se usan como datos de respaldo en la aplicación.

La evidencia de esas respuestas, con IDs, coordenadas, ejemplos y tiempos, se conserva en `docs/PRUEBAS-LUGARES-REALES.json`. Las cantidades pueden cambiar con el proveedor y sus traducciones: no están codificadas en la aplicación.

También pasaron 27 pruebas automatizadas, lint y build. El build conserva el aviso previo de paquetes grandes. Las pruebas simuladas cubren respuestas vacías, errores parciales, conexión, saturación, caché y guardado privado sin duplicados, además de las pruebas existentes de viajes y sesión. No se escribió en el proyecto Firebase real ni se revisó una sesión autenticada en un navegador; para verificar esa persistencia se deben seguir los pasos manuales anteriores.
