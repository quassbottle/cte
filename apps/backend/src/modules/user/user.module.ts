import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { OsuStatsService } from './osu-stats.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService, OsuStatsService],
  exports: [UserService, OsuStatsService],
})
export class UserModule {}
