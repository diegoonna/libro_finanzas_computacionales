// Simulador del Capítulo 17: la fábrica de falsos descubrimientos.
// Generaliza fig-snooping-is-oos: el número de variantes probadas y los años de datos
// pasan a ser controles, y se puede repetir el experimento sobre muchas muestras de ruido.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, generadorNormal, estrategiaMomentum, sharpeAnual, normInv } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const VOL_DIARIA = 0.012; // ruido puro, drift cero, como en el capítulo
const REPETICIONES = 100;

export function montar(raiz) {
  // Valores iniciales: 60 ventanas de momentum y 10 años, como en el capítulo. La muestra
  // inicial (89) es una donde el espejismo se ve nítido, como la del texto (mejor ventana:
  // 45 días, Sharpe 1.01 in-sample y −0.42 afuera); el texto del simulador lo aclara.
  const form = controles({
    n: Inputs.range([1, 200], { value: 60, step: 1, label: "Variantes probadas N" }),
    anios: Inputs.range([2, 30], { value: 10, step: 1, label: "Años de datos" }),
    semilla: Inputs.button("Nuevo ruido", { value: 89, reduce: (v) => v + 1, label: "Muestra" }),
    repetir: Inputs.toggle({ label: `Repetir el experimento ${REPETICIONES} veces`, value: false }),
  });
  montarSimulador(raiz, form, dibujar);
}

// Un experimento: ruido puro, N ventanas de momentum (2, 3, …, N+1 días) evaluadas en los
// primeros 2/3 (in-sample) y en el último tercio (out-of-sample)
function experimento(n, anios, semilla) {
  const z = generadorNormal(semilla);
  const dias = 252 * anios;
  const r = Float64Array.from({ length: dias }, () => VOL_DIARIA * z());
  const corte = Math.round((dias * 2) / 3);
  const train = r.subarray(0, corte);
  const test = r.subarray(corte);
  const variantes = d3.range(2, n + 2).map((ventana) => ({
    ventana,
    is: sharpeAnual(estrategiaMomentum(train, ventana)),
    oos: sharpeAnual(estrategiaMomentum(test, ventana)),
  }));
  const mejor = variantes.reduce((a, b) => (b.is > a.is ? b : a));
  return { variantes, mejor, aniosIS: corte / 252 };
}

function dibujar({ n, anios, semilla, repetir }, ancho) {
  const { variantes, mejor, aniosIS } = experimento(n, anios, semilla * 7919);
  const tIS = mejor.is * Math.sqrt(aniosIS);
  // Vara de significancia en unidades de Sharpe: t = Sharpe·√años ≥ z  ⇒  Sharpe ≥ z/√años
  const vara = 1.96 / Math.sqrt(aniosIS);
  const varaBonferroni = normInv(1 - 0.025 / n) / Math.sqrt(aniosIS);

  // Mismo eje vertical para in-sample y out-of-sample, así se comparan a ojo
  const extremo = Math.max(...variantes.flatMap((d) => [Math.abs(d.is), Math.abs(d.oos)]), vara) * 1.1;
  const dominio = [-extremo, extremo];
  const colorBarra = (base) => (d) => (d.ventana === mejor.ventana ? COLOR.acento : base);
  const barras = (campo, etiqueta, base) => Plot.plot({
    width: ancho,
    height: 170,
    marginLeft: 50,
    x: { label: campo === "oos" ? "Ventana de momentum (días) →" : null, type: "band",
         tickFormat: (v) => (v % 10 === 0 ? v : "") },
    y: { label: `↑ ${etiqueta}`, grid: true, domain: dominio },
    marks: [
      Plot.barY(variantes, { x: "ventana", y: campo, fill: colorBarra(base) }),
      Plot.ruleY([0], { stroke: COLOR.texto }),
      campo === "is" ? Plot.ruleY([vara], { stroke: COLOR.texto, strokeDasharray: "4 3", strokeOpacity: 0.6 }) : null,
    ],
  });

  // La mejor in-sample a medida que se prueban más variantes, y lo que hace afuera
  let mejorHasta = null;
  const camino = variantes.map((d, i) => {
    if (!mejorHasta || d.is > mejorHasta.is) mejorHasta = d;
    return { probadas: i + 1, is: mejorHasta.is, oos: mejorHasta.oos };
  });
  const evolucion = Plot.plot({
    width: ancho,
    height: 220,
    marginLeft: 50,
    x: { label: "Variantes probadas →", grid: true },
    y: { label: "↑ Sharpe de la mejor hasta ahí", grid: true },
    marks: [
      Plot.ruleY([0], { stroke: COLOR.texto }),
      Plot.ruleY([vara], { stroke: COLOR.texto, strokeDasharray: "4 3", strokeOpacity: 0.6 }),
      Plot.line(d3.range(1, n + 1).map((k) => ({ k, v: normInv(1 - 0.025 / k) / Math.sqrt(aniosIS) })),
                { x: "k", y: "v", stroke: COLOR.secundario, strokeDasharray: "2 3", strokeWidth: 1.5 }),
      Plot.line(camino, { x: "probadas", y: "is", stroke: COLOR.acento, strokeWidth: 2.2, curve: "step-after" }),
      Plot.line(camino, { x: "probadas", y: "oos", stroke: COLOR.primario, strokeWidth: 2.2, curve: "step-after" }),
    ],
  });

  const salida = [
    lecturas([
      ["Mejor ventana in-sample", `${mejor.ventana} días`],
      ["Su Sharpe in-sample", mejor.is.toFixed(2)],
      ["Su t in-sample (Sharpe·√años)", tIS.toFixed(2)],
      ["Su Sharpe out-of-sample", mejor.oos.toFixed(2)],
      ["Vara de Bonferroni (Sharpe in-sample)", varaBonferroni.toFixed(2)],
      ["P(algún falso positivo) si fueran independientes", `${((1 - 0.95 ** n) * 100).toFixed(0)}%`],
    ]),
    barras("is", "Sharpe in-sample", COLOR.gris),
    barras("oos", "Sharpe out-of-sample", COLOR.primario),
    leyenda([
      [COLOR.acento, "■", "la ventana elegida (la mejor in-sample)"],
      [COLOR.texto, "╍", "vara del 5% sin corregir (t = 1.96, el |t| > 2 del capítulo)"],
    ]),
    evolucion,
    leyenda([
      [COLOR.acento, "━", "Sharpe in-sample de la mejor hasta ahí"],
      [COLOR.primario, "━", "su Sharpe out-of-sample"],
      [COLOR.secundario, "┅", "vara corregida por Bonferroni para ese número de intentos"],
    ]),
  ];

  if (repetir) {
    const nube = d3.range(REPETICIONES).map((i) => {
      const { mejor: m } = experimento(n, anios, 104729 + semilla * 7919 + i * 31);
      return { is: m.is, oos: m.oos };
    });
    const pasan = nube.filter((d) => d.is >= vara).length;
    const lim = Math.max(...nube.flatMap((d) => [Math.abs(d.is), Math.abs(d.oos)])) * 1.1;
    salida.push(
      lecturas([
        [`Sharpe in-sample medio de la elegida (${REPETICIONES} muestras)`, d3.mean(nube, (d) => d.is).toFixed(2)],
        ["Sharpe out-of-sample medio", d3.mean(nube, (d) => d.oos).toFixed(2)],
        ["Muestras en que la elegida pasa la vara del 5%", `${pasan}%`],
      ]),
      Plot.plot({
        width: Math.min(ancho, 460),
        height: Math.min(ancho, 460) * 0.85,
        marginLeft: 50,
        x: { label: "Sharpe in-sample de la elegida →", domain: [-lim, lim], grid: true },
        y: { label: "↑ Su Sharpe out-of-sample", domain: [-lim, lim], grid: true },
        marks: [
          Plot.ruleX([0], { stroke: COLOR.texto }),
          Plot.ruleY([0], { stroke: COLOR.texto }),
          Plot.ruleX([vara], { stroke: COLOR.texto, strokeDasharray: "4 3", strokeOpacity: 0.6 }),
          Plot.dot(nube, { x: "is", y: "oos", r: 4, fill: COLOR.acento, fillOpacity: 0.6 }),
        ],
      }),
      leyenda([[COLOR.acento, "●", `cada punto es una muestra de ruido distinta; la línea punteada es la vara del 5%`]]),
    );
  }
  return salida;
}
