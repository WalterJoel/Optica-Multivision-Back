import { Producto } from 'src/productos/entities';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('descuentos')
@Index(['clienteId', 'productoId', 'serie'], { unique: false })
export class Descuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clienteId: number;

  @Column()
  productoId: number;

  @Column({ length: 50 })
  tipoProducto: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  serie: string | null;

  @Column('decimal', { precision: 10, scale: 2, name: 'monto_descuento' })
  montoDescuento: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' }) a;
  createdAt: Date;

  /*Productos*/

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
