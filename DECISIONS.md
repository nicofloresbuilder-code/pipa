# DECISIONS: PIPA

*Semana 11 de AI 2041, capítulo 10 ("Dreaming of Plenitude"). Rol: OPERATOR. Rebanada del Blueprint: "reclutar un coordinador, mapear una entrega y asignar el manejo de excepciones". El vacío primario que eligió el equipo es HERRAMIENTAS DE AGUA DEL HOGAR (pipa entre vecinos). Mi preferencia como Operator (registro de pepenadores) quedó como disenso preservado en el Blueprint, y aquí cumplo lo que se acordó.*

## Decisiones

1. **El usuario 1 es una persona con nombre, no "el comité".** La app no abre hasta que alguien pone su nombre como coordinador. Cada revisión queda a cargo de ese nombre (condición 4).
2. **El mapa de una entrega es el producto del Operator.** Siete pasos, cada uno con un responsable; el chofer aparece pero no usa la app ni recibe datos.
3. **Todo vive en el teléfono.** `localStorage` con try/catch; sin servidor de datos, sin cuentas y sin Supabase. Esto cumple la condición 1 y el piso de seguridad sin necesidad de auth ni RLS. Si el navegador no deja guardar, la app sigue en memoria y lo avisa.
4. **Tres litros distintos, siempre separados:** cotizados (lo que dijo el proveedor), observados (después menos antes, con la calibración) y estimados (el consumo durante la descarga). La confirmación del teléfono no cuenta como prueba (condición 3).
5. **El margen suma tres errores:** calibración (% aceptado), lectura de la regla (medio centímetro en cada lectura) y consumo estimado. Si la diferencia pasa del margen, hay "diferencia por revisar". Nunca se escribe "robo" ni "fraude".
6. **Sin historial no hay promesa.** Con menos de 7 días completos de lecturas no hay pronóstico y el margen se amplía. Un día solo cuenta con 20 horas o más de cobertura, y se excluyen la descarga, los huecos mayores de 36 horas y las subidas sin entrega registrada.
7. **El ML es asesor y se mide contra una línea base.** Regresión con tendencia y fin de semana contra el promedio, con prueba hacia atrás. Solo se usa si le gana por más de 5%; si no, se usa el promedio y se dice (condición 6). Nunca estima la llegada de la pipa.
8. **El dinero se registra, no se guarda.** Las cuotas se reparten en centavos enteros para que la suma sea exacta. "Por confirmar" es un estado neutro: sin colores de alarma, sin lista de deudores, sin recordatorios, y el efectivo cuenta igual (cláusula de sombra).
9. **Sin directorio de proveedores.** El comparador de cotizaciones solo compara lo que el coordinador anota. Se ordena por precio por 1,000 litros.
10. **Se puede anotar una pipa sin medir antes,** pero la app dice claramente que así no se puede saber cuántos litros llegaron. Surgió de la persona de prueba: la pipa ya había llegado.
11. **El resumen para los vecinos lo arma el coordinador casilla por casilla.** Por defecto no lleva nombres de hogares ni lecturas crudas. Se copia como texto: PIPA no manda nada por su cuenta, y no pone datos en una URL.
12. **Las excepciones se llaman "revisiones" en pantalla.** La persona de prueba no entendía "excepción". En el código y en el Blueprint siguen siendo excepciones.
13. **Los datos de ejemplo son simulados y se marcan** con una insignia en cada pantalla y en el texto compartido. Los datos son inventados (casas 1 a 8, una coordinadora "de ejemplo").
14. **No hay IA generativa en esta rebanada.** El stack del Dragon (sensing + ML + marketplace) se cumple con lectura manual más alimentación simulada, regresión propia y comparador de cotizaciones. Sin llaves, sin secretos y sin llamadas a terceros.

## Bugs

| Bug | Cómo se encontró | Arreglo |
|---|---|---|
| El resumen de la excepción decía "10000 L" sin separador de miles | Pase mecánico y captura en celular | `fmtNum` en todos los textos que se guardan |
| La autoprueba de "ruido puro" tenía datos con patrón de fin de semana y la regresión ganó | Autoprueba | El error estaba en la prueba, no en el motor: se usó ruido sin patrón |
| La autoprueba de palabras de acusación atrapó "aprobó" por contener "rob" | Autoprueba | La expresión usa palabras completas |
| Un servidor de pruebas viejo seguía en el puerto con otra versión y respondía 500 | Pase mecánico | Se mata por número de proceso; `pkill -x next-server` no coincidía con el nombre real |
| Los botones "La pipa no llegó" y "No descargó" estaban pegados al botón principal | Persona ronda 1 | Quedaron separados y piden confirmación |
| Pantalla de excepciones con cinco botones y una tabla: la persona se rendía | Persona ronda 1 | Una acción principal; lo demás en "Más opciones" |
| Resultado con "±980 L" sin explicación | Persona ronda 3 | Desglose del margen en tres partes |
| Tabla de cuotas cortada en celular | Persona ronda 2 | Tarjetas por casa |
| Persona test, 3 rondas: 25, 32 y 21 confusiones | `docs/PERSONA.md` | La mayoría arregladas; límites conocidos en ese documento |

## Deploys

1. **Deploy 1:** repositorio en GitHub (`nicofloresbuilder-code/pipa`), importado a Vercel (equipo dime5, proyecto `pipa`) desde el commit 26f4704. En vivo en https://pipa-dime5.vercel.app. Revisé con el ejemplo simulado: nivel 44 %, aviso de reserva en 2.8 a 3 días.
2. **Deploy 2:** este commit (documentos finales y registro de deploys). Vercel redespliega solo con cada push a `main`.

Nota: `pipa.vercel.app` ya pertenece a otra cuenta, por eso la dirección es `pipa-dime5.vercel.app`.

## Lo que no se construyó

Cuentas y base de datos; sensores físicos reales (el sensor es el celular más una alimentación simulada); integración con Sacmex, alcaldías o proveedores; directorio de proveedores; cobro o retención de dinero; calificaciones de vecinos; auditoría de contratos públicos (extensión posterior con otros candados); hoja de costo total de MONEY (la condición 5 queda pendiente de ese insumo); prueba con una coordinadora real.

## Cierre de sesión

- **Sesión 1:** packet, motor (66 aserciones), seis pantallas, pase mecánico (63 comprobaciones en celular), tres rondas de persona sintética.
- **Primer paso de mañana:** una prueba real con una coordinadora, en su teléfono y con una pipa de verdad, y llenar la hoja de costo total con el insumo de MONEY.
