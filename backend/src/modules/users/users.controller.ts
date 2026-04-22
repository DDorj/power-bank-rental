import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import {
  toUserResponse,
  type UserResponseDto,
} from './dto/user-response.dto.js';

// JwtAuthGuard will be added in the Auth module (Step 3)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    const record = await this.usersService.getById(user.id);
    return toUserResponse(record);
  }
}
