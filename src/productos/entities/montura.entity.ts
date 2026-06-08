import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Producto } from './producto.entity';
import { FormaFacial, SexoMontura } from 'src/common/constants';

@Entity('monturas')
export class Montura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column({ length: 50 }) //Codigo que maneja el dueño, se puede repetir
  codigo: string;

  @Column({ length: 50 }) //Codigo Montura que maneja el dueño, se puede repetir no es unico
  codigoMontura: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precioCompra: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precioVenta: number;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  material: string;

  @Column({ length: 100 }) //EJM 15-15-61
  talla: string;

  @Column({ length: 50, default: 'negro' })
  color: string;

  @Column({ length: 50, default: FormaFacial.OVALADO })
  formaFacial: string; // ovalado, cuadrado, redondo

  @Column({ length: 20, default: SexoMontura.UNISEX })
  sexo: string; // M, F, Unisex

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /*Relacion*/

  @OneToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
