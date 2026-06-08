import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sede } from '../../sedes/entities/sede.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column()
  role: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int' })
  sedeId: number;

  @ManyToOne(() => Sede, { eager: false, nullable: true })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
