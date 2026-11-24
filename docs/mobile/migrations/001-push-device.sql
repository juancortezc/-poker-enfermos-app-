-- 001-push-device.sql — T16 push nativo (tabla push_devices)
--
-- PENDIENTE DE APROBACIÓN. NO aplicado a producción.
-- Aplicado solo a la rama Neon de QA (ep-noisy-bread) con `prisma db push`.
--
-- Generado con:
--   npx prisma migrate diff \
--     --from-schema-datamodel <apps/web/prisma/schema.prisma de 00abfb4> \
--     --to-schema-datamodel apps/web/prisma/schema.prisma --script
-- y verificado idéntico contra la base de QA antes del push
-- (`--from-url <QA>`): la única diferencia era esta tabla.
--
-- Cambio aditivo: tabla nueva, no toca columnas ni datos existentes.
-- Aplicar en producción una sola vez, en una transacción:
--   psql "$DATABASE_URL" -1 -f docs/mobile/migrations/001-push-device.sql
-- Debe estar aplicado ANTES de desplegar el código que usa prisma.pushDevice:
-- sin la tabla, los envíos de push fallan al consultar push_devices.

-- CreateTable
CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "expo_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_expo_token_key" ON "push_devices"("expo_token");

-- CreateIndex
CREATE INDEX "push_devices_player_id_idx" ON "push_devices"("player_id");

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
