import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const DEFAULT_PRICING = {
  ratePerHour: 500,
  dailyMax: 5000,
  depositAmount: 3000,
};

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

    console.log(
      `Default pricing seeded: rate=${DEFAULT_PRICING.ratePerHour}, dailyMax=${DEFAULT_PRICING.dailyMax}, deposit=${DEFAULT_PRICING.depositAmount}`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
