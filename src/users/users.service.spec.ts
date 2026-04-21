import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should hash the password if provided', async () => {
      const updateUserDto = { password: 'newPassword123!' };
      const userId = 1;
      const mockUser = { id: userId, email: 'test@test.com', password: 'hashedPassword' };

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.update(userId, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123!', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          password: expect.stringContaining('$2b$10$'), // Simplified check
        }),
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should not hash anything if password is not provided', async () => {
      const updateUserDto = { name: 'New Name' };
      const userId = 1;
      const mockUser = { id: userId, email: 'test@test.com', name: 'New Name', password: 'oldHashedPassword' };

      mockPrismaService.user.update.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash');

      const result = await service.update(userId, updateUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
      });
      expect(result).not.toHaveProperty('password');
    });
  });
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((pw) => Promise.resolve(`$2b$10$mockedhashedpasswordfor${pw}`)),
}));
