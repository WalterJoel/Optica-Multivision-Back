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
  add?: number;
//Ojoderecho e izquierdo, opcionales porque no siempre se toman en la creación del cliente, pueden ser actualizadas después con UpdateClienteDto
  dipOd?: number;
  dipOi?: number;

  odEsf?: number;
  odCyl?: number;
  odEje?: number;

  

  oiEsf?: number;
  oiCyl?: number;
  oiEje?: number;
}
