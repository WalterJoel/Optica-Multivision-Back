import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Sede } from '../sedes/entities/sede.entity'; 
@Module({
  imports: [TypeOrmModule.forFeature([User, Sede])], //Registrar entities en el modulo para su posterior creacion de tabla
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
