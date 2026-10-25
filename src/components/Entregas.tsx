"use client";
import { useState } from "react";
import type { Derivado } from "@/lib/derivar";
import { fmtNum, limpiar, medirEntrega, nuevoId, numero, repartir, validarMediciones } from "@/lib/motor";
import { cambiar, horaDeTexto, horaLocalTexto } from "@/lib/navegador";
import type { Cuota, Entrega, Estado, Excepcion, Lectura } from "@/lib/tipos";
import { Aviso, Campo, Fallo, Simulado, fmtFechaHora, fmtL, fmtMXN } from "./ui";

const PASOS = [
  { n: 1, t: "Pedir la pipa y anotar lo cotizado", q: "Coordinador" },
  { n: 2, t: "Medir el nivel ANTES de la descarga", q: "Testigo (un vecino)" },
  { n: 3, t: "Descarga de la pipa", q: "Chofer · no usa la app y no recibe datos" },
  { n: 4, t: "Medir el nivel DESPUÉS de la descarga", q: "Testigo (un vecino)" },
  { n: 5, t: "Comparar litros cotizados, observados y estimados", q: "PIPA calcula · el coordinador decide" },
  { n: 6, t: "Anotar las cuotas (se registra el dinero, no se guarda)", q: "Coordinador" },
  { n: 7, t: "Si algo no cuadra: excepción con dueño y plazo", q: "Coordinador (nombre propio)" },
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
            resumen: `Cotizados ${fmtNum(x.litrosCotizados)} L; observados ${fmtNum(med.observados)} L (diferencia por revisar de ${fmtNum(med.diferencia)} L, margen ±${fmtNum(med.margen)} L).`,
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
        <span className={`insignia ${x.estado === "cerrada" ? "ok" : x.estado === "cancelada" ? "alerta" : "agua"}`}>
          {x.estado === "pedida" ? "Pedida" : x.estado === "midio_antes" ? "Descargando" : x.estado === "cerrada" ? "Cerrada" : "Cancelada"}
        </span>
      </h3>
      <p className="chico">Pedida {fmtFechaHora(x.ts)} · cotizada en {fmtL(x.litrosCotizados)} · {fmtMXN(x.precioTotal)}</p>

      {x.estado === "pedida" && (
        <>
          <Campo id={`t-${x.id}`} etiqueta="Testigo que mide (nombre o apodo)"><input id={`t-${x.id}`} value={testigo} maxLength={30} onChange={(v) => setTestigo(v.target.value)} /></Campo>
          <div className="fila">
            <Campo id={`a-${x.id}`} etiqueta="Nivel ANTES (cm)"><input id={`a-${x.id}`} inputMode="decimal" value={cmA} onChange={(v) => setCmA(v.target.value)} /></Campo>
            <Campo id={`c-${x.id}`} etiqueta="¿Cuándo?"><input id={`c-${x.id}`} type="datetime-local" value={cuando} onChange={(v) => setCuando(v.target.value)} /></Campo>
          </div>
          <Fallo texto={err} />
          <div className="acciones">
            <button className="btn" type="button" onClick={medirAntes}>Registrar nivel ANTES</button>
            <button className="btn sec" type="button" onClick={noLlego}>La pipa no llegó</button>
          </div>
        </>
      )}

      {x.estado === "midio_antes" && (
        <>
          <p>Nivel antes: <strong className="num">{x.cmAntes} cm</strong> a las {x.tsAntes ? fmtFechaHora(x.tsAntes) : ""}, mide {x.testigo}.</p>
          <div className="fila">
            <Campo id={`d-${x.id}`} etiqueta="Nivel DESPUÉS (cm)"><input id={`d-${x.id}`} inputMode="decimal" value={cmD} onChange={(v) => setCmD(v.target.value)} /></Campo>
            <Campo id={`cd-${x.id}`} etiqueta="¿Cuándo?"><input id={`cd-${x.id}`} type="datetime-local" value={cuando} onChange={(v) => setCuando(v.target.value)} /></Campo>
          </div>
          <Fallo texto={err} />
          <div className="acciones">
            <button className="btn" type="button" onClick={medirDespues}>Registrar nivel DESPUÉS y comparar</button>
            <button className="btn sec" type="button" onClick={noLlego}>No descargó</button>
          </div>
        </>
      )}

      {m && (
        <>
          <div className="rejilla">
            <div className="dato"><div className="v">{fmtL(x.litrosCotizados)}</div><div className="e">COTIZADOS (lo que dijo el proveedor)</div></div>
            <div className="dato"><div className="v">{fmtL(m.observados)}</div><div className="e">OBSERVADOS (después − antes, con la calibración)</div></div>
            <div className="dato"><div className="v">{m.consumoEst == null ? "—" : `+${fmtL(m.consumoEst)}`}</div><div className="e">{m.consumoEst == null ? "ESTIMADOS: sin historial para estimar el consumo" : `ESTIMADOS: consumo durante ${m.minutos} min`}</div></div>
            <div className={`dato ${m.fuera ? "fuera" : "bien"}`}><div className="v">{fmtL(m.diferencia)}</div><div className="e">diferencia (margen ±{Math.round(m.margen)} L)</div></div>
          </div>
          {m.fuera ? (
            <Aviso tipo="alerta"><strong>Diferencia por revisar.</strong> Esto no dice quién tiene la razón: puede ser la calibración, la medición o la entrega. Se abrió una excepción a nombre de {e.coordinador}. Antes de hablar con el proveedor, revisa las mediciones en privado.</Aviso>
          ) : (
            <Aviso tipo="agua">Dentro del margen: la diferencia es menor que lo que puede explicar el error de calibración y de lectura.</Aviso>
          )}
          {m.consumoEst == null && <Aviso>Aún no hay historial de consumo; se amplió el margen y no se estimó el consumo durante la descarga.</Aviso>}
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
        <h2>El mapa de una entrega</h2>
        <p className="chico">Cada paso tiene un responsable con nombre, para que cuando algo falle se sepa a quién le toca.</p>
        <Mapa actual={pasoActual(enCurso)} />
      </div>

      <div className="tarjeta">
        <h2>Registrar una pipa pedida</h2>
        {enCurso ? <Aviso>Ya hay una entrega en curso. Termínala antes de registrar otra.</Aviso> : (
          <>
            <Campo id="prov" etiqueta="Etiqueta de la pipa"><input id="prov" value={prov} maxLength={30} onChange={(v) => setProv(v.target.value)} placeholder="Pipa A" /></Campo>
            <div className="fila">
              <Campo id="lit" etiqueta="Litros cotizados"><input id="lit" inputMode="numeric" value={lit} onChange={(v) => setLit(v.target.value)} placeholder="10000" /></Campo>
              <Campo id="pre" etiqueta="Precio total ($)"><input id="pre" inputMode="decimal" value={precio} onChange={(v) => setPrecio(v.target.value)} placeholder="2200" /></Campo>
            </div>
            <Fallo texto={err} />
            <div className="acciones"><button className="btn" type="button" onClick={pedir}>Registrar pedido</button></div>
          </>
        )}
      </div>

      {lista.length === 0 ? <p>No hay entregas todavía.</p> : lista.map((x) => <TarjetaEntrega key={x.id} x={x} e={e} d={d} />)}
    </div>
  );
}
