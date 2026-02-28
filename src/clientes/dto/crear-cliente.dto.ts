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
}