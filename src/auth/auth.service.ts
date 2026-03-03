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
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // ✅ si está suspendido
    if (user.activo === false) {
      throw new UnauthorizedException('Usuario suspendido');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        sedeId: user.sedeId,
        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        sedeId: user.sedeId,
        avatarUrl: user.avatarUrl ?? null,
        activo: user.activo,
      },
    };
  }
}