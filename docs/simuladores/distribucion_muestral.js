// Simulador del Capítulo 15: la distribución muestral de α y β en el CAPM.
// Generaliza fig-distribucion-muestral: repite la regresión en 2000 muestras con los años
// de datos, el alfa verdadero y el ruido propio del activo como controles, y cuenta cuántas
// veces el test t declara significativo al alfa.

import { Plot, Inputs, d3 } from "./librerias.js";
import { COLOR, generadorNormal, normInv, tInv } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const MUESTRAS = 2000;
const BETA = 1.3;
const MERCADO = { media: 0.005, desvio: 0.04 }; // exceso mensual del mercado, como en el capítulo

export function montar(raiz) {
  // Valores iniciales: los del capítulo (10 años, α = 0.2% mensual, ruido 3% mensual)
  const form = controles({
    anios: Inputs.range([1, 50], { value: 10, step: 1, label: "Años de datos mensuales" }),
    alfa: Inputs.range([0, 1], { value: 0.2, step: 0.05, label: "α verdadero (% mensual)" }),
    ruido: Inputs.range([0.5, 6], { value: 3, step: 0.25, label: "Ruido propio σε (% mensual)" }),
  });
  montarSimulador(raiz, form, dibujar);
}

// MCO en cada muestra, con sumas acumuladas en una sola pasada (las mismas fórmulas que
// regresionSimple). Cada muestra usa siempre los mismos números aleatorios: más años
// extienden la muestra en lugar de cambiarla.
export function simular(meses, alfa, ruido) {
  const tCritico = tInv(0.975, meses - 2);
  return Array.from({ length: MUESTRAS }, (_, m) => {
    const z = generadorNormal(15000 + m);
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let t = 0; t < meses; t++) {
      const x = MERCADO.media + MERCADO.desvio * z();
      const y = alfa + BETA * x + ruido * z();
      sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y;
    }
    const mx = sx / meses, my = sy / meses;
    const Sxx = sxx - meses * mx * mx;
    const Sxy = sxy - meses * mx * my;
    const beta = Sxy / Sxx;
    const a = my - beta * mx;
    const ssr = Math.max(syy - meses * my * my - beta * Sxy, 0);
    const seAlfa = Math.sqrt((ssr / (meses - 2)) * (1 / meses + (mx * mx) / Sxx));
    return { beta, alfa: a, significativo: Math.abs(a / seAlfa) > tCritico };
  });
}

// Años para que el test t al 5% detecte el alfa el 80% de las veces (aproximación normal):
// se(α̂) ≈ σε·√((1 + μ²/σ²)/n), y hace falta α/se ≈ z(0.975) + z(0.80)
function aniosParaDetectar(alfa, ruido) {
  const z = normInv(0.975) + normInv(0.8);
  return ((z * ruido) / alfa) ** 2 * (1 + (MERCADO.media / MERCADO.desvio) ** 2) / 12;
}

const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
// Con el signo menos tipográfico, y sin "−0.00"
const conSigno = (x, d = 2) => (Number(x.toFixed(d)) < 0 ? `−${Math.abs(x).toFixed(d)}` : Math.abs(x).toFixed(d));

function textoAnios(anios) {
  if (anios === null) return "no hay α que detectar";
  return `≈ ${anios < 10 ? anios.toFixed(1) : Math.round(anios)}`;
}

function histograma(datos, valor, real, etiqueta, ancho, dominio, relleno) {
  return Plot.plot({
    width: ancho,
    height: 200,
    marginLeft: 15,
    x: { label: etiqueta, domain: dominio },
    y: { axis: null, insetTop: 18 }, // aire para el rótulo del valor real
    color: { domain: ["significativo al 5%", "no significativo"], range: [COLOR.acento, COLOR.gris] },
    marks: [
      Plot.rectY(datos, Plot.binX({ y: "count" }, {
        x: { value: valor, domain: dominio, thresholds: 50 }, ...relleno, insetLeft: 0.5, insetRight: 0.5,
      })),
      // El cero, solo si cae dentro del eje
      Plot.ruleX(dominio[0] <= 0 && 0 <= dominio[1] ? [0] : [], { stroke: COLOR.texto, strokeDasharray: "2 3" }),
      Plot.ruleX([real], { stroke: COLOR.texto, strokeWidth: 2 }),
      Plot.text([real], { x: (d) => d, frameAnchor: "top", dy: 2, text: () => `real: ${real}`,
                          textAnchor: "start", dx: 4, fill: COLOR.texto }),
      Plot.ruleY([0]),
    ],
  });
}

function dibujar({ anios, alfa, ruido }, ancho) {
  const meses = anios * 12;
  const a = alfa / 100;
  const s = ruido / 100;
  const muestras = simular(meses, a, s);
  const betas = muestras.map((d) => d.beta);
  const alfas = muestras.map((d) => d.alfa * 100);

  // Dominios centrados en el valor real, con ±4.5 errores estándar teóricos; el del alfa incluye
  // siempre el cero, que es lo que el test compara
  const factor = Math.sqrt((1 + (MERCADO.media / MERCADO.desvio) ** 2) / meses);
  const seAlfa = s * factor * 100;
  const seBeta = s / (MERCADO.desvio * Math.sqrt(meses));
  const dominioBeta = [BETA - 4.5 * seBeta, BETA + 4.5 * seBeta];
  const dominioAlfa = [Math.min(0, alfa - 4.5 * seAlfa), Math.max(0, alfa + 4.5 * seAlfa)];

  const negativos = d3.mean(muestras, (d) => +(d.alfa < 0));
  const significativos = d3.mean(muestras, (d) => +d.significativo);
  const anios80 = alfa > 0 ? aniosParaDetectar(a, s) : null;
  const filas = muestras.map((d) => ({ ...d, a100: d.alfa * 100,
    grupo: d.significativo ? "significativo al 5%" : "no significativo" }));

  return [
    lecturas([
      ["β estimado (media ± desvío)", `${d3.mean(betas).toFixed(2)} ± ${d3.deviation(betas).toFixed(2)}`],
      ["α estimado (% mensual)", `${conSigno(d3.mean(alfas))}% ± ${d3.deviation(alfas).toFixed(2)}%`],
      ["Muestras con α negativo", pct(negativos)],
      ["Muestras con α significativo", pct(significativos)],
      ["Años para detectarlo el 80% de las veces", textoAnios(anios80)],
    ]),
    histograma(filas, "beta", BETA, "β estimado →", ancho, dominioBeta, { fill: COLOR.primario }),
    histograma(filas, "a100", alfa, "α estimado (% mensual) →", ancho, dominioAlfa, { fill: "grupo" }),
    leyenda([
      [COLOR.acento, "■", "α estimado significativo al 5% (|t| por encima del crítico)"],
      [COLOR.gris, "■", "no significativo"],
      [COLOR.texto, "┃", "valor real"],
    ]),
  ];
}
