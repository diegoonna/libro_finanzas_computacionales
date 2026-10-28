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
