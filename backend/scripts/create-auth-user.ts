import { PrismaClient, RoleCode } from '@prisma/client';

import { hashPassword } from '../src/modules/auth/auth-password.util';

const prisma = new PrismaClient();

function parseRole(input: string): RoleCode {
  const normalized = input.trim().toUpperCase();
  if (normalized === RoleCode.ADMIN) return RoleCode.ADMIN;
  if (normalized === RoleCode.OPERATOR) return RoleCode.OPERATOR;
  if (normalized === RoleCode.SUBSCRIBER) return RoleCode.SUBSCRIBER;

  throw new Error(`Unsupported role: ${input}. Allowed: ADMIN, OPERATOR, SUBSCRIBER`);
}

async function main() {
  const [, , email, password, roleArg] = process.argv;

  if (!email || !password || !roleArg) {
    console.error('Usage: npm run create:auth-user -- <email> <password> <ADMIN|OPERATOR|SUBSCRIBER>');
    process.exit(2);
  }

  const roleCode = parseRole(roleArg);

  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    throw new Error(`Role ${roleCode} not found in DB. Run \"npm run seed:auth-users\" first.`);
  }

  const passwordHash = hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roleId: role.id,
      isActive: true
    },
    create: {
      email,
      passwordHash,
      roleId: role.id,
      isActive: true
    }
  });

  console.log(`User upserted: ${email} (${roleCode})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
