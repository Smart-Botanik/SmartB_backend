import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'admin@growingapp.com';
    const username = 'admin';
    const password = 'admin123';

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', email);
      console.log('📝 Login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email:', adminUser.email);
    console.log('   Username:', adminUser.username);
    console.log('   Password:', password);
    console.log('   Role:', adminUser.role);
    console.log('');
    console.log('🌐 You can now login at: http://localhost:3001/admin/login');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
