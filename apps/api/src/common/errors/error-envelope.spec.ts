import 'reflect-metadata';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthApplicationError } from '../../auth/application/auth.errors';
import { MoneyError } from '../../catalog/money';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ApiErrorCode, isApiErrorCode } from './api-error-code';
import { ApplicationError } from './application-error';

class SampleDto {
  @IsString()
  name!: string;
}

@Controller('envelope')
class EnvelopeController {
  @Get('application-error')
  throwApplicationError(): never {
    throw new ApplicationError(ApiErrorCode.CONFLICT);
  }

  @Get('auth-error')
  throwAuthError(): never {
    throw new AuthApplicationError('INVALID_CREDENTIALS');
  }

  @Get('domain-error')
  throwDomainError(): never {
    throw new MoneyError('1.23456 is not an exact decimal for VES');
  }

  @Get('service-unavailable')
  throwServiceUnavailable(): never {
    throw new ServiceUnavailableException();
  }

  @Get('unprocessable')
  throwUnprocessable(): never {
    throw new UnprocessableEntityException();
  }

  @Post('validated')
  validated(@Body() input: SampleDto): SampleDto {
    return input;
  }
}

interface EnvelopeBody {
  error: { code: unknown; message: unknown; details?: unknown };
  requestId: unknown;
}

function envelopeOf(response: { body: unknown }): EnvelopeBody {
  return response.body as EnvelopeBody;
}

describe('the shared error envelope', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EnvelopeController],
      providers: [
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers a thrown application error with the envelope and a code from the closed enum', async () => {
    const response = await request(app.getHttpServer())
      .get('/envelope/application-error')
      .expect(409);

    const body = envelopeOf(response);
    expect(body.error).toEqual({
      code: ApiErrorCode.CONFLICT,
      message: 'Conflict',
    });
    expect(typeof body.requestId).toBe('string');
    expect(isApiErrorCode(body.error.code)).toBe(true);
  });

  it('answers an auth application error with the same envelope and its auth code', async () => {
    const response = await request(app.getHttpServer())
      .get('/envelope/auth-error')
      .expect(401);

    const body = envelopeOf(response);
    expect(body.error).toEqual({
      code: ApiErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
    });
    expect(typeof body.requestId).toBe('string');
    expect(isApiErrorCode(body.error.code)).toBe(true);
  });

  it('answers a plain domain error with the envelope and an internal-error code', async () => {
    const response = await request(app.getHttpServer())
      .get('/envelope/domain-error')
      .expect(500);

    const body = envelopeOf(response);
    expect(body.error).toEqual({
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
    expect(typeof body.requestId).toBe('string');
    expect(isApiErrorCode(body.error.code)).toBe(true);
  });

  it('preserves a 503 status instead of rewriting it to 500', async () => {
    await request(app.getHttpServer())
      .get('/envelope/service-unavailable')
      .expect(503);
  });

  it('preserves a 422 status instead of rewriting it to 400', async () => {
    await request(app.getHttpServer())
      .get('/envelope/unprocessable')
      .expect(422);
  });

  it('maps a ValidationPipe rejection into the envelope with details', async () => {
    const response = await request(app.getHttpServer())
      .post('/envelope/validated')
      .send({ name: 123, extra: 'not allowed' })
      .expect(400);

    const body = envelopeOf(response);
    expect(body.error.code).toBe(ApiErrorCode.VALIDATION_FAILED);
    expect(isApiErrorCode(body.error.code)).toBe(true);
    expect(Array.isArray(body.error.details)).toBe(true);
    expect((body.error.details as unknown[]).length).toBeGreaterThan(0);
    expect(typeof body.requestId).toBe('string');
  });

  it('echoes the incoming X-Request-Id as the envelope requestId', async () => {
    const response = await request(app.getHttpServer())
      .get('/envelope/application-error')
      .set('X-Request-Id', 'request-id-from-client')
      .expect(409);

    expect(envelopeOf(response).requestId).toBe('request-id-from-client');
  });

  it('never leaks a stack trace or the raw exception in the message', async () => {
    const response = await request(app.getHttpServer())
      .get('/envelope/application-error')
      .expect(409);

    const body = envelopeOf(response);
    expect(body.error.message).toBe('Conflict');
    expect(String(body.error.message)).not.toContain('ApplicationError');
    expect(Object.keys(body).sort()).toEqual(['error', 'requestId']);
    expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
  });
});
