/* Tipos de PIPA. Todo vive en el teléfono (localStorage); no hay servidor de datos. */

export type Hogar = {
  id: string;
  nombre: string; // nombre inventado o apodo; nunca datos reales en demos
  parte: number; // peso de la cuota (1 = una parte)
  efectivo: boolean; // participa en efectivo / sin celular
};

export type Calibracion = {
  litrosPorCm: number;
  alturaMaxCm: number;
  incertidumbrePct: number; // error aceptado de la calibración
  fecha: string; // YYYY-MM-DD
  nota: string;
};

export type Lectura = {
  id: string;
  ts: number; // ms
  cm: number;
  fuente: "manual" | "simulada";
  tipo?: "antes" | "despues"; // medición alrededor de una descarga
  entregaId?: string;
  nota?: string;
};

export type EstadoEntrega = "pedida" | "midio_antes" | "cerrada" | "cancelada";

export type Entrega = {
  id: string;
  ts: number; // cuándo se pidió
  proveedor: string; // etiqueta libre ("Pipa A"); no es un directorio
  litrosCotizados: number;
  precioTotal: number;
  estado: EstadoEntrega;
  testigo?: string;
  tsAntes?: number;
  cmAntes?: number;
  tsDespues?: number;
  cmDespues?: number;
  simulada?: boolean;
};

export type TipoExcepcion = "litros" | "no_llego" | "acceso" | "cobro" | "sin_testigo" | "otra";
export type EstadoExcepcion = "abierta" | "en_revision" | "resuelta" | "sin_causa";

export type Excepcion = {
  id: string;
  entregaId?: string;
  tipo: TipoExcepcion;
  ts: number;
  responsable: string; // siempre el coordinador con nombre
  estado: EstadoExcepcion;
  resumen: string;
  notas: { ts: number; texto: string }[]; // notas y correcciones privadas
  simulada?: boolean;
};

export type Cuota = {
  id: string;
  entregaId: string;
  hogarId: string;
  monto: number;
  metodo: "efectivo" | "transferencia" | "otro";
  confirmada: boolean;
};

export type Cotizacion = {
  id: string;
  etiqueta: string;
  litros: number;
  precio: number;
};

export type Estado = {
  version: 1;
  coordinador: string;
  hogares: Hogar[];
  cal: Calibracion | null;
  reservaPct: number; // nivel mínimo antes de pedir pipa, en % de la capacidad
  lecturas: Lectura[];
  entregas: Entrega[];
  excepciones: Excepcion[];
  cuotas: Cuota[];
  cotizaciones: Cotizacion[];
  simulado: boolean; // true si hay datos del ejemplo simulado
};

export const ESTADO_VACIO: Estado = {
  version: 1,
  coordinador: "",
  hogares: [],
  cal: null,
  reservaPct: 15,
  lecturas: [],
  entregas: [],
  excepciones: [],
  cuotas: [],
  cotizaciones: [],
  simulado: false,
};

export type DiaConsumo = { fecha: string; litros: number; horas: number; finDeSemana: boolean };

export type Medicion = {
  observados: number;
  consumoEst: number | null; // null = sin historial para estimarlo
  entregadosEst: number;
  diferencia: number; // cotizados - entregados estimados (positivo = entró menos)
  margen: number;
  fuera: boolean;
  minutos: number;
};

export type Pronostico =
  | { tipo: "sin_historial"; dias: number; faltan: number }
  | {
      tipo: "ok";
      modelo: "linea_base" | "regresion";
      motivo: string;
      litrosPorDia: number;
      diasHastaReserva: number;
      diasMin: number;
      diasMax: number;
      maeBase: number | null;
      maeModelo: number | null;
      dias: number;
    };
