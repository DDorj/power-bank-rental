import { ServiceUnavailableException } from '@nestjs/common';
import { buildAppError } from '../../common/errors/app-errors.js';

export class MqttNotConfiguredException extends ServiceUnavailableException {
  constructor() {
    super(buildAppError('MQTT_NOT_CONFIGURED'));
  }
}

export class MqttUnavailableException extends ServiceUnavailableException {
  constructor(message?: string) {
    super(
      buildAppError('MQTT_UNAVAILABLE', message ? { message } : undefined),
    );
  }
}

export class CabinetNotConfiguredException extends ServiceUnavailableException {
  constructor() {
    super(buildAppError('CABINET_NOT_CONFIGURED'));
  }
}

export class CabinetOfflineException extends ServiceUnavailableException {
  constructor() {
    super(buildAppError('CABINET_OFFLINE'));
  }
}

export class CabinetAckTimeoutException extends ServiceUnavailableException {
  constructor() {
    super(buildAppError('CABINET_ACK_TIMEOUT'));
  }
}

export class CabinetCommandFailedException extends ServiceUnavailableException {
  constructor(message?: string) {
    super(
      buildAppError(
        'CABINET_COMMAND_FAILED',
        message ? { message } : undefined,
      ),
    );
  }
}
