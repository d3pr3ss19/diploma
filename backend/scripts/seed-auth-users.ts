import { PrismaClient, RoleCode } from '@prisma/client';

import { hashPassword } from '../src/modules/auth/auth-password.util';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { code: RoleCode.ADMIN, name: 'Администратор' },
    { code: RoleCode.OPERATOR, name: 'Оператор' },
    { code: RoleCode.SUBSCRIBER, name: 'Абонент' }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role
    });
  }

  const passwordHash = hashPassword('password123');

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.ADMIN } });
  const operatorRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.OPERATOR } });
  const subscriberRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUBSCRIBER } });

  await prisma.user.upsert({
    where: { email: 'admin@kp.local' },
    update: { passwordHash, roleId: adminRole.id, isActive: true },
    create: { email: 'admin@kp.local', passwordHash, roleId: adminRole.id, isActive: true }
  });

  await prisma.user.upsert({
    where: { email: 'operator@kp.local' },
    update: { passwordHash, roleId: operatorRole.id, isActive: true },
    create: { email: 'operator@kp.local', passwordHash, roleId: operatorRole.id, isActive: true }
  });

  await prisma.user.upsert({
    where: { email: 'subscriber@kp.local' },
    update: { passwordHash, roleId: subscriberRole.id, isActive: true },
    create: { email: 'subscriber@kp.local', passwordHash, roleId: subscriberRole.id, isActive: true }
  });

  console.log('Seeded auth users: admin/operator/subscriber (password: password123)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
