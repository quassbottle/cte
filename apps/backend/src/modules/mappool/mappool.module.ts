import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { MappoolController } from './mappool.controller';
import { MappoolService } from './mappool.service';

@Module({
  imports: [AuthModule],
  controllers: [MappoolController],
  providers: [MappoolService],
  exports: [MappoolService],
})
export class MappoolModule {}
