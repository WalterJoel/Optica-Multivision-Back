import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  tipoCliente: 'PERSONA' | 'EMPRESA';

  @Column({ type: 'varchar', length: 5 })
  tipoDoc: 'DNI' | 'RUC';

  @Column({ type: 'varchar', length: 20 })
  numeroDoc: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombres: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  apellidos: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  razonSocial: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}