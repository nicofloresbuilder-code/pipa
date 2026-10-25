"use client";
import { useState } from "react";
import type { Derivado } from "@/lib/derivar";
import { fmtNum, limpiar, medirEntrega, nuevoId, numero, repartir, validarMediciones } from "@/lib/motor";
import { cambiar, horaDeTexto, horaLocalTexto } from "@/lib/navegador";
import type { Cuota, Entrega, Estado, Excepcion, Lectura } from "@/lib/tipos";
import { Aviso, Campo, Fallo, Simulado, fmtFechaHora, fmtL, fmtMXN } from "./ui";

const PASOS = [
  { n: 1, t: "Pides la pipa y anotas lo que te cobran", q: "Coordinador" },
  { n: 2, t: "Mides el nivel ANTES de que descargue", q: "Testigo (un vecino)" },
  { n: 3, t: "La pipa descarga", q: "Chofer (no usa la app)" },
  { n: 4, t: "Mides el nivel DESPUÉS", q: "Testigo (un vecino)" },
  { n: 5, t: "PIPA compara lo que te cobraron con lo que midió la regla", q: "PIPA calcula; tú decides" },
  { n: 6, t: "Anotas quién ya dio su cuota (PIPA solo anota; no cobra ni guarda dinero)", q: "Coordinador" },
  { n: 7, t: "Si algo no cuadra, alguien con nombre lo revisa", q: "Coordinador" },
];

function pasoActual(x?: Entrega): number {
  if (!x) return 1;
  if (x.estado === "pedida") return 2;
  if (x.estado === "midio_antes") return 4;
  return 7;
}

function Mapa({ actual }: { actual: number }) {
  return (
    <div>
      {PASOS.map((p) => (
        <div key={p.n} className={`paso ${p.n < actual ? "hecho" : p.n === actual ? "actual" : ""}`}>
          <div className="n" aria-hidden="true">{p.n}</div>
          <div>
            <div>{p.t}</div>
            <div className="quien">Responsable: {p.q}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TarjetaEntrega({ x, e, d }: { x: Entrega; e: Estado; d: Derivado }) {
  const cal = e.cal!;
  const [testigo, setTestigo] = useState(x.testigo ?? "");
  const [cmA, setCmA] = useState("");
  const [cmD, setCmD] = useState("");
  const [cuando, setCuando] = useState(() => horaLocalTexto(Date.now()));
  const [err, setErr] = useState<string | null>(null);
  const m = x.estado === "cerrada" ? medirEntrega(x, cal, d.base) : null;
  const [conf, setConf] = useState(false);
  const cancelar = (label: string) =>
    !conf ? (
      <p style={{ marginTop: 18 }}>
        <button className="btn sec chico" type="button" onClick={() => setConf(true)}>{label}</button>
      </p>
    ) : (
      <Aviso tipo="alerta">
        ¿Seguro? Se cancela esta entrega y se abre una revisión para atenderlo.
        <div className="acciones">
          <button className="btn chico" type="button" onClick={noLlego}>Sí, cancelar</button>
          <button className="btn sec chico" type="button" onClick={() => setConf(false)}>Volver</button>
        </div>
      </Aviso>
    );

  function medirAntes() {
    const v = numero(cmA, 0, cal.alturaMaxCm * 1.05);
    const ts = horaDeTexto(cuando);
    const t = limpiar(testigo, 30);
    if (t.length < 2) return setErr("Anota quién midió (nombre o apodo del testigo).");
    if (v == null) return setErr("El nivel va en cm, dentro de la altura de la cisterna.");
    if (ts == null) return setErr("La fecha y hora no son válidas.");
    setErr(null);
    const l: Lectura = { id: nuevoId(), ts, cm: v, fuente: "manual", tipo: "antes", entregaId: x.id };
    cambiar((s) => ({
      ...s,
      lecturas: [...s.lecturas, l],
      entregas: s.entregas.map((q) => (q.id === x.id ? { ...q, estado: "midio_antes", testigo: t, tsAntes: ts, cmAntes: v } : q)),
    }));
    setCuando(horaLocalTexto(Date.now()));
  }

  function medirDespues() {
    const v = numero(cmD, 0, cal.alturaMaxCm * 1.05);
    const ts = horaDeTexto(cuando);
    if (v == null) return setErr("El nivel va en cm, dentro de la altura de la cisterna.");
    if (ts == null) return setErr("La fecha y hora no son válidas.");
    const malo = validarMediciones(x, v, ts);
    if (malo) return setErr(malo);
    setErr(null);
    cambiar((s) => {
      const cerrada: Entrega = { ...x, estado: "cerrada", tsDespues: ts, cmDespues: v };
      const med = medirEntrega(cerrada, s.cal!, d.base)!;
      const lectura: Lectura = { id: nuevoId(), ts, cm: v, fuente: "manual", tipo: "despues", entregaId: x.id };
      const nuevasCuotas: Cuota[] = repartir(x.precioTotal, s.hogares).map((r) => ({
        id: nuevoId(),
        entregaId: x.id,
        hogarId: r.hogarId,
        monto: r.monto,
        metodo: s.hogares.find((h) => h.id === r.hogarId)?.efectivo ? "efectivo" : "transferencia",
        confirmada: false,
      }));
      const exc: Excepcion[] = med.fuera
        ? [{
            id: nuevoId(),
            entregaId: x.id,
            tipo: "litros",
            ts,
            responsable: s.coordinador,
            estado: "abierta",
            resumen: `Te cobraron ${fmtNum(x.litrosCotizados)} L y la regla marca cerca de ${fmtNum(med.entregadosEst)} L. Faltan cerca de ${fmtNum(Math.abs(med.diferencia))} L, más que el error de medida (±${fmtNum(med.margen)} L).`,
            notas: [],
          }]
        : [];
      return {
        ...s,
        lecturas: [...s.lecturas, lectura],
        entregas: s.entregas.map((q) => (q.id === x.id ? cerrada : q)),
        cuotas: [...s.cuotas, ...(x.precioTotal > 0 ? nuevasCuotas : [])],
        excepciones: [...s.excepciones, ...exc],
      };
    });
  }

  const [cmSolo, setCmSolo] = useState("");
  function sinAntes() {
    const v = numero(cmSolo, 0, cal.alturaMaxCm * 1.05);
    const t = limpiar(testigo, 30) || "sin testigo";
    if (v == null) return setErr("Anota el nivel de ahora en cm, dentro de la altura de la cisterna.");
    setErr(null);
    const ts = Date.now();
    cambiar((s) => ({
      ...s,
      lecturas: [...s.lecturas, { id: nuevoId(), ts, cm: v, fuente: "manual" as const, nota: "nivel después de una pipa sin medida de antes" }],
      entregas: s.entregas.map((q) => (q.id === x.id ? { ...q, estado: "cerrada" as const, testigo: t, tsDespues: ts, cmDespues: v } : q)),
      cuotas: [
        ...s.cuotas,
        ...(x.precioTotal > 0
          ? repartir(x.precioTotal, s.hogares).map((r) => ({
              id: nuevoId(), entregaId: x.id, hogarId: r.hogarId, monto: r.monto,
              metodo: (s.hogares.find((h) => h.id === r.hogarId)?.efectivo ? "efectivo" : "transferencia") as Cuota["metodo"], confirmada: false,
            }))
          : []),
      ],
    }));
  }

  function noLlego() {
    cambiar((s) => ({
      ...s,
      entregas: s.entregas.map((q) => (q.id === x.id ? { ...q, estado: "cancelada" } : q)),
      excepciones: [...s.excepciones, { id: nuevoId(), entregaId: x.id, tipo: "no_llego", ts: Date.now(), responsable: s.coordinador, estado: "abierta", resumen: `La pipa (${x.proveedor}) no llegó o no descargó.`, notas: [] }],
    }));
  }

  return (
    <div className="tarjeta">
      <h3>
        {x.proveedor} {x.simulada && <Simulado />}{" "}
        <span className={`insignia ${x.estado === "cerrada" ? (m?.fuera ? "alerta" : "ok") : x.estado === "cancelada" ? "alerta" : "agua"}`}>
          {x.estado === "pedida" ? "Falta medir antes" : x.estado === "midio_antes" ? "Falta medir después" : x.estado === "cerrada" ? (m?.fuera ? "Medida · por revisar" : "Medida · en orden") : "Cancelada"}
        </span>
      </h3>
      <p className="chico">Pedida {fmtFechaHora(x.ts)} · cotizada en {fmtL(x.litrosCotizados)} · {fmtMXN(x.precioTotal)}</p>

      {x.estado === "pedida" && (
        <>
          <Campo id={`t-${x.id}`} etiqueta="¿Quién mide? (nombre o apodo)"><input id={`t-${x.id}`} value={testigo} maxLength={30} onChange={(v) => setTestigo(v.target.value)} /></Campo>
          <div className="fila">
            <Campo id={`a-${x.id}`} etiqueta="Nivel ANTES de que descargue (cm)"><input id={`a-${x.id}`} inputMode="decimal" value={cmA} onChange={(v) => setCmA(v.target.value)} /></Campo>
            <Campo id={`c-${x.id}`} etiqueta="¿Cuándo?"><input id={`c-${x.id}`} type="datetime-local" value={cuando} onChange={(v) => setCuando(v.target.value)} /></Campo>
          </div>
          <Fallo texto={err} />
          <div className="acciones">
            <button className="btn" type="button" onClick={medirAntes}>Registrar nivel ANTES</button>
          </div>
          <details>
            <summary>¿Ya descargó y no alcancé a medir antes?</summary>
            <p className="chico">Se puede anotar, pero <strong>no se podrá saber cuántos litros llegaron</strong>: sin el nivel de antes no hay con qué comparar. Mide antes la próxima vez.</p>
            <Campo id={`s-${x.id}`} etiqueta="Nivel de ahora (cm)"><input id={`s-${x.id}`} inputMode="decimal" value={cmSolo} onChange={(v) => setCmSolo(v.target.value)} /></Campo>
            <div className="acciones"><button className="btn sec chico" type="button" onClick={sinAntes}>Anotar sin comparar</button></div>
          </details>
          {cancelar("La pipa no llegó")}
        </>
      )}

      {x.estado === "midio_antes" && (
        <>
          <p>Nivel antes: <strong className="num">{x.cmAntes} cm</strong> a las {x.tsAntes ? fmtFechaHora(x.tsAntes) : ""}, mide {x.testigo}.</p>
          <div className="fila">
            <Campo id={`d-${x.id}`} etiqueta="Nivel DESPUÉS de que descargó (cm)"><input id={`d-${x.id}`} inputMode="decimal" value={cmD} onChange={(v) => setCmD(v.target.value)} /></Campo>
            <Campo id={`cd-${x.id}`} etiqueta="¿Cuándo?"><input id={`cd-${x.id}`} type="datetime-local" value={cuando} onChange={(v) => setCuando(v.target.value)} /></Campo>
          </div>
          <Fallo texto={err} />
          <div className="acciones">
            <button className="btn" type="button" onClick={medirDespues}>Ver cuántos litros llegaron</button>
          </div>
          {cancelar("La pipa no descargó")}
        </>
      )}

      {x.estado === "cerrada" && !m && (
        <Aviso>Esta pipa se anotó <strong>sin medir antes</strong>, así que no se puede saber cuántos litros llegaron. Las cuotas sí se pueden llevar.</Aviso>
      )}
      {m && (
        <>
          <p style={{ fontSize: "1.08rem" }}>
            <strong>Te cobraron {fmtL(x.litrosCotizados)} y llegaron cerca de {fmtL(m.entregadosEst)}.</strong>{" "}
            {m.fuera ? (m.diferencia > 0 ? `Faltaron cerca de ${fmtL(m.diferencia)}.` : `Llegaron cerca de ${fmtL(-m.diferencia)} de más.`) : "La diferencia es normal para medir con regla."}
          </p>
          <p className="chico">Cómo se calculó: antes {x.cmAntes} cm, después {x.cmDespues} cm; {((x.cmDespues ?? 0) - (x.cmAntes ?? 0)).toLocaleString("es-MX", { maximumFractionDigits: 1 })} cm × {cal.litrosPorCm} L por cm = {fmtL(m.observados)}.</p>
          <div className="rejilla">
            <div className="dato"><div className="v">{fmtL(x.litrosCotizados)}</div><div className="e">Lo que te cobraron (cotizados)</div></div>
            <div className="dato"><div className="v">{fmtL(m.observados)}</div><div className="e">Lo que midió la regla (observados: después menos antes)</div></div>
            <div className="dato"><div className="v">{m.consumoEst == null ? "—" : `+${fmtL(m.consumoEst)}`}</div><div className="e">{m.consumoEst == null ? "Agua gastada durante la descarga (estimados): aún no se puede calcular" : `Agua gastada durante la descarga (estimados): ${m.minutos} min`}</div></div>
            <div className={`dato ${m.fuera ? "fuera" : "bien"}`}><div className="v">{fmtL(m.diferencia)}</div><div className="e">{m.diferencia > 0 ? "Faltaron" : m.diferencia < 0 ? "Sobraron" : "Diferencia"} (por medir con regla puede haber hasta {Math.round(m.margen).toLocaleString("es-MX")} L de error)</div></div>
          </div>
          {m.fuera ? (
            <Aviso tipo="alerta">
              <strong>Es más de lo que explica el error de medida</strong> (hasta {Math.round(m.margen).toLocaleString("es-MX")} L). Todavía no sabemos por qué: puede ser la medida de la cisterna, la regla o la entrega.
              <br />Se abrió una <strong>revisión</strong> a cargo de {e.coordinador}: te toca volver a medir con calma. No es una acusación a nadie. Si sigue sin cuadrar, habla con el proveedor.
            </Aviso>
          ) : (
            <Aviso tipo="agua">Todo en orden: la diferencia es menor que el error normal al medir con regla, así que no hay nada que revisar.</Aviso>
          )}
          {m.consumoEst == null && <Aviso>Todavía no se puede calcular cuánta agua se gastó mientras descargaba (faltan días de lecturas). Por eso el margen de error es más grande.</Aviso>}
        </>
      )}
    </div>
  );
}

export default function Entregas({ e, d }: { e: Estado; d: Derivado }) {
  const [prov, setProv] = useState("");
  const [lit, setLit] = useState("");
  const [precio, setPrecio] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const lista = [...e.entregas].sort((a, b) => b.ts - a.ts);
  const enCurso = lista.find((x) => x.estado === "pedida" || x.estado === "midio_antes");

  function pedir() {
    const p = limpiar(prov, 30);
    const l = numero(lit, 500, 50000);
    const pr = numero(precio, 0, 100000);
    if (p.length < 2) return setErr("Ponle una etiqueta a la pipa (por ejemplo \"Pipa A\"). No es un directorio: solo para distinguirla.");
    if (l == null) return setErr("Los litros cotizados van entre 500 y 50,000.");
    if (pr == null) return setErr("El precio total va entre 0 y 100,000 pesos.");
    setErr(null);
    cambiar((s) => ({ ...s, entregas: [...s.entregas, { id: nuevoId(), ts: Date.now(), proveedor: p, litrosCotizados: l, precioTotal: pr, estado: "pedida" }] }));
    setProv(""); setLit(""); setPrecio("");
  }

  return (
    <div>
      <div className="tarjeta">
        <h2>Cómo va una pipa</h2>
        <p className="chico">Cada paso tiene un responsable, para que cuando algo falle se sepa a quién le toca.</p>
        <Mapa actual={pasoActual(enCurso)} />
      </div>

      <details className="tarjeta" open={lista.length === 0}>
        <summary><strong>{lista.length === 0 ? "Registrar una pipa" : "Registrar otra pipa"}</strong></summary>
        {enCurso ? <Aviso>Ya hay una entrega en curso. Termina esa antes de registrar otra.</Aviso> : (
          <>
            <Campo id="prov" etiqueta="Nombre de la pipa (para distinguirla)"><input id="prov" value={prov} maxLength={30} onChange={(v) => setProv(v.target.value)} placeholder="Ej: Pipa de Don Beto" /></Campo>
            <div className="fila">
              <Campo id="lit" etiqueta="Litros que te cobran"><input id="lit" inputMode="numeric" value={lit} onChange={(v) => setLit(v.target.value)} placeholder="Ej: 10000" /></Campo>
              <Campo id="pre" etiqueta="Precio total ($)"><input id="pre" inputMode="decimal" value={precio} onChange={(v) => setPrecio(v.target.value)} placeholder="Ej: 2300" /></Campo>
            </div>
            <Fallo texto={err} />
            <div className="acciones"><button className="btn" type="button" onClick={pedir}>Registrar pedido</button></div>
          </>
        )}
      </details>

      {lista.length === 0 ? <p>No hay entregas todavía.</p> : lista.map((x) => <TarjetaEntrega key={x.id} x={x} e={e} d={d} />)}
    </div>
  );
}
