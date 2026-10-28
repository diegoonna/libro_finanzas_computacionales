// Simulador del Capítulo 8: frontera eficiente, portafolio tangente y CML.
// Generaliza fig-frontera-cml y fig-composicion-frontera: los retornos esperados, la tasa
// libre de riesgo y la aversión al riesgo λ del Capítulo 7 pasan a ser controles.

import { Plot, Inputs, d3 } from "./librerias.js";
import {
  COLOR, covarianza, minimaVarianza, tangente, puntoFrontera, retornoCartera, volCartera,
} from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

// El universo del capítulo: volatilidades y correlaciones fijas (lo que se mueve es μ)
const ACTIVOS = ["Acción Growth", "Acción Value", "Acción Defensiva", "Bono Corporativo"];
const VOLS = [0.28, 0.20, 0.14, 0.06];
const SIGMA = covarianza(VOLS, [
  [1.00, 0.65, 0.45, 0.10],
  [0.65, 1.00, 0.50, 0.15],
  [0.45, 0.50, 1.00, 0.20],
  [0.10, 0.15, 0.20, 1.00],
]);
const COLORES = [COLOR.acento, COLOR.primario, COLOR.secundario, COLOR.gris, "#cbd5e1"];

export function montar(raiz) {
  const form = controles({
    mu0: Inputs.range([0, 20], { value: 14, step: 0.5, label: "μ Acción Growth (%)" }),
    mu1: Inputs.range([0, 20], { value: 10, step: 0.5, label: "μ Acción Value (%)" }),
    mu2: Inputs.range([0, 20], { value: 7, step: 0.5, label: "μ Acción Defensiva (%)" }),
    mu3: Inputs.range([0, 20], { value: 5, step: 0.5, label: "μ Bono Corporativo (%)" }),
    rf: Inputs.range([0, 8], { value: 3, step: 0.25, label: "Tasa libre de riesgo (%)" }),
    lambda: Inputs.range([1, 30], { value: 10, step: 0.5, label: "Aversión al riesgo λ" }),
    cortos: Inputs.toggle({ label: "Permitir ventas en corto", value: false }),
  });
  montarSimulador(raiz, form, dibujar);
}

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

function dibujar({ mu0, mu1, mu2, mu3, rf, lambda, cortos }, ancho) {
  const mu = [mu0, mu1, mu2, mu3].map((m) => m / 100);
  rf /= 100;
  const punto = (w) => ({ w, ret: retornoCartera(w, mu), vol: volCartera(w, SIGMA) });

  const gmv = punto(minimaVarianza(SIGMA, cortos));
  const wTan = tangente(SIGMA, mu, rf, cortos);
  const tan = wTan && punto(wTan);

  // Frontera: mínima varianza para cada retorno objetivo (con cortos se extiende un poco más arriba)
  const desde = Math.min(...mu);
  const hasta = Math.max(...mu) + (cortos ? 0.03 : 0);
  const frontera = d3.range(0, 121)
    .map((i) => puntoFrontera(SIGMA, mu, desde + (hasta - desde) * i / 120, cortos))
    .filter(Boolean)
    .map(punto);
  const eficiente = frontera.filter((p) => p.ret >= gmv.ret - 1e-12);
  const ineficiente = frontera.filter((p) => p.ret <= gmv.ret + 1e-12);

  // Tu cartera (Capítulo 7): sobre la CML, la fracción en el tangente que maximiza
  // la utilidad media-varianza es y = (E[R_T] − rf) / (λ σ_T²); el resto, a tasa.
  const y = tan ? (tan.ret - rf) / (lambda * tan.vol ** 2) : 0;
  const tuya = tan ? { ret: rf + y * (tan.ret - rf), vol: y * tan.vol } : { ret: rf, vol: 0 };
  const sharpe = tan ? (tan.ret - rf) / tan.vol : NaN;

  const volMax = Math.max(...VOLS, ...frontera.map((p) => p.vol)) * 1.08;
  const cml = tan ? [0, volMax].map((v) => ({ vol: v, ret: rf + sharpe * v })) : [];
  const activos = ACTIVOS.map((nombre, i) => ({ nombre, vol: VOLS[i], ret: mu[i] }));

  const grafico = Plot.plot({
    width: ancho,
    height: 400,
    marginLeft: 50,
    x: { label: "Volatilidad anual (%) →", domain: [0, volMax * 100], grid: true },
    y: { label: "↑ Retorno esperado anual (%)", grid: true },
    marks: [
      Plot.line(cml, { x: (d) => d.vol * 100, y: (d) => d.ret * 100, stroke: COLOR.secundario,
                       strokeWidth: 1.8, strokeDasharray: "6 4", clip: true }),
      Plot.line(ineficiente, { x: (d) => d.vol * 100, y: (d) => d.ret * 100, stroke: COLOR.primario,
                               strokeWidth: 1.5, strokeDasharray: "1.5 3" }),
      Plot.line(eficiente, { x: (d) => d.vol * 100, y: (d) => d.ret * 100, stroke: COLOR.primario,
                             strokeWidth: 2.5 }),
      Plot.dot(activos, { x: (d) => d.vol * 100, y: (d) => d.ret * 100, fill: COLOR.texto, r: 4 }),
      Plot.text(activos, { x: (d) => d.vol * 100, y: (d) => d.ret * 100, text: "nombre", dx: 7,
                           textAnchor: "start", fontSize: 10, fill: COLOR.texto }),
      Plot.dot([{ vol: 0, ret: rf }], { x: (d) => d.vol * 100, y: (d) => d.ret * 100,
                                         symbol: "square", r: 5, fill: COLOR.texto }),
      Plot.dot([gmv], { x: (d) => d.vol * 100, y: (d) => d.ret * 100, symbol: "diamond", r: 6,
                        fill: "#b45309" }),
      tan ? Plot.dot([tan], { x: (d) => d.vol * 100, y: (d) => d.ret * 100, symbol: "star", r: 9,
                              fill: COLOR.secundario, stroke: "white" }) : null,
      tan ? Plot.dot([tuya], { x: (d) => d.vol * 100, y: (d) => d.ret * 100, r: 7,
                               fill: COLOR.acento, stroke: "white" }) : null,
      tan ? Plot.text([tuya], { x: (d) => d.vol * 100, y: (d) => d.ret * 100, text: () => "tu cartera",
                                dy: -14, fill: COLOR.acento, fontWeight: "bold" }) : null,
    ],
  });

  // Composición: GMV, tangente y tu cartera (que agrega el activo libre de riesgo)
  const filas = [];
  const agregar = (cartera, w, libre = 0) => {
    ACTIVOS.forEach((activo, i) => filas.push({ cartera, activo, peso: w[i] * 100 }));
    filas.push({ cartera, activo: "Libre de riesgo", peso: libre * 100 });
  };
  agregar("Mínima varianza", gmv.w);
  if (tan) {
    agregar("Tangente", tan.w);
    agregar("Tu cartera", tan.w.map((x) => x * y), 1 - y);
  }
  const composicion = Plot.plot({
    width: ancho,
    height: tan ? 150 : 70,
    marginLeft: 110,
    x: { label: "Peso (%) →", grid: true },
    y: { label: null, domain: ["Mínima varianza", "Tangente", "Tu cartera"].slice(0, tan ? 3 : 1) },
    color: { domain: [...ACTIVOS, "Libre de riesgo"], range: COLORES, legend: true },
    marks: [
      Plot.barX(filas, { x: "peso", y: "cartera", fill: "activo", title: (d) => `${d.activo}: ${d.peso.toFixed(1)}%` }),
      Plot.ruleX([0, 100], { stroke: COLOR.texto, strokeOpacity: 0.4 }),
    ],
  });

  const tarjetas = tan
    ? [
        ["Tangente: retorno · vol", `${pct(tan.ret, 2)} · ${pct(tan.vol, 2)}`],
        ["Tangente: Sharpe", sharpe.toFixed(3)],
        ["Tu cartera: en el tangente", pct(y)],
        // Más de 100% en el tangente: la diferencia se toma prestada a la tasa libre de riesgo
        y <= 1 ? ["Tu cartera: a tasa libre", pct(1 - y)] : ["Tu cartera: deuda a tasa libre", pct(y - 1)],
        ["Tu cartera: retorno · vol", `${pct(tuya.ret, 2)} · ${pct(tuya.vol, 2)}`],
      ]
    : [["Tangente", "no existe: ninguna cartera rinde más que la tasa libre de riesgo"]];
  return [
    lecturas(tarjetas),
    grafico,
    leyenda([
      [COLOR.primario, "━", "frontera eficiente"],
      [COLOR.primario, "┅", "tramo ineficiente"],
      [COLOR.secundario, "╍", "CML"],
      ["#b45309", "◆", "mínima varianza"],
      [COLOR.secundario, "★", "tangente"],
      [COLOR.acento, "●", "tu cartera (según λ)"],
      [COLOR.texto, "■", "libre de riesgo"],
    ]),
    composicion,
  ];
}
