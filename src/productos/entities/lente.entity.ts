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
  kitId: number;

  // @Column()
  // productoId: number;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  material: string;

  @Column({ length: 255, nullable: true })
  imagenUrl: string;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie1: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie2: number;

  @Column('decimal', {
    precision: 8,
    scale: 2,
  })
  precio_serie3: number;

  @Column({
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /*Relacion*/
  // @OneToOne(() => Producto, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'productoId' })
  // producto: Producto;

  @ManyToOne(() => Kit, { nullable: true }) //Un mismo kit puede estar en muchos lentes
  @JoinColumn({ name: 'kitId' })
  kit: Kit;
}
