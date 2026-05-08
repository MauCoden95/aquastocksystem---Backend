import { IsEnum, IsString } from 'class-validator';

export enum SaleStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateSaleStatusDto {
  @IsEnum(SaleStatus)
  status: SaleStatus;
}
