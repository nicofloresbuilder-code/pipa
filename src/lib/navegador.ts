"use client";
/* Solo navegador: el estado vive en localStorage (condición 1 del Blueprint: nada personal en el servidor).
   Si el navegador no deja guardar, la app sigue funcionando en memoria y lo avisa. */

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Estado } from "./tipos";
import { ESTADO_VACIO } from "./tipos";

const CLAVE = "pipa.v1";
let cache: Estado | null = null;
let guardadoOk = true;
const oyentes = new Set<() => void>();

function valido(x: unknown): x is Estado {
  const e = x as Estado;
  return Boolean(e) && e.version === 1 && Array.isArray(e.hogares) && Array.isArray(e.lecturas) && Array.isArray(e.entregas) && Array.isArray(e.excepciones) && Array.isArray(e.cuotas) && Array.isArray(e.cotizaciones);
}

function cargar(): Estado {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v) {
      const j = JSON.parse(v);
      if (valido(j)) return j;
    }
  } catch {
    guardadoOk = false;
  }
  return ESTADO_VACIO;
}

export function getEstado(): Estado {
  if (!cache) cache = cargar();
  return cache;
}

export function cambiar(fn: (e: Estado) => Estado) {
  cache = fn(getEstado());
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cache));
    guardadoOk = true;
  } catch {
    guardadoOk = false;
  }
  oyentes.forEach((f) => f());
}

export function borrarTodo() {
  cache = ESTADO_VACIO;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
  oyentes.forEach((f) => f());
}

export function usaGuardado(): boolean {
  return guardadoOk;
}

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => oyentes.delete(f);
};

export function useEstado(): Estado {
  return useSyncExternalStore(suscribir, getEstado, () => ESTADO_VACIO);
}

/** Reloj que se actualiza cada minuto (para "hace X horas" sin llamar a Date.now() en el render). */
export function useReloj(): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

/** Hora actual en formato datetime-local, para llenar campos al abrir un formulario. */
export function horaLocalTexto(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function horaDeTexto(v: string): number | null {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}
