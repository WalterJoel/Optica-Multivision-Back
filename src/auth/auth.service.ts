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
    console.log(email, password, ' ----->>>>>>>>>>>>');
    const user = await this.userRepo.findOne({ where: { email } });
    console.log(user, ' USER --->>>>>>>>');

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    // if()
    // const ok = await bcrypt.compare(password, user.password);
    // console.log(ok, ' OKK');
    // if (!ok) {
    //   throw new UnauthorizedException('Credenciales inválidas');
    // }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,

        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }
}
