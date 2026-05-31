import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';


import { MovimientoCaja } from './entities/movimientoCaja.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoCaja])],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule { }
