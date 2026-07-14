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

> **Red de seguridad (CI):** el workflow [`.github/workflows/render.yml`](./.github/workflows/render.yml) re-renderiza el libro en cada push a `main`. Si pusheaste un capítulo editado sin correr `quarto render`, el CI detecta que `docs/` quedó desactualizado y commitea la diferencia automáticamente (commit `chore: re-render automático de docs/ [CI]`). Si renderizaste localmente, el CI no agrega nada. Acordate de hacer `git pull` después de un push en el que te hayas olvidado de renderizar, para traerte el commit del bot. El mismo workflow corre un job `links` con [lychee](https://github.com/lycheeverse/lychee) que chequea los links externos de los `.qmd`; si alguno murió, el job queda en rojo pero no bloquea la publicación.

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

## Dataset del libro

`datos/precios.csv` contiene cinco años de precios diarios ajustados (jul-2021 a jun-2026) de 10 tickers: 9 acciones de sectores distintos + SPY. Lo usan las secciones **"Con datos reales"** de los capítulos 8 (Markowitz), 9 (HRP), 11 (VaR/ES) y 17 (backtesting), y está documentado en el apéndice de obtención de datos. Está listado en `project: resources:` para que se publique con el sitio, así las celdas Pyodide pueden cargarlo por URL. Si lo regenerás (script en el apéndice), los números impresos en esos capítulos van a cambiar — regenerarlo es una decisión editorial, no mantenimiento.

## Bibliografía

Las referencias viven centralizadas en [`references.bib`](./references.bib). Cada capítulo lista sus obras en el campo `nocite` de su front-matter y cierra con un div `::: {#refs}` donde Quarto genera la lista formateada. Para citar en el texto se usa la sintaxis estándar `@clave` (por ejemplo `@markowitz1952`). Al agregar una obra nueva: entrada en `references.bib` primero, después la `@clave` en el `nocite` (o en el texto) del capítulo.

## Estructura

- `index.qmd`: portada y entrada principal del libro
- `unidad1/` a `unidad4/`: los capítulos, agrupados por módulo (20 capítulos en total)
- `apendices/`: apéndices (introducción a Python, obtención de datos financieros)
- `datos/`: el dataset real congelado del libro (ver arriba)
- `references.bib`: bibliografía centralizada (ver arriba)
- `_extensions/`: extensiones de Quarto que usa el proyecto (incluye `coatless-quarto/pyodide`)
- `docs/`: salida generada por Quarto (sitio + PDF) — no se edita a mano
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

Cada versión agrupa los commits de un hito del libro: algo que el lector notaría al abrir el sitio. Los commits chicos (correcciones, retoques, re-renders) se acumulan dentro de la versión en curso. La más reciente arriba.

| Versión | Fecha | Commits | Qué cambió |
|---------|------------|-----------|------------|
| v0.6 | 2026-07-13 | `8fade5a` | Publicación pulida: workflow de CI que re-renderiza `docs/` en cada push, `.nojekyll` para GitHub Pages, portada optimizada (`cover.jpg`) y favicon. |
| v0.5 | 2026-07-12 → 07-13 | `833f405`…`2fd2598` | Reescritura integral: intros narrativas para los 4 módulos, revisión de todo el módulo 1 y del capítulo de VaR, apéndice de obtención de datos financieros y `requirements.txt`. |
| v0.4 | 2026-07-11 | `fcb993b` | Gran expansión: el libro pasa a 20 capítulos. Nuevos: NumPy, HRP, Black-Litterman, riesgo y regulación, procesos estocásticos, econometría, series macro, backtesting y volatilidad estocástica. Se suma la plantilla de casos prácticos. |
| v0.3 | 2026-03-20 → 03-31 | `ea76c0e`…`8fae2b7` | Módulo 1 desarrollado: capítulos de funciones, POO y series de tiempo con pandas. Primer README del proyecto y nueva portada. |
| v0.2 | 2026-03-13 → 03-17 | `bc82d46`…`28f21c9` | Reorganización de "semanas" a capítulos numerados (`capXX`), índice detallado con el esquema de cada capítulo, apéndice de introducción a Python y revisión de los capítulos 1 y 2. |
| v0.1 | 2026-03-10 | `e3cfb40`…`e55d6ec` | Nace el proyecto: estructura Quarto, 13 capítulos iniciales en 4 módulos y código ejecutable en el navegador (arrancó con Shinylive y ese mismo día migró a Pyodide). |

### Cómo versionar de ahora en más

La regla: **una versión nueva solo cuando el lector notaría la diferencia** — un capítulo nuevo o reescrito, un caso práctico, un cambio visible del sitio. Correcciones de tipeo, ajustes de estilo o re-renders no abren versión: quedan dentro de la próxima.

El flujo con cada commit:

1. Escribí un mensaje que describa el cambio (`"Agrega caso práctico de cuchillos cayendo"`), no `"commit 14"`. Es lo que después permite armar la fila de la versión sin arqueología.
2. Si el commit **cierra un hito**, agregá una fila arriba de la tabla con la versión siguiente, el rango de commits desde la versión anterior y un resumen en términos del libro (qué gana el lector, no qué archivos se tocaron). Para listar qué entró: `git log --oneline v0.6..HEAD`.
3. Si es un commit chico, no hagas nada: se sumará al rango de la próxima versión.

Opcional pero recomendado: etiquetá el commit que cierra cada versión, así GitHub las muestra como releases y los rangos de la tabla se vuelven navegables:

```powershell
git tag -a v0.7 -m "Resumen del hito"
git push --tags
```

## Contribuir

Si encontrás un error o querés proponer un cambio, abrí un issue o mandá un PR en el [repositorio](https://github.com/diegoonna/libro_finanzas_computacionales) (el sitio tiene los accesos directos habilitados vía `repo-actions: [edit, issue]`).

Al editar un capítulo, mantené el estilo de los bloques ejecutables (`python` vs `pyodide-python`) para que el comportamiento siga siendo consistente.
