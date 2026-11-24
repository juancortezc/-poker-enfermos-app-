-- 002-eliminations-unique.sql — una posición y un eliminado por fecha
--
-- PENDIENTE DE APROBACIÓN. NO aplicado a producción.
-- Aplicado solo a la rama Neon de QA (ep-noisy-bread) con `prisma db push`.
--
-- Generado con:
--   npx prisma migrate diff --from-url <PRODUCCIÓN> \
--     --to-schema-datamodel apps/web/prisma/schema.prisma --script
-- El diff contra producción incluye además la tabla push_devices, que es la
-- migración 001 (todavía pendiente); aquí queda solo lo propio de 002.
--
-- Comprobación previa (SELECT de solo lectura, 2026-11-24):
--   producción: 765 eliminaciones, 0 duplicados por (fecha, posición),
--               0 duplicados por (fecha, eliminado).
--   QA:         777 eliminaciones, 0 y 0.
-- Volver a correr esta comprobación justo antes de aplicar; si devuelve filas,
-- el CREATE UNIQUE INDEX falla y hay que resolver esos duplicados primero:
--   SELECT game_date_id, position, array_agg(id) FROM eliminations
--     GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT game_date_id, eliminated_player_id, array_agg(id) FROM eliminations
--     GROUP BY 1, 2 HAVING count(*) > 1;
--
-- Cambio aditivo: solo índices, no toca columnas ni datos.
-- Aplicar en producción una sola vez, en una transacción:
--   psql "$DATABASE_URL" -1 -f docs/mobile/migrations/002-eliminations-unique.sql
-- El código que captura el error de unicidad (P2002 → 409) funciona con o sin
-- estos índices; sin ellos, dos altas simultáneas aún podrían colarse.

-- CreateIndex
CREATE UNIQUE INDEX "eliminations_game_date_id_position_key" ON "eliminations"("game_date_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "eliminations_game_date_id_eliminated_player_id_key" ON "eliminations"("game_date_id", "eliminated_player_id");
