# Verificación de las mejoras de VIAJANDO

## Comprobaciones locales

- `npm run lint`
- `npm test`: validaciones, fotos antiguas y nuevas, filtros, conteo por ISO,
  CRUD y conversión de destinos con Firestore simulado. No escribe en Firebase.
- `npm run build`

También se verificaron las cuatro pantallas en Chrome headless a 320, 375,
768 y 1280 px con un proveedor de datos simulado. Se probaron los mensajes,
el guardado y edición, la galería, el buscador, el orden, la eliminación,
las estadísticas, el arrastre real con mouse y los tooltips del mapa.

## Prueba manual con el proyecto real de Firebase

1. Abrir un viaje anterior: comprobar su foto y descripción. Editarlo y confirmar
   que conserva los datos anteriores. No hay migración automática de documentos.
2. Crear un viaje con foto principal y dos URLs adicionales; agregar una
   descripción de varios párrafos y lugares destacados, uno por línea.
3. Ver sus fotos en el detalle y en «Instantes de tus viajes»; seleccionar una
   foto para abrir su recuerdo. Editar y recargar para verificar la persistencia.
4. Crear dos viajes al mismo país con variantes como «Estados Unidos» y «USA».
   Inicio debe contar dos viajes y un país. Los continentes usan la clasificación
   de Natural Earth: América del Norte y América del Sur se cuentan por separado.
   Países desconocidos o continentes no determinados no se incluyen en esos conteos.
5. Crear un destino en Por conocer, pulsar «¡Ya lo conocí!» y completar su fecha.
   Guardar: debe aparecer un único viaje y desaparecer ese destino pendiente.
6. Repetir sin conexión: una transacción no puede completarse; conservar el
   formulario y el destino pendiente. Recuperar conexión y reintentar.
7. Probar campos vacíos, fechas futuras y URLs incorrectas; verificar los mensajes.
   Una URL válida que no sea una imagen muestra el reemplazo y su aviso.
8. Buscar por destino y país, con y sin tildes, y alternar ambos órdenes de fecha.
9. Cancelar una eliminación y confirmar otra. Comprobar cambios en Firestore,
   estadísticas y mapa. Eliminar el último viaje de un país lo desmarca.
10. Revisar foco con Tab, envío con teclado, fotografías y scroll táctil, menú fijo
    inferior, FAQ y footer en celular. Probar preferencia de movimiento reducido.

## Compatibilidad de datos

- Se conservan `foto`, `destino`, `pais`, `fecha` y `descripcion`.
- Los viajes guardados o editados pueden incluir `fotos` y `destacados` (arrays).
- La edición usa updateDoc y conserva campos ajenos al formulario.
- La conversión utiliza una transacción en las colecciones actuales del usuario.
  El ID `desde-pendiente-{idDelDestino}` permite reintentar sin crear duplicados.
- No se cambiaron credenciales, configuración ni reglas de Firebase.

## Cuentas y pantalla inicial de acceso

1. Sin sesión, comprobar que aparece VIAJANDO, el eslogan y el formulario de acceso,
   sin navegación ni homepage. No se debe crear una cuenta anónima automáticamente.
2. Registrar un correo nuevo, completar la contraseña y su confirmación. Debe
   abrirse Inicio con la navegación de cuatro opciones, perfil y Cerrar sesión,
   sin mostrar el correo en la barra.
3. Crear un viaje, recargar y comprobar la persistencia de sesión y datos.
4. Cerrar sesión: debe volver al acceso y permanecer allí al recargar, sin crear
   una identidad anónima. Iniciar sesión con el mismo correo recupera los viajes.
5. Si existe una sesión anónima anterior, debe permanecer en la pantalla de acceso.
   Crear una cuenta con un correo nuevo debe vincularla con linkWithCredential,
   manteniendo su UID y los documentos existentes. No se fusionan cuentas.
6. Probar campos vacíos, contraseñas que no coinciden, contraseña incorrecta,
   correo existente y conexión interrumpida. Los errores no deben borrar datos.
7. Revisar acceso y navegación autenticada en celular, tablet y computadora;
   usar Tab y Enter para recorrer los campos y enviar el formulario.

Las pruebas automatizadas y la revisión de Chrome usan autenticación simulada.
No se registraron usuarios reales durante esas comprobaciones. Las credenciales,
variables de entorno y reglas de seguridad del proyecto permanecen iguales.
