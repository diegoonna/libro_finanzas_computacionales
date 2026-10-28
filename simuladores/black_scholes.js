// Simulador del Capítulo 18: tablero de Black-Scholes y griegas.
// Junta fig-sensibilidad-call, fig-taylor-griegas y fig-perfil-griegas en un solo
// gráfico con todos los inputs de la fórmula como controles.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, bsPrecio, bsGriegas } from "./finanzas.js";
import { controles, dinero, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

// Eje de precios fijo: así, al mover S, el punto recorre la curva en vez de moverse el eje
const S_MIN = 40;
const S_MAX = 160;
// Alcance de las aproximaciones de Taylor a cada lado del precio actual
const TRAMO_TAYLOR = 30;

export function montar(raiz) {
  // Valores iniciales: el contrato del capítulo (call al dinero, 6 meses, vol 25%, r 5%)
  const form = controles({
    tipo: Inputs.radio(["call", "put"], { value: "call", label: "Opción" }),
    S: Inputs.range([50, 150], { value: 100, step: 1, label: "Precio del subyacente S" }),
    K: Inputs.range([50, 150], { value: 100, step: 1, label: "Strike K" }),
    T: Inputs.range([0.01, 2], { value: 0.5, step: 0.01, label: "Plazo T (años)" }),
    sigma: Inputs.range([5, 80], { value: 25, step: 1, label: "Volatilidad σ (%)" }),
    r: Inputs.range([0, 15], { value: 5, step: 0.5, label: "Tasa r (%)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ tipo, S, K, T, sigma, r }, ancho) {
  sigma /= 100;
  r /= 100;
  const precio = bsPrecio(S, K, T, r, sigma, tipo);
  const g = bsGriegas(S, K, T, r, sigma, tipo);
  const payoff = (s) => (tipo === "call" ? Math.max(s - K, 0) : Math.max(K - s, 0));

  const grilla = d3.range(S_MIN, S_MAX + 0.001, 0.5).map((s) => ({
    s,
    valor: bsPrecio(s, K, T, r, sigma, tipo),
    payoff: payoff(s),
    ...bsGriegas(s, K, T, r, sigma, tipo),
  }));
  const tramo = grilla
    .filter((p) => Math.abs(p.s - S) <= TRAMO_TAYLOR)
    .map(({ s }) => ({
      s,
      recta: precio + g.delta * (s - S),
      parabola: precio + g.delta * (s - S) + 0.5 * g.gamma * (s - S) ** 2,
    }));
  const yMax = d3.max(grilla, (p) => Math.max(p.valor, p.payoff));

  const principal = Plot.plot({
    width: ancho,
    height: 360,
    marginLeft: 50,
    x: { label: "Precio del subyacente S →", domain: [S_MIN, S_MAX], grid: true },
    y: { label: `↑ Valor de la ${tipo} ($)`, domain: [-3, yMax * 1.05 + 3], grid: true },
    marks: [
      Plot.ruleX([K], { stroke: COLOR.gris, strokeDasharray: "2 3" }),
      Plot.text([K], { x: (d) => d, frameAnchor: "top", text: () => "K", dy: 4, fill: COLOR.gris }),
      Plot.line(grilla, { x: "s", y: "payoff", stroke: COLOR.texto, strokeOpacity: 0.25, strokeWidth: 4 }),
      Plot.line(grilla, { x: "s", y: "valor", stroke: COLOR.primario, strokeWidth: 2.5 }),
      Plot.line(tramo, { x: "s", y: "recta", stroke: COLOR.acento, strokeWidth: 1.6,
                         strokeDasharray: "6 4", clip: true }),
      Plot.line(tramo, { x: "s", y: "parabola", stroke: COLOR.secundario, strokeWidth: 1.8,
                         strokeDasharray: "1.5 3", clip: true }),
      Plot.dot([{ s: S, valor: precio }], { x: "s", y: "valor", r: 6, fill: COLOR.texto, stroke: "white" }),
    ],
  });

  // Perfiles de delta y gamma: lado a lado si hay lugar, uno abajo del otro en el celular
  const anchoPerfil = ancho >= 600 ? Math.floor(ancho / 2) - 8 : ancho;
  const perfil = (campo, etiqueta, dominio) => Plot.plot({
    width: anchoPerfil,
    height: 200,
    marginLeft: 50,
    x: { label: "S →", domain: [S_MIN, S_MAX], grid: true },
    y: { label: `↑ ${etiqueta}`, domain: dominio, grid: true },
    marks: [
      Plot.ruleX([K], { stroke: COLOR.gris, strokeDasharray: "2 3" }),
      Plot.areaY(grilla, { x: "s", y: campo, fill: COLOR.primario, fillOpacity: 0.1 }),
      Plot.line(grilla, { x: "s", y: campo, stroke: COLOR.primario, strokeWidth: 2 }),
      Plot.dot([{ s: S, v: g[campo] }], { x: "s", y: "v", r: 5, fill: COLOR.acento, stroke: "white" }),
    ],
  });
  const perfiles = document.createElement("div");
  perfiles.style.cssText = "display: flex; flex-wrap: wrap; gap: 16px";
  perfiles.append(
    perfil("delta", "Delta", tipo === "call" ? [0, 1] : [-1, 0]),
    perfil("gamma", "Gamma", [0, d3.max(grilla, (p) => p.gamma) * 1.1]),
  );

  const paridad = bsPrecio(S, K, T, r, sigma, "call") - bsPrecio(S, K, T, r, sigma, "put");
  return [
    lecturas([
      [`Precio de la ${tipo}`, dinero(precio, 4)],
      ["Valor intrínseco", dinero(payoff(S))],
      ["Valor tiempo", dinero(precio - payoff(S), 4)],
      ["Delta", g.delta.toFixed(4)],
      ["Gamma", g.gamma.toFixed(4)],
      ["Vega: por +1 punto de vol", dinero(g.vega / 100, 4)],
      ["Theta: por día", dinero(g.theta / 365, 4)],
      ["Paridad: C − P = S − K·e^(−rT)", `${paridad.toFixed(3)} = ${(S - K * Math.exp(-r * T)).toFixed(3)}`],
    ]),
    principal,
    leyenda([
      [COLOR.primario, "━", `valor de la ${tipo} hoy`],
      [COLOR.texto, "━", "payoff al vencimiento"],
      [COLOR.acento, "╍", "recta del delta"],
      [COLOR.secundario, "┅", "parábola delta + gamma"],
    ]),
    perfiles,
  ];
}
