export class CreateSedeDto {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  logoUrl?: string | null;
  activo?: boolean;
}