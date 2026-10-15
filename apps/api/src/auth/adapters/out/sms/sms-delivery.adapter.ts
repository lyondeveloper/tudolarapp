import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SmsDeliveryPort } from '../../../application/auth.ports';

@Injectable()
export class UnavailableSmsDeliveryAdapter implements SmsDeliveryPort {
  readonly available = false;

  sendPhoneVerification(): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableException('SMS delivery is not configured'),
    );
  }
}

@Injectable()
export class InMemorySmsDeliveryAdapter implements SmsDeliveryPort {
  readonly available = true;
  readonly messages: Array<{ phoneE164: string; code: string }> = [];

  sendPhoneVerification(phoneE164: string, code: string): Promise<void> {
    this.messages.push({ phoneE164, code });
    return Promise.resolve();
  }

  latestCode(phoneE164: string): string | undefined {
    return this.messages
      .slice()
      .reverse()
      .find((message) => message.phoneE164 === phoneE164)?.code;
  }
}
