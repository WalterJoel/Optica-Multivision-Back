import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { EstadoPedido } from 'src/common/constants';

export interface HistorialEstado {
  estado: EstadoPedido;
  fechaCambio: string;
  observaciones?: string;
  usuarioId?: number;
}

@Entity('seguimiento_pedido')
export class SeguimientoPedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ventaId: number;

  // ✅ Estado actual del pedido
  @Column({ length: 50, default: 'CREADO' })
  estado: string;

  // ✅ Historial completo de cambios - NO EDITABLE
  @Column({ type: 'json', default: () => "'[]'" })
  historial: HistorialEstado[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relación con la venta
  @ManyToOne(() => Venta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;
}
