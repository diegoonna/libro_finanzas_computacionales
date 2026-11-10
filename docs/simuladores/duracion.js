// Simulador del Capítulo 6: duración y convexidad.
// Generaliza fig-duracion-convexidad y la tabla de shocks: el precio exacto contra la
// tangente (duración) y la parábola (duración + convexidad) para cualquier bono y shock.
// Debajo, el peso de cada flujo en el precio: la duración de Macaulay es su centro de gravedad.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, metricasBono, precioBono } from "./finanzas.js";
import { controles, dinero, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const NOMINAL = 1000;
const TASA_MAXIMA = 25; // en %, el borde derecho del gráfico

const signo = (x, f) => `${x < 0 ? "−" : "+"}${f(Math.abs(x))}`;

export function montar(raiz) {
  // Valores iniciales: el bono del capítulo (cupón 8%, 5 años, TIR 10%) y el shock de +3 pp
  const form = controles({
    cupon: Inputs.range([0, 15], { value: 8, step: 0.5, label: "Cupón anual (%)" }),
    anios: Inputs.range([1, 30], { value: 5, step: 1, label: "Plazo (años)" }),
    tir: Inputs.range([1, 20], { value: 10, step: 0.1, label: "TIR actual (%)" }),
    shock: Inputs.range([-5, 5], { value: 3, step: 0.25, label: "Shock de tasa (pp)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ cupon, anios, tir, shock }, ancho) {
  const c = cupon / 100, y = tir / 100, dy = shock / 100;
  const m = metricasBono(NOMINAL, c, anios, y);
  const lineal = (d) => m.precio * (1 - m.modificada * d);
  const cuadratica = (d) => m.precio * (1 - m.modificada * d + 0.5 * m.convexidad * d * d);

  const desde = Math.min(0, tir + shock);
  const tasas = d3.range(desde, TASA_MAXIMA + 0.001, 0.1);
  const curva = (f) => tasas.map((r) => ({ r, p: f(r) }));
  const exacta = curva((r) => precioBono(NOMINAL, c, anios, r / 100));
  const techo = Math.max(exacta[0].p, cuadratica(desde / 100 - y)) * 1.05;

  const nuevo = { exacto: precioBono(NOMINAL, c, anios, y + dy), lineal: lineal(dy), cuadratica: cuadratica(dy) };
  const enShock = [
    { r: tir + shock, p: nuevo.lineal, color: COLOR.acento },
    { r: tir + shock, p: nuevo.cuadratica, color: COLOR.secundario },
    { r: tir + shock, p: nuevo.exacto, color: COLOR.primario },
  ];

  const precioTasa = Plot.plot({
    width: ancho,
    height: 360,
    marginLeft: 55,
    x: { label: "TIR (%) →", domain: [desde, TASA_MAXIMA], grid: true },
    y: { label: "↑ Precio ($)", grid: true, domain: [0, techo] },
    marks: [
      Plot.ruleX([tir + shock], { stroke: COLOR.gris, strokeDasharray: "4 4" }),
      Plot.line(curva((r) => lineal(r / 100 - y)), { x: "r", y: "p", stroke: COLOR.acento,
                                                      strokeWidth: 1.8, strokeDasharray: "7 4", clip: true }),
      Plot.line(curva((r) => cuadratica(r / 100 - y)), { x: "r", y: "p", stroke: COLOR.secundario,
                                                          strokeWidth: 2, strokeDasharray: "2 3", clip: true }),
      Plot.line(exacta, { x: "r", y: "p", stroke: COLOR.primario, strokeWidth: 2.5, clip: true }),
      Plot.dot([{ r: tir, p: m.precio }], { x: "r", y: "p", r: 5, fill: COLOR.texto }),
      Plot.dot(enShock, { x: "r", y: "p", r: 5, fill: "color", stroke: "white", clip: true }),
    ],
  });

  const pesos = m.pesos.map((w, i) => ({ t: i + 1, w }));
  const ancho1 = Math.min(0.4, 0.4 * (10 / anios) + 0.1);
  const gravedad = Plot.plot({
    width: ancho,
    height: 200,
    marginLeft: 55,
    x: { label: "Año del flujo →", domain: [0, anios + 0.6] },
    y: { label: "↑ Peso en el precio (%)", grid: true, percent: true },
    marks: [
      Plot.rectY(pesos, { x1: (d) => d.t - ancho1, x2: (d) => d.t + ancho1, y: "w", fill: COLOR.primario, fillOpacity: 0.75 }),
      Plot.ruleX([m.macaulay], { stroke: COLOR.acento, strokeWidth: 2 }),
      Plot.text([m.macaulay], { x: (d) => d, frameAnchor: "top", dy: 4, dx: -6, textAnchor: "end",
                                text: (d) => `duración ${d.toFixed(2)} años`, fill: COLOR.acento, fontWeight: "bold" }),
      Plot.ruleY([0]),
    ],
  });

  const cambio = nuevo.exacto - m.precio;
  return [
    lecturas([
      ["Precio", dinero(m.precio)],
      ["Duración de Macaulay", `${m.macaulay.toFixed(2)} años`],
      ["Duración modificada", m.modificada.toFixed(2)],
      ["Convexidad", m.convexidad.toFixed(2)],
      ["DV01", dinero(m.dv01, 4)],
      ["Cambio exacto con el shock", `${signo(cambio, (x) => dinero(x))} (${signo(cambio / m.precio, (x) => (x * 100).toFixed(2))}%)`],
      ["Error de la duración sola", signo(nuevo.lineal - nuevo.exacto, (x) => dinero(x))],
      ["Error con convexidad", signo(nuevo.cuadratica - nuevo.exacto, (x) => dinero(x))],
    ]),
    precioTasa,
    leyenda([
      [COLOR.primario, "━", "precio exacto"],
      [COLOR.acento, "╍", "solo duración (tangente)"],
      [COLOR.secundario, "┅", "duración + convexidad"],
      [COLOR.gris, "┆", "TIR después del shock"],
    ]),
    gravedad,
    leyenda([
      [COLOR.primario, "■", "peso de cada flujo en el precio"],
      [COLOR.acento, "│", "duración de Macaulay: el centro de gravedad"],
    ]),
  ];
}
