import type { IdentityRepositoryPort } from '../../auth/application/auth.ports';
import { AuthApplicationError } from '../../auth/application/auth.errors';
import type { CurrentUserView } from './current-user.view';

export class UsersService {
  constructor(private readonly identity: IdentityRepositoryPort) {}

  async getCurrentUser(userId: string): Promise<CurrentUserView> {
    const account = await this.identity.findById(userId);
    if (!account) throw new AuthApplicationError('USER_NOT_FOUND');
    return {
      id: account.id,
      displayName: account.displayName,
      username: account.username,
      email: account.email,
      emailVerified: Boolean(account.emailVerifiedAt),
      phoneNumber: account.phoneE164,
      phoneVerified: Boolean(account.phoneVerifiedAt),
      accountStatus: account.accountStatus,
      authMethods: account.authMethods,
    };
  }
}
