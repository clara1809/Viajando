# VIAJANDO

Aplicación de diario de viajes desarrollada para Desarrollo Frontend II.
Permite guardar experiencias, fotografías y lugares que se quieren conocer.

## Funcionalidades

- **Inicio:** destinos para inspirarse, estadísticas personales y preguntas frecuentes.
- **Mis viajes:** registrar y editar viajes, fechas, experiencias, fotografías y lugares destacados.
- **Mis recuerdos:** consultar, buscar y ordenar viajes, ver sus fotografías y explorar el mapa de países visitados.
- **Por conocer:** guardar destinos pendientes, editarlos, eliminarlos o convertirlos en viajes realizados.

Interfaz en español, diseño responsive y navegación inferior fija en celulares.

## Tecnologías

React, Vite, JavaScript, CSS, Firebase Authentication anónimo y Cloud Firestore.
Las tipografías IvyMode y Finder se cargan mediante Adobe Fonts.
Los datos geográficos provienen de Natural Earth; su fuente se documenta en
[src/data/README.md](src/data/README.md).

## Ejecutar localmente

Necesitás una versión de Node.js compatible con Vite 8 y npm.

```sh
npm ci
cp .env.example .env
```

Completá las seis variables de `.env` con la configuración de la aplicación web
que figura en la consola de tu proyecto Firebase. Luego:

```sh
npm run dev
```

Reiniciá el servidor de desarrollo si cambiás `.env`.

## Firebase

Habilitá el proveedor **Anónimo** en Authentication y creá Cloud Firestore.
Los datos se guardan en las subcolecciones de cada usuario autenticado:

```text
usuarios/{uid}/viajes/{id}
usuarios/{uid}/porConocer/{id}
```

[firestore.rules](firestore.rules) contiene las reglas de acceso por UID
correspondientes a la configuración definida para este proyecto. El archivo
local no publica reglas automáticamente: comprobá que coincida con las reglas
activas de la consola. No se incluyen credenciales de administración.

La sesión anónima se conserva en el mismo navegador. Otro navegador o la
eliminación de sus datos pueden generar una identidad diferente.

`.env` no se sube al repositorio. Las variables con prefijo `VITE_` forman parte
del frontend compilado; el acceso a los documentos está protegido por las reglas.

## Comprobaciones

```sh
npm run lint
npm test
npm run build
npm run preview
```

Las pruebas automatizadas usan datos simulados y no escriben en Firestore.
La compilación genera `dist/`, excluido del repositorio. El mapa se descarga
al entrar a Mis recuerdos para reducir la carga inicial.

Consultá [docs/VERIFICACION.md](docs/VERIFICACION.md) para comprobar manualmente
la persistencia y las operaciones con el proyecto real de Firebase.

## Publicación

En un servicio como Vercel, usá `npm run build` como comando de compilación y
`dist` como directorio de salida. Configurá las seis variables de `.env.example`
en el entorno del servicio antes de compilar.

Repositorio previsto: https://github.com/clara1809/Viajando
