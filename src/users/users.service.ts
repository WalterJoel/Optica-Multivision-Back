import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Sede } from '../sedes/entities/sede.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Sede)
    private sedeRepo: Repository<Sede>,
  ) {}

  async create(dto: CreateUserDto) {
    if (!dto.password) throw new Error('Password es requerido');

    // ✅ validar sede
    const sede = await this.sedeRepo.findOne({ where: { id: dto.sedeId } });
    if (!sede) throw new NotFoundException('Sede no existe');

    // ✅ validar email único
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya existe');

    const user = this.userRepo.create({
      email: dto.email.trim().toLowerCase(),
      role: dto.role,
      sedeId: dto.sedeId,
      password: await bcrypt.hash(dto.password, 10),
    });

    await this.userRepo.save(user);

    // ✅ devolver sin password + con sede (para el front)
    return this.findOne(user.id);
  }

  findAll() {
    return this.userRepo.find({
      relations: { sede: true },
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        activo: true,        // ✅ AQUI
        createdAt: true,
        sedeId: true,
        sede: {
          id: true,
          nombre: true,
        },
      },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { sede: true },
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        activo: true,       // ✅ AQUI

        createdAt: true,
        sedeId: true,
        sede: {
          id: true,
          nombre: true,
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario no existe');
    return user;
  }
  //valdair si esta activo o no
  async updateStatus(id: number, activo: boolean) {
  const user = await this.userRepo.findOne({ where: { id } });
  if (!user) throw new NotFoundException("Usuario no existe");

  user.activo = !!activo;
  await this.userRepo.save(user);

  return this.findOne(id);
}

  async update(id: number, dto: UpdateUserDto) {
  const user = await this.userRepo.findOne({ where: { id } });
  if (!user) throw new NotFoundException('Usuario no existe');

  // validar y setear sedeId si viene
  if (dto.sedeId !== undefined) {
    const sedeId = Number(dto.sedeId);
    const sede = await this.sedeRepo.findOne({ where: { id: sedeId } });
    if (!sede) throw new NotFoundException('Sede no existe');
    user.sedeId = sedeId;
  }

  if (dto.email) user.email = dto.email.trim().toLowerCase();
  if (dto.role) user.role = dto.role;

  if (dto.password) {
    user.password = await bcrypt.hash(dto.password, 10);
  }

  await this.userRepo.save(user);
  return this.findOne(id);
}

  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no existe');

    await this.userRepo.remove(user);
    return { message: 'Usuario eliminado' };
  }

  async setAvatar(userId: number, filename: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no existe');

    user.avatarUrl = `/uploads/avatars/${filename}`;
    await this.userRepo.save(user);

    return { ok: true, avatarUrl: user.avatarUrl };
  }
}