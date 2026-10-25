# PERSONA TEST: Doña Chela y PIPA

*Semana 11, OPERATOR. Tres rondas con un usuario sintético. Es una prueba hecha por una IA que lee capturas, no una persona real: sirve para encontrar dónde se tropieza alguien así antes de arriesgar a una persona de verdad.*

## Quién es la persona sintética

**Doña Chela, 58 años**, vive en un edificio de 8 casas con una cisterna compartida en la Ciudad de México. Vende tamales por la mañana. Usa WhatsApp todos los días pero desconfía de las apps nuevas ("seguro me quieren cobrar o sacar mis datos"). Lee despacio, no le gustan las palabras técnicas y se rinde en silencio cuando algo no se entiende (cierra la pantalla y le llama a su sobrino). Los vecinos la nombraron coordinadora de la cisterna "porque siempre ha llevado las cuentas".

**Su tarea:** hoy llegó una pipa de 10,000 litros. Quiere (1) anotarla y (2) saber si dejó los litros que le cobraron.

**Cómo se hizo:** un chat nuevo recibió solo la persona y la tarea, más 11 capturas del celular (390 px) en el orden en que ella las vería. Narró cada pantalla en primera persona y entregó una lista de confusiones con gravedad. Cada ronda usó un agente nuevo y capturas hechas con una versión distinta de la app. Los datos de las capturas son inventados.

## Ronda 1

**Resultado:** 25 confusiones, 5 de gravedad ALTA. Casi se rinde en la primera pantalla y se rinde de verdad en la pantalla de excepciones. No supo si le llegaron los litros que cobraron.

| Gravedad ALTA | Qué pasó | Qué se hizo |
|---|---|---|
| "¿quién es el usuario 1?" | Jerga de sistemas; casi cierra | Se cambió por "¿quién lleva las cuentas de la cisterna?" y se explicó con palabras de ella |
| Pantalla de excepciones | Tabla de tipos y plazos, cinco botones; cierra sin tocar nada | Una sola acción principal ("Ya lo revisé"), el resto en "Más opciones", y la tabla plegada |
| Resultado de la pipa | "1,200 L (margen ±980 L)" sin un sí o un no | Primera frase grande: "Te cobraron 10,000 L y llegaron cerca de 8,800 L. Faltaron cerca de 1,200 L" |
| "Se abrió una excepción a nombre de Doña Chela" en rojo | Lo leyó como acusación contra ella | "Se abrió una revisión a cargo de ella: te toca volver a medir. No es una acusación a nadie" |
| Nivel "18%" tras recibir la pipa | Era un artefacto de mi guion (hora de la lectura) | No era un fallo de la app; se corrigió el guion. Se agregó un botón grande "Anotar una pipa" en Hoy |

También se corrigió: la palabra "Asesor" (ahora "Aviso"), "El celular es el sensor" (ahora "tú mides con la regla"), la línea "Litros de ejemplo", "excepciones" en el menú (ahora "Revisiones"), botones de cancelar pegados al botón principal (ahora piden confirmación) y "calibración" en varios textos.

## Ronda 2

**Resultado:** 32 confusiones, 9 de gravedad ALTA. Entendió más (que le llegaron unos 8,800 litros), pero aparecieron problemas nuevos.

| Gravedad ALTA | Qué se hizo |
|---|---|
| Llegó la pipa y ya no pudo medir el nivel de antes | Opción "¿Ya descargó y no alcancé a medir antes?": se anota sin comparar y la app lo dice claro |
| "1,200 L Falta o sobra" sin decir cuál | Ahora dice "Faltaron" o "Sobraron" |
| No se veía cómo salió la resta | "Cómo se calculó: antes 24 cm, después 112 cm; 88 cm × 100 L por cm = 8,800 L" |
| No sabía si podía cobrar a los vecinos de más | La pantalla de dinero explica que las cuotas son sobre lo que cobró el proveedor y que se corrige si se ajusta el cobro |
| El mensaje a los vecinos decía "puede ser error de medida" y el resultado decía "más de lo que explica el error" | Se unificó el texto |
| El formulario de pedir pipa reaparecía vacío y parecía que había perdido lo anotado | Quedó plegado como "Registrar otra pipa" |
| Camino hacia "Anotar la pipa que llegó" no era claro | Botón grande en Hoy |

También: la tabla de cuotas pasó a tarjetas (se cortaba en el celular), "$ por m³" pasó a "$ por 1,000 L", el mensaje ya no dice "Lo aprobó", y el nivel muestra "11,200 de 13,000 litros".

## Ronda 3

**Resultado:** 21 confusiones, 4 de gravedad ALTA. **Llegó hasta el final**: entendió que "según la regla llegaron unos 8,800 litros de los 10,000 que cobraron", sabe que debe volver a medir con calma antes de reclamarle al proveedor y le mostraría el mensaje a los vecinos. Se rindió a medias en la pantalla de dinero por cansancio.

| Gravedad ALTA | Qué se hizo |
|---|---|
| "hasta 980 L" no cuadraba con su 5% (500 L) | Se agregó "¿De dónde sale ese margen de error?" con las tres partes: calibración, lectura de la regla y consumo no estimado |
| El resultado decía dos cosas ("pudo ser la pipa o la medida") | "Lo más probable es que haya llegado menos de lo cobrado... vuelve a medir con calma; si sigue igual, habla con el proveedor" |
| "Ya lo revisé: resuelta" daba miedo | Ahora es "Ya lo revisé: cerrar" con una línea: "cierra la revisión, tu nota queda guardada y puedes reabrirla" |
| La vista previa del mensaje cortaba el texto | La caja crece con el texto y las casillas usan palabras de ella |

También: la fecha y la hora van en su propia fila, la hora se llama "¿A qué hora lo mediste?", el menú se acomoda en dos filas en celular, "calibración" casi desaparece, "$287.50" con centavos y una línea "Cuando un vecino te dé su cuota, toca «Por confirmar»".

## Lo que NO se arregló (y por qué)

- **Los campos de fecha y hora se ven cortados** en las capturas. Salen del navegador de pruebas (Chromium sin interfaz); en un celular real cada sistema pone su propio selector. **No lo verifiqué en un teléfono real.**
- **La palabra "prototipo (proyecto de clase)"** sigue en el pie de página: prefiero que se sepa a que genere falsa confianza.
- **"Comparar cotizaciones"** no tiene que ver con su tarea de hoy; se queda porque es la parte de mercado del stack y está al final de la pantalla de dinero.
- **Un límite de esta prueba:** una IA que lee capturas no se cansa ni se distrae como una persona. No sustituye una prueba con una coordinadora real.

## Siguiente paso

Probar con una coordinadora real de una cisterna compartida, en su teléfono, con la pipa de verdad. Si no logra anotar una entrega sin ayuda en dos intentos, se simplifica el flujo antes de agregar nada (condición para parar del PACKET).
