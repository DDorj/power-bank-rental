import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const DEFAULT_PRICING = {
  ratePerHour: 500,
  dailyMax: 5000,
  depositAmount: 3000,
};

const DEMO_USERS = [
  {
    phone: '+97699000001',
    name: 'Admin Demo',
    primaryAuthMethod: 'phone_otp',
    role: 'admin',
    trustTier: 3,
    kycStatus: 'verified',
    balance: 0,
    frozenAmount: 0,
  },
  {
    phone: '+97699000002',
    name: 'Batzaya User',
    primaryAuthMethod: 'phone_otp',
    role: 'user',
    trustTier: 2,
    kycStatus: 'verified',
    balance: 15000,
    frozenAmount: 0,
  },
  {
    phone: '+97699000003',
    name: 'Saraa User',
    primaryAuthMethod: 'phone_otp',
    role: 'user',
    trustTier: 1,
    kycStatus: 'none',
    balance: 8000,
    frozenAmount: 3000,
  },
];

const DEMO_STATIONS = [
  {
    name: 'Shangri-La Mall',
    address: 'Olympic street 19A, Ulaanbaatar',
    lat: 47.9136,
    lng: 106.9155,
    totalSlots: 8,
    mqttDeviceId: 'cabinet-demo-1',
    status: 'active',
    heartbeatMinutesAgo: 1,
  },
  {
    name: 'State Department Store',
    address: 'Ikh Toiruu 8, Ulaanbaatar',
    lat: 47.9191,
    lng: 106.9177,
    totalSlots: 8,
    mqttDeviceId: 'cabinet-demo-2',
    status: 'maintenance',
    heartbeatMinutesAgo: 180,
  },
];

const DEMO_POWER_BANKS = [
  { serialNumber: 'PB-DEMO-001', stationMqtt: 'cabinet-demo-1', slotIndex: 0, status: 'idle', chargeLevel: 92 },
  { serialNumber: 'PB-DEMO-002', stationMqtt: 'cabinet-demo-1', slotIndex: 1, status: 'idle', chargeLevel: 76 },
  { serialNumber: 'PB-DEMO-003', stationMqtt: 'cabinet-demo-1', slotIndex: 2, status: 'charging', chargeLevel: 48 },
  { serialNumber: 'PB-DEMO-004', stationMqtt: 'cabinet-demo-2', slotIndex: 0, status: 'idle', chargeLevel: 88 },
];

async function upsertStation(tx, station) {
  const existing = station.mqttDeviceId
    ? await tx.station.findUnique({
        where: { mqttDeviceId: station.mqttDeviceId },
        select: { id: true },
      })
    : null;

  const lastHeartbeatAt = new Date(Date.now() - station.heartbeatMinutesAgo * 60_000);

  if (existing) {
    await tx.$executeRaw`
      UPDATE stations
      SET
        name = ${station.name},
        address = ${station.address},
        location = ST_SetSRID(ST_MakePoint(${station.lng}, ${station.lat}), 4326),
        status = ${station.status},
        total_slots = ${station.totalSlots},
        last_heartbeat_at = ${lastHeartbeatAt},
        updated_at = NOW()
      WHERE id = ${existing.id}::uuid
    `;

    await tx.slot.deleteMany({ where: { stationId: existing.id } });
    await tx.slot.createMany({
      data: Array.from({ length: station.totalSlots }, (_, index) => ({
        stationId: existing.id,
        slotIndex: index,
        status: 'empty',
      })),
    });

    return existing.id;
  }

  const inserted = await tx.$queryRaw`
    INSERT INTO stations (
      name,
      address,
      location,
      status,
      total_slots,
      mqtt_device_id,
      last_heartbeat_at,
      created_at,
      updated_at
    )
    VALUES (
      ${station.name},
      ${station.address},
      ST_SetSRID(ST_MakePoint(${station.lng}, ${station.lat}), 4326),
      ${station.status},
      ${station.totalSlots},
      ${station.mqttDeviceId},
      ${lastHeartbeatAt},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const id = inserted[0].id;
  await tx.slot.createMany({
    data: Array.from({ length: station.totalSlots }, (_, index) => ({
      stationId: id,
      slotIndex: index,
      status: 'empty',
    })),
  });

  return id;
}

async function seedDemoData(prisma) {
  await prisma.$transaction(async (tx) => {
    const userMap = new Map();
    for (const user of DEMO_USERS) {
      const record = await tx.user.upsert({
        where: { phone: user.phone },
        update: {
          name: user.name,
          role: user.role,
          trustTier: user.trustTier,
          kycStatus: user.kycStatus,
          isActive: true,
        },
        create: {
          phone: user.phone,
          name: user.name,
          role: user.role,
          trustTier: user.trustTier,
          kycStatus: user.kycStatus,
          primaryAuthMethod: user.primaryAuthMethod,
        },
      });

      await tx.wallet.upsert({
        where: { userId: record.id },
        update: {
          balance: user.balance,
          frozenAmount: user.frozenAmount,
        },
        create: {
          userId: record.id,
          balance: user.balance,
          frozenAmount: user.frozenAmount,
        },
      });

      userMap.set(user.phone, record.id);
    }

    const stationMap = new Map();
    for (const station of DEMO_STATIONS) {
      const stationId = await upsertStation(tx, station);
      stationMap.set(station.mqttDeviceId, stationId);
    }

    for (const powerBank of DEMO_POWER_BANKS) {
      const stationId = stationMap.get(powerBank.stationMqtt);
      const slot = await tx.slot.findFirst({
        where: {
          stationId,
          slotIndex: powerBank.slotIndex,
        },
      });

      if (!slot) continue;

      const bank = await tx.powerBank.upsert({
        where: { serialNumber: powerBank.serialNumber },
        update: {
          status: powerBank.status,
          chargeLevel: powerBank.chargeLevel,
          stationId,
        },
        create: {
          serialNumber: powerBank.serialNumber,
          status: powerBank.status,
          chargeLevel: powerBank.chargeLevel,
          stationId,
        },
      });

      await tx.slot.update({
        where: { id: slot.id },
        data: {
          status: 'occupied',
          powerBankId: bank.id,
        },
      });
    }

    const topupUserId = userMap.get('+97699000002');
    if (topupUserId) {
      await tx.bonumInvoice.upsert({
        where: { transactionId: 'seed-topup-paid-1' },
        update: {
          status: 'paid',
          amount: 5000,
          paidAt: new Date(),
          userId: topupUserId,
          expiresAt: new Date(Date.now() + 600_000),
        },
        create: {
          userId: topupUserId,
          transactionId: 'seed-topup-paid-1',
          invoiceId: 'SEED-INV-PAID-1',
          amount: 5000,
          purpose: 'topup',
          status: 'paid',
          followUpLink: 'https://example.mn/paid',
          paymentLinks: null,
          expiresAt: new Date(Date.now() + 600_000),
          paidAt: new Date(),
          paymentTransactionId: 'seed-payment-1',
        },
      });

      await tx.bonumInvoice.upsert({
        where: { transactionId: 'seed-topup-pending-1' },
        update: {
          status: 'pending',
          amount: 3000,
          userId: topupUserId,
          expiresAt: new Date(Date.now() + 600_000),
        },
        create: {
          userId: topupUserId,
          transactionId: 'seed-topup-pending-1',
          invoiceId: 'SEED-INV-PENDING-1',
          amount: 3000,
          purpose: 'topup',
          status: 'pending',
          followUpLink: 'https://example.mn/pending',
          paymentLinks: null,
          expiresAt: new Date(Date.now() + 600_000),
        },
      });
    }
  });
}

async function main() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run prisma/seed.js');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pricingRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      const existing = await tx.pricingRule.findFirst({
        where: DEFAULT_PRICING,
        orderBy: { createdAt: 'asc' },
      });

      if (existing) {
        await tx.pricingRule.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
        return;
      }

      await tx.pricingRule.create({
        data: {
          ...DEFAULT_PRICING,
          isDefault: true,
        },
      });
    });

    await seedDemoData(prisma);

    console.log(
      `Default pricing seeded: rate=${DEFAULT_PRICING.ratePerHour}, dailyMax=${DEFAULT_PRICING.dailyMax}, deposit=${DEFAULT_PRICING.depositAmount}`,
    );
    console.log('Demo admin/dashboard data seeded');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
