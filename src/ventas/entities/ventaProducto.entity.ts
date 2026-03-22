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

  @Column({ length: 50 })
  tipoProducto: string; // LENTE, MONTURA, ACCESORIO

  @Column('decimal', { precision: 10, scale: 2 })
  precioUnitario: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number; // 🔶 PRECIO UNITARIO * CANTIDAD

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  descuento?: number; // 🔶 NO VINCULO CON EL ID, PORQUE LOS DESCUENTOS PUEDEN CAMBIAR SE ACTIVAN EN EL MOMENTO DE LA VENTA NADA MAS

  @Column('int')
  cantidad: number;

  // STOCK PARA LENTES
  @Column({ nullable: true })
  stockId?: number; // lentes

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  esf?: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cyl?: number;

  // STOCK PARA MONTURAS Y ACCESORIOS
  @Column({ nullable: true })
  stockProductoId?: number;

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
