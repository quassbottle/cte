import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EnvService } from 'lib/common/env/env.service';
import { OsuModule } from 'lib/osu/osu.module';
import { UserModule } from 'modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtUserGuard } from './guards/jwt.guard';
import { JwtService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  exports: [JwtUserGuard],
  providers: [AuthService, JwtService, JwtStrategy, JwtUserGuard],
  imports: [
    OsuModule,
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt-user-guard' }),
    NestJwtModule.registerAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        secret: env.get('JWT_SECRET'),
        signOptions: { expiresIn: env.get('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
