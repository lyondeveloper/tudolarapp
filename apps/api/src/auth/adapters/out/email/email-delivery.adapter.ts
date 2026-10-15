import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmailDeliveryPort } from '../../../application/auth.ports';

@Injectable()
export class UnavailableEmailDeliveryAdapter implements EmailDeliveryPort {
  readonly available = false;

  sendVerification(): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableException('Email delivery is not configured'),
    );
  }

  sendPasswordReset(): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableException('Email delivery is not configured'),
    );
  }

  sendPasswordChanged(): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableException('Email delivery is not configured'),
    );
  }
}

@Injectable()
export class InMemoryEmailDeliveryAdapter implements EmailDeliveryPort {
  readonly available = true;
  readonly messages: Array<{
    email: string;
    purpose: 'verify_email' | 'password_reset' | 'password_changed';
    token?: string;
  }> = [];

  sendVerification(email: string, token: string): Promise<void> {
    this.messages.push({ email, purpose: 'verify_email', token });
    return Promise.resolve();
  }

  sendPasswordReset(email: string, token: string): Promise<void> {
    this.messages.push({ email, purpose: 'password_reset', token });
    return Promise.resolve();
  }

  sendPasswordChanged(email: string): Promise<void> {
    this.messages.push({ email, purpose: 'password_changed' });
    return Promise.resolve();
  }

  latestToken(
    email: string,
    purpose: 'verify_email' | 'password_reset',
  ): string | undefined {
    return this.messages
      .slice()
      .reverse()
      .find((message) => message.email === email && message.purpose === purpose)
      ?.token;
  }
}
