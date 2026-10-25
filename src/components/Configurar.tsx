"use client";
import { useState } from "react";
import { ejemploSimulado } from "@/lib/ejemplo";
import { limpiar, litrosPorCmDe, nuevoId, numero } from "@/lib/motor";
import { cambiar, useEstado } from "@/lib/navegador";
import { copiar } from "@/lib/copiar";
import { fechaLocal } from "@/lib/motor";
import { Aviso, Campo, Fallo } from "./ui";

const FRASE =
  "Oye, ¿me ayudas a llevar el registro de las pipas de la cisterna? Tú solo anotas el nivel antes y después de cada descarga y las cuotas que te den. Nadie se queda sin agua por no pagar a tiempo ni por no usar el celular, y no se comparte nada con la pipa ni con el casero. Si algo no cuadra, lo vemos tú y yo en privado primero.";

export default function Configurar({ alTerminar }: { alTerminar?: () => void }) {
  const e = useEstado();
  const [coord, setCoord] = useState(e.coordinador);
  const [modo, setModo] = useState<"medidas" | "directo">("medidas");
  const [largo, setLargo] = useState("");
  const [ancho, setAncho] = useState("");
  const [lpc, setLpc] = useState(e.cal ? String(e.cal.litrosPorCm) : "");
  const [alto, setAlto] = useState(e.cal ? String(e.cal.alturaMaxCm) : "");
  const [inc, setInc] = useState(e.cal ? String(e.cal.incertidumbrePct) : "5");
  const [nota, setNota] = useState(e.cal?.nota ?? "");
  const [reserva, setReserva] = useState(String(e.reservaPct));
  const [hogares, setHogares] = useState(e.hogares.map((h) => h.nombre).join("\n"));
  const [err, setErr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function guardar() {
    const nombre = limpiar(coord, 40);
    if (nombre.length < 2) return setErr("Escribe el nombre del coordinador (2 a 40 letras). Sin coordinador con nombre no se abren excepciones.");
    let litrosCm: number | null;
    if (modo === "medidas") {
      const l = numero(largo, 0.5, 30);
      const a = numero(ancho, 0.5, 30);
      if (l == null || a == null) return setErr("El largo y el ancho de la cisterna van en metros, entre 0.5 y 30.");
      litrosCm = litrosPorCmDe(l, a);
    } else litrosCm = numero(lpc, 1, 5000);
    if (litrosCm == null) return setErr("Los litros por centímetro deben ser un número entre 1 y 5000.");
    const altura = numero(alto, 20, 400);
    if (altura == null) return setErr("La altura máxima del agua va en centímetros, entre 20 y 400.");
    const incert = numero(inc, 1, 20);
    if (incert == null) return setErr("El error aceptado de la calibración va entre 1 y 20 %.");
    const res = numero(reserva, 5, 50);
    if (res == null) return setErr("El nivel de reserva va entre 5 y 50 % de la capacidad.");
    const nombres = hogares.split("\n").map((x) => limpiar(x, 30)).filter(Boolean);
    if (nombres.length < 1 || nombres.length > 40) return setErr("Anota entre 1 y 40 hogares, uno por línea. Usa apodos o \"Casa 1\"; nada de datos reales.");
    setErr(null);
    cambiar((s) => {
      const previos = new Map(s.hogares.map((h) => [h.nombre, h]));
      return {
        ...s,
        coordinador: nombre,
        reservaPct: res,
        cal: { litrosPorCm: litrosCm!, alturaMaxCm: altura, incertidumbrePct: incert, fecha: fechaLocal(Date.now()), nota: limpiar(nota, 120) },
        hogares: nombres.map((n) => previos.get(n) ?? { id: nuevoId(), nombre: n, parte: 1, efectivo: false }),
      };
    });
    alTerminar?.();
  }

  return (
    <div>
      <div className="tarjeta agua">
        <h2>Día 1: ¿quién es el usuario 1?</h2>
        <p>
          El usuario 1 es <strong>una persona con nombre</strong> que ya hace este trabajo a mano: el coordinador de la cisterna. Ella o él mide (o designa a un testigo), anota las cuotas y recibe las
          excepciones. Sin ese nombre, PIPA no abre ninguna excepción.
        </p>
        <details>
          <summary>Frase para pedirle a un vecino que sea el coordinador</summary>
          <p className="mono chico" style={{ whiteSpace: "pre-wrap" }}>{FRASE}</p>
          <button className="btn sec chico" type="button" onClick={async () => { setCopiado(await copiar(FRASE)); }}>
            {copiado ? "Copiada" : "Copiar frase"}
          </button>
        </details>
      </div>

      <div className="tarjeta">
        <h2>{e.cal ? "Calibración y hogares" : "Armar la cisterna"}</h2>
        <Aviso>Esta app guarda todo en tu teléfono. No pidas ni escribas datos reales de personas: usa apodos.</Aviso>
        <Campo id="coord" etiqueta="Coordinador (nombre o apodo)">
          <input id="coord" value={coord} maxLength={40} onChange={(x) => setCoord(x.target.value)} autoComplete="off" />
        </Campo>

        <label htmlFor="modo">¿Cómo calibramos la cisterna?</label>
        <select id="modo" value={modo} onChange={(x) => setModo(x.target.value as "medidas" | "directo")}>
          <option value="medidas">Tengo el largo y el ancho (cisterna rectangular)</option>
          <option value="directo">Ya sé cuántos litros entran por cada centímetro</option>
        </select>
        {modo === "medidas" ? (
          <div className="fila">
            <Campo id="largo" etiqueta="Largo (m)"><input id="largo" inputMode="decimal" value={largo} onChange={(x) => setLargo(x.target.value)} placeholder="4" /></Campo>
            <Campo id="ancho" etiqueta="Ancho (m)"><input id="ancho" inputMode="decimal" value={ancho} onChange={(x) => setAncho(x.target.value)} placeholder="2.5" /></Campo>
          </div>
        ) : (
          <Campo id="lpc" etiqueta="Litros por cada cm de altura"><input id="lpc" inputMode="decimal" value={lpc} onChange={(x) => setLpc(x.target.value)} placeholder="100" /></Campo>
        )}
        <div className="fila">
          <Campo id="alto" etiqueta="Altura máxima del agua (cm)"><input id="alto" inputMode="decimal" value={alto} onChange={(x) => setAlto(x.target.value)} placeholder="130" /></Campo>
          <Campo id="inc" etiqueta="Error aceptado (%)" ayuda="Qué tanto te fías de la calibración."><input id="inc" inputMode="decimal" value={inc} onChange={(x) => setInc(x.target.value)} /></Campo>
          <Campo id="res" etiqueta="Reserva mínima (%)" ayuda="Aviso cuando el nivel se acerque."><input id="res" inputMode="decimal" value={reserva} onChange={(x) => setReserva(x.target.value)} /></Campo>
        </div>
        <Campo id="nota" etiqueta="Nota de calibración (opcional)"><input id="nota" value={nota} maxLength={120} onChange={(x) => setNota(x.target.value)} placeholder="Medí con cinta el 20 de octubre" /></Campo>

        <Campo id="hog" etiqueta="Hogares (uno por línea)">
          <textarea id="hog" value={hogares} onChange={(x) => setHogares(x.target.value)} placeholder={"Casa 1\nCasa 2\nCasa 3"} />
        </Campo>
        <Fallo texto={err} />
        <div className="acciones">
          <button className="btn" type="button" onClick={guardar}>Guardar</button>
          {!e.cal && (
            <button
              className="btn sec"
              type="button"
              onClick={() => {
                cambiar((s) => ejemploSimulado(Date.now(), s.coordinador));
                alTerminar?.();
              }}
            >
              Cargar ejemplo simulado (21 días)
            </button>
          )}
        </div>
        {!e.cal && <p className="chico">El ejemplo simulado llena todo con datos inventados y los marca como simulados; sirve para probar sin esperar tres semanas.</p>}
      </div>
    </div>
  );
}
