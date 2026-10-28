// Simulador del Capítulo 12: un CDO y la correlación de los defaults.
// Generaliza la tabla cdo-correlacion (tres valores de ρ, por Monte Carlo) a un control
// continuo, con la distribución EXACTA de pérdidas del pool y los tramos móviles.

import { Plot, Inputs } from "./librerias.js";
import { COLOR, distribucionDefaults, perdidaTramo } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const N_HIPOTECAS = 100;

export function montar(raiz) {
  // Valores iniciales: el CDO de juguete del capítulo
  const form = controles({
    rho: Inputs.range([0, 0.95], { value: 0.2, step: 0.01, label: "Correlación de los defaults ρ" }),
    pd: Inputs.range([1, 20], { value: 8, step: 0.5, label: "Probabilidad de default (%)" }),
    lgd: Inputs.range([20, 80], { value: 50, step: 5, label: "Pérdida por default (%)" }),
    mezz: Inputs.range([2, 30], { value: 10, step: 1, label: "El mezzanine empieza en (%)" }),
    senior: Inputs.range([5, 50], { value: 25, step: 1, label: "El senior empieza en (%)" }),
    log: Inputs.toggle({ label: "Escala logarítmica", value: false }),
  });
  montarSimulador(raiz, form, dibujar);
}

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

// Probabilidades chicas con las cifras que importan: 0.0000013%, 0.11%, 3.5%
function prob(p) {
  if (p >= 0.01) return pct(p, 1);
  if (p >= 1e-4) return pct(p, 2);
  if (p < 1e-12) return "≈ 0%";
  return `${(p * 100).toPrecision(2)}%`;
}

function dibujar({ rho, pd, lgd, mezz, senior, log }, ancho) {
  pd /= 100;
  lgd /= 100;
  const a = mezz / 100;
  const d = Math.max(senior, mezz + 1) / 100; // el senior siempre arriba del mezzanine
  const p = distribucionDefaults(N_HIPOTECAS, pd, Math.min(rho, 0.999));

  const filas = Array.from(p, (v, k) => ({ perdida: (k / N_HIPOTECAS) * lgd, prob: v }));
  const esperada = (desde, hasta) => filas.reduce((s, f) => s + f.prob * perdidaTramo(f.perdida, desde, hasta), 0);
  const pSenior = filas.reduce((s, f) => s + (f.perdida > d ? f.prob : 0), 0);

  const piso = 1e-10;
  const visibles = log ? filas.filter((f) => f.prob > piso) : filas;
  const xMax = lgd * 100;
  const tramos = [
    { desde: 0, hasta: a * 100, fill: "#fde8dc", nombre: "Equity" },
    { desde: a * 100, hasta: d * 100, fill: "#fef3c7", nombre: "Mezzanine" },
    { desde: d * 100, hasta: Math.max(xMax, d * 100), fill: "#eef2e3", nombre: "Senior (AAA)" },
  ].filter((t) => t.desde < xMax);

  const grafico = Plot.plot({
    width: ancho,
    height: 330,
    marginLeft: 55,
    x: { label: "Pérdida del pool (% del total) →", domain: [0, xMax], grid: true },
    y: log
      ? { label: "↑ Probabilidad (escala log)", type: "log", domain: [piso, 1], grid: true,
          tickFormat: (v) => `${(v * 100).toPrecision(1)}%`, ticks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1] }
      : { label: "↑ Probabilidad (%)", percent: true, grid: true },
    marks: [
      Plot.rect(tramos, { x1: "desde", x2: (t) => Math.min(t.hasta, xMax), y1: log ? piso : 0,
                           y2: log ? 1 : Math.max(...p) * 1.05, fill: "fill" }),
      Plot.text(tramos, { x: (t) => (t.desde + Math.min(t.hasta, xMax)) / 2, frameAnchor: "top", dy: 6,
                          text: "nombre", fill: COLOR.texto, fontSize: 10 }),
      Plot.ruleX(visibles, { x: (f) => f.perdida * 100, y1: log ? piso : 0, y2: "prob",
                             stroke: COLOR.primario, strokeWidth: Math.max(2, ancho / 160) }),
      Plot.ruleX([pd * lgd * 100], { stroke: COLOR.acento, strokeDasharray: "6 4", strokeWidth: 1.5 }),
    ],
  });

  return [
    lecturas([
      ["Pérdida esperada del pool", pct(pd * lgd)],
      ["P(el senior AAA pierde algo)", prob(pSenior)],
      ["P(ningún default)", prob(p[0])],
      ["Pérdida esperada: equity", pct(esperada(0, a))],
      ["Pérdida esperada: mezzanine", pct(esperada(a, d), 2)],
      ["Pérdida esperada: senior", prob(esperada(d, 1))],
    ]),
    grafico,
    leyenda([
      [COLOR.primario, "┃", "probabilidad de cada nivel de pérdida (exacta)"],
      [COLOR.acento, "╎", "pérdida esperada"],
      ["#e9a07a", "■", "equity"],
      ["#e4c35c", "■", "mezzanine"],
      [COLOR.secundario, "■", "senior"],
    ]),
  ];
}
