// Simulador del Capítulo 19: delta hedging de una call vendida.
// Junta fig-hedge-cuatro-paneles (un escenario), fig-error-frecuencia (la distribución del
// error) y fig-frecuencia-costos (el balance entre gamma y costos), con la frecuencia de
// rebalanceo y el costo por operación como controles.
//
// A propósito NO tiene un control de volatilidad realizada distinta de la cotizada: es el
// ejercicio 1 del capítulo, y el simulador no debería resolverlo.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, simularCobertura, media, desvio } from "./finanzas.js";
import { controles, dinero, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

// El contrato del capítulo: call al dinero a un año, r 5%, vol 25%
const CONTRATO = { S0: 100, K: 100, T: 1, r: 0.05, sigma: 0.25 };
const FRECUENCIAS = [4, 12, 26, 52, 126, 252];
const N_ESCENARIOS = 300;

export function montar(raiz) {
  const form = controles({
    n: Inputs.select(FRECUENCIAS, { value: 252, label: "Rebalanceos por año" }),
    costo: Inputs.range([0, 50], { value: 0, step: 1, label: "Costo por operación (pb)" }),
    semilla: Inputs.button("Nueva muestra", { value: 1, reduce: (v) => v + 1, label: "Escenarios" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ n, costo, semilla }, ancho) {
  // Todas las frecuencias con la misma semilla: así el panel de abajo es comparable
  const resultados = FRECUENCIAS.map((f) => {
    const sim = simularCobertura({ ...CONTRATO, n: f, costoBps: costo, nSims: N_ESCENARIOS, semilla: semilla * 7919 });
    const e = sim.erroresConCostos;
    const costoMedio = media(sim.errores) - media(e); // mismos caminos: la diferencia es el costo puro
    return { n: f, sim, media: media(e), desvio: desvio(sim.errores), costoMedio,
             total: Math.hypot(media(e), desvio(e)) };
  });
  const actual = resultados.find((r) => r.n === n);
  const optima = resultados.reduce((a, b) => (b.total < a.total ? b : a));
  const { camino, prima } = actual.sim;

  // El escenario dibujado: precio, y la cartera replicante contra el valor de la opción
  const anchoPanel = ancho >= 600 ? Math.floor(ancho / 2) - 8 : ancho;
  const precio = Plot.plot({
    width: anchoPanel,
    height: 220,
    marginLeft: 45,
    x: { label: "Años →", grid: true },
    y: { label: "↑ Precio del subyacente ($)", grid: true },
    marks: [
      Plot.ruleY([CONTRATO.K], { stroke: COLOR.acento, strokeDasharray: "6 4" }),
      Plot.line(camino, { x: "t", y: "S", stroke: COLOR.primario, strokeWidth: 1.5 }),
    ],
  });
  const replica = Plot.plot({
    width: anchoPanel,
    height: 220,
    marginLeft: 45,
    x: { label: "Años →", grid: true },
    y: { label: "↑ Valor ($)", grid: true },
    marks: [
      Plot.line(camino, { x: "t", y: "opcion", stroke: COLOR.acento, strokeWidth: 2, strokeDasharray: "6 4" }),
      Plot.line(camino, { x: "t", y: "cartera", stroke: COLOR.primario, strokeWidth: 1.5,
                          curve: "step-after" }),
    ],
  });
  const escenario = document.createElement("div");
  escenario.style.cssText = "display: flex; flex-wrap: wrap; gap: 16px";
  escenario.append(precio, replica);

  // Distribución del error en los 300 escenarios (con costos, si hay)
  const errores = Array.from(actual.sim.erroresConCostos);
  const limite = Math.max(3, d3.quantile(errores.map(Math.abs), 0.99) * 1.1);
  const histograma = Plot.plot({
    width: ancho,
    height: 220,
    marginLeft: 45,
    x: { label: "Error de cobertura ($) →", domain: [-limite, limite], grid: true },
    y: { label: "↑ Escenarios", grid: true },
    marks: [
      Plot.rectY(errores.filter((e) => Math.abs(e) <= limite),
                 Plot.binX({ y: "count" }, { x: (e) => e, thresholds: d3.range(-limite, limite + 1e-9, limite / 25),
                                             fill: COLOR.gris, inset: 0.5 })),
      Plot.ruleX([0], { stroke: COLOR.texto }),
      Plot.ruleX([actual.media], { stroke: COLOR.acento, strokeWidth: 2 }),
    ],
  });

  // El balance: el gamma pide rebalancear seguido, los costos piden lo contrario
  const balance = Plot.plot({
    width: ancho,
    height: 240,
    marginLeft: 45,
    x: { label: "Rebalanceos por año (escala log) →", type: "log", ticks: FRECUENCIAS, tickFormat: (v) => v,
         grid: true },
    y: { label: "↑ $", grid: true, domain: [0, d3.max(resultados, (r) => Math.max(r.total, r.desvio)) * 1.05] },
    marks: [
      Plot.line(resultados, { x: "n", y: "desvio", stroke: COLOR.primario, strokeWidth: 2, marker: "circle" }),
      Plot.line(resultados, { x: "n", y: "costoMedio", stroke: COLOR.acento, strokeWidth: 2, marker: "circle" }),
      Plot.line(resultados, { x: "n", y: "total", stroke: COLOR.secundario, strokeWidth: 2.5, strokeDasharray: "6 4" }),
      Plot.dot([optima], { x: "n", y: "total", r: 8, fill: "none", stroke: COLOR.secundario, strokeWidth: 2 }),
      Plot.ruleX([n], { stroke: COLOR.texto, strokeOpacity: 0.35, strokeWidth: 6 }),
    ],
  });

  return [
    lecturas([
      ["Prima cobrada", dinero(prima)],
      ["Error medio", dinero(actual.media, 3)],
      ["Desvío del error", dinero(actual.desvio, 3)],
      ["Costo medio pagado", dinero(actual.costoMedio, 3)],
      ["Error en el escenario dibujado", dinero(actual.sim.erroresConCostos[0], 3)],
      ["Frecuencia con menor error total", `${optima.n} por año`],
    ]),
    escenario,
    leyenda([
      [COLOR.primario, "━", "precio (izq.) · cartera replicante (der.)"],
      [COLOR.acento, "╍", "strike (izq.) · valor de la opción (der.)"],
    ]),
    histograma,
    leyenda([
      [COLOR.gris, "■", `error de cobertura en ${N_ESCENARIOS} escenarios`],
      [COLOR.acento, "│", "error medio"],
    ]),
    balance,
    leyenda([
      [COLOR.primario, "●", "desvío del error (gamma)"],
      [COLOR.acento, "●", "costo medio pagado"],
      [COLOR.secundario, "╍", "error total: √(media² + desvío²)"],
      [COLOR.secundario, "○", "la frecuencia que lo minimiza"],
      [COLOR.texto, "▌", "la frecuencia elegida"],
    ]),
  ];
}
