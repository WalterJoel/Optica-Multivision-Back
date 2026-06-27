import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Producto } from './producto.entity';
import { Kit } from 'src/kits/entities/kit.entity';
import { PrioridadLentes } from 'src/common/constants';


@Entity('lentes')
@Index(['prioridad'], { unique: true, where: 'prioridad IS NOT NULL' })
export class Lente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  kitId?: number | null;

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

  @Column({
    type: 'integer',
    nullable: true,
  })
  prioridad: PrioridadLentes | null;

  @Column({ length: 255, nullable: true })
  imagenUrl: string;



  @Column({
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Kit, { nullable: true }) //Un mismo kit puede estar en muchos lentes
  @JoinColumn({ name: 'kitId' })
  kit?: Kit | null;
}
