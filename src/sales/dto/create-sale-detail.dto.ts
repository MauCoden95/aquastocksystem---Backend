import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateSaleDetailDto {
  @IsInt()
  productId: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;
}
