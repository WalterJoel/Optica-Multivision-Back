import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { KitAccesorio } from './kitAccesorio.entity';

@Entity('kits')
export class Kit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => KitAccesorio, (ka) => ka.kit, { cascade: true })
  accesorios: KitAccesorio[];
}
