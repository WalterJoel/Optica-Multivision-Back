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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precioCompra: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precioVenta: number;

  @Column({ nullable: true })
  monturaId: number;

  @Column({ nullable: true })
  accesorioId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  //Relations

  @ManyToOne(() => Sede)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @ManyToOne(() => Montura, (montura) => montura.productos, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'monturaId' })
  montura: Montura;

  @ManyToOne(() => Accesorio, (accesorio) => accesorio.productos, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accesorioId' })
  accesorio: Accesorio;
}
