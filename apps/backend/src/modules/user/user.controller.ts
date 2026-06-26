import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserIdPipe } from 'lib/common/pipes/user-id.pipe';
import { UserId } from 'lib/domain/user/user.id';
import { DbUser } from 'lib/infrastructure/db';
import { RequestUser } from 'modules/auth/decorators/user.decorator';
import { JwtUserGuard } from 'modules/auth/guards/jwt.guard';
import { ZodResponse } from 'nestjs-zod';
import { UserDto, type UserDtoOutput } from './dto';
import { UserService } from './user.service';

@ApiBearerAuth('bearer')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtUserGuard)
  @ZodResponse({
    status: 200,
    description: 'Returns the current user.',
    type: UserDto,
  })
  public getMe(@RequestUser() user: DbUser): UserDtoOutput {
    return user;
  }

  @Get('lookup')
  @ZodResponse({
    status: 200,
    description: 'Returns the user by internal ID, osu! ID, or osu! username.',
    type: UserDto,
  })
  public async getByLookup(
    @Query('query') query?: string,
  ): Promise<UserDtoOutput> {
    if (!query?.trim()) {
      throw new BadRequestException('query is required');
    }

    const user = await this.userService.getByLookup({ query });

    return user;
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns the user by ID.',
    type: UserDto,
  })
  public async getById(
    @Param('id', UserIdPipe) id: UserId,
  ): Promise<UserDtoOutput> {
    const user = await this.userService.getById({ id });

    return user;
  }
}
