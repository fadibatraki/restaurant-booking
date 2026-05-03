import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'User',
      email: 'user@example.com',
      role: 'CUSTOMER',
      passwordHash: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@example.com', password: 'wrongpass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should return temporary token and safe user fields for valid credentials', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'User',
      email: 'user@example.com',
      role: 'CUSTOMER',
      passwordHash: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-jwt-token');

    await expect(
      service.login({ email: 'user@example.com', password: '123456' }),
    ).resolves.toEqual({
      accessToken: 'signed-jwt-token',
      user: {
        id: 1,
        name: 'User',
        email: 'user@example.com',
        role: 'CUSTOMER',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'user@example.com',
      role: 'CUSTOMER',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
