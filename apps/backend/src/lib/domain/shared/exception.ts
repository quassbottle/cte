import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(message: string, statusCode: HttpStatus, errorCode: string) {
    super({ message, errorCode }, statusCode);
  }
}
