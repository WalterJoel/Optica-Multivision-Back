import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('lentes')
export class Lente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  producto: Producto;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  material: string;

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie1: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie2: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie3: number;

  @Column({
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
