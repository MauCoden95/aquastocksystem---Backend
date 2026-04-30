import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsInt({ message: 'La categoría debe ser un número entero' })
  @IsPositive({ message: 'La categoría debe ser un número positivo' })
  categoryId: number;

  @IsInt({ message: 'La marca debe ser un número entero' })
  @IsPositive({ message: 'La marca debe ser un número positivo' })
  brandId: number;

  @IsOptional()
  @IsNumberString({}, { message: 'El código de barras debe ser numérico' })
  barcode?: string;

  @IsNumber({}, { message: 'El precio de compra debe ser un número' })
  @IsPositive({ message: 'El precio de compra debe ser mayor a cero' })
  purchasePrice: number;

  @IsNumber({}, { message: 'El precio de venta debe ser un número' })
  @IsPositive({ message: 'El precio de venta debe ser mayor a cero' })
  sellingPrice: number;

  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock: number;

  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  isActive?: boolean;
}
