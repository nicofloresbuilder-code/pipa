"use client";
import { useState } from "react";
import { limpiar, litrosDe, nuevoId, numero } from "@/lib/motor";
import { cambiar, horaDeTexto, horaLocalTexto } from "@/lib/navegador";
import type { Estado, Lectura } from "@/lib/tipos";
import { Aviso, Campo, Fallo, Simulado, fmtFechaHora, fmtL } from "./ui";

function Grafica({ e }: { e: Estado }) {
  const cal = e.cal!;
  const L = [...e.lecturas].sort((a, b) => a.ts - b.ts);
  if (L.length < 2) return <p className="chico">Con dos lecturas o más aparece la gráfica.</p>;
  const W = 640, H = 220, pad = 34;
  const t0 = L[0].ts, t1 = L[L.length - 1].ts;
  const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad - 10);
  const y = (cm: number) => H - pad - (cm / cal.alturaMaxCm) * (H - pad - 12);
  const camino = L.map((l, i) => `${i ? "L" : "M"}${x(l.ts).toFixed(1)},${y(l.cm).toFixed(1)}`).join(" ");
  const res = y((e.reservaPct / 100) * cal.alturaMaxCm);
  return (
    <svg className="grafica" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nivel del tanque en el tiempo, con las descargas marcadas">
      <line x1={pad} x2={W - 10} y1={res} y2={res} stroke="#b8391f" strokeDasharray="5 4" />
      <text x={pad + 4} y={res - 4} fontSize="11" fill="#b8391f">reserva</text>
      {[0, 50, 100].map((p) => (
        <g key={p}>
          <text x={4} y={y((p / 100) * cal.alturaMaxCm) + 4} fontSize="11" fill="#4a5568">{p}%</text>
          <line x1={pad} x2={W - 10} y1={y((p / 100) * cal.alturaMaxCm)} y2={y((p / 100) * cal.alturaMaxCm)} stroke="#c9c2ad" strokeWidth="0.6" />
        </g>
      ))}
      {e.entregas.filter((q) => q.tsAntes).map((q) => (
        <g key={q.id}>
          <line x1={x(q.tsAntes!)} x2={x(q.tsAntes!)} y1={12} y2={H - pad} stroke="#0b6e8a" strokeWidth="2" strokeDasharray="2 3" />
          <text x={x(q.tsAntes!) + 3} y={22} fontSize="11" fill="#0b6e8a">pipa</text>
        </g>
      ))}
      <path d={camino} fill="none" stroke="#12203a" strokeWidth="2" strokeDasharray={e.simulado ? "6 3" : undefined} />
      <text x={pad} y={H - 8} fontSize="11" fill="#4a5568">{new Date(t0).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</text>
      <text x={W - 70} y={H - 8} fontSize="11" fill="#4a5568">{new Date(t1).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</text>
    </svg>
  );
}

export default function Tanque({ e, cambiarCal }: { e: Estado; cambiarCal: () => void }) {
  const cal = e.cal!;
  const [cm, setCm] = useState("");
  const [cuando, setCuando] = useState(() => horaLocalTexto(Date.now()));
  const [nota, setNota] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoCm, setNuevoCm] = useState("");
  const [motivo, setMotivo] = useState("");
  const [errEd, setErrEd] = useState<string | null>(null);

  function agregar() {
    const v = numero(cm, 0, cal.alturaMaxCm * 1.05);
    if (v == null) return setErr(`El nivel va en centímetros, entre 0 y ${Math.round(cal.alturaMaxCm * 1.05)}.`);
    const ts = horaDeTexto(cuando);
    if (ts == null) return setErr("La fecha y hora no son válidas.");
    if (ts > Date.now() + 5 * 60_000) return setErr("La hora no puede estar en el futuro.");
    setErr(null);
    const l: Lectura = { id: nuevoId(), ts, cm: Math.round(v * 10) / 10, fuente: "manual", nota: limpiar(nota, 100) || undefined };
    cambiar((s) => ({ ...s, lecturas: [...s.lecturas, l] }));
    setCm("");
    setNota("");
    setCuando(horaLocalTexto(Date.now()));
  }

  function corregir(l: Lectura) {
    const v = numero(nuevoCm, 0, cal.alturaMaxCm * 1.05);
    const m = limpiar(motivo, 100);
    if (v == null) return setErrEd("Número no válido.");
    if (m.length < 3) return setErrEd("Escribe el motivo de la corrección (queda registrado).");
    setErrEd(null);
    cambiar((s) => ({
      ...s,
      lecturas: s.lecturas.map((x) => (x.id === l.id ? { ...x, cm: Math.round(v * 10) / 10, nota: `corregido de ${l.cm} a ${v} cm: ${m}` } : x)),
    }));
    setEditando(null);
    setMotivo("");
  }

  const recientes = [...e.lecturas].sort((a, b) => b.ts - a.ts).slice(0, 12);
  return (
    <div>
      <div className="tarjeta">
        <h2>Anotar el nivel {e.simulado && <Simulado />}</h2>
        <p className="chico">Tú mides con la regla o el flotador y aquí apuntas el número. Cada lectura se queda guardada en este teléfono.</p>
        <details>
          <summary>¿Cómo mido?</summary>
          <p className="chico">Con una regla, una cinta o un palo largo: mételo hasta el fondo, sácalo, y mide cuántos centímetros se mojó. Si tu cisterna tiene una varilla o un flotador, también sirve. Mide siempre en el mismo punto.</p>
        </details>
        <div className="fila">
          <Campo id="cm" etiqueta="Nivel del agua (cm)"><input id="cm" inputMode="decimal" value={cm} onChange={(x) => setCm(x.target.value)} placeholder={`0 a ${cal.alturaMaxCm}`} /></Campo>
          <Campo id="cuando" etiqueta="¿Cuándo?"><input id="cuando" type="datetime-local" value={cuando} onChange={(x) => setCuando(x.target.value)} /></Campo>
        </div>
        <Campo id="nota-l" etiqueta="Nota (opcional)"><input id="nota-l" value={nota} maxLength={100} onChange={(x) => setNota(x.target.value)} /></Campo>
        <Fallo texto={err} />
        <div className="acciones"><button className="btn" type="button" onClick={agregar}>Guardar lectura</button></div>
      </div>

      <div className="tarjeta">
        <h2>Nivel en el tiempo</h2>
        <Grafica e={e} />
      </div>

      <div className="tarjeta">
        <h2>Medidas de tu cisterna</h2>
        <p>
          Tu cisterna guarda <span className="num">{cal.litrosPorCm}</span> litros por cada centímetro de agua, hasta <span className="num">{cal.alturaMaxCm}</span> cm de altura. Margen de error que aceptas: ±{cal.incertidumbrePct}%. Medida el {new Date(cal.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.
          {cal.nota ? ` ${cal.nota}` : ""}
        </p>
        <Aviso tipo="agua">Los litros se calculan con las medidas de tu cisterna, por eso son aproximados. Si puedes, comprueba una vez cuánta agua entra con una cubeta o un medidor.</Aviso>
        <div className="acciones"><button className="btn sec" type="button" onClick={cambiarCal}>Cambiar calibración u hogares</button></div>
      </div>

      <div className="tarjeta">
        <h2>Últimas lecturas</h2>
        {recientes.length === 0 ? <p>Aún no hay lecturas.</p> : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>Cuándo</th><th className="num">cm</th><th className="num">Litros (est.)</th><th>Origen</th><th></th></tr></thead>
              <tbody>
                {recientes.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtFechaHora(l.ts)}{l.tipo ? <span className="chico"> · {l.tipo === "antes" ? "antes de la pipa" : "después de la pipa"}</span> : null}{l.nota ? <div className="chico">{l.nota}</div> : null}</td>
                    <td className="num">{l.cm}</td>
                    <td className="num">{fmtL(litrosDe(l.cm, cal))}</td>
                    <td>{l.fuente === "simulada" ? <Simulado /> : "manual"}</td>
                    <td>
                      {editando === l.id ? null : <button className="btn sec chico" type="button" onClick={() => { setEditando(l.id); setNuevoCm(String(l.cm)); setErrEd(null); }}>Corregir</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editando && (
          <div className="aviso">
            <strong>Corregir lectura.</strong> La corrección queda anotada; nada se borra en silencio.
            <div className="fila">
              <Campo id="ncm" etiqueta="Nivel correcto (cm)"><input id="ncm" inputMode="decimal" value={nuevoCm} onChange={(x) => setNuevoCm(x.target.value)} /></Campo>
              <Campo id="mot" etiqueta="Motivo"><input id="mot" value={motivo} maxLength={100} onChange={(x) => setMotivo(x.target.value)} /></Campo>
            </div>
            <Fallo texto={errEd} />
            <div className="acciones">
              <button className="btn chico" type="button" onClick={() => corregir(e.lecturas.find((x) => x.id === editando)!)}>Guardar corrección</button>
              <button className="btn sec chico" type="button" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
