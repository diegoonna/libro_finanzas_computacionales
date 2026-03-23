# Finanzas Computacionales (Libro Quarto)

Este repositorio contiene el libro **"Finanzas Computacionales con Python"**, construido con [Quarto](https://quarto.org/).
La configuracion principal vive en [`_quarto.yml`](./_quarto.yml) y el sitio renderizado se genera en `docs/`.

## Requisitos

- [Quarto](https://quarto.org/) (para renderizar/preview)
- Python (porque el proyecto usa `jupyter: python3` para ejecutar bloques `python`)
- Paquetes Python usados por los ejemplos del libro (segun imports en `*.qmd`):
  - `numpy`
  - `pandas`
  - `matplotlib`
  - `scipy`
  - `pymc`

## Quick start (render local)

Desde `PowerShell`:

```powershell
cd .\libro-finanzas
quarto render
```

El sitio resultante se escribe en `docs/` (ver `output-dir: docs` en [`_quarto.yml`](./_quarto.yml)).

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
- `unidad1/`, `unidad2/`, `unidad3/`, `unidad4/`: capitulos por modulo
- `apendices/`: apendices del libro
- `_extensions/`: extensiones de Quarto utilizadas por el proyecto (incluye `coatless-quarto/pyodide`)
- `docs/`: salida generada por Quarto (`output-dir: docs`)

## Configuracion y assets (importante)

[`_quarto.yml`](./_quarto.yml) referencia:

- `theme: [cosmo, custom.scss]`
- `cover-image: cover.png` / `favicon: cover.png`

En el checkout actual existe `custom.scss`, pero no se encontro `cover.png`. Si te falta el archivo para renderizar (o queres otro estilo/imagen), tenes dos opciones:

- agregar `cover.png` en `.libro-finanzas/`, o
- ajustar/remover `cover-image` y `favicon` (y/o el tema) en [`_quarto.yml`](./_quarto.yml).

## Contribuir

Si queres reportar errores o proponer cambios:

- abrile un `issue` o envia un PR en el repositorio (coherente con `repo-actions: [edit, issue]` en [`_quarto.yml`](./_quarto.yml))

Cuando edites un capitulo, mantene el estilo de los bloques ejecutables (por ejemplo, `python` vs `pyodide-python`) para que el comportamiento siga siendo consistente.

