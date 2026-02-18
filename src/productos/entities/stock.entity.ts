import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Lente } from './lente.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { MatrixTipo } from '../types';

/**
 * Stock solamente para los lentes
 */

@Entity('stock')
@Index(['lenteId', 'sedeId', 'matrix', 'row', 'col'], { unique: true })
@Index(['lenteId'])
@Index(['sedeId'])
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  lenteId: number;

  @Column()
  sedeId: number;

  @Column({
    type: 'enum',
    enum: ['NEGATIVO', 'POSITIVO'],
  })
  matrix: MatrixTipo;

  @Column('int')
  row: number;

  @Column('int')
  col: number;

  // valores ópticos (para lectura humana)
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  esf: number | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cyl: number | null;

  @Column('int', { default: 0 })
  cantidad: number;

  @Column({ length: 100, default: '' })
  ubicacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /* Relaciones */
  @ManyToOne(() => Lente, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lenteId' })
  lente: Lente;

  @ManyToOne(() => Sede, (sede) => sede.stocks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;
}
