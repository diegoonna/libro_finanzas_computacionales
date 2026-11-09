// Simulador del Capítulo 6: bootstrapping de la curva de tasas.
// Los cinco bonos del capítulo (cupones fijos) con su precio como control: de los precios
// salen las spot (bootstrapping), las forward de un año y, para comparar, la TIR de cada bono.

import { Plot, Inputs } from "./librerias.js";
import { COLOR, bootstrapCurva, tirBono } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const NOMINAL = 100;
// Los bonos del capítulo: plazo, cupón y precio de mercado inicial
const BONOS = [
  { plazo: 1, cupon: 0.05, precio: 100.0 },
  { plazo: 2, cupon: 0.06, precio: 100.5 },
  { plazo: 3, cupon: 0.065, precio: 99.8 },
  { plazo: 4, cupon: 0.07, precio: 100.2 },
  { plazo: 5, cupon: 0.075, precio: 99.5 },
];

const pct = (x) => `${x.toFixed(2)}%`;

export function montar(raiz) {
  const campos = {};
  for (const b of BONOS) {
    campos[`p${b.plazo}`] = Inputs.range([95, 105], {
      value: b.precio, step: 0.1,
      label: `Precio del bono a ${b.plazo} ${b.plazo === 1 ? "año" : "años"} (cupón ${(b.cupon * 100).toFixed(1)}%)`,
    });
  }
  montarSimulador(raiz, controles(campos), dibujar);
}

function dibujar(valores, ancho) {
  const bonos = BONOS.map((b) => ({ ...b, precio: valores[`p${b.plazo}`] }));
  const { spot, forward } = bootstrapCurva(bonos, NOMINAL);
  // En porcentaje, para graficar directo
  const puntos = bonos.map((b, i) => ({
    plazo: b.plazo, spot: spot[i] * 100, forward: forward[i] * 100,
    tir: tirBono(NOMINAL, b.cupon, b.plazo, b.precio) * 100,
  }));
  // Cada forward vale para su tramo (n−1, n]: escalones que arrancan en 0
  const escalones = [{ plazo: 0, forward: puntos[0].forward }, ...puntos];

  const todas = puntos.flatMap((d) => [d.spot, d.forward, d.tir]);
  const grafico = Plot.plot({
    width: ancho,
    height: 340,
    marginLeft: 50,
    x: { label: "Plazo (años) →", domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5] },
    y: { label: "↑ Tasa (%)", grid: true, domain: [Math.min(0, ...todas), Math.max(...todas) * 1.12] },
    marks: [
      Plot.line(escalones, { x: "plazo", y: "forward", curve: "step-before", stroke: COLOR.acento, strokeWidth: 2 }),
      Plot.line(puntos, { x: "plazo", y: "spot", stroke: COLOR.primario, strokeWidth: 2.5 }),
      Plot.dot(puntos, { x: "plazo", y: "spot", r: 6, fill: COLOR.primario, stroke: "white" }),
      // La TIR va encima: queda muy cerca de la spot y si no, el punto la tapa
      Plot.dot(puntos, { x: "plazo", y: "tir", r: 5, symbol: "diamond", fill: COLOR.gris, stroke: "white" }),
      Plot.ruleY([0]),
    ],
  });

  return [
    lecturas(puntos.map((d) => [`Spot a ${d.plazo} ${d.plazo === 1 ? "año" : "años"}`,
                                `${pct(d.spot)}<br><span style="font-size: 0.7em">forward ${pct(d.forward)}</span>`])),
    grafico,
    leyenda([
      [COLOR.primario, "●", "tasa spot (bootstrapping)"],
      [COLOR.acento, "━", "forward de un año, tramo por tramo"],
      [COLOR.gris, "◆", "TIR de cada bono"],
    ]),
  ];
}
