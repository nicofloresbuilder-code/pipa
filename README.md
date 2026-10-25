# PIPA

El cuaderno compartido de una cisterna: lecturas del nivel, entregas de pipa, cuotas y revisiones cuando algo no cuadra. **Todo se queda en el teléfono.**

Proyecto de la semana 11 de *Business Bending* (capítulo 10, "Dreaming of Plenitude"), rol OPERATOR. Rebanada del Blueprint del equipo: reclutar un coordinador, mapear una entrega y asignar el manejo de excepciones.

## Qué hace

- **Hoy:** nivel de la cisterna, aviso de cuándo conviene pedir pipa (asesor, no promesa) y revisiones pendientes.
- **Tanque:** lecturas manuales (el celular es el sensor), gráfica y medidas de la cisterna.
- **Entregas:** el mapa de siete pasos. Mide antes y después; compara litros cotizados, observados y estimados; abre una revisión con responsable si la diferencia pasa del margen.
- **Revisiones:** una acción principal, notas privadas, corrección de medidas y plazos sugeridos.
- **Dinero:** cuotas por entrega (se registran, no se guardan), hogares y comparador de cotizaciones.
- **Compartir:** un mensaje que el coordinador arma casilla por casilla.
- **/condiciones:** dónde se cumple cada condición del Blueprint.

## Correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npx tsx src/lib/__selftest.ts   # autoprueba del motor
npm run build && npm run lint
```

No hay variables de entorno ni llaves.

## Stack

Next.js 16 (App Router), React 19, TypeScript. Sensing: lectura manual más alimentación simulada y etiquetada. ML: regresión propia contra una línea base. Marketplace: comparador de cotizaciones y reparto de cuotas. Datos: `localStorage`.

## Piso de seguridad

Sin secretos en el código. Sin datos personales en el servidor, así que no hay auth ni tablas. Todos los campos validan tipo y largo. Datos de demo inventados y etiquetados.

## Documentos

`docs/PACKET.md` (el packet antes del código), `docs/PERSONA.md` (la prueba con la persona sintética) y `DECISIONS.md`.

## Límites

Es un prototipo. No prueba que una entrega haya sido robada ni que no lo haya sido, no audita contratos públicos y no ha sido probado con una coordinadora real.
