import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Request } from 'express';
import { AllowedRoles } from '../auth/roles.decorator';
import { Roles } from '../common/constants';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @AllowedRoles(Roles.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
  @Get('me')
  me(@Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.usersService.findOne(userId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @AllowedRoles(Roles.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
  @Patch(':id/status')
  @AllowedRoles(Roles.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { activo: boolean },
  ) {
    return this.usersService.updateStatus(id, body.activo);
  }
  @Delete(':id')
  @AllowedRoles(Roles.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
