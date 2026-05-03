import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate login to authService', async () => {
    const payload: LoginDto = {
      email: 'user@example.com',
      password: '123456',
    };
    const expectedResult = {
      accessToken: 'temporary-token',
      user: {
        id: 1,
        name: 'User',
        email: 'user@example.com',
        role: 'CUSTOMER',
      },
    };

    authService.login.mockResolvedValue(expectedResult);

    await expect(controller.login(payload)).resolves.toEqual(expectedResult);
    expect(authService.login).toHaveBeenCalledWith(payload);
  });

  it('should return safe user fields from token payload for me', () => {
    expect(
      controller.me({
        user: {
          sub: 1,
          email: 'user@example.com',
          role: 'CUSTOMER',
        },
      } as never),
    ).toEqual({
      id: 1,
      email: 'user@example.com',
      role: 'CUSTOMER',
    });
  });
});
