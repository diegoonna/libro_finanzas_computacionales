// Simulador del Capítulo 13: laboratorio de Monte Carlo con GBM.
// Junta fig-caminos-gbm (abanico y distribución final) y fig-convergencia-mc, con los
// parámetros del activo, el número de simulaciones y las variables antitéticas como controles.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, normCdf, caminosGBM, finalesGBM, media, desvio, mediana } from "./finanzas.js";
import { controles, dinero, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const S0 = 100;
const N_CAMINOS = 60; // trayectorias dibujadas en el abanico

export function montar(raiz) {
  // Valores iniciales: los del capítulo (μ 10%, σ 25%, 1 año, 10.000 simulaciones)
  const form = controles({
    mu: Inputs.range([-10, 30], { value: 10, step: 1, label: "Drift μ (%)" }),
    sigma: Inputs.range([5, 80], { value: 25, step: 1, label: "Volatilidad σ (%)" }),
    T: Inputs.range([0.25, 5], { value: 1, step: 0.25, label: "Horizonte T (años)" }),
    N: Inputs.select([100, 1000, 10000, 50000], {
      value: 10000, label: "Simulaciones N", format: (n) => n.toLocaleString("es-AR"),
    }),
    antiteticas: Inputs.toggle({ label: "Variables antitéticas", value: false }),
    semilla: Inputs.button("Nueva muestra", { value: 1, reduce: (v) => v + 1, label: "Muestra" }),
  });
  montarSimulador(raiz, form, dibujar);
}

// Error estándar de la media. Con antitéticas, la unidad independiente es el par (Z, −Z):
// se promedia cada par y se divide por la raíz de la cantidad de pares.
function errorEstandar(ST, antiteticas) {
  if (!antiteticas) return desvio(ST) / Math.sqrt(ST.length);
  const pares = new Float64Array(ST.length / 2);
  for (let i = 0; i < pares.length; i++) pares[i] = 0.5 * (ST[2 * i] + ST[2 * i + 1]);
  return desvio(pares) / Math.sqrt(pares.length);
}

function dibujar({ mu, sigma, T, N, antiteticas, semilla }, ancho) {
  mu /= 100;
  sigma /= 100;
  const mediaTeorica = S0 * Math.exp(mu * T);
  const medianaTeorica = S0 * Math.exp((mu - 0.5 * sigma ** 2) * T);
  const nPasos = Math.round(252 * T);

  // Misma semilla al mover μ, σ o T: las trayectorias se estiran en vez de cambiar por otras
  const caminos = caminosGBM(S0, mu, sigma, T, nPasos, N_CAMINOS, semilla);
  const ST = finalesGBM(S0, mu, sigma, T, N, semilla + 7919, antiteticas);
  // El otro método con el mismo N, para comparar errores estándar a igual costo
  const STotro = finalesGBM(S0, mu, sigma, T, N, semilla + 104729, !antiteticas);
  const se = errorEstandar(ST, antiteticas);
  const seOtro = errorEstandar(STotro, !antiteticas);

  const tendencias = d3.range(0, nPasos + 1).map((i) => {
    const t = (i / nPasos) * T;
    return { t, media: S0 * Math.exp(mu * t), mediana: S0 * Math.exp((mu - 0.5 * sigma ** 2) * t) };
  });

  // Abanico y distribución final lado a lado si hay lugar
  const anchoPanel = ancho >= 600 ? Math.floor(ancho / 2) - 8 : ancho;
  const abanico = Plot.plot({
    width: anchoPanel,
    height: 300,
    marginLeft: 50,
    x: { label: "Años →", grid: true },
    y: { label: "↑ Precio ($)", grid: true },
    marks: [
      Plot.line(caminos, { x: "t", y: "S", z: "camino", stroke: COLOR.primario, strokeOpacity: 0.22,
                           strokeWidth: 0.8 }),
      Plot.line(tendencias, { x: "t", y: "media", stroke: COLOR.secundario, strokeWidth: 2.2,
                              strokeDasharray: "6 4" }),
      Plot.line(tendencias, { x: "t", y: "mediana", stroke: COLOR.acento, strokeWidth: 2.2,
                              strokeDasharray: "2 3" }),
    ],
  });

  // Para que se vea la forma, el histograma omite el 1% superior (la cola larga de la lognormal)
  const corte = d3.quantile(ST, 0.99);
  const mediaSim = media(ST);
  const medianaSim = mediana(ST);
  const histograma = Plot.plot({
    width: anchoPanel,
    height: 300,
    marginLeft: 50,
    x: { label: `Precio final S_T ($) →`, grid: true },
    y: { label: "↑ Frecuencia (%)", percent: true, grid: true },
    marks: [
      Plot.rectY(ST.filter((v) => v <= corte),
                 Plot.binX({ y: (valores) => valores.length / ST.length }, { x: (v) => v, thresholds: 50,
                                                                fill: COLOR.gris, inset: 0.5 })),
      Plot.ruleX([mediaSim], { stroke: COLOR.secundario, strokeWidth: 2.2, strokeDasharray: "6 4" }),
      Plot.ruleX([medianaSim], { stroke: COLOR.acento, strokeWidth: 2.2, strokeDasharray: "2 3" }),
    ],
  });
  const paneles = document.createElement("div");
  paneles.style.cssText = "display: flex; flex-wrap: wrap; gap: 16px";
  paneles.append(abanico, histograma);

  // Convergencia: la media acumulada con cada vez más simulaciones (tamaños pares, para
  // no partir un par antitético), contra la banda teórica de ±2 errores estándar
  const acumulada = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) acumulada[i + 1] = acumulada[i] + ST[i];
  const tamanos = [...new Set(d3.range(40).map((k) => 2 * Math.round(5 * (N / 10) ** (k / 39))))];
  const convergencia = tamanos.map((n) => {
    const banda = 2 * se * Math.sqrt(N / n); // el error estándar escala como 1/√n
    return { n, estimacion: acumulada[n] / n, inf: mediaTeorica - banda, sup: mediaTeorica + banda };
  });
  const graficoConvergencia = Plot.plot({
    width: ancho,
    height: 260,
    marginLeft: 50,
    x: { label: "Número de simulaciones (escala log) →", type: "log", grid: true },
    y: { label: "↑ Media estimada de S_T ($)", grid: true },
    marks: [
      Plot.areaY(convergencia, { x: "n", y1: "inf", y2: "sup", fill: COLOR.acento, fillOpacity: 0.12 }),
      Plot.ruleY([mediaTeorica], { stroke: COLOR.acento, strokeDasharray: "6 4" }),
      Plot.line(convergencia, { x: "n", y: "estimacion", stroke: COLOR.primario, strokeWidth: 2,
                                marker: "circle-stroke" }),
    ],
  });

  const pierde = ST.reduce((cuenta, v) => cuenta + (v < S0), 0) / N;
  const pierdeTeorica = normCdf(-((mu - 0.5 * sigma ** 2) * Math.sqrt(T)) / sigma);
  return [
    lecturas([
      [`Media simulada · teórica ${dinero(mediaTeorica)}`, dinero(mediaSim)],
      [`Mediana simulada · teórica ${dinero(medianaTeorica)}`, dinero(medianaSim)],
      [`P(S_T < S0) simulada · teórica ${(pierdeTeorica * 100).toFixed(1)}%`, `${(pierde * 100).toFixed(1)}%`],
      [`Error estándar ${antiteticas ? "con" : "sin"} antitéticas`, dinero(se, 3)],
      [`Error estándar ${antiteticas ? "sin" : "con"} antitéticas, mismo N`, dinero(seOtro, 3)],
    ]),
    paneles,
    leyenda([
      [COLOR.primario, "━", `${N_CAMINOS} trayectorias`],
      [COLOR.secundario, "╍", "media (teórica a la izquierda, simulada a la derecha)"],
      [COLOR.acento, "┅", "mediana"],
    ]),
    graficoConvergencia,
    leyenda([
      [COLOR.primario, "●", "media estimada con las primeras n simulaciones"],
      [COLOR.acento, "▬", "banda de ±2 errores estándar alrededor del valor teórico"],
    ]),
  ];
}
