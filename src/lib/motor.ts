/* Motor de PIPA: funciones puras, sin IA. Las reglas calculan; la persona decide.
   Se prueba con `npx tsx src/lib/__selftest.ts`. */

import type {
  Calibracion,
  Cotizacion,
  DiaConsumo,
  Entrega,
  Estado,
  Hogar,
  Lectura,
  Medicion,
  Pronostico,
} from "./tipos";

const H = 3_600_000;
const DIA = 24 * H;

export const fmtNum = (n: number) => Math.round(n).toLocaleString("es-MX");

export const redondea = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/* ---------- Validación (todo campo pasa por aquí) ---------- */

export function limpiar(texto: string, max: number): string {
  return String(texto ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function numero(valor: unknown, min: number, max: number): number | null {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(n) || String(valor ?? "").trim() === "") return null;
  if (n < min || n > max) return null;
  return n;
}

/* ---------- Calibración y litros ---------- */

/** Cisterna rectangular: m² × 10 = litros por cada centímetro de altura. */
export const litrosPorCmDe = (largoM: number, anchoM: number) => redondea(largoM * anchoM * 10, 2);
export const litrosDe = (cm: number, cal: Calibracion) => redondea(cm * cal.litrosPorCm, 1);
export const capacidadL = (cal: Calibracion) => redondea(cal.alturaMaxCm * cal.litrosPorCm, 0);

/* ---------- Tiempo (día local) ---------- */

export function fechaLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const medianocheSiguiente = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};
const esFinDeSemana = (fecha: string) => {
  const g = new Date(fecha + "T12:00:00").getDay();
  return g === 0 || g === 6;
};
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DIA);
const sumaDias = (fecha: string, n: number) => {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() + n);
  return fechaLocal(d.getTime());
};

/* ---------- Consumo diario a partir de las lecturas ---------- */

/** Tasa de bajada entre lecturas consecutivas. Se excluyen:
 *  - la descarga (de "antes" a "después" de la misma entrega),
 *  - los huecos de más de 36 h,
 *  - subidas sin una entrega registrada (podría ser una descarga que no se anotó).
 *  Un día solo cuenta si hay al menos 20 h cubiertas. */
export function consumoDiario(lecturas: Lectura[], cal: Calibracion): { dias: DiaConsumo[]; subidasSinEntrega: number } {
  const L = [...lecturas].sort((a, b) => a.ts - b.ts);
  const acum = new Map<string, { litros: number; horas: number }>();
  let subidas = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const a = L[i];
    const b = L[i + 1];
    const dt = b.ts - a.ts;
    if (dt <= 0 || dt > 36 * H) continue;
    if (a.tipo === "antes" && b.tipo === "despues" && a.entregaId && a.entregaId === b.entregaId) continue;
    const bajo = (a.cm - b.cm) * cal.litrosPorCm;
    if (bajo < 0) {
      subidas++;
      continue;
    }
    const tasa = bajo / (dt / H); // litros por hora
    let cursor = a.ts;
    while (cursor < b.ts) {
      const fin = Math.min(b.ts, medianocheSiguiente(cursor));
      const h = (fin - cursor) / H;
      const k = fechaLocal(cursor);
      const prev = acum.get(k) ?? { litros: 0, horas: 0 };
      prev.litros += tasa * h;
      prev.horas += h;
      acum.set(k, prev);
      cursor = fin;
    }
  }
  const dias: DiaConsumo[] = [...acum.entries()]
    .filter(([, v]) => v.horas >= 20)
    .map(([fecha, v]) => ({
      fecha,
      litros: redondea((v.litros * 24) / v.horas, 1),
      horas: redondea(v.horas, 1),
      finDeSemana: esFinDeSemana(fecha),
    }))
    .sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
  return { dias, subidasSinEntrega: subidas };
}

export const promedio = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/* ---------- Medición de una entrega ---------- */

export function medirEntrega(e: Entrega, cal: Calibracion, litrosPorDiaBase: number | null): Medicion | null {
  if (e.cmAntes == null || e.cmDespues == null || e.tsAntes == null || e.tsDespues == null) return null;
  const observados = redondea((e.cmDespues - e.cmAntes) * cal.litrosPorCm, 1);
  const minutos = redondea((e.tsDespues - e.tsAntes) / 60000, 0);
  const consumoEst = litrosPorDiaBase != null ? redondea(((litrosPorDiaBase / 24) * minutos) / 60, 1) : null;
  const entregadosEst = redondea(observados + (consumoEst ?? 0), 1);
  const diferencia = redondea(e.litrosCotizados - entregadosEst, 1);
  // Margen = error de calibración + error de lectura (±0.5 cm en cada una) + error del consumo estimado.
  const errCal = (cal.incertidumbrePct / 100) * Math.max(observados, 0);
  const errLectura = 2 * 0.5 * cal.litrosPorCm;
  const errConsumo = consumoEst != null ? 0.5 * consumoEst : 0.05 * Math.max(observados, 0);
  const margen = redondea(errCal + errLectura + errConsumo, 1);
  return { observados, consumoEst, entregadosEst, diferencia, margen, fuera: Math.abs(diferencia) > margen, minutos };
}

export function validarMediciones(e: Entrega, cmDespues: number, tsDespues: number): string | null {
  if (e.cmAntes == null || e.tsAntes == null) return "Falta la medición de antes.";
  if (cmDespues <= e.cmAntes) return "El nivel de después debe ser mayor que el de antes. Si no subió, abre una excepción de \"no llegó\".";
  if (tsDespues <= e.tsAntes) return "La hora de después debe ser posterior a la de antes.";
  if ((tsDespues - e.tsAntes) / H > 6) return "Pasaron más de 6 horas entre las dos mediciones; el consumo en medio ya no se puede estimar bien.";
  return null;
}

/* ---------- Dinero: se registra, no se retiene ---------- */

/** Reparte en centavos enteros para que la suma sea exacta. */
export function repartir(total: number, hogares: Pick<Hogar, "id" | "parte">[]): { hogarId: string; monto: number }[] {
  if (!hogares.length) return [];
  const centavos = Math.round(total * 100);
  const suma = hogares.reduce((s, h) => s + h.parte, 0);
  let usados = 0;
  return hogares.map((h, i) => {
    const c = i === hogares.length - 1 ? centavos - usados : Math.floor((centavos * h.parte) / suma);
    usados += c;
    return { hogarId: h.id, monto: c / 100 };
  });
}

export const precioPorM3 = (c: Pick<Cotizacion, "litros" | "precio">) => redondea(c.precio / (c.litros / 1000), 2);

export function ordenarCotizaciones(cs: Cotizacion[]) {
  return [...cs].map((c) => ({ ...c, porM3: precioPorM3(c) })).sort((a, b) => a.porM3 - b.porM3);
}

export function precioPromedioHistorico(entregas: Entrega[]): number | null {
  const v = entregas.filter((e) => e.estado === "cerrada" && e.precioTotal > 0 && e.litrosCotizados > 0).map((e) => precioPorM3({ litros: e.litrosCotizados, precio: e.precioTotal }));
  return v.length ? redondea(promedio(v), 2) : null;
}

/* ---------- Pronóstico (asesor) con línea base ---------- */

function resolver(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((f, i) => [...f, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((f, i) => f[n] / M[i][i]);
}

type Modelo = (t: number, finDeSemana: boolean) => number;

/** Mínimos cuadrados con intercepto, tendencia y fin de semana (con un poco de regularización). */
export function ajustarRegresion(dias: DiaConsumo[]): Modelo | null {
  if (dias.length < 10) return null;
  const t0 = dias[0].fecha;
  const X = dias.map((d) => [1, diasEntre(t0, d.fecha), d.finDeSemana ? 1 : 0]);
  const y = dias.map((d) => d.litros);
  const lambda = 1e-3;
  const A = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s, f) => s + f[i] * f[j], 0) + (i === j && i > 0 ? lambda : 0)));
  const b = [0, 1, 2].map((i) => X.reduce((s, f, k) => s + f[i] * y[k], 0));
  const w = resolver(A, b);
  if (!w || w.some((v) => !Number.isFinite(v))) return null;
  return (t, fin) => Math.max(0, w[0] + w[1] * t + w[2] * (fin ? 1 : 0));
}

export function backtest(dias: DiaConsumo[]): { maeBase: number; maeModelo: number | null; puntos: number } | null {
  if (dias.length < 8) return null;
  const t0 = dias[0].fecha;
  let eb = 0;
  let em = 0;
  let nb = 0;
  let nm = 0;
  for (let i = 7; i < dias.length; i++) {
    const train = dias.slice(0, i);
    const real = dias[i].litros;
    eb += Math.abs(promedio(train.map((d) => d.litros)) - real);
    nb++;
    const m = ajustarRegresion(train);
    if (m) {
      em += Math.abs(m(diasEntre(t0, dias[i].fecha), dias[i].finDeSemana) - real);
      nm++;
    }
  }
  return { maeBase: redondea(eb / nb, 1), maeModelo: nm >= 2 ? redondea(em / nm, 1) : null, puntos: nb };
}

export function pronosticar(dias: DiaConsumo[], nivelL: number, reservaL: number, hoy: string): Pronostico {
  const MIN = 7;
  if (dias.length < MIN) return { tipo: "sin_historial", dias: dias.length, faltan: MIN - dias.length };
  const base = promedio(dias.map((d) => d.litros));
  const bt = backtest(dias);
  const modelo = ajustarRegresion(dias);
  const usaRegresion = Boolean(bt && bt.maeModelo != null && modelo && bt.maeModelo < bt.maeBase * 0.95);
  const mae = usaRegresion ? bt!.maeModelo! : bt?.maeBase ?? base * 0.15;
  const t0 = dias[0].fecha;
  const consumoDe = (k: number, off: number) => {
    const fecha = sumaDias(hoy, k);
    const v = usaRegresion && modelo ? modelo(diasEntre(t0, fecha), esFinDeSemana(fecha)) : base;
    return Math.max(base * 0.2, v + off);
  };
  const simula = (off: number) => {
    let nivel = nivelL;
    if (nivel <= reservaL) return 0;
    for (let k = 0; k < 60; k++) {
      const c = consumoDe(k, off);
      if (nivel - c <= reservaL) return k + (nivel - reservaL) / c;
      nivel -= c;
    }
    return 60;
  };
  const motivo = usaRegresion
    ? "La regresión le ganó a la línea base en la prueba hacia atrás."
    : bt?.maeModelo == null
      ? "Todavía no hay días suficientes para probar la regresión; se usa el promedio."
      : "La regresión no le ganó a la línea base (el promedio), así que se usa el promedio.";
  return {
    tipo: "ok",
    modelo: usaRegresion ? "regresion" : "linea_base",
    motivo,
    litrosPorDia: redondea(consumoDe(0, 0), 0),
    diasHastaReserva: redondea(simula(0), 1),
    diasMin: redondea(simula(+mae), 1),
    diasMax: redondea(simula(-mae), 1),
    maeBase: bt?.maeBase ?? null,
    maeModelo: bt?.maeModelo ?? null,
    dias: dias.length,
  };
}

/* ---------- Resumen aprobado para el grupo ---------- */

export type OpcionesResumen = {
  nivel: boolean;
  ultimaEntrega: boolean;
  pronostico: boolean;
  gasto: boolean;
  cuotas: boolean;
  lecturasCrudas: boolean;
};

export function nivelActual(e: Estado): { cm: number; litros: number; pct: number; ts: number } | null {
  if (!e.cal || !e.lecturas.length) return null;
  const u = [...e.lecturas].sort((a, b) => b.ts - a.ts)[0];
  const litros = litrosDe(u.cm, e.cal);
  return { cm: u.cm, litros, pct: redondea((u.cm / e.cal.alturaMaxCm) * 100, 0), ts: u.ts };
}

export function nombreHogar(e: Estado, id: string) {
  return e.hogares.find((h) => h.id === id)?.nombre ?? "—";
}

export function textoResumen(e: Estado, o: OpcionesResumen, hoy: string, base: number | null): string {
  const l: string[] = [];
  l.push(`Resumen de la cisterna · ${hoy}${e.simulado ? " · DATOS SIMULADOS" : ""}`);
  l.push(`Lo aprobó: ${e.coordinador || "(sin coordinador)"} (el texto lo revisa antes de enviarlo)`);
  const n = nivelActual(e);
  if (o.nivel && n) l.push(`Nivel: ${n.pct}% (~${Math.round(n.litros).toLocaleString("es-MX")} L, estimado con la calibración)`);
  const cerradas = e.entregas.filter((x) => x.estado === "cerrada" && e.cal).sort((a, b) => b.ts - a.ts);
  if (o.ultimaEntrega && cerradas[0] && e.cal) {
    const m = medirEntrega(cerradas[0], e.cal, base);
    if (m)
      l.push(
        `Última pipa: cobraron ${cerradas[0].litrosCotizados.toLocaleString("es-MX")} L y la regla marcó cerca de ${Math.round(m.entregadosEst).toLocaleString("es-MX")} L. ${
          m.fuera ? `Hay una diferencia de cerca de ${Math.abs(Math.round(m.diferencia)).toLocaleString("es-MX")} L que se está revisando en privado (puede ser error de medida).` : "Está dentro del error normal de medida."
        }`,
      );
  }
  if (o.pronostico && e.cal) {
    const { dias } = consumoDiario(e.lecturas, e.cal);
    const nv = nivelActual(e);
    if (nv) {
      const p = pronosticar(dias, nv.litros, (e.reservaPct / 100) * capacidadL(e.cal), hoy);
      l.push(
        p.tipo === "ok"
          ? `Aviso (no es promesa): al ritmo actual llegaríamos a la reserva en ${p.diasMin}–${p.diasMax} días. No incluye la llegada de la pipa.`
          : `Aviso: aún no hay historial para estimar cuándo pedir pipa (faltan ${p.faltan} días de lecturas).`,
      );
    }
  }
  if (o.gasto && cerradas[0]) l.push(`Gasto de la última entrega: $${cerradas[0].precioTotal.toLocaleString("es-MX")}`);
  if (o.cuotas && cerradas[0]) {
    const cs = e.cuotas.filter((c) => c.entregaId === cerradas[0].id);
    if (cs.length) l.push(`Cuotas confirmadas: ${cs.filter((c) => c.confirmada).length} de ${cs.length} (sin nombres)`);
  }
  if (o.lecturasCrudas && e.cal) {
    const u = [...e.lecturas].sort((a, b) => b.ts - a.ts).slice(0, 5);
    l.push("Últimas lecturas: " + u.map((x) => `${new Date(x.ts).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} ${x.cm} cm`).join(" · "));
  }
  l.push("Reglas: el agua no depende de este registro. El efectivo cuenta igual. Cualquier diferencia se habla en privado primero.");
  return l.join("\n");
}

export const nuevoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
