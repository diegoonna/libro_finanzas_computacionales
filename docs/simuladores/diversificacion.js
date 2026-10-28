// Simulador del Capítulo 8: diversificación con dos activos.
// Generaliza fig-diversificacion-correlacion: la correlación pasa de 4 valores fijos
// a un control continuo, y se agregan los pesos y el perfil de cada activo.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

export function montar(raiz) {
  // Valores iniciales: los activos de la figura (acción 14%/28%, bono 5%/6%)
  const form = controles({
    rho: Inputs.range([-1, 1], { value: 0.5, step: 0.05, label: "Correlación ρ" }),
    w: Inputs.range([0, 100], { value: 50, step: 1, label: "Peso en A (%)" }),
    muA: Inputs.range([0, 25], { value: 14, step: 0.5, label: "Retorno de A (%)" }),
    volA: Inputs.range([1, 50], { value: 28, step: 1, label: "Volatilidad de A (%)" }),
    muB: Inputs.range([0, 25], { value: 5, step: 0.5, label: "Retorno de B (%)" }),
    volB: Inputs.range([1, 50], { value: 6, step: 1, label: "Volatilidad de B (%)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

function dibujar({ rho, w, muA, volA, muB, volB }, ancho) {
  // Todo en puntos porcentuales: la fórmula de la volatilidad es homogénea de grado 1
  const mezcla = (wa, r) => ({
    w: wa,
    ret: wa * muA + (1 - wa) * muB,
    vol: Math.sqrt((wa * volA) ** 2 + ((1 - wa) * volB) ** 2 + 2 * wa * (1 - wa) * r * volA * volB),
  });
  const grilla = d3.range(0, 1.0001, 0.005);
  const curva = grilla.map((wa) => mezcla(wa, rho));
  const recta = grilla.map((wa) => mezcla(wa, 1));
  const actual = mezcla(w / 100, rho);
  const sinDiversificar = mezcla(w / 100, 1);

  // Mínima varianza sin cortos: el peso que anula la derivada de la varianza, acotado a [0, 1].
  // Si el denominador es 0 (ρ = 1 con vols iguales), todas las mezclas empatan: queda el activo menos volátil.
  const denominador = volA ** 2 + volB ** 2 - 2 * rho * volA * volB;
  let wMin = volA <= volB ? 1 : 0;
  if (denominador > 1e-12) {
    wMin = Math.min(1, Math.max(0, (volB ** 2 - rho * volA * volB) / denominador));
  }
  const minVar = mezcla(wMin, rho);

  const activos = [
    { vol: volA, ret: muA, nombre: "A (acción)" },
    { vol: volB, ret: muB, nombre: "B (bono)" },
  ];

  const grafico = Plot.plot({
    width: ancho,
    height: 380,
    marginLeft: 50,
    x: { label: "Volatilidad anual (%) →", domain: [0, Math.max(volA, volB) * 1.15], grid: true },
    y: { label: "↑ Retorno esperado anual (%)", grid: true,
         domain: [Math.min(muA, muB) - 1, Math.max(muA, muB) + 1] },
    marks: [
      Plot.line(recta, { x: "vol", y: "ret", stroke: COLOR.gris, strokeWidth: 1.5, strokeDasharray: "6 4" }),
      Plot.line(curva, { x: "vol", y: "ret", stroke: COLOR.primario, strokeWidth: 2.5 }),
      // Flecha horizontal: el riesgo que se ahorra respecto de ρ = 1, con el mismo retorno
      Plot.arrow([{ desde: sinDiversificar.vol, hasta: actual.vol, ret: actual.ret }], {
        x1: "desde", x2: "hasta", y1: "ret", y2: "ret",
        stroke: COLOR.secundario, strokeWidth: 1.5, headLength: 6,
      }),
      Plot.dot(activos, { x: "vol", y: "ret", fill: COLOR.texto, r: 4 }),
      Plot.text(activos, { x: "vol", y: "ret", text: "nombre", dx: 8, textAnchor: "start", fill: COLOR.texto }),
      Plot.dot([minVar], { x: "vol", y: "ret", symbol: "diamond", r: 6, fill: COLOR.secundario }),
      Plot.dot([actual], { x: "vol", y: "ret", r: 7, fill: COLOR.acento, stroke: "white" }),
      Plot.text([actual], { x: "vol", y: "ret", text: () => "tu cartera", dy: -14,
                            fill: COLOR.acento, fontWeight: "bold" }),
    ],
  });

  return [
    lecturas([
      ["Retorno esperado", `${actual.ret.toFixed(2)}%`],
      ["Volatilidad de la mezcla", `${actual.vol.toFixed(2)}%`],
      ["Volatilidad si ρ = 1", `${sinDiversificar.vol.toFixed(2)}%`],
      ["Riesgo que ahorra diversificar", `${(sinDiversificar.vol - actual.vol).toFixed(2)} pp`],
      ["Mínima varianza: peso en A", `${(minVar.w * 100).toFixed(1)}%`],
      ["Mínima varianza: volatilidad", `${minVar.vol.toFixed(2)}%`],
    ]),
    grafico,
    leyenda([
      [COLOR.primario, "━", "mezclas con la ρ elegida"],
      [COLOR.gris, "╍", "mezclas con ρ = 1"],
      [COLOR.acento, "●", "tu cartera"],
      [COLOR.secundario, "◆", "mínima varianza"],
      [COLOR.secundario, "→", "riesgo ahorrado"],
    ]),
  ];
}
