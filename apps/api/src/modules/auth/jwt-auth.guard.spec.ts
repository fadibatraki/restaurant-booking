import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: {
    verifyAsync: jest.Mock;
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    guard = new JwtAuthGuard(jwtService as unknown as JwtService);
  });

  it('should attach the decoded user payload to the request', async () => {
    const request = {
      headers: {
        authorization: 'Bearer signed-jwt-token',
      },
    };
    const payload = {
      sub: 1,
      email: 'user@example.com',
      role: 'CUSTOMER',
    };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('signed-jwt-token');
    expect(request).toEqual({
      headers: {
        authorization: 'Bearer signed-jwt-token',
      },
      user: payload,
    });
  });

  it('should throw UnauthorizedException when the authorization header is missing', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when the token is invalid', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer bad-token',
          },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
