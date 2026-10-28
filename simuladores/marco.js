// Piezas comunes de la interfaz de los simuladores: controles, lecturas y montaje.
// Los estilos (.simulador, .controles, .lecturas) viven en custom.scss.

import { Inputs, htl } from "./librerias.js";

// Ancho máximo de los gráficos, en píxeles: el de la columna de texto del libro
export const ANCHO_MAXIMO = 760;

// Controles en grilla (dos o tres columnas en pantallas anchas, una en el celular).
// El valor del formulario es un objeto {nombre: valor} con todos los controles.
export function controles(campos) {
  return Inputs.form(campos, {
    template: (inputs) => htl.html`<div class="controles">${Object.values(inputs)}</div>`,
  });
}

// Montos con el signo adelante del símbolo: −$0.0258, no $-0.0258
export function dinero(x, decimales = 2) {
  return `${x < 0 ? "−" : ""}$${Math.abs(x).toFixed(decimales)}`;
}

// Tarjetas con las lecturas numéricas del simulador: [[nombre, valor], ...]
export function lecturas(items) {
  const contenedor = document.createElement("div");
  contenedor.className = "lecturas";
  for (const [nombre, valor] of items) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "lectura";
    tarjeta.innerHTML = `<div class="nombre">${nombre}</div><div class="valor">${valor}</div>`;
    contenedor.append(tarjeta);
  }
  return contenedor;
}

// Leyenda en una línea: [[color, símbolo, texto], ...]
export function leyenda(items) {
  const p = document.createElement("div");
  p.className = "leyenda";
  p.innerHTML = items
    .map(([color, simbolo, texto]) => `<span style="color: ${color}">${simbolo}</span> ${texto}`)
    .join(" · ");
  return p;
}

// Arma el simulador dentro de `raiz`: los controles arriba y, debajo, lo que devuelva
// dibujar(valores, ancho) (un nodo o una lista de nodos). Redibuja al mover cualquier
// control y cuando cambia el ancho disponible (rotar el celular, abrir la barra lateral).
export function montar(raiz, form, dibujar) {
  const salida = document.createElement("div");
  raiz.append(form, salida);
  let anchoPrevio = 0;
  const redibujar = () => {
    anchoPrevio = raiz.clientWidth;
    const ancho = Math.min(anchoPrevio, ANCHO_MAXIMO);
    salida.replaceChildren(...[dibujar(form.value, ancho)].flat());
  };
  form.addEventListener("input", redibujar);
  new ResizeObserver(() => {
    if (raiz.clientWidth !== anchoPrevio) redibujar();
  }).observe(raiz);
  redibujar();
}
