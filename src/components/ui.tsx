import type { ReactNode } from "react";

export const fmtL = (n: number) => `${Math.round(n).toLocaleString("es-MX")} L`;
export const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const fmtFechaHora = (ts: number) =>
  new Date(ts).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Simulado({ texto = "Simulado" }: { texto?: string }) {
  return <span className="insignia" title="Datos inventados para probar la app">{texto}</span>;
}

export function Aviso({ children, tipo = "" }: { children: ReactNode; tipo?: "" | "agua" | "alerta" }) {
  return <div className={`aviso ${tipo}`} role="note">{children}</div>;
}

export function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {ayuda ? <div className="chico">{ayuda}</div> : null}
    </div>
  );
}

export function Fallo({ texto }: { texto: string | null }) {
  return texto ? <p className="error" role="alert">{texto}</p> : null;
}

export function hace(ts: number, ahora: number): string {
  const h = Math.max(0, (ahora - ts) / 3_600_000);
  if (h < 1) return "hace menos de 1 hora";
  if (h < 48) return `hace ${Math.round(h)} h`;
  return `hace ${Math.round(h / 24)} días`;
}
