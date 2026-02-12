// src/productos/entities/producto.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
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

  @Column({
    type: 'enum',
    enum: ['LENTE', 'MONTURA', 'ACCESORIO'],
  })
  tipo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
