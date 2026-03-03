export class CrearClienteDto {
  tipoCliente: 'PERSONA' | 'EMPRESA';
  tipoDoc: 'DNI' | 'RUC';
  numeroDoc: string;

  nombres?: string;
  apellidos?: string;
  razonSocial?: string;

  telefono?: string;
  correo?: string;
  direccion?: string;

  // MEDIDAS
  dip?: number;
  add?: number;

  odEsf?: number;
  odCyl?: number;
  odEje?: number;

  oiEsf?: number;
  oiCyl?: number;
  oiEje?: number;

}