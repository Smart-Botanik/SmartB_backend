import { PrismaService } from '../prisma/prisma.service';

export function createPrismaResources(prismaService: PrismaService) {
  return [
    {
      resource: prismaService.user,
      options: {
        id: 'User',
        listProperties: ['id', 'email', 'username', 'role', 'createdAt'],
        showProperties: ['id', 'email', 'username', 'role', 'createdAt', 'updatedAt'],
        editProperties: ['email', 'username', 'role'],
        filterProperties: ['email', 'username', 'role'],
        properties: {
          passwordHash: {
            isVisible: false,
          },
          role: {
            availableValues: [
              { value: 'USER', label: 'User' },
              { value: 'ADMIN', label: 'Admin' },
            ],
          },
        },
      },
    },
    {
      resource: prismaService.plant,
      options: {
        id: 'Plant',
        listProperties: ['id', 'name', 'userId', 'createdAt'],
        showProperties: ['id', 'name', 'userId', 'diaryId', 'createdAt', 'updatedAt'],
        editProperties: ['name', 'userId', 'diaryId'],
        filterProperties: ['name', 'userId'],
      },
    },
    {
      resource: prismaService.diary,
      options: {
        id: 'Diary',
        listProperties: ['id', 'title', 'userId', 'createdAt'],
        showProperties: ['id', 'title', 'body', 'userId', 'createdAt', 'updatedAt'],
        editProperties: ['title', 'body', 'userId'],
        filterProperties: ['title', 'userId'],
      },
    },
    {
      resource: prismaService.brand,
      options: {
        id: 'Brand',
        listProperties: ['id', 'name', 'category', 'createdAt'],
        showProperties: ['id', 'name', 'category', 'avatarMediaId', 'createdAt', 'updatedAt'],
        editProperties: ['name', 'category', 'avatarMediaId'],
        filterProperties: ['name', 'category'],
      },
    },
    {
      resource: prismaService.product,
      options: {
        id: 'Product',
        listProperties: ['id', 'name', 'category', 'brandId', 'createdAt'],
        showProperties: ['id', 'name', 'category', 'brandId', 'avatarMediaId', 'createdAt', 'updatedAt'],
        editProperties: ['name', 'category', 'brandId', 'avatarMediaId'],
        filterProperties: ['name', 'category', 'brandId'],
      },
    },
    {
      resource: prismaService.media,
      options: {
        id: 'Media',
        listProperties: ['id', 'provider', 'bucket', 'key', 'mime', 'createdAt'],
        showProperties: ['id', 'provider', 'bucket', 'key', 'url', 'mime', 'size', 'width', 'height', 'createdAt'],
        editProperties: ['provider', 'bucket', 'key', 'url', 'mime', 'size', 'width', 'height'],
        filterProperties: ['provider', 'bucket', 'mime'],
      },
    },
  ];
}

export async function testDatabaseConnection(prismaService: PrismaService): Promise<boolean> {
  try {
    await prismaService.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export async function getDatabaseStats(prismaService: PrismaService) {
  try {
    const stats = await Promise.all([
      prismaService.user.count(),
      prismaService.plant.count(),
      prismaService.diary.count(),
      prismaService.brand.count(),
      prismaService.product.count(),
      prismaService.media.count(),
    ]);

    return {
      user: stats[0],
      plant: stats[1],
      diary: stats[2],
      brand: stats[3],
      product: stats[4],
      media: stats[5],
      total: stats.reduce((sum, count) => sum + count, 0),
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
}
