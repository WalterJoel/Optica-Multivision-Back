import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sede } from '../../sedes/entities/sede.entity';
import { Producto } from './producto.entity';

@Entity('stock_productos')
@Index(['sedeId'])
export class StockProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sedeId: number;

  @Column()
  productoId: number;

  @Column('int', { default: 0 })
  cantidad: number;

  @Column({ length: 100, default: '' })
  ubicacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    transformer: {
      to: (value: Date) => value,
      from: (value: Date) => {
        // Esto asegura que cuando NestJS lea la fecha, la trate como local
        return value;
      },
    },
  })
  updatedAt: Date;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @ManyToOne(() => Sede, (sede) => sede.stocks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;
}
