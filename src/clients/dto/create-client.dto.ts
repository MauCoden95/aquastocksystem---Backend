import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateClientDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string;

  @IsString({ message: 'El CUIT/CUIL debe ser una cadena de texto' })
  @IsOptional()
  taxId?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'El email debe ser un correo electrónico válido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsOptional()
  address?: string;

  @IsNumber({}, { message: 'El límite de crédito debe ser un número' })
  @IsOptional()
  creditLimit?: number;
}
