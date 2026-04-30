import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBrandDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.\-]+$/, {
    message: 'El nombre contiene caracteres no válidos.',
  })
  name: string;
}
