// Simulador del Capítulo 11: VaR contra Expected Shortfall con colas pesadas.
// Generaliza fig-anatomia-var-es: la distribución de los retornos y el nivel de confianza
// pasan a ser controles, y cada una se compara con la normal de igual media y volatilidad
// (la que usaría un VaR paramétrico). Todo es cálculo exacto, sin simular.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, distNormal, distT, distMezcla, varES } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

// Retornos diarios del capítulo: media 0.04%, volatilidad 1.5%
const MEDIA = 0.0004;
const VOL = 0.015;

export function montar(raiz) {
  const form = controles({
    tipo: Inputs.radio(["Normal", "t de Student", "Con días de crisis"],
                       { value: "t de Student", label: "Distribución" }),
    nu: Inputs.range([2.5, 30], { value: 3, step: 0.5, label: "Grados de libertad ν (t)" }),
    crisis: Inputs.range([0, 20], { value: 5, step: 0.5, label: "Días de crisis (%)" }),
    conf: Inputs.range([90, 99.9], { value: 95, step: 0.1, label: "Confianza (%)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

// Distribución elegida, con su media y su desvío (para ajustarle la normal paramétrica)
function distribucion(tipo, nu, crisis) {
  if (tipo === "Normal") return { dist: distNormal(MEDIA, VOL), m: MEDIA, s: VOL };
  if (tipo === "t de Student") return { dist: distT(nu, MEDIA, VOL), m: MEDIA, s: VOL };
  // La mezcla del Capítulo 7: días normales N(0.08%, 1.2%) y de crisis N(−2%, 4%)
  const p = crisis / 100;
  const normales = [0.0008, 0.012];
  const malos = [-0.02, 0.04];
  const m = (1 - p) * normales[0] + p * malos[0];
  const segundo = (1 - p) * (normales[1] ** 2 + normales[0] ** 2) + p * (malos[1] ** 2 + malos[0] ** 2);
  return {
    dist: distMezcla([[1 - p, distNormal(...normales)], [p, distNormal(...malos)]]),
    m,
    s: Math.sqrt(segundo - m * m),
  };
}

const pct = (x) => `${(x * 100).toFixed(2)}%`;

function dibujar({ tipo, nu, crisis, conf }, ancho) {
  const { dist, m, s } = distribucion(tipo, nu, crisis);
  const normal = distNormal(m, s);
  const real = varES(dist, conf / 100);
  const param = varES(normal, conf / 100);

  // Densidades en % (x en puntos porcentuales: la densidad se divide por 100)
  const grilla = d3.range(m - 7 * s, m + 4.5 * s, s / 40).map((x) => ({
    x: x * 100, real: dist.pdf(x) / 100, normal: normal.pdf(x) / 100,
  }));
  const cola = grilla.filter((p) => p.x <= -real.var * 100);

  const lineas = [
    Plot.areaY(cola, { x: "x", y: "real", fill: COLOR.acento, fillOpacity: 0.25 }),
    Plot.line(grilla, { x: "x", y: "normal", stroke: COLOR.gris, strokeWidth: 1.8, strokeDasharray: "6 4" }),
    Plot.line(grilla, { x: "x", y: "real", stroke: COLOR.primario, strokeWidth: 2.4 }),
  ];
  const marcas = [
    Plot.ruleX([-param.var * 100], { stroke: COLOR.gris, strokeWidth: 1.5, strokeDasharray: "6 4" }),
    Plot.ruleX([-real.var * 100], { stroke: COLOR.acento, strokeWidth: 2 }),
  ];

  const principal = Plot.plot({
    width: ancho,
    height: 300,
    marginLeft: 50,
    x: { label: "Retorno diario (%) →", grid: true },
    y: { label: "↑ Densidad", grid: true, tickFormat: () => "" },
    marks: [
      ...lineas,
      ...marcas,
      // Triángulos en la base: dónde cae el ES (el promedio de la cola) de cada una
      Plot.dot([{ x: -real.es * 100, y: 0 }], { x: "x", y: "y", symbol: "triangle", r: 7, fill: COLOR.acento }),
      Plot.dot([{ x: -param.es * 100, y: 0 }], { x: "x", y: "y", symbol: "triangle", r: 6, fill: COLOR.gris }),
    ],
  });

  // La cola izquierda en escala logarítmica: ahí se ve lo que la escala lineal aplana
  const colaLog = grilla.filter((p) => p.x <= (m - 1 * s) * 100 && p.real > 0 && p.normal > 1e-9);
  const zoom = Plot.plot({
    width: ancho,
    height: 220,
    marginLeft: 50,
    x: { label: "Retorno diario (%) →", grid: true },
    y: { label: "↑ Densidad (escala log)", type: "log", grid: true, tickFormat: () => "",
         domain: [Math.max(1e-6, d3.min(colaLog, (p) => Math.min(p.real, p.normal))), d3.max(colaLog, (p) => p.real) * 1.5] },
    marks: [
      Plot.line(colaLog, { x: "x", y: "normal", stroke: COLOR.gris, strokeWidth: 1.8, strokeDasharray: "6 4" }),
      Plot.line(colaLog, { x: "x", y: "real", stroke: COLOR.primario, strokeWidth: 2.4 }),
      ...marcas,
    ],
  });

  const desvioVar = (param.var / real.var - 1) * 100;
  return [
    lecturas([
      ["VaR verdadero", pct(real.var)],
      ["VaR si asumís normal", pct(param.var)],
      ["ES verdadero", pct(real.es)],
      ["ES si asumís normal", pct(param.es)],
      ["El VaR normal…", `${desvioVar > 0 ? "sobre" : "sub"}estima ${Math.abs(desvioVar).toFixed(0)}%`],
      ["Volatilidad de la distribución", pct(s)],
    ]),
    principal,
    leyenda([
      [COLOR.primario, "━", tipo === "Normal" ? "distribución (normal)" : "distribución verdadera"],
      [COLOR.gris, "╍", "normal con igual media y volatilidad"],
      [COLOR.acento, "│", "VaR verdadero"],
      [COLOR.acento, "▲", "ES verdadero"],
      [COLOR.gris, "╎ ▲", "VaR y ES de la normal"],
    ]),
    zoom,
    leyenda([[COLOR.texto, "", "La misma cola en escala logarítmica: las colas pesadas son una recta que baja lento; la normal, una parábola que se desploma."]]),
  ];
}
