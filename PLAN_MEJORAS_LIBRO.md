# Plan: Reescritura didáctica + expansión del libro "Finanzas Computacionales"

## Contexto

El libro Quarto (`libro-finanzas/`, español, Python, UADE) tiene calidad muy dispareja:

- **cap01–cap04** están bien escritos, humanos y didácticos (prosa que motiva cada concepto, callouts, aplicaciones financieras). Usan bloques `{pyodide-python}`.
- **cap05–cap06** son correctos pero más escuetos. Usan `{python}`.
- **cap08–cap13** (Módulos 3–4, hoy **comentados en `_quarto.yml`**, no se renderizan) son esqueléticos: vuelco de fórmulas + código con `# TODO`, prosa mínima. Es lo que el usuario describe como "no parece hecho por un humano".
- **NumPy nunca se enseña**: aparece de golpe como `import numpy as np` en cap05 y se usa intensivamente después, sin capítulo introductorio.

Objetivo: (1) reescribir todos los capítulos para que sean uniformemente humanos y didácticos; (2) agregar NumPy en Módulo 1; (3) reestructurar la parte bayesiana/Black-Litterman hacia un enfoque algebraico clásico y reforzar econometría; (4) incorporar bloques temáticos nuevos (riesgo/regulación, procesos estocásticos, series temporales macro, HRP, backtesting); (5) dejar una plantilla para "casos prácticos" aplicados entre capítulos.

Decisiones tomadas por el usuario (a lo largo de la planificación):
- Reescritura "humana": **todos los capítulos, en orden**.
- NumPy: **insertar y renumerar todo** (numeración secuencial limpia).
- Bayes/BL: **BL 100% algebraico**, absorbiendo solo la intuición bayesiana mínima; se deprecia el capítulo bayesiano standalone (PyMC/MCMC fuera). **BL vive en Módulo 2** junto a Markowitz/HRP.
- Temas nuevos: riesgo/regulación, ARIMA/VAR, procesos estocásticos (split por objeto), **HRP** y **backtesting**.
- Econometría: **reforzada** como capítulo sólido de modelos lineales aplicados a finanzas.
- **Casos prácticos**: el usuario quiere, a futuro, interludios aplicados entre capítulos (p.ej. "¿conviene invertir en cuchillos cayendo?") que apliquen la metodología del capítulo previo. Aún no tiene los ejemplos → necesita un **template** reutilizable.

---

## Estructura destino (renumerada, 20 capítulos)

| Nuevo | Archivo destino | Origen | Estado |
|:--:|---|---|---|
| **Módulo 1: Fundamentos y Renta Fija** | | | |
| 1 | `unidad1/cap01_pensamiento_computacional.qmd` | cap01 | reescribir (pulir) |
| 2 | `unidad1/cap02_iteraciones_estructuras.qmd` | cap02 | reescribir (pulir) |
| 3 | `unidad1/cap03_funciones_modularizacion.qmd` | cap03 | reescribir (pulir) |
| 4 | `unidad1/cap04_poo.qmd` | cap04 | reescribir (pulir) |
| **5** | `unidad1/cap05_numpy.qmd` | — | **NUEVO (NumPy)** |
| 6 | `unidad1/cap06_series_tiempo_pandas.qmd` | cap05 | reescribir + ampliar (curvas) + renombrar |
| **Módulo 2: Teoría de Portafolios y Optimización** | | | |
| 7 | `unidad2/cap07_estadistica_optimizacion.qmd` | cap06 | reescribir + renombrar |
| 8 | `unidad2/cap08_markowitz.qmd` | cap07 | reescribir + ampliar + renombrar |
| **9** | `unidad2/cap09_hrp.qmd` | — | **NUEVO (HRP)** |
| **10** | `unidad2/cap10_black_litterman.qmd` | parte BL de cap11 (+ intuición de cap10) | **NUEVO (BL algebraico)** |
| **Módulo 3: Riesgo, Simulación y Econometría** | | | |
| 11 | `unidad3/cap11_var_expected_shortfall.qmd` | cap08 | reescribir + ampliar (ES/CVaR) + renombrar |
| **12** | `unidad3/cap12_riesgo_regulacion.qmd` | — | **NUEVO (riesgo/regulación)** |
| 13 | `unidad3/cap13_monte_carlo.qmd` | cap09 | reescribir + renombrar |
| **14** | `unidad3/cap14_procesos_estocasticos_activos.qmd` | — | **NUEVO (jump-diffusion, Lévy)** |
| 15 | `unidad3/cap15_econometria_modelos_lineales.qmd` | parte econometría/CAPM de cap11 | reescribir + **reforzar** + renombrar |
| **16** | `unidad3/cap16_series_temporales_macro.qmd` | — | **NUEVO (ARIMA/VAR)** |
| **17** | `unidad3/cap17_backtesting.qmd` | — | **NUEVO (in/out-of-sample, p-values, walk-forward)** |
| **Módulo 4: Derivados y Volatilidad** | | | |
| 18 | `unidad4/cap18_derivados_vol_implicita.qmd` | cap12 | reescribir + renombrar |
| 19 | `unidad4/cap19_delta_hedging.qmd` | cap13 | reescribir + renombrar |
| **20** | `unidad4/cap20_volatilidad_estocastica.qmd` | — | **NUEVO (Heston, SABR)** |

Notas de reorganización:
- `unidad3/cap10_estadistica_bayesiana.qmd` **se elimina**: su intuición prior→posterior (Beta-Binomial, frecuentista vs bayesiano) pasa como preámbulo breve del nuevo cap10 (BL).
- **Black-Litterman se mueve a Módulo 2** (cap10), agrupado con Markowitz (cap08) y HRP (cap09): los tres son métodos de construcción de portafolios. El viejo cap11 se **parte en dos**: la parte econométrica/CAPM → cap15 (reforzada); la parte BL → cap10.
- **Construcción de curvas de rendimiento**: se amplía dentro del capítulo de Pandas/Series de Tiempo (cap06), donde ya existe el bootstrapping ETTI (de bonos con cupón a curva spot/forward + interpolación). No es capítulo aparte.
- **Split de modelos estocásticos por objeto** (feedback del usuario): los procesos del **precio del activo** (GBM en cap13; jump-diffusion de Merton y Lévy en cap14) van **en Módulo 3, antes de opciones**. La **volatilidad estocástica (Heston, SABR)** —que existe para el *pricing de opciones* y la superficie de volatilidad— va a Módulo 4 (cap20).
- **Orden del bloque de modelado** (feedback del usuario): econometría/modelos lineales (cap15) → series temporales ARIMA/VAR (cap16, que son modelos de series de tiempo y continúan naturalmente lo visto) → backtesting (cap17) como capstone de validación. El cap16 referencia explícitamente el capítulo de Series de Tiempo con Pandas (cap06).

---

## Guía de estilo "humano" (aplicar a todo capítulo reescrito o nuevo)

Tomar cap01 como vara de calidad. Para cada capítulo:

1. **Motivar antes de formalizar**: abrir cada sección con el "por qué" financiero (un problema real) antes de la fórmula o el código.
2. **Voz**: español rioplatense didáctico, segunda persona ("vas a ver", "fijate"), consistente con la bienvenida y las intros de módulo.
3. **Ejemplos trabajados numéricos**: al menos un ejemplo con números concretos y su interpretación ("esto significa que…").
4. **Eliminar todos los `# TODO`** y bloques de código estáticos no ejecutables (p.ej. el bloque PyMC): todo bloque debe correr, o se elimina.
5. **Callouts pedagógicos**: `.callout-tip` (buenas prácticas), `.callout-warning` (errores/trampas), `.callout-note` (matices), como ya usa el libro.
6. **Intuición + analogías** para conceptos duros (broadcasting, equilibrio inverso, clustering, volatilidad estocástica).
7. **Estructura uniforme**: front-matter con `abstract` → Introducción motivada → secciones prosa+código → "Errores comunes" → "Ejercicios propuestos" (con pistas) → "Referencias".
8. **Consistencia de bloques**: `{pyodide-python}` en los introductorios de Módulo 1; `{python}` en cómputo pesado (numpy/scipy/pandas/statsmodels).
9. **Continuidad narrativa**: cada capítulo referencia lo aprendido en el anterior.

---

## Plantilla de "Casos prácticos" (interludios aplicados)

Entregable adicional (feedback del usuario): un **template reutilizable** para insertar entre capítulos un caso práctico que aplique la metodología del capítulo previo a una pregunta general (ej.: *"¿Conviene invertir en cuchillos cayendo?"* aplicando lo del capítulo de riesgo/backtesting). El usuario aún no tiene los ejemplos; solo se crea el andamiaje:

- Archivo template `unidad_x/_caso_practico_template.qmd` (o snippet documentado) con la estructura sugerida: **La pregunta** (planteo intuitivo) → **¿Qué capítulo/metodología aplica?** → **Datos/supuestos** → **Resolución paso a paso (código)** → **Interpretación y matices** → **Conclusión / respuesta**.
- Documentar en el README/CLAUDE cómo intercalarlos en `_quarto.yml` (como capítulos `.unnumbered` o secciones "Caso práctico") sin romper la numeración.
- No se escribe ningún caso concreto todavía: quedan como placeholders a completar por el usuario.

---

## Trabajo por bloque

### A. NumPy nuevo (`unidad1/cap05_numpy.qmd`)
Entre POO (cap04) y Pandas (cap06). `ndarray` vs listas y por qué; creación (`array`, `arange`, `linspace`, `zeros/ones`, `random`), dtype/memoria contigua, indexado/slicing/máscaras booleanas, **vectorización** (reemplazar los bucles del cap02), **broadcasting** (con analogía visual), reducciones por eje (`axis`), álgebra lineal (`@`, `np.linalg`) anticipando Markowitz. Ejemplos: retornos vectorizados, matriz de precios, primera matriz de covarianzas. Cierra conectando con Pandas.

### B. Módulo 1: pulido cap01–04 + Pandas (cap06)
cap01–cap04 ya son buenos → limpiar `# TODO` residuales, reforzar transiciones/ejemplos. Pandas (cap06): engordar prosa escueta y **ampliar la sección de curvas de rendimiento** (bootstrapping → spot + forward + interpolación).

### C. Módulo 2: Estadística/Optim (cap07), Markowitz (cap08), HRP (cap09), Black-Litterman (cap10)
- **cap07**: reescritura didáctica.
- **cap08 Markowitz** (ampliado, feedback del usuario):
  - **Frontera eficiente** a fondo: construcción por optimización, portafolio de mínima varianza, línea de mercado de capitales (CML), portafolio tangente/Sharpe máximo.
  - **Métricas y objetivos**: discusión de qué significan y cuándo usar Sharpe, Sortino, minimizar varianza, maximizar retorno, etc. (qué penaliza/premia cada uno).
  - **Dividendos**: retorno total = apreciación + dividend yield y su efecto en μ.
  - **Renta fija**: incluir activo libre de riesgo / bono en el universo y su efecto en la frontera y el portafolio óptimo (reusa bonos del Módulo 1).
  - **Deflación y horizontes largos**: retornos reales vs nominales al analizar períodos largos, por qué importa deflactar.
  - **Precios directos vs exceso de mercado**: cuándo tiene sentido optimizar sobre el exceso de retorno (excess returns) y cuándo sobre precios/retornos directos.
- **cap09 HRP (NUEVO)**: motivar con la inestabilidad de Markowitz (invertir Σ mal condicionada). Tres pasos de López de Prado: (1) *tree clustering* jerárquico sobre distancias de correlación (`scipy.cluster.hierarchy`), (2) *quasi-diagonalización*, (3) *recursive bisection* inverse-variance. Implementación from-scratch + comparación fuera de muestra vs Markowitz. Ref: López de Prado (2016).
- **cap10 Black-Litterman (NUEVO, algebraico)**: preámbulo de "intuición prior→posterior" (heredado del cap10 bayesiano deprecado), sin formalismo pesado. Luego método **clásico/algebraico**: (1) *reverse optimization* Π = δΣw_mkt (retornos implícitos de equilibrio), (2) views P, Q, Ω, (3) **fórmula maestra** de retornos posteriores, (4) covarianza BL, con derivación paso a paso y ejemplo 2–3 activos + optimización resultante y comparación con Markowitz "puro".

### D. Módulo 3: riesgo, simulación, econometría
- **cap11 VaR + Expected Shortfall/CVaR**: ampliar el VaR existente. **Explicar bien CVaR/ES** (feedback del usuario): qué es la pérdida esperada más allá del VaR, por qué es coherente y VaR no, cálculo histórico/paramétrico/Monte Carlo, y comparación e interpretación. Backtesting de VaR (Kupiec).
- **cap12 Riesgo y Regulación (NUEVO)**: stress testing, Basel III (capital, RWA, LCR/NSFR conceptual), PPNR, riesgo operacional vs de mercado, y **casos narrativos** LTCM (modelos mal calibrados / apalancamiento) y crisis 2008 (derivados de crédito, correlación falsa / cópula gaussiana). Prosa de caso + código ilustrativo (p.ej. una correlación subestimada rompiendo un portafolio).
- **cap13 Monte Carlo**: reescritura; reforzar GBM (proceso del precio del activo), reducción de varianza (antitéticas), pricing de opción por MC como puente.
- **cap14 Procesos Estocásticos de Activos (NUEVO)**: desde GBM → limitaciones (colas gruesas, saltos) → **jump-diffusion de Merton** y **procesos de Lévy**, simulación de trayectorias del precio y comparación de distribuciones de retornos vs GBM. Enfoque en *modelar el activo*.
- **cap15 Econometría y Modelos Lineales en finanzas (REFORZADO)** (feedback del usuario): capítulo sólido, no básico. **Cómo armar modelos lineales**: especificación, regresión simple y **múltiple**, supuestos (Gauss-Markov) y diagnósticos, interpretación de coeficientes, **p-values / t-stats y significancia** (base para el cap17), R²/ajuste. **Aplicaciones en finanzas**: CAPM (mantener), **modelos multifactor** (Fama-French a nivel intro), hedging ratios, factor exposure. Mantener la clase `RegresionLineal` from-scratch y complementar con `statsmodels` para inferencia.
- **cap16 Series Temporales: ARIMA y VAR (NUEVO)**: continúa naturalmente cap15 y referencia el cap06 (Series de Tiempo con Pandas). Estacionariedad (ADF), ACF/PACF, **ARIMA** (identificación, ajuste con `statsmodels`, pronóstico) y **VAR** para varias series macro (impulso-respuesta intro).
- **cap17 Backtesting (NUEVO, capstone de validación)**: **in-sample vs out-of-sample**, sobreajuste / data snooping, **cálculo e interpretación de p-values** de estrategias (conexión con cap15), **walk-forward analysis** (ventanas rodantes entrenar→probar) y métricas out-of-sample (Sharpe, drawdown, hit ratio). Ejemplo end-to-end backtesteando una estrategia simple con walk-forward.

### E. Módulo 4: derivados y volatilidad
- **cap18** (Black-Scholes/vol implícita) y **cap19** (delta hedging): reescritura didáctica; hoy esqueléticos.
- **cap20 Volatilidad Estocástica (NUEVO)**: motivar con la **sonrisa/superficie de volatilidad** que Black-Scholes no captura → **Heston** (vol estocástica mean-reverting) y **SABR**, con simulación y calibración conceptual y su efecto sobre precios de opciones y la sonrisa. (Los procesos del precio del activo ya se cubrieron en Módulo 3.)

---

## Renumeración y configuración (cambios mecánicos)

1. **Renombrar archivos** a la tabla destino (cap05→cap06, cap06→cap07, cap07 markowitz→cap08, cap08 var→cap11, cap09 monte_carlo→cap13, cap12 derivados→cap18, cap13 delta→cap19; **partir cap11** econometría/CAPM+BL en cap15 + cap10; **eliminar** cap10 bayesiano) y crear los **8 nuevos** (NumPy, HRP, BL, riesgo/regulación, procesos estocásticos de activos, series temporales, backtesting, volatilidad estocástica). BL pasa a `unidad2/`.
2. **Actualizar el título "Capítulo N"** en el front-matter de cada `.qmd` al nuevo número.
3. **`_quarto.yml`**: reconstruir `chapters` con el nuevo orden (20 caps) y **descomentar** Módulos 2 (resto), 3 y 4. Actualizar los 4 `part:` (Módulo 3 → "Riesgo, Simulación y Econometría"; Módulo 4 → "Derivados y Volatilidad").
4. **`index.qmd`**: actualizar la descripción de los 4 módulos y la numeración (agregar NumPy, HRP, BL, riesgo/regulación, procesos estocásticos, series temporales, backtesting, volatilidad estocástica).
5. **`_intro_modX.qmd`**: actualizar tablas de "recorrido", objetivos, herramientas (agregar NumPy, statsmodels) y semanas.
6. **`README.md`**: agregar `statsmodels`; quitar `pymc` (ya no se usa).

---

## Orden de ejecución sugerido (por olas)

1. **Ola 0 — Andamiaje**: renombrar/partir archivos, crear placeholders de los 8 nuevos + template de caso práctico, actualizar `_quarto.yml`/`index`/intros/`README`, y verificar que **renderiza** antes de escribir contenido.
2. **Ola 1 — Módulo 1**: NumPy (cap05) + pulido cap01–04 + Pandas/curvas (cap06). **Punto de aprobación de estilo** con el usuario tras cap05+cap06.
3. **Ola 2 — Módulo 2**: cap07, cap08 (Markowitz ampliado), cap09 (HRP), cap10 (BL algebraico).
4. **Ola 3 — Módulo 3**: cap11 (VaR/ES/CVaR), cap12 (riesgo/regulación), cap13 (MC), cap14 (procesos estocásticos), cap15 (econometría reforzada), cap16 (ARIMA/VAR), cap17 (backtesting).
5. **Ola 4 — Módulo 4**: cap18 (Black-Scholes), cap19 (delta hedging), cap20 (Heston/SABR).

---

## Verificación

- **Build**: `cd libro-finanzas && quarto render` completa sin error; los 4 módulos se numeran secuencialmente 1–20. (`quarto preview` para iterar.)
- **Código ejecutable**: no queda ningún bloque `{python}` que falle ni `# TODO`/bloque estático; `statsmodels` instalado en `.venv`.
- **Coherencia de numeración**: cada "Capítulo N" del título coincide con el orden del sidebar; sin referencias cruzadas rotas.
- **Revisión de estilo**: muestreo de 2–3 capítulos contra la guía de estilo.
- **Enlaces/estructura**: `index.qmd` e `_intro_modX.qmd` reflejan la estructura final; el template de caso práctico existe y documenta cómo intercalarlo.

## Riesgos / notas
- Volumen grande (13 reescrituras + 8 capítulos nuevos + renumeración/reorganización + template). Se ejecuta por olas con puntos de aprobación; el plan no compromete terminar todo en una sola pasada.
- Capítulos de mayor exigencia matemática (cap14 procesos estocásticos, cap16 VAR, cap20 Heston/SABR): cuidado extra en intuición y validación numérica.
