import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@unicircle.app';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  // Check if super admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Super admin already exists. Updating...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: {
        role: 'super_admin',
        passwordHash: hashedPassword,
        isVerified: true,
        verificationStatus: 'approved',
      },
    });
    console.log('✅ Super admin updated successfully!');
  } else {
    // Create super admin
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: 'super_admin',
        isVerified: true,
        verificationStatus: 'approved',
        profileMode: 'professional',
      },
    });
    console.log('✅ Super admin created successfully!');
  }

  console.log(`\n📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('\n⚠️  Please change the password after first login!');
}

createSuperAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

