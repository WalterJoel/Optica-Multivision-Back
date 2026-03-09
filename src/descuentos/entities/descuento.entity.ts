import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('descuentos')
@Index(['clienteId', 'productoId', 'serie'], { unique: false })
export class Descuento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cliente_id' })
  clienteId: number;

  @Column({ name: 'producto_id' })
  productoId: number;

  @Column({ length: 50 })
  tipoProducto: string;

  @Column({ length: 50, nullable: true })
  serie: string | null;

  @Column('decimal', { precision: 10, scale: 2, name: 'monto_descuento' })
  montoDescuento: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
