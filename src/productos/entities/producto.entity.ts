import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  OneToOne,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Montura } from './montura.entity';
import { Accesorio } from './accesorio.entity';
import { Sede } from 'src/sedes/entities/sede.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sedeId: number;

  @Index()
  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ length: 50 })
  tipo: string;

  @Column('int', { default: 0 })
  cantidad: number;

  @Column({ length: 100, default: '' })
  ubicacion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  //Relations

  @ManyToOne(() => Sede)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @OneToOne(() => Montura, (montura) => montura.producto)
  montura: Montura;

  @OneToOne(() => Accesorio, (accesorio) => accesorio.producto)
  accesorio: Accesorio;
}
