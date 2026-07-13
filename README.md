# Finanzas Computacionales (Libro Quarto)

Este repositorio contiene el libro **"Finanzas Computacionales con Python"**, construido con [Quarto](https://quarto.org/).
La configuracion principal vive en [`_quarto.yml`](./_quarto.yml) y el sitio renderizado se genera en `docs/`.

## Requisitos

- [Quarto](https://quarto.org/) (para renderizar/preview)
- Python (porque el proyecto usa `jupyter: python3` para ejecutar bloques `python`)
- Paquetes Python usados por los ejemplos del libro: instalar con

  ```powershell
  pip install -r requirements.txt
  ```

  (nucleo: `numpy`, `pandas`, `scipy`, `matplotlib`, `statsmodels` + el kernel de Jupyter;
  los opcionales de datos —`yfinance`, `pandas-datareader`, `fredapi`— solo hacen falta
  para reproducir el apendice de obtencion de datos)

> **Render incremental:** el proyecto usa `freeze: auto`, asi que Quarto cachea los
> resultados de ejecucion en `_freeze/` y solo re-ejecuta los capitulos cuyo codigo
> cambio. El primer render construye la cache (tarda unos minutos); los siguientes
> son casi instantaneos.

## Quick start (render local)

Desde `PowerShell`:

```powershell
cd .\libro-finanzas
quarto render
```

El sitio resultante se escribe en `docs/` (ver `output-dir: docs` en [`_quarto.yml`](./_quarto.yml)),
que es lo que GitHub Pages publica desde la rama `main`.

> **Red de seguridad (CI):** el workflow [`.github/workflows/render.yml`](./.github/workflows/render.yml)
> re-renderiza el libro en cada push a `main`. Si pusheaste un capitulo editado sin correr
> `quarto render`, el CI detecta que `docs/` quedo desactualizado y commitea la diferencia
> automaticamente (commit `chore: re-render automático de docs/ [CI]`). Si renderizaste
> localmente, el CI no agrega nada. Acordate de hacer `git pull` despues de un push en el
> que te hayas olvidado de renderizar, para traerte el commit del bot.

> **Nota (Windows):** si Quarto no encuentra el interprete correcto, apunta `QUARTO_PYTHON`
> al Python del entorno virtual antes de renderizar:
>
> ```powershell
> $env:QUARTO_PYTHON = (Resolve-Path ..\.venv-win\Scripts\python.exe).Path
> quarto render
> ```
>
> El entorno `.venv-win` se crea con un CPython nativo de Windows (python.org) e
> instala: `numpy pandas scipy matplotlib statsmodels ipykernel nbclient nbformat`.

## Preview local

Si queres iterar rapido sin volver a renderizar todo:

```powershell
cd .\libro-finanzas
quarto preview
```

## Como se ejecuta el codigo del libro

Este libro mezcla dos tipos de bloques ejecutables:

- Bloques `python` (p.ej. ` ```{python} `): se ejecutan en el entorno Python local durante el renderizado (configurado con `jupyter: python3` en [`_quarto.yml`](./_quarto.yml)).
- Bloques `pyodide-python` (p.ej. ` ```{pyodide-python} `): se ejecutan en el navegador usando el filtro/extension `coatless-quarto/pyodide` (ver `filters: - coatless-quarto/pyodide` en [`_quarto.yml`](./_quarto.yml)).

## Estructura

- `index.qmd`: entrada principal del libro
- `unidad1/`, `unidad2/`, `unidad3/`, `unidad4/`: capitulos por modulo (20 capitulos en 4 modulos)
- `apendices/`: apendices del libro
- `_extensions/`: extensiones de Quarto utilizadas por el proyecto (incluye `coatless-quarto/pyodide`)
- `docs/`: salida generada por Quarto (`output-dir: docs`)
- `_caso_practico_template.qmd`: plantilla para interludios aplicados (ver abajo)

## Casos practicos (interludios aplicados)

La plantilla [`_caso_practico_template.qmd`](./_caso_practico_template.qmd) define la estructura
para insertar, entre capitulos, un caso practico que aplique la metodologia del capitulo
anterior a una pregunta concreta (ej.: *"¿conviene invertir en cuchillos cayendo?"*).

Para agregar uno:

1. Copiar la plantilla con un nombre descriptivo, p. ej. `unidad3/caso_cuchillos_cayendo.qmd`
   (sin guion bajo inicial: los archivos `_*.qmd` no se renderizan).
2. Completar las seis secciones (pregunta → herramienta → datos → resolucion → matices → conclusion).
3. Agregar la ruta en `_quarto.yml` inmediatamente despues del capitulo correspondiente y marcar
   el primer encabezado con `{.unnumbered}` para no romper la numeracion de capitulos.

## Configuracion y assets (importante)

[`_quarto.yml`](./_quarto.yml) referencia:

- `theme: [cosmo, custom.scss]`
- `cover-image: cover.jpg` / `favicon: favicon.png` (ambos optimizados para web; el original en alta resolucion esta en el historial de git como `cover.png`)
- `.nojekyll` (listado en `project: resources:`) — obligatorio para GitHub Pages: sin el, Jekyll excluye del sitio publicado todo archivo que empiece con `_` (como los `_intro_modX.html`).

Si queres otro estilo/imagen, ajusta `cover-image`, `favicon` y/o el tema en [`_quarto.yml`](./_quarto.yml).

## Contribuir

Si queres reportar errores o proponer cambios:

- abrile un `issue` o envia un PR en el repositorio (coherente con `repo-actions: [edit, issue]` en [`_quarto.yml`](./_quarto.yml))

Cuando edites un capitulo, mantene el estilo de los bloques ejecutables (por ejemplo, `python` vs `pyodide-python`) para que el comportamiento siga siendo consistente.

