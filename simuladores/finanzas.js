// Matemática compartida de los simuladores del libro.
//
// Es la contraparte en JavaScript de las funciones Python de los capítulos: los
// simuladores corren en el navegador del lector y no pueden usar numpy/scipy. El
// código que se enseña sigue siendo el Python del texto; esto es solo el motor de
// las figuras interactivas. Sin DOM ni librerías externas, para poder verificarlo
// contra scipy con `node simuladores/verificar.mjs` (ver ese archivo).

// Paleta del libro: la misma de _esquemas.py y custom.scss
export const COLOR = {
  primario: "#1e3a5f",
  secundario: "#637238",
  acento: "#c2410c",
  gris: "#94a3b8",
  texto: "#1f2937",
};

// --- Distribución normal -------------------------------------------------

export function normPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// N(x) con el algoritmo de Hart (1968) en la versión de West (2005):
// error relativo del orden de 1e-14, suficiente para coincidir con scipy.
export function normCdf(x) {
  const a = Math.abs(x);
  let c;
  if (a > 37) {
    c = 0;
  } else {
    const e = Math.exp(-a * a / 2);
    if (a < 7.07106781186547) {
      let b = 3.52624965998911e-2 * a + 0.700383064443688;
      b = b * a + 6.37396220353165;
      b = b * a + 33.912866078383;
      b = b * a + 112.079291497871;
      b = b * a + 221.213596169931;
      b = b * a + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-2 * a + 1.75566716318264;
      b = b * a + 16.064177579207;
      b = b * a + 86.7807322029461;
      b = b * a + 296.564248779674;
      b = b * a + 637.333633378831;
      b = b * a + 793.826512519948;
      b = b * a + 440.413735824752;
      c = c / b;
    } else {
      let b = a + 0.65;
      b = a + 4 / b;
      b = a + 3 / b;
      b = a + 2 / b;
      b = a + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

// --- Números aleatorios con semilla ---------------------------------------

// Generador uniforme mulberry32: rápido y reproducible (misma semilla, misma secuencia).
function mulberry32(semilla) {
  let s = semilla >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Devuelve una función que genera N(0,1) por Box-Muller. No reproduce los números
// de numpy (otro algoritmo), pero sí sus propiedades estadísticas.
export function generadorNormal(semilla) {
  const u = mulberry32(semilla);
  let guardado = null;
  return function () {
    if (guardado !== null) {
      const z = guardado;
      guardado = null;
      return z;
    }
    let u1 = u();
    while (u1 === 0) u1 = u();
    const radio = Math.sqrt(-2 * Math.log(u1));
    const angulo = 2 * Math.PI * u();
    guardado = radio * Math.sin(angulo);
    return radio * Math.cos(angulo);
  };
}

// --- Estadística ----------------------------------------------------------

export function media(x) {
  let s = 0;
  for (const v of x) s += v;
  return s / x.length;
}

export function desvio(x) {
  const m = media(x);
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return Math.sqrt(s / (x.length - 1));
}

export function mediana(x) {
  const o = Float64Array.from(x).sort();
  const n = o.length;
  return n % 2 ? o[(n - 1) / 2] : 0.5 * (o[n / 2 - 1] + o[n / 2]);
}

// --- Black-Scholes (Capítulo 18) ------------------------------------------

function d1d2(S, K, T, r, sigma) {
  const raiz = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / raiz;
  return [d1, d1 - raiz];
}

// Precio de una call o una put europea. Con T = 0 devuelve el payoff.
export function bsPrecio(S, K, T, r, sigma, tipo = "call") {
  if (T <= 0) return tipo === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const [d1, d2] = d1d2(S, K, T, r, sigma);
  const descuento = K * Math.exp(-r * T);
  return tipo === "call"
    ? S * normCdf(d1) - descuento * normCdf(d2)
    : descuento * normCdf(-d2) - S * normCdf(-d1);
}

// Griegas con fórmula cerrada. Vega por unidad de sigma y theta anual, como en el
// texto (theta = derivada respecto del paso del tiempo: negativa si la opción pierde valor).
export function bsGriegas(S, K, T, r, sigma, tipo = "call") {
  const [d1, d2] = d1d2(S, K, T, r, sigma);
  const raizT = Math.sqrt(T);
  const descuento = K * Math.exp(-r * T);
  const gamma = normPdf(d1) / (S * sigma * raizT);
  const vega = S * normPdf(d1) * raizT;
  const decaimiento = -S * normPdf(d1) * sigma / (2 * raizT);
  if (tipo === "call") {
    return { delta: normCdf(d1), gamma, vega, theta: decaimiento - r * descuento * normCdf(d2) };
  }
  return { delta: normCdf(d1) - 1, gamma, vega, theta: decaimiento + r * descuento * normCdf(-d2) };
}

// --- Movimiento Browniano Geométrico (Capítulo 13) -------------------------

// Trayectorias completas (para dibujar): n_tray caminos de n_pasos pasos.
// Devuelve filas {t, S, camino}, el formato que espera Observable Plot.
export function caminosGBM(S0, mu, sigma, T, nPasos, nTray, semilla) {
  const z = generadorNormal(semilla);
  const dt = T / nPasos;
  const deriva = (mu - 0.5 * sigma * sigma) * dt;
  const difusion = sigma * Math.sqrt(dt);
  const filas = [];
  for (let j = 0; j < nTray; j++) {
    let S = S0;
    filas.push({ t: 0, S, camino: j });
    for (let i = 1; i <= nPasos; i++) {
      S *= Math.exp(deriva + difusion * z());
      filas.push({ t: i * dt, S, camino: j });
    }
  }
  return filas;
}

// Precios finales S_T de un GBM. Como log(S_T) es normal, alcanza un shock por
// trayectoria (exacto, sin discretizar el tiempo). Con antiteticas = true, los
// precios vienen en pares consecutivos (Z, −Z): cualquier prefijo par contiene
// pares completos.
export function finalesGBM(S0, mu, sigma, T, n, semilla, antiteticas = false) {
  const z = generadorNormal(semilla);
  const m = Math.log(S0) + (mu - 0.5 * sigma * sigma) * T;
  const s = sigma * Math.sqrt(T);
  const ST = new Float64Array(n);
  if (antiteticas) {
    for (let i = 0; i + 1 < n; i += 2) {
      const zi = z();
      ST[i] = Math.exp(m + s * zi);
      ST[i + 1] = Math.exp(m - s * zi);
    }
  } else {
    for (let i = 0; i < n; i++) ST[i] = Math.exp(m + s * z());
  }
  return ST;
}

// --- Más distribuciones (Capítulo 11) -------------------------------------

// Inversa de N(x): algoritmo de Acklam más un paso de Newton (precisión de máquina).
export function normInv(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const bajo = 0.02425;
  let x;
  if (p < bajo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - bajo) {
    const q = p - 0.5;
    const r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x - (normCdf(x) - p) / normPdf(x);
}

// log Γ(x) por la aproximación de Lanczos (g = 7)
export function lgamma(x) {
  const coef = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let s = coef[0];
  for (let i = 1; i < 9; i++) s += coef[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

// Beta incompleta regularizada I_x(a, b), por fracción continua (Numerical Recipes)
function betaIncReg(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - betaIncReg(1 - x, b, a);
  const frente = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const MINIMO = 1e-300;
  const acotar = (v) => (Math.abs(v) < MINIMO ? MINIMO : v);
  let c = 1;
  let d = 1 / acotar(1 - (a + b) * x / (a + 1));
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 / acotar(1 + aa * d);
    c = acotar(1 + aa / c);
    h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 / acotar(1 + aa * d);
    c = acotar(1 + aa / c);
    const paso = d * c;
    h *= paso;
    if (Math.abs(paso - 1) < 1e-15) break;
  }
  return frente * h / a;
}

// t de Student estándar con nu grados de libertad
export function tPdf(t, nu) {
  return Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * Math.PI)
    - (nu + 1) / 2 * Math.log(1 + t * t / nu));
}

export function tCdf(t, nu) {
  const cola = 0.5 * betaIncReg(nu / (nu + t * t), nu / 2, 0.5);
  return t > 0 ? 1 - cola : cola;
}

// Distribuciones de retornos como objetos {pdf, cdf, colaParcial}, donde
// colaParcial(q) = E[X · 1{X < q}]: con eso salen el VaR y el ES sin simular.
export function distNormal(m, s) {
  return {
    pdf: (x) => normPdf((x - m) / s) / s,
    cdf: (x) => normCdf((x - m) / s),
    colaParcial: (q) => {
      const z = (q - m) / s;
      return m * normCdf(z) - s * normPdf(z);
    },
  };
}

// t de Student con DESVÍO s (no escala s), para compararla con una normal de igual volatilidad
export function distT(nu, m, s) {
  const escala = s * Math.sqrt((nu - 2) / nu);
  return {
    pdf: (x) => tPdf((x - m) / escala, nu) / escala,
    cdf: (x) => tCdf((x - m) / escala, nu),
    colaParcial: (q) => {
      const t = (q - m) / escala;
      return m * tCdf(t, nu) - escala * (nu + t * t) / (nu - 1) * tPdf(t, nu);
    },
  };
}

// Mezcla de distribuciones: [[peso, dist], ...]
export function distMezcla(componentes) {
  const suma = (f) => (x) => componentes.reduce((acc, [w, dist]) => acc + w * dist[f](x), 0);
  return { pdf: suma("pdf"), cdf: suma("cdf"), colaParcial: suma("colaParcial") };
}

// Cuantil de una distribución por bisección sobre su CDF
export function cuantil(dist, p) {
  let desde = -1;
  let hasta = 1;
  while (dist.cdf(desde) > p) desde *= 2;
  while (dist.cdf(hasta) < p) hasta *= 2;
  for (let i = 0; i < 200 && hasta - desde > 1e-15; i++) {
    const medio = 0.5 * (desde + hasta);
    if (dist.cdf(medio) < p) desde = medio;
    else hasta = medio;
  }
  return 0.5 * (desde + hasta);
}

// VaR y ES (como pérdidas positivas) al nivel de confianza conf
export function varES(dist, conf) {
  const alfa = 1 - conf;
  const q = cuantil(dist, alfa);
  return { var: -q, es: -dist.colaParcial(q) / alfa, q };
}

// --- Backtesting de VaR y EWMA (Capítulo 11) -------------------------------

// Varianza EWMA como en el capítulo: σ²₀ = r₀² y σ²ₜ = λσ²ₜ₋₁ + (1 − λ)r²ₜ₋₁
export function varianzaEWMA(r, lambda) {
  const v = new Float64Array(r.length);
  v[0] = r[0] ** 2;
  for (let t = 1; t < r.length; t++) v[t] = lambda * v[t - 1] + (1 - lambda) * r[t - 1] ** 2;
  return v;
}

// P(X ≥ k) con X ~ Binomial(n, p): el p-value del test de Kupiec del capítulo,
// 1 − binom.cdf(k − 1, n, p). Suma la cola más corta para no perder precisión.
export function colaBinomial(k, n, p) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  const logComb = lgamma(n + 1);
  const pmf = (j) => Math.exp(logComb - lgamma(j + 1) - lgamma(n - j + 1) + j * Math.log(p) + (n - j) * Math.log1p(-p));
  let s = 0;
  if (k > n * p) {
    for (let j = k; j <= n; j++) s += pmf(j);
    return s;
  }
  for (let j = 0; j < k; j++) s += pmf(j);
  return 1 - s;
}

// --- Álgebra lineal chica y carteras (Capítulos 7-8) ------------------------

// Resuelve A x = b por eliminación gaussiana con pivoteo parcial; null si es singular.
export function resolver(A, b) {
  const n = b.length;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let i = col + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
    if (Math.abs(M[piv][col]) < 1e-14) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let i = col + 1; i < n; i++) {
      const f = M[i][col] / M[col][col];
      for (let j = col; j <= n; j++) M[i][j] -= f * M[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// Σ = D ρ D
export function covarianza(vols, corr) {
  return vols.map((vi, i) => vols.map((vj, j) => vi * vj * corr[i][j]));
}

export function retornoCartera(w, mu) {
  return w.reduce((s, wi, i) => s + wi * mu[i], 0);
}

export function volCartera(w, Sigma) {
  let v = 0;
  for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i] * w[j] * Sigma[i][j];
  return Math.sqrt(Math.max(v, 0));
}

// Todos los subconjuntos no vacíos de {0, ..., n−1}
function subconjuntos(n) {
  const lista = [];
  for (let m = 1; m < 1 << n; m++) lista.push([...Array(n).keys()].filter((i) => m & (1 << i)));
  return lista;
}

const submatriz = (M, idx) => idx.map((i) => idx.map((j) => M[i][j]));
const sumar = (v) => v.reduce((a, x) => a + x, 0);

// Sin cortos, el óptimo de un problema convexo coincide con la solución SIN restricción de
// signo calculada sobre su propio soporte (los activos con peso positivo). Con pocos activos
// alcanza con resolver cada soporte posible y quedarse con la mejor solución factible: da el
// óptimo exacto sin un optimizador iterativo como SLSQP. candidato(idx) devuelve los pesos
// de los activos idx (o null); puntaje(w) es lo que se maximiza.
function mejorSobreSoportes(n, cortos, candidato, puntaje) {
  const soportes = cortos ? [[...Array(n).keys()]] : subconjuntos(n);
  let mejor = null;
  let mejorPuntaje = -Infinity;
  for (const idx of soportes) {
    const ws = candidato(idx);
    if (!ws || ws.some((v) => !Number.isFinite(v))) continue;
    if (!cortos && ws.some((v) => v < -1e-10)) continue;
    const w = new Array(n).fill(0);
    idx.forEach((i, k) => { w[i] = cortos ? ws[k] : Math.max(ws[k], 0); });
    const p = puntaje(w);
    if (p > mejorPuntaje + 1e-15) {
      mejor = w;
      mejorPuntaje = p;
    }
  }
  return mejor;
}

// Pesos proporcionales a Σ⁻¹v sobre el soporte, normalizados a sumar 1
function normalizadoSobre(Sigma, idx, v) {
  const z = resolver(submatriz(Sigma, idx), idx.map((i) => v[i]));
  if (!z) return null;
  const s = sumar(z);
  return s > 0 ? z.map((x) => x / s) : null;
}

// Mínima varianza global: w ∝ Σ⁻¹1
export function minimaVarianza(Sigma, cortos = false) {
  const unos = Sigma.map(() => 1);
  return mejorSobreSoportes(Sigma.length, cortos, (idx) => normalizadoSobre(Sigma, idx, unos),
    (w) => -volCartera(w, Sigma));
}

// Portafolio tangente (máximo Sharpe): w ∝ Σ⁻¹(μ − rf). null si ninguna cartera rinde más que rf.
export function tangente(Sigma, mu, rf, cortos = false) {
  const exceso = mu.map((m) => m - rf);
  const w = mejorSobreSoportes(Sigma.length, cortos, (idx) => normalizadoSobre(Sigma, idx, exceso),
    (w) => (retornoCartera(w, mu) - rf) / volCartera(w, Sigma));
  return w && retornoCartera(w, mu) > rf ? w : null;
}

// Punto de la frontera: mínima varianza con retorno objetivo. Sobre un soporte,
// w = Σ⁻¹(a·1 + b·μ), con (a, b) tales que los pesos sumen 1 y rindan el objetivo.
export function puntoFrontera(Sigma, mu, objetivo, cortos = false) {
  return mejorSobreSoportes(Sigma.length, cortos, (idx) => {
    if (idx.length === 1) return Math.abs(mu[idx[0]] - objetivo) < 1e-9 ? [1] : null;
    const S = submatriz(Sigma, idx);
    const m = idx.map((i) => mu[i]);
    const u = resolver(S, idx.map(() => 1));
    const v = resolver(S, m);
    if (!u || !v) return null;
    const ab = resolver([[sumar(u), sumar(v)],
                         [sumar(u.map((x, k) => x * m[k])), sumar(v.map((x, k) => x * m[k]))]],
                        [1, objetivo]);
    return ab ? u.map((x, k) => ab[0] * x + ab[1] * v[k]) : null;
  }, (w) => -volCartera(w, Sigma));
}

// --- Black-Litterman (Capítulo 10) ----------------------------------------

const multiplicar = (A, x) => A.map((fila) => fila.reduce((s, a, j) => s + a * x[j], 0));

// Equilibrio Π = δΣw y fórmula maestra, con Ω = diag(P τΣ Pᵀ) como en el capítulo y cada
// view escalada por su factor (chico = mucha confianza). Devuelve también los pesos sin
// restricciones w = Σ⁻¹μ / δ.
export function blackLitterman({ Sigma, wMercado, delta, tau, P, Q, factores }) {
  const n = Sigma.length;
  const Pi = multiplicar(Sigma, wMercado).map((x) => delta * x);
  const tauSigma = Sigma.map((fila) => fila.map((x) => tau * x));
  // (τΣ)⁻¹ columna por columna
  const columnas = [...Array(n).keys()].map((j) => resolver(tauSigma, [...Array(n).keys()].map((i) => +(i === j))));
  const invTauSigma = columnas[0].map((_, i) => columnas.map((c) => c[i]));
  const precisionView = P.map((fila, k) => 1 / (factores[k] * fila.reduce((s, a, i) =>
    s + a * fila.reduce((t, b, j) => t + b * tauSigma[i][j], 0), 0)));
  const A = invTauSigma.map((fila, i) => fila.map((x, j) =>
    x + P.reduce((s, f, k) => s + f[i] * precisionView[k] * f[j], 0)));
  const b = multiplicar(invTauSigma, Pi).map((x, i) =>
    x + P.reduce((s, f, k) => s + f[i] * precisionView[k] * Q[k], 0));
  const mu = resolver(A, b);
  const w = resolver(Sigma, mu).map((x) => x / delta);
  return { Pi, mu, w };
}

// --- Hierarchical Risk Parity (Capítulo 9) ---------------------------------

// Covarianza muestral (con n − 1, como np.cov y DataFrame.cov) de filas de retornos
export function covMuestral(filas) {
  const n = filas.length;
  const k = filas[0].length;
  const m = new Array(k).fill(0);
  for (const f of filas) for (let j = 0; j < k; j++) m[j] += f[j] / n;
  const S = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const f of filas) {
    for (let i = 0; i < k; i++) {
      const di = f[i] - m[i];
      for (let j = i; j < k; j++) S[i][j] += di * (f[j] - m[j]);
    }
  }
  for (let i = 0; i < k; i++) for (let j = i; j < k; j++) S[j][i] = S[i][j] /= n - 1;
  return S;
}

// Orden de las hojas del dendrograma: distancia sqrt((1 − ρ)/2), single linkage y el
// recorrido de hierarchy.leaves_list (cada unión pone primero el grupo de menor número).
export function ordenJerarquico(Sigma) {
  const k = Sigma.length;
  const dist = (i, j) => Math.sqrt(Math.max(0, (1 - Sigma[i][j] / Math.sqrt(Sigma[i][i] * Sigma[j][j])) / 2));
  let grupos = [...Array(k).keys()].map((i) => ({ id: i, hojas: [i] }));
  let siguiente = k;
  while (grupos.length > 1) {
    let mejor = null;
    for (let a = 0; a < grupos.length; a++) {
      for (let b = a + 1; b < grupos.length; b++) {
        let d = Infinity;
        for (const i of grupos[a].hojas) for (const j of grupos[b].hojas) d = Math.min(d, dist(i, j));
        if (!mejor || d < mejor.d) mejor = { a, b, d };
      }
    }
    const [g1, g2] = [grupos[mejor.a], grupos[mejor.b]].sort((x, y) => x.id - y.id);
    grupos = grupos.filter((_, i) => i !== mejor.a && i !== mejor.b);
    grupos.push({ id: siguiente++, hojas: [...g1.hojas, ...g2.hojas] });
  }
  return grupos[0].hojas;
}

// Varianza del sub-portafolio inverse-variance de un grupo (solo usa su diagonal para los pesos)
function varianzaGrupo(Sigma, items) {
  const iv = items.map((i) => 1 / Sigma[i][i]);
  const s = sumar(iv);
  const w = iv.map((x) => x / s);
  let v = 0;
  items.forEach((i, a) => items.forEach((j, b) => { v += w[a] * w[b] * Sigma[i][j]; }));
  return v;
}

// Bisección recursiva sobre la lista ordenada, como hrp() del capítulo. Pesos en el orden original.
export function pesosHRP(Sigma, orden) {
  const w = new Array(Sigma.length).fill(1);
  let grupos = [orden];
  while (grupos.length) {
    const nuevos = [];
    for (const g of grupos) {
      if (g.length <= 1) continue;
      const izq = g.slice(0, Math.floor(g.length / 2));
      const der = g.slice(Math.floor(g.length / 2));
      const vIzq = varianzaGrupo(Sigma, izq);
      const alpha = 1 - vIzq / (vIzq + varianzaGrupo(Sigma, der));
      for (const i of izq) w[i] *= alpha;
      for (const i of der) w[i] *= 1 - alpha;
      nuevos.push(izq, der);
    }
    grupos = nuevos;
  }
  return w;
}

// --- Riesgo de crédito: CDO con cópula gaussiana de un factor (Capítulo 12) ---

// Distribución EXACTA del número de defaults en un pool de n créditos. Condicional al
// factor común Z, los defaults son independientes con probabilidad p(Z): se integra esa
// binomial sobre Z ~ N(0, 1). Sin simulación, así que sin ruido de Monte Carlo.
export function distribucionDefaults(n, pd, rho, nodos = 801) {
  const prob = new Float64Array(n + 1);
  const umbral = normInv(pd);
  const lcomb = Array.from({ length: n + 1 }, (_, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1));
  const h = 16 / (nodos - 1);
  for (let i = 0; i < nodos; i++) {
    const z = -8 + i * h;
    const peso = normPdf(z) * h * (i === 0 || i === nodos - 1 ? 0.5 : 1);
    const p = normCdf((umbral - Math.sqrt(rho) * z) / Math.sqrt(1 - rho));
    if (p <= 0) { prob[0] += peso; continue; }
    if (p >= 1) { prob[n] += peso; continue; }
    const lp = Math.log(p);
    const lq = Math.log1p(-p);
    for (let k = 0; k <= n; k++) prob[k] += peso * Math.exp(lcomb[k] + k * lp + (n - k) * lq);
  }
  const total = sumar(prob);
  return prob.map((v) => v / total);
}

// Pérdida de un tramo [desde, hasta] (fracciones del pool), como fracción del tramo
export function perdidaTramo(perdida, desde, hasta) {
  return Math.min(Math.max(perdida - desde, 0), hasta - desde) / (hasta - desde);
}

// --- Bonos (Capítulos 2 y 3) ---------------------------------------------

// Flujos de un bono bullet con cupón anual: el último año devuelve además el nominal
export function flujosBono(nominal, tasaCupon, anios) {
  return Array.from({ length: anios }, (_, i) => nominal * tasaCupon + (i === anios - 1 ? nominal : 0));
}

// Precio como suma de flujos descontados, como valuacion_bono del Capítulo 3
export function precioBono(nominal, tasaCupon, anios, tasa) {
  return flujosBono(nominal, tasaCupon, anios).reduce((p, f, i) => p + f / (1 + tasa) ** (i + 1), 0);
}

// TIR al precio de mercado. El capítulo la busca de a 0.01%; acá se biseca, porque el
// precio baja siempre que la tasa sube. Devuelve null si cae fuera de [−50%, 500%].
export function tirBono(nominal, tasaCupon, anios, precio) {
  let lo = -0.5, hi = 5;
  const exceso = (r) => precioBono(nominal, tasaCupon, anios, r) - precio;
  if (exceso(lo) < 0 || exceso(hi) > 0) return null;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (exceso(m) > 0) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

// --- Backtesting (Capítulo 17) -------------------------------------------

// Momentum del capítulo: el día t se invierte si la media de los `ventana` días previos
// fue positiva (al principio, con menos días disponibles, usa los que hay).
export function estrategiaMomentum(r, ventana) {
  const acumulada = new Float64Array(r.length + 1);
  for (let t = 0; t < r.length; t++) acumulada[t + 1] = acumulada[t] + r[t];
  const salida = new Float64Array(r.length);
  for (let t = 1; t < r.length; t++) {
    if (acumulada[t] - acumulada[Math.max(0, t - ventana)] > 0) salida[t] = r[t];
  }
  return salida;
}

// Sharpe anualizado de retornos diarios (desvío poblacional, como np.std)
export function sharpeAnual(r) {
  const m = media(r);
  let s = 0;
  for (const v of r) s += (v - m) ** 2;
  const sd = Math.sqrt(s / r.length);
  return sd > 0 ? (m / sd) * Math.sqrt(252) : 0;
}

// --- Cobertura dinámica (Capítulo 19) ---------------------------------------

export function bsDelta(S, K, T, r, sigma) {
  if (T <= 0) return S > K ? 1 : 0;
  return normCdf((Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T)));
}

// Vende una call, cobra la prima y la cubre rebalanceando n veces en el plazo, como
// error_hedging y error_con_costos del capítulo. Los errores sin y con costos salen de
// los MISMOS caminos, así que su diferencia es el costo puro. Del primer escenario
// guarda la trayectoria completa para dibujarla.
export function simularCobertura({ S0, K, T, r, sigma, n, costoBps, nSims, semilla }) {
  const z = generadorNormal(semilla);
  const dt = T / n;
  const prima = bsPrecio(S0, K, T, r, sigma, "call");
  const crecer = Math.exp(r * dt);
  const deriva = (r - 0.5 * sigma * sigma) * dt;
  const difusion = sigma * Math.sqrt(dt);
  const errores = new Float64Array(nSims);
  const erroresConCostos = new Float64Array(nSims);
  const camino = [];
  for (let i = 0; i < nSims; i++) {
    let S = S0;
    let cash = prima;
    let cashConCostos = prima;
    let acciones = 0;
    for (let t = 0; t < n; t++) {
      const delta = bsDelta(S, K, T - t * dt, r, sigma);
      const trade = delta - acciones;
      cash -= trade * S;
      cashConCostos -= trade * S + Math.abs(trade) * S * costoBps / 1e4;
      acciones = delta;
      if (i === 0) {
        camino.push({ t: t * dt, S, delta, cartera: acciones * S + cash,
                      opcion: bsPrecio(S, K, T - t * dt, r, sigma, "call") });
      }
      cash *= crecer;
      cashConCostos *= crecer;
      S *= Math.exp(deriva + difusion * z());
    }
    const payoff = Math.max(S - K, 0);
    errores[i] = acciones * S + cash - payoff;
    erroresConCostos[i] = acciones * S + cashConCostos - payoff;
    if (i === 0) camino.push({ t: T, S, delta: acciones, cartera: acciones * S + cash, opcion: payoff });
  }
  return { prima, errores, erroresConCostos, camino };
}
