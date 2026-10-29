// Verifica la librería de los simuladores contra valores de referencia de scipy.
//
//     node simuladores/verificar.mjs
//
// Las referencias salen de scipy.stats.norm, de la bs_call/bs_put del Capítulo 18 y
// de las fórmulas cerradas de las griegas. Correrlo después de tocar finanzas.js.

import {
  normCdf, bsPrecio, bsGriegas, generadorNormal, finalesGBM, media, desvio, mediana,
  normInv, lgamma, tCdf, distNormal, distT, distMezcla, varES,
  covarianza, minimaVarianza, tangente, puntoFrontera, retornoCartera, volCartera,
  distribucionDefaults, estrategiaMomentum, sharpeAnual, simularCobertura, precioBono, tirBono,
  covMuestral, ordenJerarquico, pesosHRP, blackLitterman, varianzaEWMA, colaBinomial,
  regresionSimple, tInv,
} from "./finanzas.js";
import { readFileSync } from "node:fs";

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

// Inversa de la normal, log Γ y t de Student contra scipy
const ppf = [[1e-6, -4.753424308822899], [0.01, -2.3263478740408408], [0.025, -1.9599639845400545],
  [0.08, -1.4050715603096329], [0.5, 0], [0.9, 1.2815515655446004], [0.999, 3.090232306167813]];
for (const [p, ref] of ppf) chequear(`N⁻¹(${p})`, normInv(p), ref, 1e-10);
const lg = [[0.5, 0.5723649429247], [1.5, -0.12078223763524526], [3, 0.6931471805599453],
  [10.25, 13.368023671476045], [101, 363.73937555556347]];
for (const [x, ref] of lg) chequear(`lgamma(${x})`, lgamma(x), ref, 1e-10);
const tc = [[-2.353, 3, 0.05001649418000489], [-4.5, 3, 0.010245206172226701], [1.2, 5, 0.8580544716469489],
  [-0.3, 30, 0.3831230526421764], [-10, 4, 0.00028100181135799556]];
for (const [t, nu, ref] of tc) chequear(`t(${nu}) cdf(${t})`, tCdf(t, nu), ref, 1e-12);

// VaR y ES exactos (media 0.04%, desvío 1.5%) contra scipy
const vares = [
  [distT(3, 0.0004, 0.015), 0.95, 0.019980725188757847, 0.0331521409140179, "t(3) 95%"],
  [distT(3, 0.0004, 0.015), 0.99, 0.03892364026472834, 0.06024846948049855, "t(3) 99%"],
  [distT(6, 0.0004, 0.015), 0.99, 0.03808967009415028, 0.04898817594224519, "t(6) 99%"],
  [distMezcla([[0.95, distNormal(0.0005, 0.01)], [0.05, distNormal(-0.02, 0.04)]]), 0.95,
    0.018968802104583276, 0.037305235655359585, "mezcla 95%"],
  [distMezcla([[0.95, distNormal(0.0005, 0.01)], [0.05, distNormal(-0.02, 0.04)]]), 0.99,
    0.0536649318404094, 0.07599238909837486, "mezcla 99%"],
];
for (const [dist, conf, refVar, refES, nombre] of vares) {
  const { var: v, es } = varES(dist, conf);
  chequear(`VaR ${nombre}`, v, refVar, 1e-10);
  chequear(`ES ${nombre}`, es, refES, 1e-10);
}

// Carteras del Capítulo 8 (sin cortos, rf = 3%) contra SLSQP con ftol=1e-15. El libro usa la
// tolerancia por defecto y se detiene un poco antes: imprime 1.3% / 8.8% donde el óptimo exacto
// es 1.4% / 8.6%, con la misma volatilidad (5.84%).
const muL = [0.14, 0.10, 0.07, 0.05];
const SigmaL = covarianza([0.28, 0.20, 0.14, 0.06], [[1, 0.65, 0.45, 0.10], [0.65, 1, 0.50, 0.15],
  [0.45, 0.50, 1, 0.20], [0.10, 0.15, 0.20, 1]]);
const gmv = minimaVarianza(SigmaL);
[0, 0.01448, 0.08647, 0.89905].forEach((ref, i) => chequear(`GMV peso ${i}`, gmv[i], ref, 1e-5));
chequear("GMV vol", volCartera(gmv, SigmaL), 0.058377374049506686, 1e-12);
const tan = tangente(SigmaL, muL, 0.03);
[0.14904, 0.07854, 0.0606, 0.71182].forEach((ref, i) => chequear(`tangente peso ${i}`, tan[i], ref, 1e-4));
chequear("tangente Sharpe", (retornoCartera(tan, muL) - 0.03) / volCartera(tan, SigmaL), 0.5022941786121112, 1e-9);
// Un punto de la frontera debe rendir el objetivo y no ser más volátil que el tangente con su retorno
const wf = puntoFrontera(SigmaL, muL, retornoCartera(tan, muL));
chequear("frontera: retorno objetivo", retornoCartera(wf, muL), retornoCartera(tan, muL), 1e-12);
chequear("frontera: pasa por el tangente", volCartera(wf, SigmaL), volCartera(tan, SigmaL), 1e-9);

// Backtesting del Capítulo 11: p-value de Kupiec contra scipy.stats.binom y EWMA contra numpy
for (const [k, n, p, ref] of [[55, 1252, 0.05, 0.8538494300134964], [83, 1252, 0.05, 0.006490635922141497],
  [22, 1252, 0.01, 0.009221176544111587], [24, 1252, 0.01, 0.0023852298428959084], [0, 252, 0.05, 1],
  [13, 252, 0.05, 0.49405462336201644], [40, 252, 0.05, 1.248317005320132e-10]]) {
  chequear(`Kupiec ${k} de ${n} al ${p}`, colaBinomial(k, n, p), ref, Math.max(1e-12, ref * 1e-9));
}
const serieEWMA = Array.from({ length: 200 }, (_, t) => 0.01 * Math.sin(t * 1.7) + 0.004 * Math.cos(t * 0.3));
for (const [lambda, refs] of [[0.94, [1.6e-05, 5.4868745958017e-05, 5.6298000178822135e-05]],
  [0.8, [1.6e-05, 5.361841387113162e-05, 5.346462253871444e-05]]]) {
  const v = varianzaEWMA(serieEWMA, lambda);
  [1, 50, 199].forEach((t, i) => chequear(`EWMA λ=${lambda} día ${t}`, v[t], refs[i], 1e-18));
}
// De punta a punta con datos/precios.csv: excepciones de SPY, como las cuenta pandas + scipy
{
  const filas = readFileSync(new URL("../datos/precios.csv", import.meta.url), "utf8").trim().split(/\r?\n/);
  const col = filas[0].split(",").indexOf("SPY");
  const px = filas.slice(1).map((f) => +f.split(",")[col]);
  const r = px.slice(1).map((x, i) => x / px[i] - 1);
  const m = media(r);
  const s = Math.sqrt(r.reduce((a, x) => a + (x - m) ** 2, 0) / r.length);
  const v = varianzaEWMA(r, 0.94);
  for (const [conf, refConst, refEWMA] of [[0.95, 55, 83], [0.99, 22, 24]]) {
    const z = normInv(1 - conf);
    chequear(`SPY ${conf}: excepciones VaR constante`, r.filter((x) => x < m + z * s).length, refConst, 0);
    chequear(`SPY ${conf}: excepciones VaR EWMA`, r.filter((x, t) => x < m + z * Math.sqrt(v[t])).length, refEWMA, 0);
  }
}

// Regresión del Capítulo 15 sobre una serie determinística, contra statsmodels; cuantiles t contra scipy
{
  const x = Array.from({ length: 60 }, (_, t) => 0.04 * Math.sin(t * 1.3) + 0.005);
  const y = x.map((xi, t) => 0.002 + 1.3 * xi + 0.03 * Math.cos(t * 2.1 + 0.4));
  const r = regresionSimple(x, y);
  chequear("MCO alfa", r.alfa, 0.002222913466325171, 1e-15);
  chequear("MCO beta", r.beta, 1.2756470938116347, 1e-13);
  chequear("MCO se(alfa)", r.seAlfa, 0.002844131386021427, 1e-15);
  chequear("MCO se(beta)", r.seBeta, 0.09874846244343319, 1e-13);
}
for (const [nu, ref] of [[10, 2.2281388519649385], [118, 1.9802722492407059], [598, 1.9639388980554935]]) {
  chequear(`t.ppf(0.975, ${nu})`, tInv(0.975, nu), ref, 1e-9);
}

// Black-Litterman del Capítulo 10, contra la fórmula maestra en numpy
const universoBL = {
  Sigma: [[0.0225, 0.0075, 0.0010], [0.0075, 0.0196, 0.0012], [0.0010, 0.0012, 0.0036]],
  wMercado: [0.55, 0.30, 0.15], delta: 2.5, tau: 0.05, P: [[0, 1, 0], [1, 0, -1]],
};
[0.0369375, 0.0254625, 0.003625].forEach((ref, i) =>
  chequear(`BL equilibrio Π ${i}`, blackLitterman({ ...universoBL, Q: [0.12, 0.04], factores: [1, 1] }).Pi[i], ref, 1e-15));
for (const [Q, factores, muRef, wRef] of [
  [[0.12, 0.04], [1, 1], [0.05136671611028517, 0.07216343046357615, 0.007022446006217054],
   [0.4778959318826869, 1.2762565211515067, 0.22210406811731292]],
  [[0.12, 0.04], [0.1, 10], [0.06828831402115552, 0.11136013260355337, 0.009121493706863411],
   [0.5181878501007596, 2.063238244172784, 0.18181214989924005]],
  [[0.05, 0], [31.6227766016838, 0.0316227766016838], [0.008235956127777545, 0.017952090395341805, 0.007204828390515687],
   [0.00880295297541234, 0.32068252828528687, 0.6911970470245885]]]) {
  const r = blackLitterman({ ...universoBL, Q, factores });
  r.mu.forEach((m, i) => chequear(`BL Q=${Q} f=${factores.map((f) => f.toFixed(2))}: μ ${i}`, m, muRef[i], 1e-12));
  r.w.forEach((w, i) => chequear(`BL Q=${Q} f=${factores.map((f) => f.toFixed(2))}: w ${i}`, w, wRef[i], 1e-10));
}

// HRP del Capítulo 9 sobre series determinísticas, contra hierarchy.leaves_list y hrp() del libro
const serieHRP = (n, k) => Array.from({ length: n }, (_, t) => Array.from({ length: k }, (_, j) =>
  0.01 * Math.sin(t * (j + 1) * 0.7 + j) + 0.004 * Math.cos(t * 0.37 * (j + 2))
  + (j < 2 ? 0.012 * Math.sin(t * 1.3) : 0) + (k > 5 && (j === 4 || j === 5) ? 0.009 * Math.cos(t * 0.53) : 0)));
for (const [n, k, ordenRef, hrpRef, mvRef] of [
  [300, 5, [2, 0, 1, 3, 4],
   [0.12605463412184534, 0.12864562322725867, 0.2811029663087184, 0.23253391264901319, 0.2316628636931644],
   [0.08577810417489888, 0.09792624440406221, 0.30836431328065905, 0.2551803491259743, 0.2527509890144055]],
  [400, 7, [0, 1, 4, 5, 2, 3, 6],
   [0.07265621711550609, 0.07119732018474635, 0.21619303195487632, 0.21043587646552261,
    0.09199798811931965, 0.12791052353941074, 0.20960904262061822],
   [0.06417262967837586, 0.07142870702682035, 0.224368811012687, 0.22470420124244606,
    0.0964079382023273, 0.09411413939901983, 0.22480357343832358]]]) {
  const S = covMuestral(serieHRP(n, k));
  const orden = ordenJerarquico(S);
  chequear(`HRP ${k} activos: orden de hojas ${orden}`, orden.join() === ordenRef.join() ? 1 : 0, 1, 0);
  pesosHRP(S, orden).forEach((w, i) => chequear(`HRP ${k} activos: peso ${i}`, w, hrpRef[i], 1e-12));
  minimaVarianza(S, true).forEach((w, i) => chequear(`mín. varianza ${k} activos: peso ${i}`, w, mvRef[i], 1e-10));
}

// CDO del Capítulo 12 (100 hipotecas, PD 8%, LGD 50%): distribución exacta contra scipy.integrate
for (const [rho, refSenior, refCero] of [[0.05, 1.3150452995215755e-08, 0.005885694299007276],
  [0.2, 0.0010624157809245997, 0.07228599198630324], [0.6, 0.034783919323002226, 0.41414911961981904]]) {
  const p = distribucionDefaults(100, 0.08, rho);
  const senior = p.reduce((s, v, k) => s + (k / 100 * 0.5 > 0.25 ? v : 0), 0);
  chequear(`CDO ρ=${rho} P(pérdida > 25%)`, senior, refSenior, 1e-6);
  chequear(`CDO ρ=${rho} P(0 defaults)`, p[0], refCero, 1e-9);
  chequear(`CDO ρ=${rho} pérdida esperada`, p.reduce((s, v, k) => s + v * k / 100 * 0.5, 0), 0.04, 1e-9);
}

// Bonos de los Capítulos 2 y 3, contra valuacion_bono y scipy.optimize.brentq
for (const [c, n, r, ref] of [[0.08, 5, 0.10, 924.1842646118308], [0.08, 5, 0, 1400],
  [0, 30, 0.06, 174.1101309106343], [0.12, 20, 0.04, 2087.2261075974143]]) {
  chequear(`precio bono c=${c} n=${n} r=${r}`, precioBono(1000, c, n, r), ref, 1e-9);
}
for (const [c, n, precio, ref] of [[0.08, 5, 950, 0.09295327539501987], [0, 10, 500, 0.07177346253629312],
  [0.06, 30, 1300, 0.04218729185186634]]) {
  chequear(`TIR bono c=${c} n=${n} a $${precio}`, tirBono(1000, c, n, precio), ref, 1e-12);
}
chequear("TIR fuera de rango", tirBono(1000, 0.08, 5, 1e6) ?? -1, -1, 0);

// Momentum del Capítulo 17 sobre una serie determinística, contra la versión de numpy
const serie = Float64Array.from({ length: 300 }, (_, t) => 0.01 * Math.sin(t * 1.7) + 0.003 * Math.cos(t * 0.3) - 0.0005);
[[2, -8.170195771930107], [5, -1.72071568790419], [20, -5.454618026570785], [61, -1.1273664211748038]]
  .forEach(([v, ref]) => chequear(`momentum ventana ${v}`, sharpeAnual(estrategiaMomentum(serie, v)), ref, 1e-9));

// Delta hedging del Capítulo 19: el desvío del error debe parecerse al del libro
// (400 escenarios con otro generador: se tolera la diferencia de muestreo, ~10%)
for (const [n, ref] of [[12, 2.181], [52, 1.130], [252, 0.567]]) {
  const { errores } = simularCobertura({ S0: 100, K: 100, T: 1, r: 0.05, sigma: 0.25, n, costoBps: 0,
                                         nSims: 2000, semilla: 3 });
  chequear(`cobertura n=${n}: media ≈ 0`, media(errores), 0, 0.15);
  chequear(`cobertura n=${n}: desvío`, desvio(errores), ref, ref * 0.1);
}

console.log(fallas ? `\n${fallas} chequeo(s) fallaron` : "\nTodo coincide con las referencias");
process.exit(fallas ? 1 : 0);
