// Simulador del Capítulo 2: precio y TIR de un bono bullet.
// Junta los dos problemas del caso integrador sobre la misma curva precio-tasa: de la
// tasa al precio (la sumatoria de flujos descontados) y del precio a la TIR (la búsqueda
// inversa). Debajo, los flujos y sus valores presentes, como fig-flujos-bono.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, flujosBono, precioBono, tirBono } from "./finanzas.js";
import { controles, dinero, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const NOMINAL = 1000;
const TASA_MAXIMA = 20; // en %, el borde derecho de la curva

export function montar(raiz) {
  // Valores iniciales: el bono del capítulo (cupón 8%, 5 años, tasa 10%, cotiza a $950)
  const form = controles({
    cupon: Inputs.range([0, 15], { value: 8, step: 0.5, label: "Cupón anual (%)" }),
    anios: Inputs.range([1, 30], { value: 5, step: 1, label: "Plazo (años)" }),
    tasa: Inputs.range([0, TASA_MAXIMA], { value: 10, step: 0.1, label: "Tasa de mercado (%)" }),
    precio: Inputs.range([300, 2000], { value: 950, step: 5, label: "Precio de mercado ($)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ cupon, anios, tasa, precio }, ancho) {
  const c = cupon / 100;
  const valuar = (tasaPct) => precioBono(NOMINAL, c, anios, tasaPct / 100);
  const curva = d3.range(0, TASA_MAXIMA + 0.001, 0.1).map((r) => ({ r, p: valuar(r) }));
  const valuacion = { r: tasa, p: valuar(tasa) };
  const tir = tirBono(NOMINAL, c, anios, precio);
  const tirVisible = tir !== null && tir * 100 >= 0 && tir * 100 <= TASA_MAXIMA;

  const flujos = flujosBono(NOMINAL, c, anios).map((f, i) => ({
    anio: i + 1, flujo: f, vp: f / (1 + tasa / 100) ** (i + 1),
  }));
  const ultimo = flujos[flujos.length - 1];

  const brecha = valuacion.p / NOMINAL - 1;
  const respectoPar = Math.abs(brecha) < 0.0005 ? "a la par"
    : `${brecha < 0 ? "bajo" : "sobre"} la par (${brecha < 0 ? "−" : "+"}${Math.abs(brecha * 100).toFixed(1)}%)`;
  const variacion = (dr) => {
    const v = valuar(tasa + dr) / valuacion.p - 1;
    return `${v < 0 ? "−" : "+"}${Math.abs(v * 100).toFixed(2)}%`;
  };

  const curvaPrecio = Plot.plot({
    width: ancho,
    height: 360,
    marginLeft: 55,
    x: { label: "Tasa de descuento (%) →", domain: [0, TASA_MAXIMA], grid: true },
    y: { label: "↑ Precio ($)", grid: true, domain: [0, Math.max(curva[0].p, precio) * 1.05] },
    marks: [
      Plot.ruleY([NOMINAL], { stroke: COLOR.gris, strokeDasharray: "6 4" }),
      Plot.text([NOMINAL], { y: (d) => d, x: TASA_MAXIMA, text: () => "la par", dy: -7,
                             textAnchor: "end", fill: COLOR.gris }),
      Plot.ruleY([precio], { stroke: COLOR.secundario, strokeWidth: 1.2, strokeDasharray: "2 3" }),
      Plot.line(curva, { x: "r", y: "p", stroke: COLOR.primario, strokeWidth: 2.5 }),
      tirVisible ? Plot.dot([{ r: tir * 100, p: precio }], { x: "r", y: "p", symbol: "diamond",
                                                             r: 6, fill: COLOR.secundario }) : null,
      Plot.dot([valuacion], { x: "r", y: "p", r: 7, fill: COLOR.acento, stroke: "white" }),
      Plot.text([valuacion], { x: "r", y: "p", text: () => "tu tasa", dx: 10, dy: -12,
                               textAnchor: "start", fill: COLOR.acento, fontWeight: "bold" }),
    ],
  });

  const barras = Plot.plot({
    width: ancho,
    height: 220,
    marginLeft: 55,
    x: { label: "Año →", tickFormat: (a) => (anios > 15 && a % 5 !== 0 ? "" : a) },
    y: { label: "↑ Monto ($)", grid: true },
    marks: [
      Plot.barY(flujos, { x: "anio", y: "flujo", fill: COLOR.gris, fillOpacity: 0.45 }),
      Plot.barY(flujos, { x: "anio", y: "vp", fill: COLOR.primario, inset: 0.15 * Math.min(1, 10 / anios) }),
      Plot.ruleY([0]),
    ],
  });

  return [
    lecturas([
      ["Precio a tu tasa", dinero(valuacion.p)],
      ["Respecto del nominal", respectoPar],
      ["TIR al precio de mercado", tir === null ? "fuera de rango" : `${(tir * 100).toFixed(2)}%`],
      ["Si la tasa sube 1 pp", variacion(1)],
      ["Si la tasa baja 1 pp", variacion(-1)],
      ["Último flujo en el precio", `${((ultimo.vp / valuacion.p) * 100).toFixed(1)}%`],
    ]),
    curvaPrecio,
    leyenda([
      [COLOR.primario, "━", "precio a cada tasa"],
      [COLOR.acento, "●", "valuación a tu tasa"],
      [COLOR.secundario, "┄", "precio de mercado"],
      [COLOR.secundario, "◆", "TIR"],
    ]),
    barras,
    leyenda([
      [COLOR.gris, "■", "flujo que paga el bono"],
      [COLOR.primario, "■", "su valor presente a tu tasa"],
    ]),
  ];
}
