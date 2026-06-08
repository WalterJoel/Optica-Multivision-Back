import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Producto, Stock } from '../../productos/entities';

@Entity('venta_productos')
export class VentaProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ventaId: number;

  @Column({ nullable: true })
  productoId?: number | null; //SOLO PARA MONTURA Y ACCESORIO, CASO CONTRARIO NULO

  @Column({ length: 50 })
  tipoProducto: string; // LENTE, MONTURA, ACCESORIO

  @Column('decimal', { precision: 10, scale: 2 })
  precioUnitario: number;

  @Column('int')
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number; // 🔶 PRECIO UNITARIO * CANTIDAD

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  descuento?: number | null; // 🔶 NO VINCULO CON EL ID, PORQUE LOS DESCUENTOS PUEDEN CAMBIAR SE ACTIVAN EN EL MOMENTO DE LA VENTA NADA MAS


  //De aqui sacamos toda la info de lentes
  @Column({ nullable: true })
  stockId?: number | null; // lentes

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  esf?: number | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cyl?: number | null;


  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /* RELACIONES */

  @ManyToOne(() => Venta, (venta) => venta.productos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @ManyToOne(() => Producto, {
    eager: false,
    nullable: true,
  })

  @JoinColumn({ name: 'productoId' })
  producto?: Producto;
  @ManyToOne(() => Stock, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'stockId' })
  stock?: Stock;
}
