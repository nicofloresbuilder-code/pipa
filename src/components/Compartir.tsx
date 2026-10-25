"use client";
import { useState } from "react";
import type { Derivado } from "@/lib/derivar";
import { copiar } from "@/lib/copiar";
import { fechaLocal, textoResumen } from "@/lib/motor";
import type { OpcionesResumen } from "@/lib/motor";
import type { Estado } from "@/lib/tipos";
import { Aviso } from "./ui";

const ETQ: Record<keyof OpcionesResumen, string> = {
  nivel: "Cuánta agua hay ahora",
  ultimaEntrega: "Última pipa: cuánto cobraron y cuánto llegó",
  pronostico: "Aviso de cuándo conviene pedir otra pipa",
  gasto: "Cuánto costó la última pipa",
  cuotas: "Cuántas cuotas van (sin decir quién)",
  lecturasCrudas: "Las últimas 5 medidas que anoté",
};

export default function Compartir({ e, d, ahora }: { e: Estado; d: Derivado; ahora: number }) {
  const [o, setO] = useState<OpcionesResumen>({ nivel: true, ultimaEntrega: true, pronostico: true, gasto: false, cuotas: false, lecturasCrudas: false });
  const [copiado, setCopiado] = useState<boolean | null>(null);
  const texto = textoResumen(e, o, fechaLocal(ahora), d.base);

  return (
    <div>
      <div className="tarjeta agua">
        <h2>Mensaje para tus vecinos</h2>
        <p>Tú decides qué se cuenta. Las lecturas se quedan en este teléfono y solo sale lo que marques aquí, como texto que tú pegas en el grupo. PIPA no manda nada por su cuenta, y no manda nada a proveedores, caseros ni autoridades.</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="oculto-lector">Qué incluir</legend>
          {(Object.keys(ETQ) as (keyof OpcionesResumen)[]).map((k) => (
            <label key={k} className="chk">
              <input type="checkbox" checked={o[k]} onChange={(v) => { setO({ ...o, [k]: v.target.checked }); setCopiado(null); }} />
              {ETQ[k]}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="tarjeta">
        <h2>Vista previa</h2>
        <label htmlFor="prev" className="oculto-lector">Texto del resumen</label>
        <textarea id="prev" readOnly value={texto} rows={texto.split("\n").length + 6} style={{ minHeight: 220 }} />
        <div className="acciones">
          <button className="btn" type="button" onClick={async () => setCopiado(await copiar(texto))}>Copiar resumen</button>
        </div>
        {copiado === true && <p role="status">Copiado. Pégalo en el grupo de la cisterna.</p>}
        {copiado === false && <p className="error" role="alert">No se pudo copiar solo. Selecciona el texto de arriba y cópialo a mano.</p>}
        <Aviso>Revisa el texto antes de pegarlo. No incluye nombres de hogares ni lecturas crudas a menos que lo marques.</Aviso>
      </div>
    </div>
  );
}
