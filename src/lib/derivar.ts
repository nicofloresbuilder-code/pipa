import { capacidadL, consumoDiario, fechaLocal, nivelActual, promedio, pronosticar } from "./motor";
import type { Estado, Pronostico } from "./tipos";

export type Derivado = {
  nivel: ReturnType<typeof nivelActual>;
  capacidad: number;
  reservaL: number;
  base: number | null; // litros por día (promedio de días completos)
  diasValidos: number;
  subidasSinEntrega: number;
  pron: Pronostico | null;
  abiertas: number;
};

export function derivar(e: Estado, ahora: number): Derivado {
  if (!e.cal) return { nivel: null, capacidad: 0, reservaL: 0, base: null, diasValidos: 0, subidasSinEntrega: 0, pron: null, abiertas: 0 };
  const { dias, subidasSinEntrega } = consumoDiario(e.lecturas, e.cal);
  const base = dias.length >= 3 ? promedio(dias.map((d) => d.litros)) : null;
  const nivel = nivelActual(e);
  const capacidad = capacidadL(e.cal);
  const reservaL = (e.reservaPct / 100) * capacidad;
  const pron = nivel ? pronosticar(dias, nivel.litros, reservaL, fechaLocal(ahora)) : null;
  const abiertas = e.excepciones.filter((x) => x.estado === "abierta" || x.estado === "en_revision").length;
  return { nivel, capacidad, reservaL, base, diasValidos: dias.length, subidasSinEntrega, pron, abiertas };
}
