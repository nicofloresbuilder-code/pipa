/* Datos SIMULADOS para probar PIPA. Todo es inventado y la pantalla lo dice.
   Son 21 días de una cisterna de 13,000 L con 8 hogares inventados y dos entregas:
   la primera trae menos litros que los cotizados (para que se vea una excepción)
   y la segunda sale dentro del margen. */

import { consumoDiario, fechaLocal, fmtNum, litrosPorCmDe, medirEntrega, nuevoId, promedio, redondea, repartir } from "./motor";
import type { Calibracion, Cuota, Entrega, Estado, Excepcion, Hogar, Lectura } from "./tipos";
import { ESTADO_VACIO } from "./tipos";

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERFIL = (() => {
  const w = Array.from({ length: 24 }, (_, h) => (h >= 6 && h <= 8 ? 0.07 : h >= 12 && h <= 14 ? 0.05 : h >= 19 && h <= 21 ? 0.08 : h < 5 ? 0.008 : 0.025));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);
})();

const NOMBRES = ["Casa 1", "Casa 2", "Casa 3", "Casa 4", "Casa 5", "Casa 6", "Casa 7", "Casa 8"];

export function ejemploSimulado(ahora: number, coordinadorActual: string): Estado {
  const rnd = mulberry32(20261021);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const lpc = litrosPorCmDe(4, 2.5); // 100 L por cm
  const cal: Calibracion = {
    litrosPorCm: lpc,
    alturaMaxCm: 130,
    incertidumbrePct: 5,
    fecha: fechaLocal(ahora),
    nota: "SIMULADO: cisterna de 4 m × 2.5 m",
  };
  const hogares: Hogar[] = NOMBRES.map((nombre, i) => ({ id: `h${i + 1}`, nombre, parte: 1, efectivo: i === 2 || i === 6 }));

  const d0 = new Date(ahora);
  const inicio = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - 20, 0, 0, 0).getTime();
  const PASO = 10 * 60_000;
  const entregasPlan = [
    { dia: 7, cotizados: 10000, reales: 9100, precio: 2350, proveedor: "Pipa A (simulada)" },
    { dia: 16, cotizados: 10000, reales: 9900, precio: 2200, proveedor: "Pipa B (simulada)" },
  ];

  let nivelL = 118 * lpc;
  const lecturas: Lectura[] = [];
  const entregas: Entrega[] = [];
  const lee = (ts: number, tipo?: "antes" | "despues", entregaId?: string) => {
    const cm = Math.max(0, Math.min(cal.alturaMaxCm, redondea((nivelL + gauss() * 0.3 * lpc) / lpc, 1)));
    lecturas.push({ id: nuevoId(), ts, cm, fuente: "simulada", tipo, entregaId });
    return cm;
  };

  const pendientes = new Map<number, { cmAntes?: number; tsAntes?: number; id: string; plan: (typeof entregasPlan)[number] }>();
  for (const p of entregasPlan) pendientes.set(p.dia, { id: nuevoId(), plan: p });

  for (let ts = inicio; ts < ahora; ts += PASO) {
    const f = new Date(ts);
    const dia = Math.round((new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime() - inicio) / 86_400_000);
    const h = f.getHours();
    const min = f.getMinutes();
    const fin = f.getDay() === 0 || f.getDay() === 6;
    const totalDia = 1100 + dia * 8 + (fin ? 180 : 0);
    const consumoPaso = (totalDia * PERFIL[h]) / 6 * (1 + gauss() * 0.08);
    const ent = pendientes.get(dia);
    if (ent && h === 9 && min === 50) {
      const cm = lee(ts, "antes", ent.id);
      ent.cmAntes = cm;
      ent.tsAntes = ts;
    }
    nivelL -= consumoPaso;
    if (ent && h === 10) nivelL += ent.plan.reales / 6;
    nivelL = Math.max(0, Math.min(cal.alturaMaxCm * lpc, nivelL));
    if (ent && h === 11 && min === 10 && ent.tsAntes != null && ts + PASO <= ahora) {
      const cmDespues = lee(ts, "despues", ent.id);
      entregas.push({
        id: ent.id,
        ts: ent.tsAntes - 20 * 3_600_000,
        proveedor: ent.plan.proveedor,
        litrosCotizados: ent.plan.cotizados,
        precioTotal: ent.plan.precio,
        estado: "cerrada",
        testigo: "Vecino testigo (simulado)",
        tsAntes: ent.tsAntes,
        cmAntes: ent.cmAntes,
        tsDespues: ts,
        cmDespues,
        simulada: true,
      });
    }
    if (min === 0 && [0, 6, 12, 18].includes(h)) lee(ts);
  }

  const { dias } = consumoDiario(lecturas, cal);
  const base = dias.length ? promedio(dias.map((d) => d.litros)) : null;
  const coord = coordinadorActual || "Coordinadora (ejemplo)";
  const excepciones: Excepcion[] = [];
  const cuotas: Cuota[] = [];
  entregas.sort((a, b) => a.ts - b.ts);
  entregas.forEach((e, idx) => {
    const m = medirEntrega(e, cal, base);
    if (m?.fuera) {
      excepciones.push({
        id: nuevoId(),
        entregaId: e.id,
        tipo: "litros",
        ts: e.tsDespues ?? ahora,
        responsable: coord,
        estado: "abierta",
        resumen: `Cotizados ${fmtNum(e.litrosCotizados)} L; observados ${fmtNum(m.observados)} L (diferencia por revisar de ${fmtNum(m.diferencia)} L, margen ±${fmtNum(m.margen)} L).`,
        notas: [],
        simulada: true,
      });
    }
    repartir(e.precioTotal, hogares).forEach((r, j) => {
      cuotas.push({
        id: nuevoId(),
        entregaId: e.id,
        hogarId: r.hogarId,
        monto: r.monto,
        metodo: hogares[j].efectivo ? "efectivo" : "transferencia",
        confirmada: idx === 1 || j < 5,
      });
    });
  });

  return {
    ...ESTADO_VACIO,
    coordinador: coord,
    hogares,
    cal,
    reservaPct: 15,
    lecturas,
    entregas,
    excepciones,
    cuotas,
    cotizaciones: [
      { id: nuevoId(), etiqueta: "Pipa A (simulada)", litros: 10000, precio: 2350 },
      { id: nuevoId(), etiqueta: "Pipa B (simulada)", litros: 10000, precio: 2200 },
      { id: nuevoId(), etiqueta: "Pipa C (simulada)", litros: 5000, precio: 1400 },
    ],
    simulado: true,
  };
}
