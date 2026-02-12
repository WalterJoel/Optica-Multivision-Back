import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Stock } from '../../productos/entities/stock.entity';

@Entity('sedes')
export class Sede {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
    comment: 'Nombre comercial de la sede',
  })
  nombre: string;

  @Column({
    length: 11,
    unique: true,
    comment: 'RUC de la sede',
  })
  ruc: string;

  @Column({
    length: 255,
    comment: 'Dirección física',
  })
  direccion: string;

  @Column({
    length: 20,
    comment: 'Teléfono de contacto',
  })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'URL del logo de la sede',
  })
  logoUrl: string | null;

  @Column({
    default: true,
    comment: 'Indica si la sede está activa',
  })
  activo: boolean;

  @CreateDateColumn({
    name: 'fecha_creacion',
  })
  fechaCreacion: Date;

  // Relación con tabla stock
  @OneToMany(() => Stock, (stock) => stock.sede)
  stocks: Stock[];
}
