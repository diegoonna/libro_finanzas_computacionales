// Simulador del Capítulo 16: la regresión espuria y la persistencia.
// Generaliza fig-regresion-espuria: los dos paseos aleatorios pasan a ser dos AR(1)
// independientes con persistencia φ (φ = 1 son los paseos del capítulo), y además del par
// que se dibuja se cuentan los falsos positivos en 1000 pares.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, parAR1, pendienteMCO, regresionEspuria } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const PARES = 1000;
const SEMILLA = 16000;

export function montar(raiz) {
  // Valores iniciales: dos paseos aleatorios de 500 períodos, como en el capítulo
  const form = controles({
    phi: Inputs.range([0, 1], { value: 1, step: 0.01, label: "Persistencia φ de cada serie" }),
    n: Inputs.range([50, 1000], { value: 500, step: 10, label: "Largo de las series" }),
    par: Inputs.range([1, 20], { value: 1, step: 1, label: "Par que se dibuja" }),
  });
  montarSimulador(raiz, form, dibujar);
}

// Los 1000 pares solo se recalculan si cambian φ o el largo, no al cambiar el par dibujado
let cache = { clave: null, tasas: null };
function tasas(phi, n) {
  const clave = `${phi}|${n}`;
  if (cache.clave !== clave) {
    const res = regresionEspuria({ phi, n, pares: PARES, semilla: SEMILLA });
    cache = { clave, tasas: {
      niveles: d3.mean(res, (r) => +(r.niveles.pValor < 0.05)),
      difs: d3.mean(res, (r) => +(r.difs.pValor < 0.05)),
    } };
  }
  return cache.tasas;
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
// p-values chicos en notación científica legible (p = 2×10⁻³⁹); los que no entran en un double, como cota
function pValor(p) {
  if (p >= 1e-4) return `p = ${p.toFixed(3)}`;
  if (p === 0) return "p < 10⁻³⁰⁰";
  const exponente = Math.floor(Math.log10(p));
  const mantisa = Math.round(p / 10 ** exponente);
  const superindice = [...String(-exponente)].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[c]).join("");
  return `p = ${mantisa}×10⁻${superindice}`;
}

function nube(xs, ys, ajuste, titulo, ancho) {
  const puntos = Array.from(xs, (x, i) => ({ x, y: ys[i] }));
  const extremos = d3.extent(xs);
  return Plot.plot({
    width: ancho,
    height: 240,
    marginLeft: 40,
    x: { label: "x →", grid: true },
    y: { label: "↑ y", grid: true },
    marks: [
      Plot.dot(puntos, { x: "x", y: "y", r: 1.6, fill: COLOR.gris, fillOpacity: 0.7 }),
      Plot.line(extremos.map((x) => ({ x, y: ajuste.alfa + ajuste.beta * x })),
                { x: "x", y: "y", stroke: COLOR.acento, strokeWidth: 2 }),
      Plot.text([titulo], { text: (d) => d, frameAnchor: "top-left", dx: 4, dy: 4, fontWeight: "bold",
                            fill: COLOR.primario }),
    ],
  });
}

function dibujar({ phi, n, par }, ancho) {
  const { niveles, difs } = tasas(phi, n);
  const { x, y } = parAR1(phi, n, SEMILLA + par - 1);
  const dx = x.slice(1).map((v, i) => v - x[i]);
  const dy = y.slice(1).map((v, i) => v - y[i]);
  const ajusteNiveles = pendienteMCO(x, y);
  const ajusteDifs = pendienteMCO(dx, dy);

  const serie = Array.from(x, (v, t) => ({ t, x: v, y: y[t] }));
  const tiempo = Plot.plot({
    width: ancho,
    height: 200,
    marginLeft: 40,
    x: { label: "Tiempo →" },
    y: { label: null, grid: true },
    marks: [
      Plot.lineY(serie, { x: "t", y: "x", stroke: COLOR.primario, strokeWidth: 1.2 }),
      Plot.lineY(serie, { x: "t", y: "y", stroke: COLOR.acento, strokeWidth: 1.2 }),
    ],
  });

  // Las dos nubes lado a lado en pantallas anchas, una debajo de la otra en el celular
  const lado = ancho >= 600 ? Math.floor((ancho - 16) / 2) : ancho;
  const nubes = document.createElement("div");
  nubes.style.cssText = "display: flex; flex-wrap: wrap; gap: 16px;";
  nubes.append(
    nube(x, y, ajusteNiveles, `En niveles: R² = ${ajusteNiveles.r2.toFixed(2)}`, lado),
    nube(dx, dy, ajusteDifs, `En diferencias: R² = ${ajusteDifs.r2.toFixed(3)}`, lado),
  );

  return [
    lecturas([
      [`"Significativas" en niveles (de ${PARES} pares)`, pct(niveles)],
      [`"Significativas" en diferencias`, pct(difs)],
      ["Lo que debería dar un test válido", "5%"],
      [`Par ${par} · niveles`, pValor(ajusteNiveles.pValor)],
      [`Par ${par} · diferencias`, pValor(ajusteDifs.pValor)],
    ]),
    tiempo,
    leyenda([
      [COLOR.primario, "━", "x"],
      [COLOR.acento, "━", "y, generada de forma independiente de x"],
    ]),
    nubes,
    leyenda([[COLOR.acento, "━", "recta MCO de y sobre x"]]),
  ];
}
