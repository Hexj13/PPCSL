import { IsOptional, IsUUID } from 'class-validator';

export class CreateSyncRunDto {
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
