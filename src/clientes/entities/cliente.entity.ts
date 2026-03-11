import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('clientes')
@Index('IDX_CLIENTE_NUMERO_DOC', ['numeroDoc'])
@Index('IDX_CLIENTE_NOMBRES', ['nombres'])
@Index('IDX_CLIENTE_APELLIDOS', ['apellidos'])
@Index('IDX_CLIENTE_RAZON_SOCIAL', ['razonSocial'])
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  tipoCliente: 'PERSONA' | 'EMPRESA';

  @Column({ type: 'varchar', length: 5 })
  tipoDoc: 'DNI' | 'RUC';

  @Column({ type: 'varchar', length: 20, unique: true })
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

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  antecedentes: string | null;

  // MEDIDAS
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  add: number | null;

  // OJO DERECHO (OD)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  odEsf: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  odCyl: number | null;

  @Column({ type: 'int', nullable: true })
  odEje: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  dipOd: number | null;

  // OJO IZQUIERDO (OI)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  oiEsf: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  oiCyl: number | null;

  @Column({ type: 'int', nullable: true })
  oiEje: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  dipOi: number | null;

  // Encargado = usuario logueado
  @Column({ type: 'int', nullable: true })
  encargadoMedicionId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  fechaMedicion: Date | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}