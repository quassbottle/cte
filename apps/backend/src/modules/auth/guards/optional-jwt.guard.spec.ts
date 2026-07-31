import { ExecutionContext } from '@nestjs/common';
import { JwtUserGuard } from './jwt.guard';
import { OptionalJwtUserGuard } from './optional-jwt.guard';

const context = (headers: Record<string, string>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as ExecutionContext;

describe('OptionalJwtUserGuard', () => {
  it('keeps requests without Authorization anonymous', () => {
    const guard = new OptionalJwtUserGuard();

    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('validates requests that provide Authorization', () => {
    const parent = jest
      .spyOn(JwtUserGuard.prototype, 'canActivate')
      .mockReturnValue(true);
    const guard = new OptionalJwtUserGuard();

    expect(guard.canActivate(context({ authorization: 'Bearer token' }))).toBe(
      true,
    );
    expect(parent).toHaveBeenCalledTimes(1);
  });
});
