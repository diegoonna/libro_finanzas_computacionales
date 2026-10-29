// Simulador del Capítulo 10: Black-Litterman y la confianza en las views.
// Junta fig-equilibrio-vs-bl (retornos y pesos, del equilibrio a BL) y
// fig-efecto-confianza (la escala de Ω), con cada view y su confianza como controles.

import { Plot, Inputs } from "./librerias.js";
import { COLOR, blackLitterman } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

// El universo del capítulo
const ACTIVOS = ["Acciones USA", "Acciones EU", "Bonos"];
const UNIVERSO = {
  Sigma: [[0.0225, 0.0075, 0.0010], [0.0075, 0.0196, 0.0012], [0.0010, 0.0012, 0.0036]],
  wMercado: [0.55, 0.30, 0.15],
  delta: 2.5,
  tau: 0.05,
  P: [[0, 1, 0], [1, 0, -1]], // view 1: EU; view 2: USA − Bonos
};

// Confianza de 0 a 100 → factor de escala de Ω entre 10^1.5 y 10^−1.5, el rango de
// fig-efecto-confianza. 50 deja la Ω del capítulo (factor 1).
const factor = (confianza) => 10 ** (1.5 - (3 * confianza) / 100);

export function montar(raiz) {
  // Valores iniciales: las views del capítulo (EU 12%, USA − Bonos 4%) con su Ω
  const form = controles({
    q1: Inputs.range([0, 20], { value: 12, step: 0.5, label: "View 1: retorno de EU (%)" }),
    c1: Inputs.range([0, 100], { value: 50, step: 1, label: "Confianza en la view 1" }),
    q2: Inputs.range([-4, 10], { value: 4, step: 0.5, label: "View 2: USA − Bonos (%)" }),
    c2: Inputs.range([0, 100], { value: 50, step: 1, label: "Confianza en la view 2" }),
  });
  montarSimulador(raiz, form, dibujar);
}

const pct = (x, d = 1) => `${x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)}%`;

// extra: marcas adicionales; otrosValores: niveles que esas marcas necesitan dentro del eje
function barras(datos, series, colores, ancho, etiquetaY, extra = [], otrosValores = []) {
  const valores = [...datos.map((d) => d.valor), ...otrosValores];
  return Plot.plot({
    width: ancho,
    height: 260,
    marginLeft: 50,
    fx: { domain: ACTIVOS, label: null, padding: 0.15 },
    x: { domain: series, axis: null, padding: 0.1 },
    y: { label: etiquetaY, grid: true, tickFormat: (v) => `${v}%`,
         domain: [Math.min(0, ...valores) * 1.15, Math.max(...valores) * 1.15] },
    color: { domain: series, range: colores },
    marks: [
      Plot.barY(datos, { fx: "activo", x: "serie", y: "valor", fill: "serie" }),
      Plot.text(datos, { fx: "activo", x: "serie", y: "valor", text: (d) => `${d.valor.toFixed(1)}%`,
                         lineAnchor: "bottom", dy: -4, fontSize: 10, fill: COLOR.texto }),
      Plot.ruleY([0]),
      ...extra,
    ],
  });
}

function dibujar({ q1, c1, q2, c2 }, ancho) {
  const factores = [factor(c1), factor(c2)];
  const { Pi, mu, w } = blackLitterman({ ...UNIVERSO, Q: [q1 / 100, q2 / 100], factores });

  const retornos = ACTIVOS.flatMap((activo, i) => [
    { activo, serie: "Equilibrio Π", valor: Pi[i] * 100 },
    { activo, serie: "Black-Litterman", valor: mu[i] * 100 },
  ]);
  const pesos = ACTIVOS.flatMap((activo, i) => [
    { activo, serie: "Mercado", valor: UNIVERSO.wMercado[i] * 100 },
    { activo, serie: "Black-Litterman", valor: w[i] * 100 },
  ]);
  // La view 1 es absoluta: se marca sobre la barra de EU. La 2 es relativa y no tiene un nivel que marcar.
  const marcaView = Plot.tickY([{ activo: "Acciones EU", serie: "Black-Litterman", valor: q1 }],
    { fx: "activo", x: "serie", y: "valor", stroke: COLOR.acento, strokeWidth: 2.5 });

  const suma = w.reduce((s, x) => s + x, 0);
  return [
    lecturas([
      ["μ BL · Acciones USA", pct(mu[0], 2)],
      ["μ BL · Acciones EU", pct(mu[1], 2)],
      ["μ BL · Bonos", pct(mu[2], 2)],
      ["Peso BL · Acciones USA", pct(w[0])],
      ["Peso BL · Acciones EU", pct(w[1])],
      ["Peso BL · Bonos", pct(w[2])],
      ["Suma de los pesos", pct(suma)],
      ["Spread USA − Bonos (BL)", pct(mu[0] - mu[2], 2)],
    ]),
    barras(retornos, ["Equilibrio Π", "Black-Litterman"], [COLOR.gris, COLOR.primario], ancho,
           "↑ Retorno esperado", [marcaView], [q1]),
    leyenda([
      [COLOR.gris, "■", "equilibrio Π"],
      [COLOR.primario, "■", "Black-Litterman μ"],
      [COLOR.acento, "━", "lo que afirma la view 1"],
    ]),
    barras(pesos, ["Mercado", "Black-Litterman"], [COLOR.gris, COLOR.acento], ancho, "↑ Peso"),
    leyenda([
      [COLOR.gris, "■", "cartera de mercado"],
      [COLOR.acento, "■", "cartera BL sin restricciones"],
    ]),
    leyenda([[COLOR.texto, "Ω", `escalada ×${factores[0].toPrecision(2)} en la view 1 y
      ×${factores[1].toPrecision(2)} en la view 2`]]),
  ];
}
