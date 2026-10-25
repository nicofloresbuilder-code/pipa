"use client";
import { useState } from "react";
import { limpiar, nuevoId, nombreHogar, numero, ordenarCotizaciones, precioPromedioHistorico, repartir } from "@/lib/motor";
import { cambiar } from "@/lib/navegador";
import type { Cuota, Estado } from "@/lib/tipos";
import { Aviso, Campo, Fallo, Simulado, fmtFechaHora, fmtL, fmtMXN } from "./ui";

export default function Dinero({ e }: { e: Estado }) {
  const [etq, setEtq] = useState("");
  const [lit, setLit] = useState("");
  const [pre, setPre] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const entregas = [...e.entregas].filter((x) => x.estado === "cerrada").sort((a, b) => b.ts - a.ts);
  const cot = ordenarCotizaciones(e.cotizaciones);
  const hist = precioPromedioHistorico(e.entregas);

  function agregarCot() {
    const t = limpiar(etq, 30);
    const l = numero(lit, 500, 50000);
    const p = numero(pre, 1, 100000);
    if (e.cotizaciones.length >= 6) return setErr("Máximo 6 cotizaciones a la vez; borra alguna.");
    if (t.length < 2) return setErr("Ponle una etiqueta (\"Pipa A\").");
    if (l == null) return setErr("Los litros van entre 500 y 50,000.");
    if (p == null) return setErr("El precio va entre $1 y $100,000.");
    setErr(null);
    cambiar((s) => ({ ...s, cotizaciones: [...s.cotizaciones, { id: nuevoId(), etiqueta: t, litros: l, precio: p }] }));
    setEtq(""); setLit(""); setPre("");
  }

  const confirmar = (c: Cuota) => cambiar((s) => ({ ...s, cuotas: s.cuotas.map((q) => (q.id === c.id ? { ...q, confirmada: !q.confirmada } : q)) }));
  const metodo = (c: Cuota, m: Cuota["metodo"]) => cambiar((s) => ({ ...s, cuotas: s.cuotas.map((q) => (q.id === c.id ? { ...q, metodo: m } : q)) }));
  const generar = (id: string, total: number) =>
    cambiar((s) => ({
      ...s,
      cuotas: [...s.cuotas, ...repartir(total, s.hogares).map((r) => ({ id: nuevoId(), entregaId: id, hogarId: r.hogarId, monto: r.monto, metodo: (s.hogares.find((h) => h.id === r.hogarId)?.efectivo ? "efectivo" : "transferencia") as Cuota["metodo"], confirmada: false }))],
    }));
  const hogar = (id: string, cambio: Partial<{ parte: number; efectivo: boolean }>) => cambiar((s) => ({ ...s, hogares: s.hogares.map((h) => (h.id === id ? { ...h, ...cambio } : h)) }));

  return (
    <div>
      <div className="tarjeta ambar">
        <h2>El dinero se registra, no se guarda</h2>
        <p>PIPA no cobra, no retiene y no manda recordatorios. Solo anota quién dio qué. El efectivo cuenta igual que la transferencia, y <strong>nadie se queda sin agua por una cuota pendiente</strong>. No hay lista de deudores: cada cuota solo se ve aquí, en este teléfono.</p>
      </div>

      <div className="tarjeta">
        <h2>Cuotas por entrega {e.simulado && <Simulado />}</h2>
        {entregas.length === 0 ? <p>Cuando cierres una entrega aparecen las cuotas.</p> : entregas.map((x) => {
          const cs = e.cuotas.filter((c) => c.entregaId === x.id);
          const ok = cs.filter((c) => c.confirmada);
          const suma = cs.reduce((s, c) => s + c.monto, 0);
          return (
            <details key={x.id} open={entregas[0].id === x.id}>
              <summary>{x.proveedor} · {fmtFechaHora(x.ts)} · {fmtMXN(x.precioTotal)} · {cs.length ? `${ok.length} de ${cs.length} confirmadas` : "sin cuotas"}</summary>
              {cs.length === 0 ? (
                x.precioTotal > 0 && e.hogares.length > 0 ? <div className="acciones"><button className="btn sec chico" type="button" onClick={() => generar(x.id, x.precioTotal)}>Calcular cuotas</button></div> : <p className="chico">Sin precio o sin hogares.</p>
              ) : (
                <div className="tabla-scroll">
                  <table>
                    <thead><tr><th>Hogar</th><th className="num">Cuota</th><th>Cómo</th><th>Estado</th></tr></thead>
                    <tbody>
                      {cs.map((c) => (
                        <tr key={c.id}>
                          <td>{nombreHogar(e, c.hogarId)}</td>
                          <td className="num">{fmtMXN(c.monto)}</td>
                          <td>
                            <select aria-label={`Método de ${nombreHogar(e, c.hogarId)}`} value={c.metodo} onChange={(v) => metodo(c, v.target.value as Cuota["metodo"])} style={{ minHeight: 36, padding: "4px 6px" }}>
                              <option value="efectivo">Efectivo</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="otro">Otro</option>
                            </select>
                          </td>
                          <td><button className="btn sec chico" type="button" aria-pressed={c.confirmada} onClick={() => confirmar(c)}>{c.confirmada ? "Confirmada" : "Por confirmar"}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="chico">Suma de cuotas: {fmtMXN(Math.round(suma * 100) / 100)} de {fmtMXN(x.precioTotal)}.</p>
                </div>
              )}
            </details>
          );
        })}
      </div>

      <div className="tarjeta">
        <h2>Hogares</h2>
        <p className="chico">La parte cambia cómo se reparte la cuota de las <em>próximas</em> entregas. Marca &quot;efectivo&quot; para quien participa sin celular o sin transferencia.</p>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Hogar</th><th>Parte</th><th>Efectivo</th></tr></thead>
            <tbody>
              {e.hogares.map((h) => (
                <tr key={h.id}>
                  <td>{h.nombre}</td>
                  <td><input aria-label={`Parte de ${h.nombre}`} type="number" min={0.5} max={5} step={0.5} value={h.parte} onChange={(v) => { const n = numero(v.target.value, 0.5, 5); if (n != null) hogar(h.id, { parte: n }); }} style={{ width: 90, minHeight: 36 }} /></td>
                  <td><input aria-label={`Efectivo: ${h.nombre}`} type="checkbox" checked={h.efectivo} onChange={(v) => hogar(h.id, { efectivo: v.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tarjeta">
        <h2>Comparar cotizaciones</h2>
        <Aviso tipo="agua">PIPA no tiene directorio de proveedores ni los recomienda. Compara <strong>lo que tú capturas</strong> que te dijeron. El precio de lista y el que pagas al final pueden diferir.</Aviso>
        <div className="fila">
          <Campo id="ce" etiqueta="Etiqueta"><input id="ce" value={etq} maxLength={30} onChange={(v) => setEtq(v.target.value)} placeholder="Pipa C" /></Campo>
          <Campo id="cl" etiqueta="Litros"><input id="cl" inputMode="numeric" value={lit} onChange={(v) => setLit(v.target.value)} placeholder="10000" /></Campo>
          <Campo id="cp" etiqueta="Precio total ($)"><input id="cp" inputMode="decimal" value={pre} onChange={(v) => setPre(v.target.value)} placeholder="2200" /></Campo>
        </div>
        <Fallo texto={err} />
        <div className="acciones"><button className="btn" type="button" onClick={agregarCot}>Agregar</button></div>
        {cot.length > 0 && (
          <div className="tabla-scroll" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Etiqueta</th><th className="num">Litros</th><th className="num">Precio</th><th className="num">$ por m³</th><th></th></tr></thead>
              <tbody>
                {cot.map((c, i) => (
                  <tr key={c.id}>
                    <td>{c.etiqueta} {i === 0 && cot.length > 1 && <span className="insignia ok">Menor $ por m³</span>}</td>
                    <td className="num">{fmtL(c.litros)}</td>
                    <td className="num">{fmtMXN(c.precio)}</td>
                    <td className="num">{fmtMXN(c.porM3)}</td>
                    <td><button className="btn sec chico" type="button" aria-label={`Quitar ${c.etiqueta}`} onClick={() => cambiar((s) => ({ ...s, cotizaciones: s.cotizaciones.filter((q) => q.id !== c.id) }))}>Quitar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hist != null && <p className="chico">Referencia: en tus entregas cerradas pagaron en promedio {fmtMXN(hist)} por m³ (según lo cotizado, no lo observado).</p>}
      </div>
    </div>
  );
}
