// src/productos/entities/producto.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  /**
   * Campo flexible para almacenar una característica adicional
   * de cualquier accesorio (ej: material, estilo, colección, edición especial, etc).
   */
  @Column({ length: 50 })
  tipo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
