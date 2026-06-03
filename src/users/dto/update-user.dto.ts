import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsInt()
  @IsOptional()
  sedeId?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}