import { Module } from '@nestjs/common';
import { KitsService } from './kits.service';
import { KitsController } from './kits.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kit } from './entities/kit.entity';
import { KitAccesorio } from './entities/kitAccesorio.entity';
import { Accesorio } from 'src/productos/entities/accesorio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Kit, KitAccesorio, Accesorio])],
  controllers: [KitsController],
  providers: [KitsService],
})
export class KitsModule {}
