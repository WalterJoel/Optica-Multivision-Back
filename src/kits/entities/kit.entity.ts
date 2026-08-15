import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { KitAccesorio } from './kitAccesorio.entity';
import { Sede } from 'src/sedes/entities/sede.entity';

@Entity('kits')
export class Kit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  sedeId: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 300 })
  descripcion: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Sede)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @OneToMany(() => KitAccesorio, (ka) => ka.kit, { cascade: true })
  accesorios: KitAccesorio[];
}
