# Finanzas Computacionales

Este repositorio contiene el libro **"Finanzas Computacionales: De los Fundamentos a los Derivados"**, escrito con [Quarto](https://quarto.org/) y publicado en [diegoonna.github.io/libro_finanzas_computacionales](https://diegoonna.github.io/libro_finanzas_computacionales/).

Son 20 capítulos organizados en 4 módulos que van desde pensamiento computacional y Python básico hasta derivados y volatilidad estocástica, pasando por portafolios, riesgo y econometría. La idea central: cada concepto financiero se aprende escribiendo y ejecutando código.

La configuración principal vive en [`_quarto.yml`](./_quarto.yml) y el sitio renderizado se genera en `docs/`, que es lo que GitHub Pages publica desde `main`.

## Requisitos

- [Quarto](https://quarto.org/), para renderizar y previsualizar.
- Python, porque el proyecto usa `jupyter: python3` para ejecutar los bloques de código durante el render.
- TinyTeX (`quarto install tinytex`), para generar el PDF descargable del libro.
- Los paquetes que usan los ejemplos del libro:

  ```powershell
  pip install -r requirements.txt
  ```

  El núcleo es `numpy`, `pandas`, `scipy`, `matplotlib` y `statsmodels`, más el kernel de Jupyter. Los opcionales de datos (`yfinance`, `pandas-datareader`, `fredapi`) solo hacen falta para reproducir el apéndice de obtención de datos.

  Las versiones están **fijadas** a propósito (Python 3.13): los números que cita el texto salen de ejecutar el código, y una versión nueva de una librería puede cambiarlos. Subir una versión es una decisión editorial: re-renderizá y revisá las cifras.

- Para el PDF, TinyTeX necesita el soporte de español (`lang: es`): `tlmgr install babel-spanish hyphen-spanish`. Si tu TinyTeX es de un año anterior al del repositorio de TeX Live, `tlmgr` se niega a instalar; usá el repositorio archivado de tu versión, por ejemplo `tlmgr --repository https://ftp.tu-chemnitz.de/pub/tug/historic/systems/texlive/2025/tlnet-final install babel-spanish hyphen-spanish`.

> **Render incremental:** el proyecto usa `freeze: auto`, así que Quarto cachea los resultados de ejecución en `_freeze/` y solo re-ejecuta los capítulos cuyo código cambió. El primer render construye la cache (tarda unos minutos); los siguientes son casi instantáneos.

## Renderizar el libro

Desde PowerShell:

```powershell
cd .\libro-finanzas
quarto render
```

El sitio queda en `docs/` (ver `output-dir: docs` en [`_quarto.yml`](./_quarto.yml)), junto con el **PDF completo del libro** (`format: pdf` + `downloads: [pdf]`: el sitio muestra el botón de descarga en la portada). Si preferís iterar rápido mientras editás un capítulo:

```powershell
quarto preview
```

> **Red de seguridad (CI):** el workflow [`.github/workflows/render.yml`](./.github/workflows/render.yml) re-renderiza el libro en cada push a `main`. Si pusheaste un capítulo editado sin correr `quarto render`, el CI detecta que `docs/` quedó desactualizado y commitea la diferencia automáticamente (commit `chore: re-render automático de docs/ [CI]`). Si renderizaste localmente, el CI no agrega nada. Acordate de hacer `git pull` después de un push en el que te hayas olvidado de renderizar, para traerte el commit del bot. El render tiene un tope de 45 minutos (un render colgado ya no puede bloquear todo durante horas), y si el render completo falla —casi siempre por el PDF—, el workflow publica igual la web con `quarto render --to html` y deja un aviso en la corrida. El mismo workflow corre un job `links` con [lychee](https://github.com/lycheeverse/lychee) que chequea los links externos de los `.qmd`; si alguno murió, el job queda en rojo pero no bloquea la publicación.

> **Nota (Windows):** si Quarto no encuentra el intérprete correcto, apuntá `QUARTO_PYTHON` al Python del entorno virtual antes de renderizar:
>
> ```powershell
> $env:QUARTO_PYTHON = (Resolve-Path ..\.venv-win\Scripts\python.exe).Path
> quarto render
> ```
>
> El entorno `.venv-win` se crea con un CPython nativo de Windows (python.org) e instala: `numpy pandas scipy matplotlib statsmodels ipykernel nbclient nbformat`.

## Cómo se ejecuta el código del libro

El libro mezcla dos tipos de bloques ejecutables, y conviene respetar la diferencia al editar:

- Bloques `python` (` ```{python} `): se ejecutan en el entorno Python local durante el render, vía `jupyter: python3`.
- Bloques `pyodide-python` (` ```{pyodide-python} `): se ejecutan en el navegador del lector usando la extensión `coatless-quarto/pyodide`. Son los que permiten que cualquiera experimente con el código sin instalar nada. Además de los ejemplos del módulo 1, **todos los capítulos de los módulos 2–4 cierran con una celda de práctica interactiva** (etiqueta `practica-navegador`) después de los ejercicios; la extensión instala sola los paquetes que la celda importa. En el PDF estas celdas aparecen como código estático.
- Simuladores interactivos (carpeta `simuladores/`): gráficos con controles que el lector mueve para ver cómo responde un modelo, ubicados junto a la figura estática que generalizan, dentro de un recuadro "Simulador". Cada uno es un módulo ES (uno por simulador: `diversificacion.js` y `frontera.js` en el capítulo 8, `var_es.js` en el 11, `cdo.js` en el 12, `montecarlo.js` en el 13, `falsos_descubrimientos.js` en el 17, `black_scholes.js` en el 18 y `cobertura.js` en el 19) que el capítulo monta desde un bloque `{=html}`; no ejecutan Python, así que modificarlos no re-ejecuta el capítulo. `finanzas.js` tiene la matemática compartida (normal y t de Student, VaR/ES exactos, Black-Scholes, GBM, carteras óptimas, la distribución de pérdidas del CDO, momentum y cobertura), `marco.js` la interfaz común y `librerias.js` fija las versiones de Observable Plot e Inputs. **No usan celdas `{ojs}` a propósito:** el runtime de OJS rompe el editor de las celdas Pyodide de la misma página (ver el comentario en `librerias.js`). Si tocás `finanzas.js`, corré `node simuladores/verificar.mjs`, que la compara contra valores de scipy. En el PDF, cada simulador se reemplaza por un recuadro con el link a la versión web.

## Dataset del libro

`datos/precios.csv` contiene cinco años de precios diarios ajustados (jul-2021 a jun-2026) de 10 tickers: 9 acciones de sectores distintos + SPY. Lo usan las secciones **"Con datos reales"** de los capítulos 6 (pandas), 7 (hechos estilizados), 8 (Markowitz), 9 (HRP), 11 (VaR/ES), 15 (betas del CAPM), 16 (ACF y clustering de volatilidad) y 17 (backtesting), y está documentado en el apéndice de obtención de datos. Está listado en `project: resources:` para que se publique con el sitio, así las celdas Pyodide pueden cargarlo por URL. Si lo regenerás (script en el apéndice), los números impresos en esos capítulos van a cambiar — regenerarlo es una decisión editorial, no mantenimiento.

## Bibliografía

Las referencias viven centralizadas en [`references.bib`](./references.bib). Cada capítulo lista sus obras en el campo `nocite` de su front-matter y cierra con un div `::: {#refs}` donde Quarto genera la lista formateada. Para citar en el texto se usa la sintaxis estándar `@clave` (por ejemplo `@markowitz1952`). Al agregar una obra nueva: entrada en `references.bib` primero, después la `@clave` en el `nocite` (o en el texto) del capítulo.

## Estructura

- `index.qmd`: portada y entrada principal del libro
- `unidad1/` a `unidad4/`: los capítulos, agrupados por módulo (20 capítulos en total)
- `apendices/`: apéndices (introducción a Python, obtención de datos financieros)
- `datos/`: el dataset real congelado del libro (ver arriba)
- `references.bib`: bibliografía centralizada (ver arriba)
- `_extensions/`: extensiones de Quarto que usa el proyecto (incluye `coatless-quarto/pyodide`)
- `docs/`: salida generada por Quarto (sitio + PDF) — no se edita a mano. Es la **única** salida: si aparecen `.html`, `*_files/` o `site_libs/` junto a las fuentes, son restos de un render sin `output-dir` y el `.gitignore` los ignora.
- `_tex/doc-class.tex`: ajuste de la plantilla LaTeX del PDF (desactiva las comillas `<<>>` de babel-spanish, que chocan con la clase KOMA-Script del libro)
- `simuladores/`: los simuladores interactivos de la versión web (ver arriba)
- `_esquemas.py`: primitivas de dibujo para los esquemas y figuras ocultas de los capítulos (y `aplicar_estilo()`, la paleta del libro para los gráficos con código visible)
- `_caso_practico_template.qmd`: plantilla para los interludios aplicados (ver abajo)

## Casos prácticos (interludios aplicados)

La plantilla [`_caso_practico_template.qmd`](./_caso_practico_template.qmd) define la estructura para insertar, entre capítulos, un caso práctico que aplique la metodología del capítulo anterior a una pregunta concreta (por ejemplo: *"¿conviene invertir en cuchillos cayendo?"*).

Para agregar uno:

1. Copiá la plantilla con un nombre descriptivo, p. ej. `unidad3/caso_cuchillos_cayendo.qmd` (sin guion bajo inicial: los archivos `_*.qmd` no se renderizan).
2. Completá las seis secciones (pregunta → herramienta → datos → resolución → matices → conclusión).
3. Agregá la ruta en `_quarto.yml` inmediatamente después del capítulo correspondiente y marcá el primer encabezado con `{.unnumbered}` para no romper la numeración de capítulos.

## Configuración y assets

[`_quarto.yml`](./_quarto.yml) referencia:

- `theme: [cosmo, custom.scss]`
- `cover-image: cover.jpg` y `favicon: favicon.png` (ambos optimizados para web; el original en alta resolución quedó en el historial de git como `cover.png`)
- `.nojekyll`, listado en `project: resources:` — obligatorio para GitHub Pages: sin él, Jekyll excluye del sitio publicado todo archivo que empiece con `_` (como los `_intro_modX.html`).

Si querés otro estilo o imagen, ajustá `cover-image`, `favicon` o el tema en [`_quarto.yml`](./_quarto.yml).

## Versiones

Lo que fue cambiando en el libro, de lo más nuevo a lo más viejo. Cada versión junta un hito que se nota al abrir el sitio; los arreglos chicos quedan adentro de la versión en la que entraron.

**v0.10 (octubre 2026)**

- Simuladores interactivos en la versión web: gráficos con controles para mover los parámetros de un modelo y ver cómo responde, cada uno junto a la figura que generaliza y con experimentos guiados ("Probá esto"). Llegan ocho: diversificación y frontera eficiente (capítulo 8), VaR contra ES con colas pesadas (11), el CDO y la correlación (12), Monte Carlo (13), la fábrica de falsos descubrimientos (17), Black-Scholes y sus griegas (18) y la mesa de cobertura (19).
- En el PDF, cada simulador queda como un recuadro con el link a la versión web.
- Corrección en los capítulos 18 y 19: el delta de la call decía 0.57; es 0.59 a seis meses y 0.63 a un año.

**v0.9 (octubre 2026)**

- Los módulos 3 y 4 recibieron el mismo trabajo visual que los dos primeros: esquemas y diagramas para las ideas que antes solo estaban explicadas en texto (VaR contra ES, Kupiec, la cascada de un CDO, walk-forward, Newton-Raphson, la cartera cubierta, Heston, entre otras), y mapas al comienzo de cada módulo.
- Se arregló la numeración de secciones de los capítulos 11 a 20, que se mezclaba con la de los capítulos.
- Todos los gráficos tienen número, epígrafe y la paleta del libro, así el texto puede citarlos.
- Más capítulos con datos reales: pandas (6), hechos estilizados (7), betas del CAPM (15) y autocorrelación de la volatilidad (16).
- En el capítulo 17, la demostración de data snooping ahora sí muestra lo que dice el texto.
- El PDF vuelve a generarse y el CI ya no se cuelga. Las dependencias quedaron con versiones fijas para que los números del libro no cambien solos.

**v0.8 (octubre 2026)**

- Esquemas y diagramas en los módulos 1 y 2: cómo funcionan las variables, los arrays, el broadcasting, la frontera eficiente, el árbol de HRP, las views de Black-Litterman.

**v0.7 (julio 2026)**

- Dataset propio: cinco años de precios de 9 acciones y el S&P 500, guardados en el repo para que los resultados no dependan de bajar datos.
- Primeras secciones "Con datos reales" (Markowitz, HRP, VaR y backtesting).
- Celda para practicar en el navegador al final de cada capítulo de los módulos 2 a 4.
- Bibliografía centralizada y chequeo automático de links rotos.

**v0.6 (julio 2026)**

- El sitio se re-renderiza solo con cada push. Portada y favicon nuevos.

**v0.5 (julio 2026)**

- Reescritura completa: introducciones narrativas para cada módulo, revisión del módulo 1 y del capítulo de VaR, y apéndice sobre cómo conseguir datos financieros.

**v0.4 (julio 2026)**

- El libro pasa de 13 a 20 capítulos: NumPy, HRP, Black-Litterman, regulación, procesos estocásticos, econometría, series de tiempo, backtesting y volatilidad estocástica.

**v0.3 (marzo 2026)**

- Se completa el módulo 1 con funciones, programación orientada a objetos y pandas.

**v0.2 (marzo 2026)**

- Se pasa de "semanas" a capítulos numerados, con un índice detallado y el apéndice de introducción a Python.

**v0.1 (marzo 2026)**

- Primera versión publicada: 13 capítulos en 4 módulos, con código que se puede correr en el navegador.

### Cómo versionar de ahora en más

La regla: **una versión nueva solo cuando el lector notaría la diferencia** — un capítulo nuevo o reescrito, un caso práctico, un cambio visible del sitio. Correcciones de tipeo, ajustes de estilo o re-renders no abren versión: quedan dentro de la próxima.

El flujo con cada commit:

1. Escribí un mensaje que describa el cambio (`"Agrega caso práctico de cuchillos cayendo"`), no `"commit 14"`. Es lo que después permite armar la fila de la versión sin arqueología.
2. Si el commit **cierra un hito**, agregá arriba de todo una entrada con la versión siguiente, el mes y unas pocas líneas sobre qué gana el lector (no qué archivos se tocaron). Para repasar qué entró desde la última etiqueta: `git log --oneline v0.10..HEAD`.
3. Si es un commit chico, no hagas nada: se sumará al rango de la próxima versión.

Opcional pero recomendado: etiquetá el commit que cierra cada versión, así GitHub las muestra como releases:

```powershell
git tag -a v0.10 -m "Resumen del hito"
git push --tags
```

## Contribuir

Si encontrás un error o querés proponer un cambio, abrí un issue o mandá un PR en el [repositorio](https://github.com/diegoonna/libro_finanzas_computacionales) (el sitio tiene los accesos directos habilitados vía `repo-actions: [edit, issue]`).

Al editar un capítulo, mantené el estilo de los bloques ejecutables (`python` vs `pyodide-python`) para que el comportamiento siga siendo consistente.
