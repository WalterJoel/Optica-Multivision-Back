import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Producto } from './producto.entity';
import { Kit } from 'src/kits/entities/kit.entity';



@Entity('lentes')
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


  @Column({ length: 255, nullable: true })
  imagenUrl: string;



  @Column({
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Kit, { onDelete: 'SET NULL', nullable: true }) //Un mismo kit puede estar en muchos lentes
  @JoinColumn({ name: 'kitId' })
  kit?: Kit | null;
}
