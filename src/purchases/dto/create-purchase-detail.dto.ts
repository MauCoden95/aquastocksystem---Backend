import { IsInt, IsNumber, Min } from 'class-validator';

export class CreatePurchaseDetailDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}
