import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VentaProducto } from './ventaProducto.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  activo: boolean;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  montoPagado: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  deuda: number;

  @Column({ nullable: true })
  kitId?: number;

  @Column()
  sedeId: number;

  @Column()
  userId: number;

  @Column({ length: 150, nullable: true })
  responsableVenta?: string;

  @Column({ length: 50 })
  metodoPago: string;

  @Column({ length: 50 })
  tipoVenta: string; // CONTADO | CREDITO

  @Column({ length: 50 })
  estadoPago: string; // PAGADO | PENDIENTE

  @Column({ default: false })
  montaje: boolean;

  @Column({ type: 'int', nullable: true })
  nroCuotas?: number;

  @Column({ length: 255, nullable: true })
  observaciones?: string;

  @Column({ length: 50, nullable: true })
  tipoComprobante?: string;

  @Column({ length: 50, nullable: true })
  nroComprobante?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => VentaProducto, (vp) => vp.venta, {
    cascade: true,
  })
  productos: VentaProducto[];
}
