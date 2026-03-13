import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearClienteDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PERSONA', 'EMPRESA'])
  tipoCliente: 'PERSONA' | 'EMPRESA';

  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'RUC'])
  tipoDoc: 'DNI' | 'RUC';

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroDoc: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  antecedentes?: string;

  // MEDIDAS
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  add?: number;

  // OJO DERECHO
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  odEsf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  odCyl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  odEje?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  dipOd?: number;

  // OJO IZQUIERDO
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  oiEsf?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  oiCyl?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  oiEje?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  dipOi?: number;
}