import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    if (!dto.password) {
      throw new Error('Password es requerido');
    }

    const user = this.userRepo.create({
      email: dto.email,
      role: dto.role,
      password: await bcrypt.hash(dto.password, 10),
    });

    return this.userRepo.save(user);
  }

  findAll() {
    return this.userRepo.find({
      select: ['id', 'email', 'role', 'createdAt'],
    });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no existe');
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.userRepo.remove(user);

    return { message: 'Usuario eliminado' };
  }
}
