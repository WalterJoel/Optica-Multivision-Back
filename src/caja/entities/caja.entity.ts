import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MovimientoCaja } from './movimientoCaja.entity';
import { User } from 'src/users/entities/user.entity';
import { Sede } from 'src/sedes/entities/sede.entity';

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Index('IDX_UNICA_CAJA_ABIERTA_POR_SEDE', ['sedeId'], {
  unique: true,
  where: `"estado" = 'ABIERTA'`,
})
@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sedeId: number;

  @Column()
  userId: number; // Quien abre caja

  @Column({
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.ABIERTA,
  })
  estado: EstadoCaja;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  saldoInicial: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  saldoFinal: number;

  @CreateDateColumn({ type: 'timestamp' })
  fechaApertura: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaCierre: Date;

  // Relaciones
  @OneToMany(() => MovimientoCaja, (mov) => mov.caja)
  movimientos: MovimientoCaja[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  usuario: User;

  @ManyToOne(() => Sede, { eager: false, nullable: true })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede | null;
}
