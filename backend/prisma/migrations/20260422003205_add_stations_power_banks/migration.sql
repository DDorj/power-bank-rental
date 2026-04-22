-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('active', 'inactive', 'maintenance');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('empty', 'occupied', 'faulty');

-- CreateEnum
CREATE TYPE "PowerBankStatus" AS ENUM ('idle', 'rented', 'charging', 'faulty');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
    "status" "StationStatus" NOT NULL DEFAULT 'active',
    "total_slots" SMALLINT NOT NULL,
    "mqtt_device_id" VARCHAR(100),
    "last_heartbeat_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "station_id" UUID NOT NULL,
    "slot_index" SMALLINT NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'empty',
    "power_bank_id" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_banks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serial_number" VARCHAR(100) NOT NULL,
    "status" "PowerBankStatus" NOT NULL DEFAULT 'idle',
    "charge_level" SMALLINT NOT NULL DEFAULT 0,
    "station_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "power_banks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_mqtt_device_id_key" ON "stations"("mqtt_device_id");

-- CreateIndex
CREATE INDEX "stations_status_idx" ON "stations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "slots_power_bank_id_key" ON "slots"("power_bank_id");

-- CreateIndex
CREATE UNIQUE INDEX "slots_station_id_slot_index_key" ON "slots"("station_id", "slot_index");

-- CreateIndex
CREATE UNIQUE INDEX "power_banks_serial_number_key" ON "power_banks"("serial_number");

-- CreateIndex
CREATE INDEX "power_banks_station_id_idx" ON "power_banks"("station_id");

-- CreateIndex
CREATE INDEX "power_banks_status_idx" ON "power_banks"("status");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_power_bank_id_fkey" FOREIGN KEY ("power_bank_id") REFERENCES "power_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_banks" ADD CONSTRAINT "power_banks_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
