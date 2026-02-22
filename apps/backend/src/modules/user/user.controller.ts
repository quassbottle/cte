import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserIdPipe } from 'lib/common/pipes/user-id.pipe';
import { UserId } from 'lib/domain/user/user.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { UserDto, userDtoSchema } from './dto';
import { UserService } from './user.service';

@ApiBearerAuth('bearer')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtUserGuard)
  @ApiResponse({
    status: 200,
    description: 'Returns the current user.',
    type: UserDto,
  })
  public getMe(@RequestUser() user: DbUser): UserDto {
    return userDtoSchema.parse(user);
  }

  @Get('lookup')
  @ApiResponse({
    status: 200,
    description: 'Returns the user by internal ID, osu! ID, or osu! username.',
    type: UserDto,
  })
  public async getByLookup(@Query('query') query?: string): Promise<UserDto> {
    if (!query?.trim()) {
      throw new BadRequestException('query is required');
    }

    const user = await this.userService.getByLookup({ query });

    return userDtoSchema.parse(user);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Returns the user by ID.',
    type: UserDto,
  })
  public async getById(@Param('id', UserIdPipe) id: UserId): Promise<UserDto> {
    const user = await this.userService.getById({ id });

    return userDtoSchema.parse(user);
  }
}
