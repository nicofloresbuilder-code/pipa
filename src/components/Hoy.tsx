"use client";
import { litrosDe, medirEntrega } from "@/lib/motor";
import type { Derivado } from "@/lib/derivar";
import type { Estado } from "@/lib/tipos";
import { Aviso, Simulado, fmtL, fmtMXN, hace } from "./ui";

export default function Hoy({ e, d, ahora, ir }: { e: Estado; d: Derivado; ahora: number; ir: (t: string) => void }) {
  if (!e.cal) return null;
  const n = d.nivel;
  const reservaPct = e.reservaPct;
  const abierta = e.excepciones.find((x) => x.estado === "abierta" || x.estado === "en_revision");
  const enCurso = e.entregas.find((x) => x.estado === "pedida" || x.estado === "midio_antes");
  const ultima = [...e.entregas].filter((x) => x.estado === "cerrada").sort((a, b) => b.ts - a.ts)[0];
  const mUltima = ultima ? medirEntrega(ultima, e.cal, d.base) : null;
  const pron = d.pron;

  return (
    <div>
      <div className="tarjeta agua">
        <h2>
          Nivel del tanque {e.simulado && <Simulado />}
        </h2>
        {n ? (
          <>
            <div className="rejilla">
              <div className="dato"><div className="v">{n.pct}%</div><div className="e">de la capacidad ({fmtL(d.capacidad)})</div></div>
              <div className="dato"><div className="v">{fmtL(n.litros)}</div><div className="e">estimado con la calibración (±{e.cal.incertidumbrePct}%)</div></div>
              <div className="dato"><div className="v">{n.cm} cm</div><div className="e">última lectura, {hace(n.ts, ahora)}</div></div>
            </div>
            <div className="tanque" role="img" aria-label={`Tanque al ${n.pct} por ciento; reserva mínima al ${reservaPct} por ciento`} style={{ marginTop: 12 }}>
              <i style={{ width: `${Math.min(100, n.pct)}%` }} />
              <b style={{ left: `${reservaPct}%` }} title="Reserva mínima" />
            </div>
            <p className="chico">La línea roja es tu reserva mínima ({reservaPct}%).</p>
          </>
        ) : (
          <p>Todavía no hay lecturas. Anota el nivel del tanque para empezar.</p>
        )}
        <div className="acciones">
          <button className="btn" type="button" onClick={() => ir("tanque")}>Anotar nivel</button>
        </div>
      </div>

      <div className="tarjeta">
        <h2>¿Cuándo pedir pipa? <span className="insignia agua">Asesor</span></h2>
        {pron?.tipo === "ok" ? (
          <>
            <p>
              Al ritmo actual, el tanque llegaría a la reserva en <strong className="num">{pron.diasMin}–{pron.diasMax} días</strong> (mejor estimación: {pron.diasHastaReserva}).
            </p>
            <Aviso>
              Esto <strong>no</strong> dice cuándo llega la pipa. Solo dice cuándo conviene pedirla. Modelo: {pron.modelo === "regresion" ? "regresión (tendencia y fin de semana)" : "promedio simple (línea base)"} sobre {pron.dias} días.
            </Aviso>
            <details>
              <summary>Cómo se comprobó el modelo</summary>
              <p className="chico">
                {pron.motivo} Error medio al predecir el día siguiente (prueba hacia atrás): línea base {pron.maeBase ?? "—"} L/día
                {pron.maeModelo != null ? `, regresión ${pron.maeModelo} L/día` : ", regresión sin probar"}. El modelo solo se usa si le gana a la línea base por más de 5%.
              </p>
            </details>
          </>
        ) : pron?.tipo === "sin_historial" ? (
          <Aviso tipo="agua">
            Todavía no hay historial para estimar el consumo: tienes <strong>{pron.dias}</strong> días completos con lecturas y se necesitan 7 (faltan {pron.faltan}). Mientras tanto <strong>no se promete ningún pronóstico</strong>. Anota el nivel
            unas 3 o 4 veces al día, o al menos cada mañana y noche.
          </Aviso>
        ) : (
          <p className="chico">Sin lecturas todavía.</p>
        )}
        {d.subidasSinEntrega > 0 && (
          <Aviso>Hay {d.subidasSinEntrega} lectura(s) donde el nivel subió sin una entrega registrada. Se dejaron fuera del consumo. ¿Se te pasó anotar una pipa?</Aviso>
        )}
      </div>

      {abierta ? (
        <div className="tarjeta alerta">
          <h2>Excepción pendiente</h2>
          <p>{abierta.resumen}</p>
          <p className="chico">A cargo de {abierta.responsable} · {hace(abierta.ts, ahora)}</p>
          <div className="acciones"><button className="btn" type="button" onClick={() => ir("excepciones")}>Ver excepciones</button></div>
        </div>
      ) : null}

      <div className="tarjeta">
        <h2>Entregas</h2>
        {enCurso ? (
          <p>
            Hay una entrega en curso ({enCurso.proveedor}): {enCurso.estado === "pedida" ? "falta medir el nivel antes de la descarga." : "falta medir el nivel después de la descarga."}
          </p>
        ) : ultima && mUltima ? (
          <p>
            Última entrega: cotizados <strong className="num">{fmtL(ultima.litrosCotizados)}</strong>, observados <strong className="num">{fmtL(mUltima.observados)}</strong>.{" "}
            {mUltima.fuera ? <span className="insignia alerta">Diferencia por revisar</span> : <span className="insignia ok">Dentro del margen</span>} Costo: {fmtMXN(ultima.precioTotal)}.
          </p>
        ) : (
          <p>No hay entregas registradas.</p>
        )}
        <div className="acciones"><button className="btn sec" type="button" onClick={() => ir("entregas")}>Ir a entregas</button></div>
      </div>
      <p className="chico">Litros de ejemplo: {n ? fmtL(litrosDe(1, e.cal)) : fmtL(e.cal.litrosPorCm)} por cada centímetro de agua.</p>
    </div>
  );
}
