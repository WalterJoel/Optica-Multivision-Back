import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('monturas')
export class Montura {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

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
}
