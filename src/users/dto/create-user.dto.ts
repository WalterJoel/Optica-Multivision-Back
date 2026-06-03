import { IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  apellido: string;

  @IsInt()
  @IsNotEmpty({ message: 'La sede es requerida' })
  sedeId: number;
}
