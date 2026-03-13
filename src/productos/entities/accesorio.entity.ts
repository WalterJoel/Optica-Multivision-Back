import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('accesorios')
export class Accesorio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ length: 100 })
  nombre: string;

  /*Si queremos que se muestre al vender como accesorios basicos*/
  @Column({
    default: false,
  })
  basico: boolean;

  /**
   * Campo flexible para almacenar una característica adicional
   * de cualquier accesorio (ej: material, estilo, colección, edición especial, etc).
   */

  @Column({
    type: 'varchar',
    length: 50,
    default: '',
  })
  atributo: string;

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /*Productos*/

  @OneToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
