"use client";
import { useState } from "react";
import type { Derivado } from "@/lib/derivar";
import { fmtNum, limpiar, medirEntrega, nuevoId, numero } from "@/lib/motor";
import { cambiar } from "@/lib/navegador";
import type { EstadoExcepcion, Estado, Excepcion, TipoExcepcion } from "@/lib/tipos";
import { Aviso, Campo, Fallo, Simulado, fmtFechaHora, fmtL, hace } from "./ui";

export const TIPOS: Record<TipoExcepcion, { t: string; primer: string; plazo: string }> = {
  litros: { t: "Diferencia de litros", primer: "Revisar mediciones y calibración en privado con el testigo; si hace falta, corregir y volver a comparar.", plazo: "48 h" },
  no_llego: { t: "La pipa no llegó", primer: "Hablar con el proveedor y avisar al grupo si hay que pedir otra.", plazo: "24 h" },
  acceso: { t: "No se pudo descargar (acceso)", primer: "Resolver el acceso con quien tenga la llave o la conexión.", plazo: "24 h" },
  cobro: { t: "Cobro distinto al acordado", primer: "Pedir el desglose por escrito antes de pagar la diferencia.", plazo: "72 h" },
  sin_testigo: { t: "Nadie pudo medir", primer: "Nombrar un testigo suplente antes de la próxima pipa.", plazo: "antes de la próxima pipa" },
  otra: { t: "Otra", primer: "Anotar qué pasó y quién lo atiende.", plazo: "72 h" },
};

const ESTADOS: Record<EstadoExcepcion, { t: string; c: string }> = {
  abierta: { t: "Abierta", c: "alerta" },
  en_revision: { t: "En revisión", c: "" },
  resuelta: { t: "Resuelta", c: "ok" },
  sin_causa: { t: "Cerrada sin causa", c: "agua" },
};

function Tarjeta({ x, e, d, ahora }: { x: Excepcion; e: Estado; d: Derivado; ahora: number }) {
  const [nota, setNota] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [cmA, setCmA] = useState("");
  const [cmD, setCmD] = useState("");
  const [motivo, setMotivo] = useState("");
  const entrega = e.entregas.find((q) => q.id === x.entregaId);
  const cerrada = x.estado === "resuelta" || x.estado === "sin_causa";
  const info = TIPOS[x.tipo];

  const poner = (estado: EstadoExcepcion, texto?: string) =>
    cambiar((s) => ({
      ...s,
      excepciones: s.excepciones.map((q) => (q.id === x.id ? { ...q, estado, notas: texto ? [...q.notas, { ts: Date.now(), texto }] : q.notas } : q)),
    }));

  function cerrar(estado: "resuelta" | "sin_causa") {
    const t = limpiar(nota, 300);
    if (t.length < 3) return setErr("Anota en una frase qué se vio o qué se decidió antes de cerrar.");
    setErr(null);
    poner(estado, `${estado === "resuelta" ? "Resuelta" : "Cerrada sin causa"}: ${t}`);
    setNota("");
  }
  function agregarNota() {
    const t = limpiar(nota, 300);
    if (t.length < 3) return setErr("Escribe la nota (mínimo 3 letras).");
    setErr(null);
    poner(x.estado, t);
    setNota("");
  }
  function corregir() {
    if (!entrega || !e.cal) return;
    const a = numero(cmA, 0, e.cal.alturaMaxCm * 1.05);
    const dd = numero(cmD, 0, e.cal.alturaMaxCm * 1.05);
    const m = limpiar(motivo, 120);
    if (a == null || dd == null) return setErr("Los dos niveles van en cm, dentro de la cisterna.");
    if (dd <= a) return setErr("El nivel de después debe ser mayor que el de antes.");
    if (m.length < 3) return setErr("Escribe el motivo de la corrección.");
    setErr(null);
    cambiar((s) => {
      const nueva = { ...entrega, cmAntes: a, cmDespues: dd };
      const med = medirEntrega(nueva, s.cal!, d.base);
      const texto = `Medición corregida (antes ${entrega.cmAntes} → ${a} cm, después ${entrega.cmDespues} → ${dd} cm). Motivo: ${m}.${med ? ` Nueva diferencia: ${fmtNum(med.diferencia)} L con margen ±${fmtNum(med.margen)} L (${med.fuera ? "sigue fuera del margen" : "queda dentro del margen"}).` : ""}`;
      return {
        ...s,
        entregas: s.entregas.map((q) => (q.id === entrega.id ? nueva : q)),
        lecturas: s.lecturas.map((l) => (l.entregaId === entrega.id ? (l.tipo === "antes" ? { ...l, cm: a } : l.tipo === "despues" ? { ...l, cm: dd } : l) : l)),
        excepciones: s.excepciones.map((q) => (q.id === x.id ? { ...q, notas: [...q.notas, { ts: Date.now(), texto }] } : q)),
      };
    });
    setCorrigiendo(false);
  }

  return (
    <div className={`tarjeta ${cerrada ? "" : "alerta"}`}>
      <h3>
        {info.t} {x.simulada && <Simulado />} <span className={`insignia ${ESTADOS[x.estado].c}`}>{ESTADOS[x.estado].t}</span>
      </h3>
      <p>{x.resumen}</p>
      <p className="chico">A cargo de <strong>{x.responsable}</strong> · abierta {fmtFechaHora(x.ts)} ({hace(x.ts, ahora)}) · plazo sugerido: {info.plazo}</p>
      <p className="chico"><strong>Primer paso:</strong> {info.primer}</p>
      {x.notas.length > 0 && (
        <ul className="chico">
          {x.notas.map((n, i) => <li key={i}>{fmtFechaHora(n.ts)}: {n.texto}</li>)}
        </ul>
      )}
      {!cerrada && (
        <>
          <Campo id={`n-${x.id}`} etiqueta="Nota privada">
            <input id={`n-${x.id}`} value={nota} maxLength={300} onChange={(v) => setNota(v.target.value)} placeholder="Qué se revisó, con quién se habló" />
          </Campo>
          <Fallo texto={err} />
          <div className="acciones">
            {x.estado === "abierta" && <button className="btn chico" type="button" onClick={() => poner("en_revision", "Puesta en revisión.")}>Poner en revisión</button>}
            <button className="btn sec chico" type="button" onClick={agregarNota}>Agregar nota</button>
            {x.tipo === "litros" && entrega && <button className="btn sec chico" type="button" onClick={() => { setCorrigiendo(true); setCmA(String(entrega.cmAntes ?? "")); setCmD(String(entrega.cmDespues ?? "")); }}>Corregir medición</button>}
            <button className="btn sec chico" type="button" onClick={() => cerrar("resuelta")}>Marcar resuelta</button>
            <button className="btn sec chico" type="button" onClick={() => cerrar("sin_causa")}>Cerrar sin causa</button>
          </div>
        </>
      )}
      {cerrada && <div className="acciones"><button className="btn sec chico" type="button" onClick={() => poner("en_revision", "Reabierta.")}>Reabrir</button></div>}
      {corrigiendo && entrega && (
        <div className="aviso agua">
          <strong>Corregir la medición de {entrega.proveedor}.</strong> Hoy: antes {entrega.cmAntes} cm, después {entrega.cmDespues} cm ({e.cal ? fmtL(((entrega.cmDespues ?? 0) - (entrega.cmAntes ?? 0)) * e.cal.litrosPorCm) : ""}).
          <div className="fila">
            <Campo id={`ca-${x.id}`} etiqueta="Antes (cm)"><input id={`ca-${x.id}`} inputMode="decimal" value={cmA} onChange={(v) => setCmA(v.target.value)} /></Campo>
            <Campo id={`cd-${x.id}`} etiqueta="Después (cm)"><input id={`cd-${x.id}`} inputMode="decimal" value={cmD} onChange={(v) => setCmD(v.target.value)} /></Campo>
          </div>
          <Campo id={`cm-${x.id}`} etiqueta="Motivo"><input id={`cm-${x.id}`} value={motivo} maxLength={120} onChange={(v) => setMotivo(v.target.value)} /></Campo>
          <div className="acciones">
            <button className="btn chico" type="button" onClick={corregir}>Guardar corrección</button>
            <button className="btn sec chico" type="button" onClick={() => setCorrigiendo(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Excepciones({ e, d, ahora }: { e: Estado; d: Derivado; ahora: number }) {
  const [tipo, setTipo] = useState<TipoExcepcion>("acceso");
  const [texto, setTexto] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const lista = [...e.excepciones].sort((a, b) => b.ts - a.ts);

  function abrir() {
    const t = limpiar(texto, 200);
    if (!e.coordinador) return setErr("Sin coordinador con nombre no se abren excepciones.");
    if (t.length < 3) return setErr("Cuenta en una frase qué pasó.");
    setErr(null);
    cambiar((s) => ({ ...s, excepciones: [...s.excepciones, { id: nuevoId(), tipo, ts: Date.now(), responsable: s.coordinador, estado: "abierta", resumen: t, notas: [] }] }));
    setTexto("");
  }

  return (
    <div>
      <div className="tarjeta ambar">
        <h2>Cómo se manejan las excepciones</h2>
        <p>Cada excepción tiene <strong>una persona con nombre</strong> ({e.coordinador || "el coordinador"}), un primer paso y un plazo. Se atienden en privado primero. PIPA nunca acusa a nadie: dice &quot;diferencia por revisar&quot;.</p>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Tipo</th><th>Primer paso</th><th>Plazo</th></tr></thead>
            <tbody>{Object.entries(TIPOS).map(([k, v]) => <tr key={k}><td>{v.t}</td><td>{v.primer}</td><td>{v.plazo}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      {lista.length === 0 ? <p>No hay excepciones. Cuando una entrega salga fuera del margen, aparece aquí.</p> : lista.map((x) => <Tarjeta key={x.id} x={x} e={e} d={d} ahora={ahora} />)}

      <div className="tarjeta">
        <h2>Abrir una excepción a mano</h2>
        <label htmlFor="tipo-exc">Tipo</label>
        <select id="tipo-exc" value={tipo} onChange={(v) => setTipo(v.target.value as TipoExcepcion)}>
          {Object.entries(TIPOS).filter(([k]) => k !== "litros").map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
        </select>
        <Campo id="txt-exc" etiqueta="¿Qué pasó?"><input id="txt-exc" value={texto} maxLength={200} onChange={(v) => setTexto(v.target.value)} /></Campo>
        <Fallo texto={err} />
        <Aviso>Las excepciones de litros se abren solas al comparar una entrega.</Aviso>
        <div className="acciones"><button className="btn" type="button" onClick={abrir}>Abrir excepción</button></div>
      </div>
    </div>
  );
}
