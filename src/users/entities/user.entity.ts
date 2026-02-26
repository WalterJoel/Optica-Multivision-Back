import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,ManyToOne ,JoinColumn} from 'typeorm';
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
  role: string;
  
  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  sedeId: number | null;

  @ManyToOne(() => Sede, { eager: false, nullable: true })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede | null;


  @CreateDateColumn()
  createdAt: Date;
}
