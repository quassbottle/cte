import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { StageController } from './stage.controller';
import { StageService } from './stage.service';

@Module({
  imports: [AuthModule],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService],
})
export class StageModule {}
