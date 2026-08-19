import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Kit } from '../../kits/entities/kit.entity';

@Entity('venta_kits')
@Index(['ventaId'])
@Index(['kitId'])
export class VentaKit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ventaId: number;

  @Column()
  kitId: number;

  @Column('int', { default: 1 })
  cantidad: number; // Cantidad de kits entregados de este tipo (ej. 1)

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Venta, (venta) => venta.ventaKits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @ManyToOne(() => Kit, { eager: false })
  @JoinColumn({ name: 'kitId' })
  kit: Kit;
}
