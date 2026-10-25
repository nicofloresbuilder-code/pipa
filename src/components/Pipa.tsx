"use client";
import { useState } from "react";
import Link from "next/link";
import { derivar } from "@/lib/derivar";
import { borrarTodo, useEstado, useReloj, usaGuardado } from "@/lib/navegador";
import Compartir from "./Compartir";
import Configurar from "./Configurar";
import Dinero from "./Dinero";
import Entregas from "./Entregas";
import Excepciones from "./Excepciones";
import Hoy from "./Hoy";
import Tanque from "./Tanque";
import { Aviso, Simulado } from "./ui";

const TABS = [
  ["hoy", "Hoy"],
  ["tanque", "Tanque"],
  ["entregas", "Entregas"],
  ["excepciones", "Excepciones"],
  ["dinero", "Dinero"],
  ["compartir", "Compartir"],
] as const;

export default function Pipa() {
  const e = useEstado();
  const ahora = useReloj();
  const [tab, setTab] = useState<string>("hoy");
  const [seguro, setSeguro] = useState(false);
  const d = derivar(e, ahora);
  const listo = Boolean(e.cal && e.coordinador);

  return (
    <div className="marco">
      <header className="cabecera">
        <h1 className="marca">PI<span>PA</span></h1>
        <span className="lema">El cuaderno compartido de la cisterna · en tu teléfono</span>
        {e.simulado && <Simulado texto="Datos simulados" />}
      </header>

      {!usaGuardado() && <Aviso>Este navegador no deja guardar datos. PIPA funciona, pero al cerrar la pestaña se pierde todo. Usa un resumen copiado para conservarlo.</Aviso>}

      {listo ? (
        <>
          <nav className="nav" aria-label="Secciones">
            {TABS.map(([k, t]) => (
              <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>
                {t}
                {k === "excepciones" && d.abiertas > 0 && <span className="punto" aria-label={`${d.abiertas} pendientes`}>{d.abiertas}</span>}
              </button>
            ))}
          </nav>
          <main id="contenido">
            {tab === "hoy" && <Hoy e={e} d={d} ahora={ahora} ir={setTab} />}
            {tab === "tanque" && <Tanque e={e} cambiarCal={() => setTab("config")} />}
            {tab === "entregas" && <Entregas e={e} d={d} />}
            {tab === "excepciones" && <Excepciones e={e} d={d} ahora={ahora} />}
            {tab === "dinero" && <Dinero e={e} />}
            {tab === "compartir" && <Compartir e={e} d={d} ahora={ahora} />}
            {tab === "config" && <Configurar alTerminar={() => setTab("hoy")} />}
          </main>
        </>
      ) : (
        <main id="contenido">
          <Configurar />
        </main>
      )}

      <footer className="pie">
        <p>
          PIPA es un prototipo de clase (Business Bending, semana 11). Registra litros y cuotas; no garantiza que una entrega sea correcta ni acusa a nadie. Todo se guarda solo en este teléfono.{" "}
          <Link href="/condiciones">Cómo cumple las condiciones del Blueprint</Link>
        </p>
        {!seguro ? (
          <button className="btn sec chico" type="button" onClick={() => setSeguro(true)}>Borrar todos mis datos de este teléfono</button>
        ) : (
          <div className="aviso alerta">
            Se borra todo lo guardado aquí y no se puede deshacer.
            <div className="acciones">
              <button className="btn chico" type="button" onClick={() => { borrarTodo(); setSeguro(false); setTab("hoy"); }}>Sí, borrar todo</button>
              <button className="btn sec chico" type="button" onClick={() => setSeguro(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
