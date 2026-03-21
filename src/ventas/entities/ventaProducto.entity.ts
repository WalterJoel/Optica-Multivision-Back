import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../../productos/entities';

@Entity('venta_productos')
export class VentaProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ventaId: number;

  @Column()
  productoId: number;

  @Column({ length: 150 })
  nombreProducto: string;

  @Column({ length: 50 })
  tipoProducto: string; // LENTE, MONTURA, ACCESORIO

  @Column('decimal', { precision: 10, scale: 2 })
  precioUnitario: number;

  @Column('int')
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column({ nullable: true })
  descuentoId?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  descuento?: number;

  // STOCK PARA LENTES
  @Column({ nullable: true })
  stockId?: number; // lentes

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  esf?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cyl?: number;
  // STOCK PARA MONTURAS Y ACCESORIOS
  @Column({ nullable: true })
  stockProductoId?: number; // montura/accesorio

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /* RELACIONES */

  @ManyToOne(() => Venta, (venta) => venta.productos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @ManyToOne(() => Producto, {
    eager: false,
  })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
