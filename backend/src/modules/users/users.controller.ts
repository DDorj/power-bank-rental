import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto.js';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiSuccessResponse({ type: UserResponseDto })
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    const record = await this.usersService.getById(user.id);
    return toUserResponse(record);
  }
}
