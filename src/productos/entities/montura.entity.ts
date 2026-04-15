import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('monturas')
@Index('idx_montura_codigo', ['codigo'])
@Index('idx_montura_qr', ['codigoQr'])
export class Montura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 }) //Codigo que maneja el dueño
  codigo: string;

  @Column({ length: 100, unique: true })
  codigoQr: string;

  @Column()
  productoId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  material: string;

  @Column({ length: 100 })
  medida: string;

  @Column({ length: 50 })
  color: string;

  @Column({ length: 50 })
  formaFacial: string; // ovalado, cuadrado, redondo

  @Column({ length: 20 })
  sexo: string; // M, F, Unisex

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /*Relacion*/

  @OneToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
