import type {
  AccountStatus,
  AuthenticationMethod,
} from '../../auth/domain/user';

export interface CurrentUserView {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  accountStatus: AccountStatus;
  authMethods: AuthenticationMethod[];
}
