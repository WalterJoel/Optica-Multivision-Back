import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Traslado } from './traslado.entity';
import { Producto, Stock } from 'src/productos/entities';

@Entity('traslado_detalle')
export class TrasladoDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  trasladoId: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipoProducto: string;

  @Column({ nullable: true })
  productoId?: number | null; // Para MONTURA y ACCESORIO

  @Column({ nullable: true })
  stockId?: number | null; // Para LENTES

  @Column({ type: 'int' })
  cantidadSolicitada: number; // cs (cantidad solicitada)

  @Column({ type: 'int', default: 0 })
  cantidadEnviada: number; // ce

  @Column({ type: 'int', default: 0 })
  cantidadRecibida: number; // cr

  @Column({ type: 'text', nullable: true })
  observacion?: string | null;

  /* RELACIONES */

  @ManyToOne(() => Traslado, (traslado) => traslado.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trasladoId' })
  traslado: Traslado;

  @ManyToOne(() => Producto, { eager: false, nullable: true })
  @JoinColumn({ name: 'productoId' })
  producto?: Producto | null;

  @ManyToOne(() => Stock, { eager: false, nullable: true })
  @JoinColumn({ name: 'stockId' })
  stock?: Stock | null;
}
