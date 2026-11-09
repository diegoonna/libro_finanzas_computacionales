// Simulador del Capítulo 1: valor tiempo del dinero.
// Junta el ejemplo de interés compuesto y el mapa de fig-conversion-tasas: la misma TNA
// rinde distinto según cada cuánto se capitaliza, y el interés simple queda como piso.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, valorFuturo, teaDesdeTna } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const FRECUENCIAS = new Map([
  ["Anual", 1], ["Semestral", 2], ["Trimestral", 4], ["Mensual", 12], ["Diaria", 365], ["Continua", Infinity],
]);

const pesos = (x) => `$${d3.format(",.2f")(x)}`;
const pct = (x) => `${(x * 100).toFixed(2)}%`;

export function montar(raiz) {
  // Valores iniciales: el ejemplo del capítulo ($100,000 al 10% anual durante 10 años)
  const form = controles({
    capital: Inputs.range([1000, 1000000], { value: 100000, step: 1000, label: "Capital inicial ($)" }),
    tna: Inputs.range([0, 120], { value: 10, step: 0.5, label: "Tasa nominal anual, TNA (%)" }),
    anios: Inputs.range([1, 30], { value: 10, step: 1, label: "Plazo (años)" }),
    m: Inputs.select(FRECUENCIAS, { value: 1, label: "Capitalización" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ capital, tna, anios, m }, ancho) {
  const r = tna / 100;
  // Los intereses se acreditan al final de cada período: entre acreditaciones el saldo no
  // cambia (escalones). Con capitalización diaria o continua la curva ya es suave.
  const saldo = (t) => (m === Infinity ? valorFuturo(capital, r, m, t)
    : capital * (1 + r / m) ** Math.floor(m * t + 1e-9));
  const grilla = d3.range(0, anios + 1e-9, anios / 600).concat([anios]);
  const serie = (nombre, f) => grilla.map((t) => ({ t, v: f(t), nombre }));
  const elegida = serie("elegida", saldo);
  const continua = serie("continua", (t) => valorFuturo(capital, r, Infinity, t));
  const simple = serie("simple", (t) => capital * (1 + r * t));

  const vf = valorFuturo(capital, r, m, anios);
  const vfSimple = capital * (1 + r * anios);
  const tea = teaDesdeTna(r, m);
  const duplicar = tea > 0 ? Math.log(2) / Math.log(1 + tea) : Infinity;

  const grafico = Plot.plot({
    width: ancho,
    height: 360,
    marginLeft: 80,
    x: { label: "Años →", domain: [0, anios], grid: true },
    y: { label: "↑ Saldo ($)", grid: true, tickFormat: d3.format("$~s") },
    marks: [
      Plot.ruleY([capital], { stroke: COLOR.gris, strokeDasharray: "6 4" }),
      Plot.line(simple, { x: "t", y: "v", stroke: COLOR.gris, strokeWidth: 2 }),
      Plot.line(continua, { x: "t", y: "v", stroke: COLOR.secundario, strokeWidth: 1.5, strokeDasharray: "5 4" }),
      Plot.line(elegida, { x: "t", y: "v", stroke: COLOR.primario, strokeWidth: 2.5 }),
      Plot.dot([{ t: anios, v: vf }], { x: "t", y: "v", r: 6, fill: COLOR.acento, stroke: "white" }),
      Plot.text([{ t: anios, v: vf }], { x: "t", y: "v", text: () => "VF", dx: -10, dy: -12,
                                         textAnchor: "end", fill: COLOR.acento, fontWeight: "bold" }),
    ],
  });

  return [
    lecturas([
      ["Valor futuro", pesos(vf)],
      ["Interés ganado", pesos(vf - capital)],
      ["TEA equivalente", pct(tea)],
      ["Tasa continua equivalente", pct(Math.log1p(tea))],
      ["Extra sobre el interés simple", pesos(vf - vfSimple)],
      ["Años para duplicar el capital", Number.isFinite(duplicar) ? duplicar.toFixed(2) : "nunca"],
    ]),
    grafico,
    leyenda([
      [COLOR.primario, "━", "capitalización elegida"],
      [COLOR.secundario, "┅", "capitalización continua (el techo)"],
      [COLOR.gris, "━", "interés simple (el piso)"],
    ]),
  ];
}
