import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sede } from 'src/sedes/entities/sede.entity';
import { User } from 'src/users/entities/user.entity';
import { EstadoTraslado, OrigenSolicitudTraslado } from 'src/common/constants';
import { TrasladoDetalle } from './trasladoDetalle.entity';

@Entity('traslado')
@Index(['sedeProveedoraId', 'estado'])
@Index(['sedeSolicitanteId', 'estado'])
export class Traslado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: EstadoTraslado,
    default: EstadoTraslado.SOLICITADO,
  })
  estado: EstadoTraslado;

  @Column({
    type: 'enum',
    enum: OrigenSolicitudTraslado,
    default: OrigenSolicitudTraslado.PRODUCTOS,
  })
  origenSolicitud: OrigenSolicitudTraslado;

  @Column()
  sedeProveedoraId: number;

  @Column()
  sedeSolicitanteId: number;

  @Column()
  usuarioSolicitanteId: number;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /* RELACIONES */

  @ManyToOne(() => Sede, { eager: false })
  @JoinColumn({ name: 'sedeProveedoraId' })
  sedeProveedora: Sede;

  @ManyToOne(() => Sede, { eager: false })
  @JoinColumn({ name: 'sedeSolicitanteId' })
  sedeSolicitante: Sede;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'usuarioSolicitanteId' })
  usuarioSolicitante: User;

  @OneToMany(() => TrasladoDetalle, (detalle) => detalle.traslado, {
    cascade: true,
  })
  detalles: TrasladoDetalle[];
}
