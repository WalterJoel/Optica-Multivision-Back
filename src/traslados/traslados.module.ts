import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrasladosService } from './traslados.service';
import { TrasladosController } from './traslados.controller';
import { Traslado } from './entities/traslado.entity';
import { TrasladoDetalle } from './entities/trasladoDetalle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Traslado, TrasladoDetalle])],
  controllers: [TrasladosController],
  providers: [TrasladosService],
  exports: [TrasladosService],
})
export class TrasladosModule {}
