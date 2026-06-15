import { ApiProperty } from '@nestjs/swagger';

export class TelegramSignInNonceResponseDto {
  @ApiProperty({ description: 'One-time nonce for Telegram Login OIDC flow' })
  nonce: string;
}
