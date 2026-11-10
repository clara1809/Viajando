# Rediseño visual de VIAJANDO

El cambio se limita a presentación: CSS, carga de tipografías, texto editorial de portada y dos clases de sección. No se modificaron endpoints, consultas, credenciales, autenticación, guardado, edición ni eliminación.

## Identidad visual

- Marfil `#F8F6F1`, arena `#E9E4DA`, oliva `#747B63`, carbón `#292C27` y terracota `#B68D73`.
- Se usa oliva profundo `#596149` en botones y enlaces para mejorar el contraste del texto. La terracota se reserva para detalles decorativos.
- Cormorant Garamond para títulos y DM Sans para interfaz, con fuentes de respaldo y `display=swap`.
- Portada editorial asimétrica, fotografías existentes en gran formato, tarjetas de recuerdos como álbum, formularios y mensajes unificados.
- Se conservan las cuatro secciones, las estadísticas, las preguntas frecuentes y el pie. No existía un bloque de contacto independiente y no se inventaron datos de contacto.
- Se mantienen el arrastre del carrusel, sus 24 px de separación y la ausencia de flechas en Mis recuerdos. No se sustituyó ninguna imagen ni URL de fotografía.
- Controles táctiles de al menos 44 px, foco visible y respeto por la preferencia de movimiento reducido. Menú inferior y acceso superior en celular; encabezado persistente en escritorio.

## Archivos modificados para el rediseño

- `index.html`: carga las dos tipografías solicitadas, reemplazando la referencia tipográfica anterior.
- `src/index.css`: variables de color, familias tipográficas, estilos base, foco y movimiento reducido.
- `src/App.css`: encabezado, menú, formularios, mensajes, tarjetas, álbum, filtros, pie y adaptación responsive.
- `src/components/Inicio.css`: portada, destinos editoriales, estadísticas y preguntas frecuentes.
- `src/components/Inicio.jsx`: cambia únicamente la presentación y textos de la portada; eventos y fotografías se conservan.
- `src/App.jsx`: agrega solamente las clases `seccion-viajes` y `seccion-destinos` respecto del estado anterior a este rediseño.
- `src/components/AccesoCuenta.css`: presentación de acceso, registro y botón de sesión, sin modificar el componente ni sus operaciones.
- `src/components/LugaresTuristicos.css`: buscador y tarjetas de Nominatim/Wikidata, sin modificar JSX ni lógica.
- `src/components/MapaRecuerdos.css`: colores y presentación del mapa y su etiqueta, sin modificar datos ni interacción.

## Verificación

Se verificaron por hash, antes y después, los archivos de Firebase, hook de usuario, servicios de sesión y lugares, backend y entrada API, y el componente de lugares turísticos. Todos se conservaron idénticos durante el rediseño. Había cambios funcionales de las tareas anteriores en el workspace: no se revirtieron ni se atribuyen a este cambio visual.

- `npm test`: 27 pruebas aprobadas.
- `npm run lint`: correcto.
- `npm run build`: correcto; se mantiene la advertencia de Vite sobre paquetes grandes.
- `git diff --check`: correcto.
- Chrome real, a 1440, 768, 390 y 320 px: se recorrieron Inicio, Mis viajes, Mis recuerdos y Por conocer, sin desbordes horizontales ni excepciones JavaScript.
- Se comprobó apertura/cierre de recuerdos y arrastre con eventos reales del mouse: el carrusel se desplazó 318 px sin abrir accidentalmente una tarjeta ni agregar flechas.
- Se revisaron las tarjetas de atracciones a 1440, 390 y 320 px. En esa prueba se interceptó la respuesta exclusivamente en el navegador temporal, usando ejemplos de la evidencia previa; no se enviaron nuevas consultas externas.
- Se revisó acceso a 1440, 390 y 320 px, el cambio a registro y la validación de un formulario vacío.

La inspección visual utilizó una configuración temporal fuera del proyecto con datos ficticios y un perfil Chrome separado. No cambió el código de autenticación de la aplicación, no inició sesión con una cuenta real ni escribió en Firestore. No se añadieron librerías o dependencias para esta revisión.

## Cómo revisar

Ejecutar `npm run dev` y abrir la URL que indique Vite. Revisar las cuatro secciones con una cuenta propia, las preguntas frecuentes, el carrusel, formularios y búsqueda. Probar también el ancho de celular desde las herramientas del navegador. Las nuevas fuentes necesitan acceso a Google Fonts; si no hay conexión se muestran las fuentes de respaldo.

No se publicaron cambios en GitHub ni se desplegó a Vercel.
