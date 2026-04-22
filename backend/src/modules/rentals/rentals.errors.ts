import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class RentalNotFoundException extends NotFoundException {
  constructor() {
    super({ code: 'RENTAL_NOT_FOUND', message: 'Түрээс олдсонгүй' });
  }
}

export class SlotNotFoundException extends NotFoundException {
  constructor() {
    super({ code: 'SLOT_NOT_FOUND', message: 'Слот олдсонгүй' });
  }
}

export class SlotEmptyException extends BadRequestException {
  constructor() {
    super({
      code: 'SLOT_EMPTY',
      message: 'Слотэнд идэвхтэй power bank байхгүй байна',
    });
  }
}

export class SlotOccupiedException extends ConflictException {
  constructor() {
    super({ code: 'SLOT_OCCUPIED', message: 'Слот дүүрэн байна' });
  }
}

export class PowerBankNotIdleException extends ConflictException {
  constructor() {
    super({
      code: 'POWER_BANK_NOT_IDLE',
      message: 'Power bank одоогоор ашиглалтад байна',
    });
  }
}

export class ActiveRentalExistsException extends ConflictException {
  constructor() {
    super({
      code: 'ACTIVE_RENTAL_EXISTS',
      message: 'Та аль хэдийн идэвхтэй түрээстэй байна',
    });
  }
}

export class NoPricingRuleException extends BadRequestException {
  constructor() {
    super({ code: 'NO_PRICING_RULE', message: 'Үнийн дүрэм олдсонгүй' });
  }
}
