const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: "dev-user" },
    update: {},
    create: { clerkId: "dev-user", email: "user_dev@ganado.ai" },
  });

  const units = ["kg", "lt", "und", "saco", "frasco"];
  console.log("Seeding units as tags on sample products context only:", units.join(", "));

  const sampleProducts = [
    { code: "SAL-001", name: "Sal mineralizada", unit: "kg", category: "Nutrición", minStock: 50, cost: 2.5, supplier: "Proveedor A" },
    { code: "VAC-AFT", name: "Vacuna Aftosa", unit: "frasco", category: "Sanidad", minStock: 10, cost: 12.0, supplier: "Vet Salud" },
    { code: "DESP-LEV", name: "Desparasitante Levamisol", unit: "frasco", category: "Sanidad", minStock: 8, cost: 8.9, supplier: "Vet Salud" },
  ];

  for (const p of sampleProducts) {
    const exists = await prisma.product.findFirst({ where: { code: p.code, userId: user.id } });
    if (!exists) {
      await prisma.product.create({ data: { ...p, userId: user.id } });
    }
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error("Seed error", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
