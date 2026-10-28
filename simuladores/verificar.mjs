// Verifica la librería de los simuladores contra valores de referencia de scipy.
//
//     node simuladores/verificar.mjs
//
// Las referencias salen de scipy.stats.norm, de la bs_call/bs_put del Capítulo 18 y
// de las fórmulas cerradas de las griegas. Correrlo después de tocar finanzas.js.

import {
  normCdf, bsPrecio, bsGriegas, generadorNormal, finalesGBM, media, desvio, mediana,
} from "./finanzas.js";

let fallas = 0;
function chequear(nombre, obtenido, esperado, tol) {
  const ok = Math.abs(obtenido - esperado) <= tol;
  if (!ok) fallas++;
  console.log(`${ok ? "ok   " : "FALLA"} ${nombre}: ${obtenido} (esperado ${esperado})`);
}

// N(x) contra scipy.stats.norm.cdf
const cdf = [
  [-8, 6.22096057427174e-16], [-3, 0.0013498980316300933], [-1.5, 0.06680720126885807],
  [-0.25, 0.4012936743170763], [0, 0.5], [0.5, 0.6914624612740131],
  [1.96, 0.9750021048517795], [4, 0.9999683287581669], [9, 1.0],
];
for (const [x, ref] of cdf) chequear(`N(${x})`, normCdf(x), ref, 1e-13);

// Black-Scholes: [S, K, T, r, sigma, tipo, precio, delta, gamma, vega, theta anual]
const bs = [
  [100, 100, 0.5, 0.05, 0.25, "call", 8.26001519934323, 0.5908801780443125, 0.02197945736915667, 27.47432171144584, -9.40998055811586],
  [100, 100, 0.5, 0.05, 0.25, "put", 5.791006402176492, -0.4091198219556875, 0.02197945736915667, 27.47432171144584, -4.533430997974197],
  [80, 100, 0.05, 0.05, 0.25, "call", 4.5058082604411756e-05, 4.4450998618817544e-05, 4.1234066058732166e-05, 0.003298725284698573, -0.008422364302091484],
  [80, 100, 0.05, 0.05, 0.25, "put", 19.750357297828614, -0.9999555490013812, 4.1234066058732166e-05, 0.003298725284698573, 4.979093247685208],
  [130, 100, 2, 0.1, 0.6, "call", 63.52259494680686, 0.8337687092441466, 0.0022611948495432133, 45.85703154873637, -11.365288457803675],
  [130, 100, 2, 0.1, 0.6, "put", 15.395670254605058, -0.1662312907558534, 0.0022611948495432133, 45.85703154873637, -3.1779809270238557],
];
for (const [S, K, T, r, s, tipo, precio, delta, gamma, vega, theta] of bs) {
  const etiqueta = `${tipo} S=${S} K=${K} T=${T}`;
  const g = bsGriegas(S, K, T, r, s, tipo);
  chequear(`${etiqueta} precio`, bsPrecio(S, K, T, r, s, tipo), precio, 1e-10);
  chequear(`${etiqueta} delta`, g.delta, delta, 1e-10);
  chequear(`${etiqueta} gamma`, g.gamma, gamma, 1e-12);
  chequear(`${etiqueta} vega`, g.vega, vega, 1e-10);
  chequear(`${etiqueta} theta`, g.theta, theta, 1e-10);
}

// Paridad put-call: C − P = S − K·e^(−rT), sin depender del modelo
const [S, K, T, r, s] = [100, 110, 0.75, 0.03, 0.4];
chequear("paridad put-call", bsPrecio(S, K, T, r, s, "call") - bsPrecio(S, K, T, r, s, "put"),
  S - K * Math.exp(-r * T), 1e-10);

// Generador normal: media 0, desvío 1, y reproducible con la misma semilla
const z = generadorNormal(42);
const muestra = Array.from({ length: 200000 }, z);
chequear("normal: media", media(muestra), 0, 0.01);
chequear("normal: desvío", desvio(muestra), 1, 0.01);
chequear("normal: misma semilla", generadorNormal(7)(), generadorNormal(7)(), 0);

// GBM: E[S_T] = S0·e^(μT) y mediana = S0·e^((μ − σ²/2)T)
const ST = finalesGBM(100, 0.1, 0.25, 1, 200000, 1, true);
chequear("GBM: media", media(ST), 100 * Math.exp(0.1), 0.2);
chequear("GBM: mediana", mediana(ST), 100 * Math.exp(0.1 - 0.5 * 0.25 ** 2), 0.3);
chequear("GBM: par antitético", Math.log(ST[0] / 100) + Math.log(ST[1] / 100),
  2 * (0.1 - 0.5 * 0.25 ** 2), 1e-12);

console.log(fallas ? `\n${fallas} chequeo(s) fallaron` : "\nTodo coincide con las referencias");
process.exit(fallas ? 1 : 0);
