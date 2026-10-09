"""Primitivas de dibujo para los esquemas y figuras del libro.

Los capítulos importan este módulo desde celdas ocultas (``#| echo: false``).
El kernel corre en la carpeta del capítulo, así que primero se agrega la raíz al path:

    import sys; sys.path.insert(0, "..")
    from _esquemas import *

El guion bajo inicial hace que Quarto no lo trate como un documento.
Las coordenadas de dibujo son "unidades de esquema": ``lienzo(16, 6)`` crea un
área de 16 x 6 unidades con aspecto 1:1, así que un cuadrado se ve cuadrado.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

# Paleta del libro (custom.scss) + acento y neutros
PRIMARIO = "#1e3a5f"
SECUNDARIO = "#637238"
ACENTO = "#c2410c"
GRIS = "#94a3b8"
TEXTO = "#1f2937"
FONDO_PRIMARIO = "#e0e9f4"
FONDO_SECUNDARIO = "#eef2e3"
FONDO_ACENTO = "#fde8dc"
FONDO_GRIS = "#f1f5f9"
MONO = "DejaVu Sans Mono"

ESCALA = 0.55  # pulgadas por unidad de esquema


def _preparar(ax, ancho, alto):
    ax.set_xlim(0, ancho)
    ax.set_ylim(0, alto)
    ax.set_aspect("equal")
    ax.axis("off")


def lienzo(ancho, alto):
    """Figura con un solo panel de ``ancho`` x ``alto`` unidades, sin ejes."""
    fig, ax = plt.subplots(figsize=(ancho * ESCALA, alto * ESCALA))
    _preparar(ax, ancho, alto)
    return fig, ax


def paneles(n, ancho, alto):
    """Figura con ``n`` paneles lado a lado, cada uno de ``ancho`` x ``alto``."""
    fig, axes = plt.subplots(1, n, figsize=(n * ancho * ESCALA, alto * ESCALA))
    for ax in axes:
        _preparar(ax, ancho, alto)
    return fig, axes


def texto(ax, x, y, s, tam=10, color=TEXTO, mono=False, peso="normal",
          ha="center", va="center", **kw):
    """Texto suelto en coordenadas de esquema."""
    return ax.text(x, y, s, fontsize=tam, color=color, ha=ha, va=va,
                   fontweight=peso, family=MONO if mono else None, **kw)


def caja(ax, x, y, w, h, s="", color=PRIMARIO, relleno=None, tam=10,
         mono=False, peso="normal", ls="-", lw=1.5, redondeo=0.15,
         color_texto=None, alpha=1.0):
    """Rectángulo redondeado con texto centrado. ``(x, y)`` es la esquina inferior izquierda.

    Devuelve el centro de la caja, útil para enganchar flechas.
    """
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={redondeo}",
        edgecolor=color, facecolor=relleno or "white",
        linewidth=lw, linestyle=ls, alpha=alpha))
    cx, cy = x + w / 2, y + h / 2
    if s:
        texto(ax, cx, cy, s, tam=tam, mono=mono, peso=peso,
              color=color_texto or TEXTO, alpha=alpha)
    return cx, cy


def flecha(ax, origen, destino, s=None, color=TEXTO, curva=0.0, ls="-",
           lw=1.4, tam=9, desplazamiento=(0, 0.3), color_texto=None,
           cabeza="-|>", encoger=2):
    """Flecha de ``origen`` a ``destino`` con etiqueta opcional en el punto medio."""
    ax.add_patch(FancyArrowPatch(
        origen, destino, arrowstyle=cabeza, mutation_scale=14,
        connectionstyle=f"arc3,rad={curva}", color=color, linewidth=lw,
        linestyle=ls, shrinkA=encoger, shrinkB=encoger))
    if s:
        mx = (origen[0] + destino[0]) / 2 + desplazamiento[0]
        my = (origen[1] + destino[1]) / 2 + desplazamiento[1]
        texto(ax, mx, my, s, tam=tam, color=color_texto or color)


def fila_de_celdas(ax, x, y, valores, w=1.0, h=0.7, color=PRIMARIO,
                   rellenos=None, tam=9, mono=True, ls="-", alpha=1.0,
                   color_texto=None):
    """Fila de celdas contiguas (un array, una fila de tabla).

    ``rellenos`` puede ser un color único o una lista con un color por celda.
    Devuelve la lista de centros ``(cx, cy)`` de cada celda.
    """
    if rellenos is None or isinstance(rellenos, str):
        rellenos = [rellenos] * len(valores)
    centros = []
    for i, (v, r) in enumerate(zip(valores, rellenos)):
        centros.append(caja(ax, x + i * w, y, w, h, str(v), color=color,
                            relleno=r, tam=tam, mono=mono, ls=ls, lw=1.2,
                            redondeo=0.02, alpha=alpha,
                            color_texto=color_texto))
    return centros


def linea_de_flujos(ax, flujos, tasa=None, color=PRIMARIO, titulo=None,
                    ymax=None):
    """Cronograma de flujos de un bono como barras en t = 1..n.

    Con ``tasa``, agrega en t = 0 una barra apilada con el valor presente de
    cada flujo y flechas que muestran el descuento: el precio es la suma.
    """
    n = len(flujos)
    t = list(range(1, n + 1))
    ax.bar(t, flujos, width=0.55, color=color, zorder=3)
    for ti, f in zip(t, flujos):
        ax.text(ti, f, f"{f:,.0f}", ha="center", va="bottom", fontsize=9,
                color=TEXTO, zorder=4)

    if tasa is not None:
        base = 0.0
        tonos = plt.cm.Blues([0.35 + 0.5 * i / max(n - 1, 1) for i in range(n)])
        alto_texto = max(flujos) * 0.07  # espacio para no pisar la etiqueta del flujo
        for ti, f, tono in zip(t, flujos, tonos):
            vp = f / (1 + tasa) ** ti
            ax.bar(0, vp, bottom=base, width=0.55, color=tono,
                   edgecolor="white", linewidth=0.8, zorder=3)
            ax.add_patch(FancyArrowPatch(
                (ti, f + alto_texto), (0.3, base + vp / 2), arrowstyle="-|>",
                mutation_scale=11, connectionstyle="arc3,rad=0.3",
                color=ACENTO, linewidth=1, linestyle="--", zorder=5))
            base += vp
        ax.text(0, base, f"Precio\n{base:,.2f}", ha="center", va="bottom",
                fontsize=9, fontweight="bold", color=ACENTO, zorder=4)

    ax.set_xticks(([0] if tasa is not None else []) + t)
    ax.set_xlim(-0.7 if tasa is not None else 0.3, n + 0.7)
    ax.set_xlabel("Período (años)")
    ax.set_ylabel("Flujo ($)")
    if ymax:
        ax.set_ylim(0, ymax)
    ax.grid(axis="y", alpha=0.3, zorder=0)
    ax.spines[["top", "right"]].set_visible(False)
    if titulo:
        ax.set_title(titulo, fontsize=11, color=PRIMARIO, fontweight="bold")


def barras_comparadas(ax, etiquetas, series, fmt="{:.0%}", colores=None,
                      rotacion=0, anotar=True):
    """Barras agrupadas para comparar varias carteras (o vectores) activo por activo.

    ``series`` es un dict ``{nombre: valores}``; cada nombre es un grupo de barras.
    Los valores negativos (posiciones cortas) quedan por debajo de la línea de cero.
    """
    import numpy as np
    colores = colores or [PRIMARIO, ACENTO, SECUNDARIO, GRIS]
    k = len(series)
    ancho = 0.8 / k
    x = np.arange(len(etiquetas))
    for i, ((nombre, valores), color) in enumerate(zip(series.items(), colores)):
        pos = x - 0.4 + ancho * (i + 0.5)
        barras = ax.bar(pos, valores, width=ancho * 0.95, color=color, label=nombre,
                        zorder=3)
        if anotar:
            for b, v in zip(barras, valores):
                ax.text(b.get_x() + b.get_width() / 2, v, fmt.format(v), ha="center",
                        va="bottom" if v >= 0 else "top", fontsize=7, color=TEXTO)
    ax.axhline(0, color=TEXTO, linewidth=0.8)
    ax.set_xticks(x, etiquetas, rotation=rotacion, ha="right" if rotacion else "center")
    ax.grid(axis="y", alpha=0.3, zorder=0)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False)
