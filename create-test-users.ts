import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Test users with different roles
    const testUsers = [
      {
        email: 'user@growingapp.com',
        username: 'testuser',
        password: 'user123',
        role: 'USER',
      },
      {
        email: 'moderator@growingapp.com',
        username: 'testmoderator',
        password: 'moderator123',
        role: 'MODERATOR',
      },
      {
        email: 'admin2@growingapp.com',
        username: 'testadmin2',
        password: 'admin123',
        role: 'ADMIN',
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists`);
        continue;
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          passwordHash,
          role: userData.role as any,
        },
      });

      console.log(`✅ Created ${userData.role} user:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    }

    console.log('🎯 Test Users Summary:');
    console.log('👤 Regular User: user@growingapp.com / user123');
    console.log('🛡️ Moderator: moderator@growingapp.com / moderator123');
    console.log('👑 Admin: admin2@growingapp.com / admin123');
    console.log('👑 Original Admin: admin@growingapp.com / admin123');
    console.log('');
    console.log('🌐 Test different permission levels at: http://localhost:3001/admin/login');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
