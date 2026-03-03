import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Kit } from './kit.entity';
import { Accesorio } from '../../productos/entities/accesorio.entity';

@Entity('kit_accesorios')
export class KitAccesorio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Kit, (kit) => kit.accesorios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_id' })
  kit: Kit;

  @ManyToOne(() => Accesorio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accesorio_id' })
  accesorio: Accesorio;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
