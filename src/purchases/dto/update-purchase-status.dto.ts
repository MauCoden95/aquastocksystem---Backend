import { IsString, IsIn } from 'class-validator';

export class UpdatePurchaseStatusDto {
  @IsString()
  @IsIn(['PENDING', 'COMPLETED', 'CANCELLED'])
  status: string;
}
