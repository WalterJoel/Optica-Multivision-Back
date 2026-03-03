import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

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
  // --- MEDIDAS (última medición) ---
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  dip: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  add: number | null;

  // OJO DERECHO (OD)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  odEsf: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  odCyl: number | null;

  @Column({ type: 'int', nullable: true })
  odEje: number | null;

  // OJO IZQUIERDO (OI)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  oiEsf: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  oiCyl: number | null;

  @Column({ type: 'int', nullable: true })
  oiEje: number | null;

  // Encargado = usuario logueado
  @Column({ type: 'int', nullable: true })
  encargadoMedicionId: number | null;

  // fecha de medición (opcional pero útil)
  @Column({ type: 'timestamp', nullable: true })
  fechaMedicion: Date | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}
