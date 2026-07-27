import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrasladosService } from './traslados.service';
import { TrasladosController } from './traslados.controller';
import { Traslado } from './entities/traslado.entity';
import { TrasladoDetalle } from './entities/trasladoDetalle.entity';
import { KardexModule } from 'src/kardex/kardex.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Traslado, TrasladoDetalle]),
    KardexModule,
  ],
  controllers: [TrasladosController],
  providers: [TrasladosService],
  exports: [TrasladosService],
})
export class TrasladosModule {}
