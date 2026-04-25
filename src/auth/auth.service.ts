import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: ['sede'],
    });

    if (!user)
      throw new UnauthorizedException({
        ok: false,
        message: 'USUARIO NO ENCONTRADO O NO REGISTRADO',
      });

    // ✅ si está suspendido
    if (user.activo === false) {
      throw new UnauthorizedException({
        ok: false,
        message: 'USER_SUSPENDIDO',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      throw new UnauthorizedException({
        ok: false,
        message: 'Credenciales inválidas',
      });

    // ✅ token-only: devolver token al front
    console.log(user.sede, ' usrrrrrr');
    console.log(user.sede?.nombre, ' usrrrrrr');
    return {
      ok: true,
      message: 'INICIO DE SESION EXITOSO',
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        sedeId: user.sedeId,
        sedeNombre: user.sede?.nombre,
        role: user.role,
      }),
      user,
    };
  }
}
