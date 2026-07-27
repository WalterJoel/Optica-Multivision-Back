import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sede } from 'src/sedes/entities/sede.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Stock } from 'src/productos/entities/stock.entity';
import { TipoProducto } from 'src/common/constants';

export enum OrigenEventoKardex {
  VENTA_REALIZADA = 'VENTA_REALIZADA',
  VENTA_ANULADA = 'VENTA_ANULADA',
  VENTA_KIT_ACCESORIO = 'VENTA_KIT_ACCESORIO',
  ANULACION_KIT_ACCESORIO = 'ANULACION_KIT_ACCESORIO',
  TRASLADO_ENVIADO = 'TRASLADO_ENVIADO',
  TRASLADO_RECIBIDO = 'TRASLADO_RECIBIDO',
  CREACION_INICIAL = 'CREACION_INICIAL',
  AJUSTE_MANUAL_MATRIZ = 'AJUSTE_MANUAL_MATRIZ',
  CARGA_EXCEL = 'CARGA_EXCEL',
  EDICION_EXCEL = 'EDICION_EXCEL',
}

@Entity('kardex')
@Index(['sedeId'])
@Index(['tipoProducto'])
@Index(['productoId'])
@Index(['stockId'])
@Index(['origenEvento'])
@Index(['createdAt'])
export class Kardex {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sedeId: number;

  @Column({
    type: 'enum',
    enum: TipoProducto,
  })
  tipoProducto: TipoProducto;

  @Column({ type: 'int', nullable: true })
  productoId: number | null;

  @Column({ type: 'int', nullable: true })
  stockId: number | null;

  @Column({
    type: 'enum',
    enum: OrigenEventoKardex,
  })
  origenEvento: OrigenEventoKardex;

  @Column({ type: 'int' })
  cantidadAnterior: number;

  @Column({ type: 'int' })
  cantidadMovimiento: number;

  @Column({ type: 'int' })
  cantidadFinal: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /* Relaciones */
  @ManyToOne(() => Sede)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @ManyToOne(() => Producto, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @ManyToOne(() => Stock, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stockId' })
  stock: Stock;
}
