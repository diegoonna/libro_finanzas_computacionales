// Simulador del Capítulo 11: VaR constante contra EWMA sobre los datos reales del libro.
// Lleva fig-ewma-var-dinamico y el test de Kupiec (fig-kupiec-binomial) a datos/precios.csv:
// el activo, λ y la confianza son controles, y una línea de tiempo muestra lo que Kupiec
// no ve, cuándo caen las excepciones.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, normInv, varianzaEWMA, colaBinomial } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const VENTANA = 63; // un trimestre de ruedas, para medir cuánto se agrupan las excepciones

export async function montar(raiz) {
  raiz.textContent = "Cargando datos/precios.csv…";
  let tabla;
  try {
    const respuesta = await fetch(new URL("../datos/precios.csv", import.meta.url));
    tabla = d3.csvParse(await respuesta.text(), d3.autoType);
  } catch (error) {
    raiz.textContent = `No se pudo cargar el dataset del libro (${error.message}).`;
    return;
  }
  raiz.textContent = "";

  // Retornos simples por activo, como pct_change().dropna()
  const fechas = tabla.slice(1).map((d) => d.Date);
  const retornos = Object.fromEntries(tabla.columns.slice(1).map((t) =>
    [t, tabla.slice(1).map((d, i) => d[t] / tabla[i][t] - 1)]));

  // Valores iniciales: SPY, λ de RiskMetrics y el VaR 95% del capítulo
  const form = controles({
    activo: Inputs.select(Object.keys(retornos), { value: "SPY", label: "Activo" }),
    lambda: Inputs.range([0.8, 0.995], { value: 0.94, step: 0.005, label: "λ de EWMA" }),
    confianza: Inputs.radio(["95%", "99%"], { value: "95%", label: "Confianza del VaR" }),
  });
  montarSimulador(raiz, form, (valores, ancho) => dibujar(valores, ancho, fechas, retornos));
}

// Ventana de VENTANA ruedas con más excepciones: [cantidad, fecha de inicio]
function peorVentana(excepcion, fechas) {
  let enVentana = 0;
  let mejor = [0, fechas[0]];
  for (let t = 0; t < excepcion.length; t++) {
    enVentana += excepcion[t] - (t >= VENTANA ? excepcion[t - VENTANA] : 0);
    if (enVentana > mejor[0]) mejor = [enVentana, fechas[Math.max(0, t - VENTANA + 1)]];
  }
  return mejor;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesAnio = (d) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const detalle = (valor, texto) => `${valor}<br><small style="font-size: 0.7em">${texto}</small>`;
const pValor = (p) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);

function dibujar({ activo, lambda, confianza }, ancho, fechas, retornos) {
  const r = retornos[activo];
  const n = r.length;
  const alfa = confianza === "95%" ? 0.05 : 0.01;
  const z = normInv(alfa);
  // Media y desvío de toda la muestra (np.std, poblacional), como el VaR constante del capítulo
  const m = d3.mean(r);
  const s = Math.sqrt(d3.mean(r, (x) => (x - m) ** 2));
  const v = varianzaEWMA(r, lambda);

  const limiteConstante = m + z * s;
  const limiteEWMA = Array.from(v, (vt) => m + z * Math.sqrt(vt));
  const excConstante = r.map((x) => +(x < limiteConstante));
  const excEWMA = r.map((x, t) => +(x < limiteEWMA[t]));
  const kConstante = d3.sum(excConstante);
  const kEWMA = d3.sum(excEWMA);
  const pConstante = colaBinomial(kConstante, n, alfa);
  const pEWMA = colaBinomial(kEWMA, n, alfa);
  const veredicto = (p) => (p > 0.05 ? "aprueba" : "rechazado");
  const [peorConstante, desdeConstante] = peorVentana(excConstante, fechas);
  const [peorEWMA, desdeEWMA] = peorVentana(excEWMA, fechas);

  const serie = r.map((x, t) => ({ fecha: fechas[t], r: x * 100, ewma: limiteEWMA[t] * 100 }));
  const retornosVaR = Plot.plot({
    width: ancho,
    height: 300,
    marginLeft: 45,
    x: { label: null, type: "utc" },
    y: { label: "↑ Retorno diario (%)", grid: true },
    marks: [
      Plot.dot(serie, { x: "fecha", y: "r", r: 1.3, fill: COLOR.gris, fillOpacity: 0.6 }),
      Plot.ruleY([limiteConstante * 100], { stroke: COLOR.secundario, strokeWidth: 1.8, strokeDasharray: "6 4" }),
      Plot.lineY(serie, { x: "fecha", y: "ewma", stroke: COLOR.primario, strokeWidth: 1.4 }),
      Plot.ruleY([0], { stroke: COLOR.texto, strokeOpacity: 0.3 }),
    ],
  });

  // Línea de tiempo de las excepciones: el "cuándo" que el test de Kupiec no mira
  const marcas = [
    ...fechas.filter((_, t) => excConstante[t]).map((fecha) => ({ fecha, metodo: "Constante" })),
    ...fechas.filter((_, t) => excEWMA[t]).map((fecha) => ({ fecha, metodo: "EWMA" })),
  ];
  const lineaTiempo = Plot.plot({
    width: ancho,
    height: 95,
    marginLeft: 75,
    x: { label: null, type: "utc", domain: [fechas[0], fechas[n - 1]] },
    y: { label: null, domain: ["Constante", "EWMA"] },
    color: { domain: ["Constante", "EWMA"], range: [COLOR.secundario, COLOR.primario] },
    marks: [Plot.tickX(marcas, { x: "fecha", y: "metodo", stroke: "metodo", strokeWidth: 1.5 })],
  });

  // La binomial de Kupiec y dónde caen los dos conteos
  const esperado = n * alfa;
  const desvio = Math.sqrt(n * alfa * (1 - alfa));
  const desde = Math.max(0, Math.floor(Math.min(esperado - 4 * desvio, kConstante - 2, kEWMA - 2)));
  const hasta = Math.ceil(Math.max(esperado + 5 * desvio, kConstante + 2, kEWMA + 2));
  const binomial = d3.range(desde, hasta + 1).map((k) => ({
    k, prob: (colaBinomial(k, n, alfa) - colaBinomial(k + 1, n, alfa)) * 100,
    rechazo: colaBinomial(k, n, alfa) < 0.05,
  }));
  const altura = d3.max(binomial, (d) => d.prob);
  // Ordenados de menor a mayor: la etiqueta del menor va a la izquierda de su línea y la del mayor a la derecha
  const observados = [
    { k: kConstante, texto: `constante: ${kConstante}`, color: COLOR.secundario },
    { k: kEWMA, texto: `EWMA: ${kEWMA}`, color: COLOR.primario },
  ].sort((a, b) => a.k - b.k);
  const kupiec = Plot.plot({
    width: ancho,
    height: 220,
    marginLeft: 45,
    x: { label: `Excepciones en ${n} ruedas →` },
    y: { label: "↑ Probabilidad (%)", grid: true, domain: [0, altura * 1.3] },
    marks: [
      Plot.rectY(binomial, { x1: (d) => d.k - 0.4, x2: (d) => d.k + 0.4, y: "prob",
                             fill: (d) => (d.rechazo ? COLOR.acento : COLOR.gris), fillOpacity: 0.55 }),
      Plot.ruleX([esperado], { stroke: COLOR.texto, strokeDasharray: "2 3" }),
      Plot.ruleX(observados, { x: "k", stroke: "color", strokeWidth: 2.5, y1: 0, y2: altura * 1.15 }),
      Plot.text(observados.slice(0, 1), { x: "k", y: altura * 1.15, text: "texto", fill: "color", dx: -4,
                                          dy: -7, fontWeight: "bold", textAnchor: "end" }),
      Plot.text(observados.slice(1), { x: "k", y: altura * 1.15, text: "texto", fill: "color", dx: 4,
                                       dy: -7, fontWeight: "bold", textAnchor: "start" }),
      Plot.ruleY([0]),
    ],
  });

  return [
    // El valor grande es el número; el detalle va en una segunda línea más chica
    lecturas([
      ["Excepciones esperadas", detalle(esperado.toFixed(1), `de ${n} días`)],
      ["Excepciones · VaR constante", detalle(kConstante, `${pValor(pConstante)} · ${veredicto(pConstante)}`)],
      ["Excepciones · VaR EWMA", detalle(kEWMA, `${pValor(pEWMA)} · ${veredicto(pEWMA)}`)],
      ["Peor trimestre · constante", detalle(peorConstante, `desde ${mesAnio(desdeConstante)}`)],
      ["Peor trimestre · EWMA", detalle(peorEWMA, `desde ${mesAnio(desdeEWMA)}`)],
      ["Vol. anual hoy · EWMA / constante",
       `${(Math.sqrt(v[n - 1] * 252) * 100).toFixed(1)}% / ${(s * Math.sqrt(252) * 100).toFixed(1)}%`],
    ]),
    retornosVaR,
    leyenda([
      [COLOR.gris, "●", "retorno de cada día"],
      [COLOR.secundario, "╍", `VaR ${confianza} constante`],
      [COLOR.primario, "━", `VaR ${confianza} EWMA (λ = ${lambda.toFixed(3)})`],
    ]),
    lineaTiempo,
    leyenda([[COLOR.texto, "│", "cada marca es un día en que la pérdida superó al VaR"]]),
    kupiec,
    leyenda([
      [COLOR.gris, "■", `Binomial(${n}, ${alfa * 100}%): excepciones esperables si el VaR está bien calibrado`],
      [COLOR.acento, "■", "zona de rechazo de Kupiec"],
    ]),
  ];
}
