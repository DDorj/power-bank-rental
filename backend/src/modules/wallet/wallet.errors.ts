import { BadRequestException } from '@nestjs/common';

export class InsufficientBalanceException extends BadRequestException {
  constructor() {
    super({
      code: 'INSUFFICIENT_BALANCE',
      message: 'Хэтэвчний үлдэгдэл хүрэлцэхгүй байна',
    });
  }
}

export class WalletNotFoundException extends BadRequestException {
  constructor() {
    super({ code: 'WALLET_NOT_FOUND', message: 'Хэтэвч олдсонгүй' });
  }
}
