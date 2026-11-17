# VIAJANDO

Diario de viajes desarrollado para el Trabajo Práctico 2 de Desarrollo Frontend II.
Permite reunir experiencias y fotografías de viajes realizados y organizar destinos
pendientes en un mismo lugar. Está pensado para personas que quieren conservar sus
recuerdos y planear qué lugares conocer después.

- **Aplicación publicada:** [viajando-beta.vercel.app](https://viajando-beta.vercel.app)
- **Repositorio:** [github.com/clara1809/Viajando](https://github.com/clara1809/Viajando)

## Funcionalidades

- **Acceso:** registro e inicio de sesión con correo y contraseña, y cierre de sesión.
- **Inicio:** destinos para inspirarse, estadísticas personales y preguntas frecuentes.
- **Mis viajes:** registrar y editar destino, país, fecha, experiencia, fotografías por URL y lugares destacados. Los campos adicionales están en un apartado desplegable.
- **Mis recuerdos:** consultar viajes en un carrusel, buscar por destino o país, ordenar por fecha, ver fotografías, editar y eliminar viajes, y explorar un mapa de países visitados.
- **Por conocer:** agregar destinos pendientes, editarlos dentro de su tarjeta, eliminarlos y recorrerlos en un carrusel. La opción «¡Ya lo conocí!» guarda el viaje y retira el pendiente en una misma transacción.
- **Descubrir lugares:** buscar ciudades y atracciones mediante Nominatim/OpenStreetMap y Wikidata y guardarlas como destinos pendientes.

La interfaz está en español y se adapta a computadora y celular. Incluye
validaciones, estados de carga, confirmaciones y mensajes de error.

## Tecnologías

React 19, Vite 8, JavaScript, CSS, Firebase Authentication y Cloud Firestore.
El buscador turístico utiliza una función serverless de Vercel en `/api/lugares`.
Las fuentes Cormorant Garamond y DM Sans se cargan mediante Google Fonts.
Los datos del mapa provienen de Natural Earth; su fuente se documenta en
[src/data/README.md](src/data/README.md).

## Requisitos para ejecutar el proyecto

- Node.js 22.12 o superior, o la rama 20 desde 20.19, según los requisitos de Vite instalado.
- npm y Git.
- Un proyecto Firebase con una aplicación web registrada, Authentication y Cloud Firestore.
- Conexión a internet para Firebase, los servicios turísticos, las fuentes y las imágenes externas.

## Instalación y ejecución local

1. Clonar el repositorio e ingresar en su carpeta:

   ```sh
   git clone https://github.com/clara1809/Viajando.git
   cd Viajando
   ```

2. Instalar las dependencias y crear el archivo de configuración local:

   ```sh
   npm install
   cp .env.example .env
   ```

   También se puede usar `npm ci` para instalar las versiones del archivo `package-lock.json`.

3. Completar las variables de Firebase en `.env`, siguiendo la sección siguiente.
4. Iniciar la aplicación:

   ```sh
   npm run dev
   ```

5. Abrir la URL que indique Vite en la terminal, normalmente `http://localhost:5173`,
   y crear una cuenta desde la pantalla de acceso.

Reiniciar el servidor después de modificar `.env`.

## Configuración de Firebase

1. Crear un proyecto en Firebase Console y registrar una aplicación web.
2. En Authentication, habilitar **Correo electrónico/contraseña**. La aplicación
   actual requiere una cuenta para acceder. El proveedor **Anónimo** solo es
   necesario para compatibilidad con sesiones anónimas de versiones anteriores;
   no se crean sesiones anónimas automáticamente.
3. Crear una base de Cloud Firestore con identificador `(default)`.
4. En la configuración de la aplicación web, obtener los valores de `firebaseConfig`
   y completar una variable por línea en `.env`:

   ```dotenv
   VITE_FIREBASE_API_KEY=valor_de_apiKey
   VITE_FIREBASE_AUTH_DOMAIN=valor_de_authDomain
   VITE_FIREBASE_PROJECT_ID=valor_de_projectId
   VITE_FIREBASE_STORAGE_BUCKET=valor_de_storageBucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=valor_de_messagingSenderId
   VITE_FIREBASE_APP_ID=valor_de_appId
   ```

5. Copiar el contenido de [firestore.rules](firestore.rules) en la pestaña
   **Reglas** de Firestore y publicarlo. Las reglas permiten leer y escribir
   únicamente documentos dentro de la ruta del usuario autenticado cuyo UID coincida.

La conexión se inicializa en [src/firebase.js](src/firebase.js), que lee las variables
mediante `import.meta.env`. Las operaciones sobre la base están en
[src/hooks/useDatosUsuario.js](src/hooks/useDatosUsuario.js):

| Operación | Implementación |
| --- | --- |
| Consultar y recibir actualizaciones | `onSnapshot` |
| Agregar registros | `addDoc` |
| Modificar registros | `updateDoc` |
| Eliminar registros | `deleteDoc` |
| Convertir pendientes en viajes y evitar duplicados al guardar lugares | `runTransaction` |

### Información guardada

Los registros se organizan por cuenta:

```text
usuarios/{uid}/viajes/{id}
usuarios/{uid}/porConocer/{id}
```

- **Viajes:** destino, país, fecha, descripción, URL de foto principal, lista de
  URLs de fotografías y lugares destacados.
- **Destinos pendientes:** nombre, país y motivo. Los obtenidos del buscador
  también pueden incluir categoría, ciudad, coordenadas, identificadores y fuente.

Las fotografías se guardan como enlaces, no como archivos subidos a Firebase Storage.
Las contraseñas las administra Firebase Authentication y no se guardan en Firestore.

La sesión se conserva al recargar. Al cerrar sesión, se vuelve al acceso; iniciar
sesión con el mismo correo permite recuperar los registros de la cuenta.
Vincular una sesión anónima anterior con un correo nuevo conserva su UID y documentos.
Iniciar sesión con una cuenta existente no fusiona los datos de otras cuentas.

### Variables y permisos

El repositorio incluye [.env.example](.env.example), sin las credenciales del proyecto.
`.gitignore` excluye `.env`, `node_modules` y `dist`.
Las variables `VITE_` se incorporan al frontend: son configuración pública de Firebase,
no credenciales de administración. No deben incluirse claves privadas ni cuentas de servicio.
El acceso a la base se controla mediante las reglas de Firestore.

## Buscador de lugares

En `.env`, configurar `OSM_APP_CONTACT` con una URL pública real o un contacto del
responsable de la aplicación. En Vercel, el servidor también admite como alternativa
el dominio provisto por `VERCEL_PROJECT_PRODUCTION_URL`.

`NOMINATIM_URL` y `WIKIDATA_SPARQL_URL` son opcionales: si no se configuran, se usan
los servicios públicos predeterminados. Estas variables se leen en el servidor;
no necesitan prefijo `VITE_`. No se requiere una clave de API turística.

El detalle de fuentes, límites, caché y manejo de errores está en
[docs/LUGARES-TURISTICOS.md](docs/LUGARES-TURISTICOS.md).
La disponibilidad de resultados depende de esos servicios externos.

## Comprobaciones

```sh
npm run lint
npm test
npm run build
```

Las pruebas automatizadas usan datos simulados y no escriben en Firestore.
La compilación genera `dist/`. Para revisar la compilación localmente:

```sh
npm run preview
```

`preview` no ejecuta la función `/api/lugares`: para probar también el buscador,
utilizar `npm run dev` o la aplicación publicada en Vercel.

### Verificar la persistencia real

1. Iniciar sesión y agregar un viaje o un destino pendiente.
2. Comprobar que aparece en **Firestore → Datos**, dentro de las colecciones del UID.
3. Recargar la aplicación y verificar que permanece.
4. Editarlo, guardar y comprobar el cambio en la aplicación y en Firestore.
5. Eliminar un registro de prueba y comprobar que desaparece también al recargar.
6. Repetir desde la URL de Vercel y revisar la interfaz en un celular.

Los cambios de edición y su persistencia al recargar se comprobaron manualmente
por la autora tanto en local como desde Vercel durante la preparación de la entrega.
Para una guía más amplia, consultar [docs/VERIFICACION.md](docs/VERIFICACION.md).

## Publicación en Vercel

1. Importar el repositorio de GitHub en Vercel.
2. Seleccionar **Vite** y la carpeta que contiene `package.json` como Root Directory.
3. Usar `npm run build` como comando de compilación y `dist` como directorio de salida.
4. Agregar las seis variables de Firebase en **Settings → Environment Variables**
   para Production y configurar el contacto del buscador indicado anteriormente.
5. Desplegar y comprobar la URL pública. Si las variables se agregan o cambian
   después de compilar, realizar un nuevo despliegue.

El proyecto está conectado con la rama `main`: al subir cambios a GitHub, Vercel
realiza un nuevo despliegue. Comprobar su estado **Ready** y que la URL principal
refleje los cambios. Las reglas de Firestore se publican por separado en Firebase;
el despliegue de Vercel no las actualiza.

## Organización del código

```text
src/App.jsx                 Navegación, formularios y pantallas principales
src/components/             Inicio, acceso, tarjetas, galerías, mapa y buscador
src/hooks/useDatosUsuario.js Lectura y escritura de datos por usuario
src/services/               Autenticación y consulta al buscador
src/utils/                  Validaciones, filtros y cálculo de países visitados
src/firebase.js             Inicialización de Firebase
api/lugares.js              Función serverless para Vercel
server/lugares.mjs           Consultas a Nominatim y Wikidata
firestore.rules             Permisos de acceso a Firestore
.env.example                Nombres de variables de configuración
tests/                      Pruebas automatizadas con datos simulados
docs/                       Documentación técnica y guías de verificación
```
