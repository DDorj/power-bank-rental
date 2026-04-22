import { Injectable, NotFoundException } from '@nestjs/common';
import { APP_ERRORS, buildAppError } from '../../common/errors/app-errors.js';
import { UsersRepository } from './users.repository.js';
import type { UserRecord } from './users.types.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getById(id: string): Promise<UserRecord> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(
        buildAppError(APP_ERRORS.USER_NOT_FOUND.code),
      );
    }
    return user;
  }

  async getByEmail(email: string): Promise<UserRecord | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getByPhone(phone: string): Promise<UserRecord | null> {
    return this.usersRepository.findByPhone(phone);
  }
}
