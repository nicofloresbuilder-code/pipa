import Link from "next/link";

const FILAS: [string, string, string][] = [
  ["1. Los residentes controlan lo que se comparte", "Las lecturas viven en localStorage del teléfono; no hay servidor que guarde datos. Lo único que sale es un texto que el coordinador aprueba casilla por casilla en «Compartir». Nada va a proveedores, caseros ni autoridades.", "Se probó que el resumen no trae nombres ni lecturas crudas por defecto (autoprueba) y que la app no hace llamadas de red con datos."],
  ["2. Cláusula de sombra", "No hay puntajes, ni lista de deudores, ni bloqueo de agua. Las cuotas se ven por entrega y solo en el teléfono del coordinador; el estado es «por confirmar», sin colores de alarma. Hogares en efectivo cuentan igual. Las correcciones son privadas y quedan anotadas.", "Autoprueba: el texto compartido no usa palabras de acusación. Revisión manual de las pantallas de Dinero y Excepciones."],
  ["3. Litros cotizados, observados y estimados", "Cada entrega muestra las tres cifras por separado, con la calibración, la hora y el consumo estimado durante la descarga. El margen suma error de calibración, error de lectura y error del consumo. La app nunca dice «robo»: dice «diferencia por revisar». La confirmación del teléfono no se presenta como prueba.", "Autoprueba: margen, diferencia y casos dentro y fuera del margen."],
  ["4. Una persona con nombre atiende las diferencias", "Sin coordinador no se abre la app. Cada excepción lleva su nombre, un primer paso y un plazo. No hay directorio de proveedores, ni integración municipal, ni retención de pagos: el dinero se registra, no se guarda.", "Probado en el pase mecánico: sin coordinador no hay acceso a Entregas."],
  ["5. Costo total frente a lo que ya existe", "El comparador de cotizaciones muestra el precio por m³ y lo compara con lo que ya se pagó. Falta todavía medir el costo total real (equipo, instalación, soporte y tiempo del coordinador): ver DECISIONS.md. El caso ilustrativo 3:1 de MONEY no se usa como resultado.", "Pendiente de la hoja de costos de MONEY."],
  ["6. Lo simulado se etiqueta; el ML es asesor", "Los 21 días de ejemplo llevan la insignia «Simulado» en cada pantalla y en el texto compartido. El pronóstico se compara con una línea base (el promedio) en una prueba hacia atrás, y si no le gana, se usa el promedio. Con menos de 7 días completos no hay pronóstico, y nunca se promete la llegada de la pipa.", "Autoprueba: con 6 días no hay pronóstico; con ruido puro se usa la línea base; con tendencia gana la regresión."],
];

export const metadata = { title: "Condiciones del Blueprint · PIPA" };

export default function Condiciones() {
  return (
    <div className="marco">
      <header className="cabecera"><h1 className="marca">PI<span>PA</span></h1><span className="lema">Condiciones del Blueprint del equipo</span></header>
      <p><Link href="/">← Volver a la app</Link></p>
      <p>Esta es mi rebanada como OPERATOR: reclutar un coordinador, mapear una entrega y asignar el manejo de excepciones. Así cumple cada condición del Blueprint de la semana 11 y cómo se comprobó.</p>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Condición</th><th>Cómo se cumple</th><th>Cómo se comprobó</th></tr></thead>
          <tbody>{FILAS.map(([a, b, c]) => <tr key={a}><td><strong>{a}</strong></td><td>{b}</td><td>{c}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="tarjeta ambar">
        <h2>Lo que PIPA no es</h2>
        <p>No audita contratos públicos (extensión posterior, con otros candados). No prueba que una entrega fue robada ni que no lo fue. No sustituye hablar con el proveedor.</p>
      </div>
    </div>
  );
}
