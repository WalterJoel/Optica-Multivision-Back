import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Caja } from './caja.entity';
import { Venta } from 'src/ventas/entities/venta.entity';

export enum TipoMovimiento {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

@Entity('movimientos_caja')
export class MovimientoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cajaId: number;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
  })
  tipo: TipoMovimiento;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  // Opcional (cuando viene de una venta/pago)
  // Podria ser un simple papel higienico como EGRESO y no requiere venta
  @Column({ nullable: true })
  ventaId?: number;

  @Column({ length: 50, nullable: true })
  metodoPago?: string; // EFECTIVO | YAPE | PLIN | TARJETA

  @CreateDateColumn()
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Venta, { nullable: true, onDelete: 'SET NULL' })
  venta?: Venta;

  @ManyToOne(() => Caja, (caja) => caja.movimientos, {
    onDelete: 'CASCADE',
  })
  caja: Caja;
}
