import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Profile } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Profile => {
    const request = ctx.switchToHttp().getRequest<{ user: Profile }>();
    return request.user;
  },
);
