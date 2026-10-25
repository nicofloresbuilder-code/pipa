/* Autoprueba del motor de PIPA. Correr con: npx tsx src/lib/__selftest.ts */
import { ejemploSimulado } from "./ejemplo";
import {
  ajustarRegresion,
  backtest,
  capacidadL,
  consumoDiario,
  limpiar,
  litrosDe,
  litrosPorCmDe,
  medirEntrega,
  nivelActual,
  numero,
  ordenarCotizaciones,
  precioPorM3,
  pronosticar,
  promedio,
  repartir,
  textoResumen,
  validarMediciones,
} from "./motor";
import type { Calibracion, DiaConsumo, Entrega, Lectura } from "./tipos";

let ok = 0;
let mal = 0;
function t(nombre: string, cond: boolean, extra = "") {
  if (cond) ok++;
  else {
    mal++;
    console.error("FALLA:", nombre, extra);
  }
}
const casi = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

const cal: Calibracion = { litrosPorCm: 100, alturaMaxCm: 130, incertidumbrePct: 5, fecha: "2026-10-01", nota: "" };

/* --- calibración --- */
t("litros por cm de 4×2.5 m", litrosPorCmDe(4, 2.5) === 100);
t("litros de 50 cm", litrosDe(50, cal) === 5000);
t("capacidad", capacidadL(cal) === 13000);

/* --- validación --- */
t("limpiar quita < >", !/[<>]/.test(limpiar("<script>x</script>", 50)));
t("limpiar recorta", limpiar("a".repeat(100), 10).length === 10);
t("numero acepta coma", numero("12,5", 0, 100) === 12.5);
t("numero rechaza texto", numero("abc", 0, 100) === null);
t("numero rechaza vacío", numero("", 0, 100) === null);
t("numero rechaza fuera de rango", numero(500, 0, 100) === null);
t("numero rechaza Infinity", numero(Infinity, 0, 1e9) === null);

/* --- medición de entrega --- */
const h = 3_600_000;
const t0 = new Date(2026, 9, 10, 9, 50).getTime();
const base: Entrega = {
  id: "e1",
  ts: t0 - 20 * h,
  proveedor: "Pipa X",
  litrosCotizados: 10000,
  precioTotal: 2300,
  estado: "cerrada",
  tsAntes: t0,
  cmAntes: 20,
  tsDespues: t0 + 80 * 60_000,
  cmDespues: 110,
};
const m1 = medirEntrega(base, cal, 1200)!;
t("observados = 90 cm × 100 L", m1.observados === 9000);
t("minutos = 80", m1.minutos === 80);
t("consumo estimado en 80 min con 1200 L/día", casi(m1.consumoEst!, 66.7, 0.2), String(m1.consumoEst));
t("entregados estimados", casi(m1.entregadosEst, 9066.7, 0.2));
t("diferencia = cotizado - entregado", casi(m1.diferencia, 933.3, 0.2));
t("margen razonable (450+100+33)", casi(m1.margen, 583.4, 0.5), String(m1.margen));
t("fuera del margen → revisar", m1.fuera === true);
const m2 = medirEntrega({ ...base, cmDespues: 118 }, cal, 1200)!;
t("dentro del margen → no revisar", m2.fuera === false, JSON.stringify(m2));
const m3 = medirEntrega(base, cal, null)!;
t("sin historial: consumo null", m3.consumoEst === null);
t("sin historial: se agrega margen", m3.margen > 100 + 450);
t("entrega sin medidas → null", medirEntrega({ ...base, cmAntes: undefined }, cal, 1200) === null);
t("validar: después menor que antes", validarMediciones(base, 10, base.tsAntes! + h) !== null);
t("validar: hora anterior", validarMediciones(base, 100, base.tsAntes! - h) !== null);
t("validar: más de 6 h", validarMediciones(base, 100, base.tsAntes! + 7 * h) !== null);
t("validar: bien", validarMediciones(base, 100, base.tsAntes! + h) === null);
t("excedente también es diferencia", medirEntrega({ ...base, litrosCotizados: 8000 }, cal, 1200)!.fuera === true);

/* --- reparto --- */
const r = repartir(2350, Array.from({ length: 8 }, (_, i) => ({ id: "h" + i, parte: 1 })));
t("reparto suma exacta", Math.round(r.reduce((s, x) => s + x.monto, 0) * 100) === 235000);
const r2 = repartir(100, [
  { id: "a", parte: 1 },
  { id: "b", parte: 1 },
  { id: "c", parte: 1 },
]);
t("reparto 100/3 suma 100.00", Math.round(r2.reduce((s, x) => s + x.monto, 0) * 100) === 10000, JSON.stringify(r2));
const r3 = repartir(900, [
  { id: "a", parte: 2 },
  { id: "b", parte: 1 },
]);
t("reparto por partes 2:1", r3[0].monto === 600 && r3[1].monto === 300);
t("reparto sin hogares", repartir(100, []).length === 0);

/* --- cotizaciones --- */
t("precio por m³", precioPorM3({ litros: 10000, precio: 2200 }) === 220);
const oc = ordenarCotizaciones([
  { id: "1", etiqueta: "A", litros: 10000, precio: 2350 },
  { id: "2", etiqueta: "B", litros: 10000, precio: 2200 },
  { id: "3", etiqueta: "C", litros: 5000, precio: 1400 },
]);
t("ordenadas por precio por m³", oc[0].etiqueta === "B" && oc[2].etiqueta === "C");

/* --- consumo diario --- */
const dia1 = new Date(2026, 9, 1, 0, 0).getTime();
const lec: Lectura[] = [];
for (let d = 0; d < 10; d++) for (const hh of [0, 6, 12, 18]) {
  const ts = dia1 + d * 24 * h + hh * h;
  const cmv = 100 - (d * 24 + hh) * (10 / 24); // 10 cm por día = 1000 L/día
  lec.push({ id: `${d}-${hh}`, ts, cm: cmv, fuente: "manual" });
}
const cd = consumoDiario(lec, cal);
t("consumo 1000 L/día en días completos", cd.dias.length >= 8 && cd.dias.every((x) => casi(x.litros, 1000, 1)), JSON.stringify(cd.dias.slice(0, 2)));
t("sin subidas", cd.subidasSinEntrega === 0);
const lecSubida = [...lec, { id: "x", ts: dia1 + 9 * 24 * h + 21 * h, cm: 120, fuente: "manual" as const }];
t("subida sin entrega se excluye y se cuenta", consumoDiario(lecSubida, cal).subidasSinEntrega >= 1);
const hueco = lec.filter((l) => !(l.ts > dia1 + 3 * 24 * h && l.ts < dia1 + 6 * 24 * h));
t("hueco de más de 36 h no cuenta días", !consumoDiario(hueco, cal).dias.some((x) => x.fecha === new Date(dia1 + 4 * 24 * h).toISOString().slice(0, 10) && false));

/* --- pronóstico --- */
const dias7: DiaConsumo[] = Array.from({ length: 6 }, (_, i) => ({ fecha: `2026-10-0${i + 1}`, litros: 1000, horas: 24, finDeSemana: false }));
const p0 = pronosticar(dias7, 5000, 1950, "2026-10-08");
t("con 6 días: sin pronóstico", p0.tipo === "sin_historial" && p0.faltan === 1);
const diasN: DiaConsumo[] = Array.from({ length: 21 }, (_, i) => {
  const fecha = `2026-10-${String(i + 1).padStart(2, "0")}`;
  const fin = [3, 4, 10, 11, 17, 18].includes(i + 1);
  return { fecha, litros: 1000 + i * 8 + (fin ? 180 : 0) + ((i * 37) % 13) - 6, horas: 24, finDeSemana: fin };
});
const bt = backtest(diasN)!;
t("backtest existe", bt && bt.maeBase > 0);
t("regresión gana si hay tendencia y fin de semana", bt.maeModelo != null && bt.maeModelo < bt.maeBase, JSON.stringify(bt));
const p1 = pronosticar(diasN, 5000, 1950, "2026-10-22");
t("con 21 días: pronóstico ok", p1.tipo === "ok");
if (p1.tipo === "ok") {
  t("usa regresión", p1.modelo === "regresion", p1.motivo);
  t("días hasta reserva razonable", p1.diasHastaReserva > 1 && p1.diasHastaReserva < 5, String(p1.diasHastaReserva));
  t("rango: min ≤ valor ≤ max", p1.diasMin <= p1.diasHastaReserva && p1.diasHastaReserva <= p1.diasMax);
}
const ruido: DiaConsumo[] = Array.from({ length: 21 }, (_, i) => ({ fecha: `2026-10-${String(i + 1).padStart(2, "0")}`, litros: 1000 + (i % 2 ? 15 : -15), horas: 24, finDeSemana: [3, 4, 10, 11, 17, 18].includes(i + 1) }));
const p2 = pronosticar(ruido, 5000, 1950, "2026-10-22");
t("con ruido puro: no sobreajusta (usa línea base)", p2.tipo === "ok" && p2.modelo === "linea_base", p2.tipo === "ok" ? p2.motivo : "");
const p3 = pronosticar(diasN, 1500, 1950, "2026-10-22");
t("ya bajo la reserva: 0 días", p3.tipo === "ok" && p3.diasHastaReserva === 0);
t("regresión necesita 10 días", ajustarRegresion(diasN.slice(0, 9)) === null);
t("promedio vacío = 0", promedio([]) === 0);

/* --- ejemplo simulado de punta a punta --- */
const ahora = new Date(2026, 9, 21, 15, 30).getTime();
const ej = ejemploSimulado(ahora, "");
t("ejemplo: marcado simulado", ej.simulado === true);
t("ejemplo: 2 entregas", ej.entregas.length === 2);
t("ejemplo: todas las lecturas simuladas", ej.lecturas.every((l) => l.fuente === "simulada"));
t("ejemplo: 8 hogares", ej.hogares.length === 8);
const cdj = consumoDiario(ej.lecturas, ej.cal!);
t("ejemplo: al menos 15 días válidos", cdj.dias.length >= 15, String(cdj.dias.length));
t("ejemplo: consumo en rango", cdj.dias.every((x) => x.litros > 700 && x.litros < 1700), JSON.stringify(cdj.dias.map((x) => x.litros)));
const baseSim = promedio(cdj.dias.map((x) => x.litros));
const ms = ej.entregas.map((e) => medirEntrega(e, ej.cal!, baseSim)!);
t("ejemplo: 1.ª entrega fuera del margen", ms[0].fuera === true, JSON.stringify(ms[0]));
t("ejemplo: 2.ª entrega dentro del margen", ms[1].fuera === false, JSON.stringify(ms[1]));
t("ejemplo: una excepción abierta a nombre del coordinador", ej.excepciones.length === 1 && ej.excepciones[0].responsable.length > 0);
t("ejemplo: cuotas de 2 entregas × 8 hogares", ej.cuotas.length === 16);
t("ejemplo: algunas cuotas por confirmar", ej.cuotas.some((c) => !c.confirmada));
const nv = nivelActual(ej)!;
t("ejemplo: nivel actual entre 0 y 100 %", nv.pct > 0 && nv.pct < 100, String(nv.pct));
const pj = pronosticar(cdj.dias, nv.litros, 0.15 * capacidadL(ej.cal!), "2026-10-21");
t("ejemplo: pronóstico disponible", pj.tipo === "ok");
const txt = textoResumen(ej, { nivel: true, ultimaEntrega: true, pronostico: true, gasto: true, cuotas: true, lecturasCrudas: false }, "2026-10-21", baseSim);
t("resumen dice SIMULADOS", /SIMULADOS/.test(txt));
t("resumen sin nombres de hogares", !/Casa \d/.test(txt));
t("resumen sin lecturas crudas por defecto", !/Últimas lecturas/.test(txt));
t("resumen nunca promete llegada", /no incluye la llegada de la pipa/i.test(txt));
t("resumen no usa palabras de acusación", !/\brob(o|aron|ar|ado)\b|fraude|culpa|deudor/i.test(txt));
const txt2 = textoResumen(ej, { nivel: false, ultimaEntrega: false, pronostico: false, gasto: false, cuotas: false, lecturasCrudas: true }, "2026-10-21", baseSim);
t("resumen incluye lecturas solo si se marca", /Últimas lecturas/.test(txt2));

console.log(`${ok} aserciones bien, ${mal} mal`);
if (mal) process.exit(1);
