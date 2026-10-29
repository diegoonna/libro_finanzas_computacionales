// Simulador del Capítulo 20: la sonrisa de SABR y sus parámetros.
// Generaliza fig-sabr: los tres escenarios fijos pasan a ser controles continuos, y se agrega
// la densidad neutral al riesgo que implica la sonrisa, donde se ve cuándo la aproximación
// de Hagan deja de ser libre de arbitraje.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, sabrVol, densidadImplicita } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const F = 100;
const STRIKES = d3.range(50, 150.01, 1);
const GRILLA_DENSIDAD = d3.range(20, 250.01, 0.5);
// Las tres sonrisas de fig-sabr (β = 1, α = 20%, T = 1), como referencia
const FIGURA = [[-0.6, 0.4], [0, 0.4], [0, 0.1]];

export function montar(raiz) {
  // Valores iniciales: el primer escenario de la figura (smirk de acciones)
  const form = controles({
    nivel: Inputs.range([5, 50], { value: 20, step: 1, label: "Nivel: vol ATM aprox. (%)" }),
    beta: Inputs.range([0, 1], { value: 1, step: 0.05, label: "β (0 normal, 1 lognormal)" }),
    rho: Inputs.range([-0.9, 0.9], { value: -0.6, step: 0.05, label: "ρ (inclinación)" }),
    nu: Inputs.range([0, 1.5], { value: 0.4, step: 0.05, label: "ν, vol de vol (curvatura)" }),
    T: Inputs.range([0.25, 10], { value: 1, step: 0.25, label: "Plazo T (años)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

const pct = (x) => `${(x * 100).toFixed(2)}%`;
const pp = (x) => `${x < 0 ? "−" : "+"}${Math.abs(x * 100).toFixed(2)} pp`;

function dibujar({ nivel, beta, rho, nu, T }, ancho) {
  // El control fija α·F^(β−1), la vol ATM aproximada: así mover β cambia la forma y no la escala
  const alfa = (nivel / 100) * F ** (1 - beta);
  const vol = (K) => sabrVol(K, F, T, alfa, beta, rho, nu);

  const sonrisa = STRIKES.map((K) => ({ K, v: vol(K) * 100 }));
  const referencias = FIGURA.flatMap(([r, n], i) =>
    STRIKES.map((K) => ({ K, v: sabrVol(K, F, 1, 0.2, 1, r, n) * 100, curva: i })));

  const densidad = GRILLA_DENSIDAD.map((K) => ({ K, d: densidadImplicita(vol, F, T, K) * 100 }));
  const negativos = densidad.filter((p) => p.d < -1e-5);

  const curvaSonrisa = Plot.plot({
    width: ancho,
    height: 280,
    marginLeft: 45,
    x: { label: "Strike K →", grid: true },
    y: { label: "↑ Vol implícita (%)", grid: true },
    marks: [
      Plot.line(referencias, { x: "K", y: "v", z: "curva", stroke: COLOR.gris, strokeWidth: 1,
                               strokeDasharray: "4 3" }),
      Plot.ruleX([F], { stroke: COLOR.texto, strokeOpacity: 0.4 }),
      Plot.line(sonrisa, { x: "K", y: "v", stroke: COLOR.primario, strokeWidth: 2.5 }),
    ],
  });

  const curvaDensidad = Plot.plot({
    width: ancho,
    height: 200,
    marginLeft: 45,
    x: { label: "Precio del subyacente al vencimiento →", domain: [20, 250] },
    y: { label: "↑ Densidad (% por $)", grid: true },
    marks: [
      Plot.areaY(densidad, { x: "K", y: (p) => Math.max(p.d, 0), fill: COLOR.primario, fillOpacity: 0.55 }),
      Plot.areaY(densidad, { x: "K", y: (p) => Math.min(p.d, 0), fill: COLOR.acento, fillOpacity: 0.8 }),
      Plot.ruleY([0]),
      Plot.ruleX([F], { stroke: COLOR.texto, strokeOpacity: 0.4 }),
    ],
  });

  const v80 = vol(80), v90 = vol(90), v110 = vol(110), v120 = vol(120), vATM = vol(F);
  return [
    lecturas([
      ["Vol ATM (K = 100)", pct(vATM)],
      ["Vol K = 80 / K = 120", `${pct(v80)} / ${pct(v120)}`],
      ["Inclinación: vol 90 − vol 110", pp(v90 - v110)],
      ["Curvatura: alas 80/120 − ATM", pp((v80 + v120) / 2 - vATM)],
      ["Densidad implícita", negativos.length
        ? `negativa entre K = ${negativos[0].K} y ${negativos.at(-1).K}` : "positiva en todo el rango"],
    ]),
    curvaSonrisa,
    leyenda([
      [COLOR.primario, "━", "tu sonrisa"],
      [COLOR.gris, "╍", "las tres sonrisas de la figura (T = 1)"],
    ]),
    curvaDensidad,
    leyenda([
      [COLOR.primario, "■", "densidad neutral al riesgo implícita (∂²C/∂K²)"],
      [COLOR.acento, "■", "tramo negativo: arbitraje"],
    ]),
  ];
}
