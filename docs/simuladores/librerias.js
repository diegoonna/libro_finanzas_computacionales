// Librerías de gráficos y controles de los simuladores, como módulos ES con versión fija.
//
// Los simuladores son módulos ES comunes y no celdas {ojs}: el runtime de OJS carga
// scripts propios al arrancar y, mientras tanto, reemplaza window.define; si el editor
// Monaco de las celdas Pyodide carga en ese momento, se rompe y la celda de práctica
// queda sin editor. Como módulos ES, estas librerías no tocan el cargador AMD de Monaco.

export * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.16/+esm";
export * as Inputs from "https://cdn.jsdelivr.net/npm/@observablehq/inputs@0.12.0/+esm";
export * as htl from "https://cdn.jsdelivr.net/npm/htl@0.3.1/+esm";
export * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
