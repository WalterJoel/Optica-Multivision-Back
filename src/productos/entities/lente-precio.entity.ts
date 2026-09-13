import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Lente } from './lente.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { Kit } from '../../kits/entities/kit.entity';

@Entity('lente_precios')
@Index(['lenteId', 'sedeId'], { unique: true })
@Index(['lenteId'])
@Index(['sedeId'])
export class LentePrecio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  lenteId: number;

  @Column()
  sedeId: number;

  @Column({ nullable: true })
  kitId?: number | null;

  @Column('decimal', {
    precision: 8,
    scale: 2,
    default: 0,
  })
  precio_serie1: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
    default: 0,
  })
  precio_serie2: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
    default: 0,
  })
  precio_serie3: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /* Relaciones */
  @ManyToOne(() => Lente, (lente) => lente.precios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lenteId' })
  lente: Lente;

  @ManyToOne(() => Sede, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @ManyToOne(() => Kit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'kitId' })
  kit?: Kit | null;
}
