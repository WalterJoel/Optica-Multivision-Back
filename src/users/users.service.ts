import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
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
  ) { }

  async create(dto: CreateUserDto) {
    if (!dto.password) throw new BadRequestException({ message: 'Password es requerido' });

    // ✅ validar sede
    const sede = await this.sedeRepo.findOne({ where: { id: dto.sedeId } });
    if (!sede) throw new NotFoundException({ message: 'Sede no existe' });

    // ✅ validar email único
    const emailFormateado = dto.email.trim().toLowerCase();
    const exists = await this.userRepo.findOne({
      where: { email: ILike(emailFormateado) },
    });
    if (exists) throw new ConflictException({ message: 'Email ya existe' });

    const user = this.userRepo.create({
      ...dto,
      email: emailFormateado,
      password: await bcrypt.hash(dto.password, 10),
    });

    try {
      await this.userRepo.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException({ message: 'Email ya existe' });
      }
      throw error;
    }

    // ✅ devolver sin password + con sede (para el front)
    return this.findOne(user.id);
  }

  findAll() {
    return this.userRepo.find({
      relations: { sede: true },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
        activo: true, // ✅ AQUI
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
        nombre: true,
        apellido: true,
        role: true,
        activo: true, // ✅ AQUI

        createdAt: true,
        sedeId: true,
        sede: {
          id: true,
          nombre: true,
        },
      },
    });

    if (!user) throw new NotFoundException({ message: 'Usuario no existe' });
    return user;
  }
  //valdair si esta activo o no
  async updateStatus(id: number, activo: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException({ message: 'Usuario no existe' });

    user.activo = !!activo;
    await this.userRepo.save(user);

    return this.findOne(id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException({ message: 'Usuario no existe' });

    // validar y setear sedeId si viene
    if (dto.sedeId !== undefined) {
      const sedeId = Number(dto.sedeId);
      const sede = await this.sedeRepo.findOne({ where: { id: sedeId } });
      if (!sede) throw new NotFoundException({ message: 'Sede no existe' });
      user.sedeId = sedeId;
    }

    if (dto.email) {
      const emailFormateado = dto.email.trim().toLowerCase();
      if (emailFormateado !== user.email) {
        const exists = await this.userRepo.findOne({
          where: {
            email: ILike(emailFormateado),
            id: Not(id),
          },
        });
        if (exists) throw new ConflictException({ message: 'Email ya existe' });
      }
      user.email = emailFormateado;
    }
    if (dto.role) user.role = dto.role;
    if (dto.nombre !== undefined) user.nombre = dto.nombre;
    if (dto.apellido !== undefined) user.apellido = dto.apellido;
    if (dto.activo !== undefined) user.activo = dto.activo;

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      await this.userRepo.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException({ message: 'Email ya existe' });
      }
      throw error;
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException({ message: 'Usuario no existe' });

    await this.userRepo.remove(user);
    return { message: 'Usuario eliminado' };
  }
}
