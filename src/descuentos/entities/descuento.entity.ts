import { Producto, Lente } from 'src/productos/entities';
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
@Index(['clienteId', 'lenteId', 'serie'], { unique: false })
export class Descuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clienteId: number;

  @Column({ nullable: true })
  productoId?: number | null;

  @Column({ length: 50 })
  tipoProducto: string;


  @Column('decimal', { precision: 10, scale: 2, name: 'monto_descuento' })
  montoDescuento: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  //Solo para lentes
  @Column({ nullable: true })
  lenteId?: number | null;

  @Column({ type: 'int', nullable: true })
  serie: number | null;

  /*Productos*/

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'productoId' })
  producto?: Producto | null;

  @ManyToOne(() => Lente, { nullable: true })
  @JoinColumn({ name: 'lenteId' })
  lente?: Lente | null;
}
