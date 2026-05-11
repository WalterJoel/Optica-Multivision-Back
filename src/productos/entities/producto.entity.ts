import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Montura } from './montura.entity';
import { Accesorio } from './accesorio.entity';
import { StockProducto } from './stockProductos.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ length: 50 })
  tipo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  //Relations

  @OneToMany(() => StockProducto, (stock) => stock.producto)
  stocks: StockProducto[];

  @OneToOne(() => Montura, (montura) => montura.producto)
  montura: Montura;

  @OneToOne(() => Accesorio, (accesorio) => accesorio.producto)
  accesorio: Accesorio;
}
