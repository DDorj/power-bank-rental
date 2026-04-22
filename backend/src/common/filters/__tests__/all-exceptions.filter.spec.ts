import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorBody } from '../all-exceptions.filter.js';
import { AllExceptionsFilter } from '../all-exceptions.filter.js';

function buildHost(mockResponse: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  } as never;
}

function getJsonArg(jsonMock: jest.Mock): ErrorBody {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return jsonMock.mock.calls[0][0] as ErrorBody;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  });

  it('handles HttpException with string message', () => {
    filter.catch(
      new BadRequestException('invalid input'),
      buildHost({ status: statusMock, json: jsonMock }),
    );

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = getJsonArg(jsonMock);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('invalid input');
  });

  it('handles HttpException with object response and custom code', () => {
    const exception = new HttpException(
      { code: 'CUSTOM_CODE', message: 'Custom error' },
      422,
    );
    filter.catch(exception, buildHost({ status: statusMock, json: jsonMock }));

    const body = getJsonArg(jsonMock);
    expect(body.success).toBe(false);
    expect(body.code).toBe('CUSTOM_CODE');
    expect(body.statusCode).toBe(422);
  });

  it('uses common message when known code is provided without message', () => {
    const exception = new HttpException({ code: 'USER_NOT_FOUND' }, 404);
    filter.catch(exception, buildHost({ status: statusMock, json: jsonMock }));

    const body = getJsonArg(jsonMock);
    expect(body.success).toBe(false);
    expect(body.code).toBe('USER_NOT_FOUND');
    expect(body.message).toBe('Хэрэглэгч олдсонгүй');
    expect(body.statusCode).toBe(404);
  });

  it('handles unknown errors with 500', () => {
    filter.catch(
      new Error('boom'),
      buildHost({ status: statusMock, json: jsonMock }),
    );

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = getJsonArg(jsonMock);
    expect(body.success).toBe(false);
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.statusCode).toBe(500);
  });
});
