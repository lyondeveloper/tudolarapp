import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export const IS_PUBLIC_ROUTE = 'isPublicRoute';
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedPrincipal }>();
    return request.user;
  },
);
