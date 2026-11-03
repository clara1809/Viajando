El archivo mapaMundial.json contiene trazados SVG en proyección equirectangular,
con coordenadas reales del GeoJSON Natural Earth Admin 0 Countries, escala 1:50m.
Incluye 242 países y territorios; los países pequeños mantienen su tamaño real.

Fuente: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
Licencia: dominio público, https://www.naturalearthdata.com/about/terms-of-use/

Para regenerarlo, descargá ese GeoJSON y ejecutá:
node scripts/generar-mapa.mjs /ruta/ne_50m_admin_0_countries.geojson

Los nombres en español y códigos ISO se conservan para reconocer el campo País.
La cartografía sigue las fronteras del conjunto de datos original.

paises.json conserva únicamente identificadores y nombres del mapa. Las estadísticas
lo utilizan sin descargar geometrías. El mapa completo se carga al abrir Mis recuerdos.
El script generar-mapa.mjs genera ambos archivos para mantenerlos sincronizados.

continentes.json se deriva de CONTINENT en el mismo GeoJSON, utilizando
la clasificación de Natural Earth (América del Norte y del Sur por separado).
Las áreas con clasificación indeterminada se omiten; no se deduce el continente
por la ciudad ni por coincidencias parciales. Los alias de país comparten ISO.
