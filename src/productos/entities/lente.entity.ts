import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { LentePrecio } from './lente-precio.entity';

@Entity('lentes')
export class Lente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  material: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: '',
  })
  clasificacion: string;

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @Column({
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => LentePrecio, (lp) => lp.lente)
  precios: LentePrecio[];
}
