import { IsNumber, IsString, IsNotEmpty, IsPositive, IsOptional, IsDateString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  clientId: number;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
