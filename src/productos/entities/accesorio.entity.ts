import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from './producto.entity';

@Entity('accesorios')
export class Accesorio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 }) //Codigo que maneja el dueño, se puede repetir
  codigoAccesorio: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50, default: 'negro' })
  color: string;


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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /*Productos*/

  @OneToMany(() => Producto, (producto) => producto.accesorio)
  productos: Producto[];
}
