// Simulador del Capítulo 9: inestabilidad de Markowitz frente a HRP.
// Generaliza fig-inestabilidad-pesos (de dos muestras a cuarenta, con la correlación de
// los gemelos y el largo de la muestra como controles) y la prueba fuera de muestra de
// fig-vol-oos: cada muestra se evalúa en 250 días que el estimador no vio.

import { Plot, Inputs } from "./librerias.js";
import { COLOR, generadorNormal, covMuestral, ordenJerarquico, pesosHRP, minimaVarianza,
         volCartera } from "./finanzas.js";
import { controles, lecturas, leyenda, montar as montarSimulador } from "./marco.js";

const MUESTRAS = 40;
const DIAS_PRUEBA = 250;
// Volatilidad diaria de cada gemelo en simular_retornos: factor 1.5% + ruido propio 0.4%.
// La correlación reparte esa volatilidad entre el factor común y el ruido, sin cambiarla.
const VOL_GEMELO = Math.hypot(0.015, 0.004);

export function montar(raiz) {
  // Valores iniciales: los gemelos del capítulo (ρ ≈ 0.93) y 250 días de entrenamiento,
  // como la prueba fuera de muestra
  const form = controles({
    rho: Inputs.range([0, 0.99], { value: 0.93, step: 0.01, label: "Correlación de los gemelos" }),
    dias: Inputs.range([60, 2000], { value: 250, step: 10, label: "Días para estimar" }),
    destacada: Inputs.range([1, MUESTRAS], { value: 1, step: 1, label: "Muestra destacada" }),
  });
  montarSimulador(raiz, form, dibujar);
}

// Cada muestra usa siempre los mismos números aleatorios: mover un control cambia el
// modelo, no la suerte. Los primeros 250 días son la prueba; los siguientes, el entrenamiento.
function experimento(rho, dias) {
  const factor = VOL_GEMELO * Math.sqrt(rho);
  const propio = VOL_GEMELO * Math.sqrt(1 - rho);
  return Array.from({ length: MUESTRAS }, (_, m) => {
    const z = generadorNormal(1000 + m);
    const filas = Array.from({ length: DIAS_PRUEBA + dias }, () => {
      const comun = factor * z();
      return [comun + 0.0004 + propio * z(), comun + 0.0004 + propio * z(),
              0.0005 + 0.012 * z(), 0.0003 + 0.010 * z(), 0.0004 + 0.008 * z()];
    });
    const Sigma = covMuestral(filas.slice(DIAS_PRUEBA));
    const SigmaPrueba = covMuestral(filas.slice(0, DIAS_PRUEBA));
    const markowitz = minimaVarianza(Sigma, true);
    const hrp = pesosHRP(Sigma, ordenJerarquico(Sigma));
    const volFuera = (w) => volCartera(w, SigmaPrueba) * Math.sqrt(252);
    return { markowitz, hrp, volMarkowitz: volFuera(markowitz), volHRP: volFuera(hrp) };
  });
}

const rango = (v) => `${pct(Math.min(...v))} a ${pct(Math.max(...v))}`;
const pct = (x, d = 0) => `${x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)}%`;
const promedio = (v) => v.reduce((s, x) => s + x, 0) / v.length;

function dibujar({ rho, dias, destacada }, ancho) {
  const muestras = experimento(rho, dias);
  const puntos = (metodo) => muestras.flatMap((m, k) => m[metodo].map((w, i) => ({
    // Desplazamiento horizontal fijo por muestra, para que los puntos no se tapen
    x: i + ((k * 0.618) % 1 - 0.5) * 0.5, w: w * 100, k: k + 1,
  })));
  const todos = muestras.flatMap((m) => [...m.markowitz, ...m.hrp]).map((w) => w * 100);
  const dominioY = [Math.min(0, ...todos) - 3, Math.max(...todos) + 3];

  const panel = (metodo, titulo) => {
    const datos = puntos(metodo);
    // Rótulo propio y no el title de Plot: ese sale como <h2> y Quarto lo estiliza como sección
    const rotulo = document.createElement("div");
    rotulo.className = "leyenda";
    rotulo.innerHTML = `<strong>${titulo}</strong>`;
    return [rotulo, Plot.plot({
      width: ancho,
      height: 230,
      marginLeft: 50,
      x: { domain: [-0.5, 4.5], ticks: [0, 1, 2, 3, 4], tickFormat: (i) => `Activo ${i}`, label: null },
      y: { label: "↑ Peso (%)", domain: dominioY, grid: true },
      marks: [
        Plot.rectY([0], { x1: -0.5, x2: 1.5, y1: dominioY[0], y2: dominioY[1],
                          fill: COLOR.acento, fillOpacity: 0.06 }),
        Plot.text(["los «gemelos»"], { x: 0.5, y: dominioY[1], dy: 8, fill: COLOR.acento,
                                       fontSize: 11 }),
        Plot.ruleY([0], { stroke: COLOR.texto }),
        Plot.dot(datos.filter((d) => d.k !== destacada), { x: "x", y: "w", r: 2.5,
                                                            fill: COLOR.primario, fillOpacity: 0.35 }),
        Plot.dot(datos.filter((d) => d.k === destacada), { x: "x", y: "w", r: 6,
                                                            fill: COLOR.acento, stroke: "white" }),
      ],
    })];
  };

  const gemelos = muestras.map((m) => m.markowitz[0] + m.markowitz[1]);
  const conCortos = muestras.filter((m) => m.markowitz.some((w) => w < 0)).length;
  const ganaHRP = muestras.filter((m) => m.volHRP < m.volMarkowitz).length;
  const elegida = muestras[destacada - 1];

  return [
    lecturas([
      ["Activo 0 · Markowitz", rango(muestras.map((m) => m.markowitz[0]))],
      ["Activo 0 · HRP", rango(muestras.map((m) => m.hrp[0]))],
      ["Gemelos juntos · Markowitz", rango(gemelos)],
      ["Muestras con cortos · Markowitz", `${conCortos} de ${MUESTRAS}`],
      ["Vol. fuera de muestra · Markowitz", pct(promedio(muestras.map((m) => m.volMarkowitz)), 2)],
      ["Vol. fuera de muestra · HRP", pct(promedio(muestras.map((m) => m.volHRP)), 2)],
      ["HRP con menos riesgo", `${ganaHRP} de ${MUESTRAS}`],
    ]),
    ...panel("markowitz", "Markowitz (mínima varianza)"),
    ...panel("hrp", "HRP"),
    leyenda([
      [COLOR.primario, "●", `peso en cada una de las ${MUESTRAS} muestras`],
      [COLOR.acento, "●", `muestra ${destacada}: vol. fuera de muestra ${pct(elegida.volMarkowitz, 2)} con
        Markowitz, ${pct(elegida.volHRP, 2)} con HRP`],
    ]),
  ];
}
