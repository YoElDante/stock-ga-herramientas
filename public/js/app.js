// Estado de la aplicación
let productos = [];

// Estado del ordenamiento
let ordenActual = {
  columna: null,
  direccion: null // 'asc', 'desc', o null
};

// Estado de agrupamiento
let estaAgrupado = false;

// Elementos del DOM
const tablaBody = document.getElementById('stockBody');
const searchInput = document.getElementById('searchInput');
const btnNuevo = document.getElementById('btnNuevo');
const btnGuardar = document.getElementById('btnGuardar');
const btnRecargar = document.getElementById('btnRecargar');
const btnImportar = document.getElementById('btnImportar');
const btnAgrupar = document.getElementById('btnAgrupar');
const modal = document.getElementById('modal');
const modalImportar = document.getElementById('modalImportar');
const modalResultadoImport = document.getElementById('modalResultadoImport');
const formProducto = document.getElementById('formProducto');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCancelar = document.getElementById('btnCancelar');
const btnCerrarModalImportar = document.getElementById('btnCerrarModalImportar');
const btnCancelarImportar = document.getElementById('btnCancelarImportar');
const btnConfirmarImportar = document.getElementById('btnConfirmarImportar');
const btnCerrarResultado = document.getElementById('btnCerrarResultado');
const btnAceptarResultado = document.getElementById('btnAceptarResultado');
const archivoImportar = document.getElementById('archivoImportar');
const mensajeDiv = document.getElementById('mensaje');
const totalProductosSpan = document.getElementById('totalProductos');
const totalImporteSpan = document.getElementById('totalImporte');

// Formatear número como moneda argentina
function formatearMoneda(numero) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}

// Mostrar mensaje
function mostrarMensaje(texto, tipo = 'success') {
  mensajeDiv.textContent = texto;
  mensajeDiv.className = `mensaje ${tipo}`;

  // Ocultar después de 3 segundos
  setTimeout(() => {
    mensajeDiv.classList.add('hidden');
  }, 3000);
}

// Actualizar resumen
function actualizarResumen(listaProductos = productos) {
  const total = listaProductos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
  const cantidadLineas = listaProductos.length;
  const cantidadTotal = listaProductos.reduce((sum, p) => sum + p.cantidad, 0);

  if (estaAgrupado) {
    totalProductosSpan.textContent = `Total: ${cantidadLineas} códigos únicos (${productos.length} registros originales)`;
  } else {
    totalProductosSpan.textContent = `Total: ${productos.length} productos`;
  }
  totalImporteSpan.textContent = `Valor total: ${formatearMoneda(total)}`;
}

// Renderizar tabla
function renderizarTabla(listaProductos = productos) {
  // Aplicar agrupamiento si está activo
  let productosAMostrar = estaAgrupado ? agruparPorCodigo(listaProductos) : [...listaProductos];

  // Aplicar ordenamiento si está activo
  if (ordenActual.columna && ordenActual.direccion) {
    productosAMostrar = ordenarProductos(productosAMostrar, ordenActual.columna, ordenActual.direccion);
  }

  tablaBody.innerHTML = productosAMostrar.map(p => `
    <tr data-id="${p.id}" class="${p.esAgrupado ? 'fila-agrupada' : ''}">
      <td>${p.codigo}</td>
      <td>${p.descripcion}</td>
      <td>${p.ubicacion}</td>
      <td class="text-right">${p.cantidad}</td>
      <td class="text-right precio">${formatearMoneda(p.precio)}</td>
      <td class="text-right importe">${formatearMoneda(p.cantidad * p.precio)}</td>
      <td class="acciones">
        ${p.esAgrupado ? `<span class="badge-agrupado" title="${p.cantidadItems} items agrupados">🗂️ ${p.cantidadItems}</span>` : `
        <button class="btn-icon btn-editar" title="Editar" onclick="editarProducto(${p.id})">✏️</button>
        <button class="btn-icon btn-eliminar" title="Eliminar" onclick="eliminarProducto(${p.id})">🗑️</button>
        `}
      </td>
    </tr>
  `).join('');

  actualizarResumen(productosAMostrar);
  actualizarIconosOrden();
  actualizarBotonAgrupar();
}

// Ordenar productos
function ordenarProductos(lista, columna, direccion) {
  const columnasTexto = ['codigo', 'descripcion', 'ubicacion'];
  const columnasNumero = ['cantidad', 'precio', 'importe'];

  return lista.sort((a, b) => {
    let valorA, valorB;

    if (columna === 'importe') {
      valorA = a.cantidad * a.precio;
      valorB = b.cantidad * b.precio;
    } else {
      valorA = a[columna];
      valorB = b[columna];
    }

    // Ordenamiento para texto (ignorando mayúsculas y acentos)
    if (columnasTexto.includes(columna)) {
      valorA = String(valorA).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      valorB = String(valorB).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (direccion === 'asc') {
        return valorA.localeCompare(valorB, 'es');
      } else {
        return valorB.localeCompare(valorA, 'es');
      }
    }

    // Ordenamiento para números
    if (columnasNumero.includes(columna)) {
      valorA = parseFloat(valorA) || 0;
      valorB = parseFloat(valorB) || 0;

      if (direccion === 'asc') {
        return valorA - valorB;
      } else {
        return valorB - valorA;
      }
    }

    return 0;
  });
}

// Cambiar ordenamiento al hacer clic en header
function cambiarOrden(columna) {
  if (ordenActual.columna === columna) {
    // Ciclar: asc -> desc -> null
    if (ordenActual.direccion === 'asc') {
      ordenActual.direccion = 'desc';
    } else if (ordenActual.direccion === 'desc') {
      ordenActual.columna = null;
      ordenActual.direccion = null;
    }
  } else {
    // Nueva columna, empezar con ascendente
    ordenActual.columna = columna;
    ordenActual.direccion = 'asc';
  }

  // Re-renderizar con el filtro actual si hay búsqueda activa
  filtrarProductos();
}

// Actualizar iconos de ordenamiento en los headers
function actualizarIconosOrden() {
  document.querySelectorAll('.sortable').forEach(th => {
    const columna = th.dataset.sort;
    const icon = th.querySelector('.sort-icon');

    th.classList.remove('sort-asc', 'sort-desc');

    if (ordenActual.columna === columna) {
      if (ordenActual.direccion === 'asc') {
        icon.textContent = '↑';
        th.classList.add('sort-asc');
      } else if (ordenActual.direccion === 'desc') {
        icon.textContent = '↓';
        th.classList.add('sort-desc');
      }
    } else {
      icon.textContent = '⇅';
    }
  });
}

// === FUNCIONES DE AGRUPAMIENTO ===

// Agrupar productos por código
function agruparPorCodigo(listaProductos) {
  const grupos = {};

  listaProductos.forEach(p => {
    const codigo = p.codigo.trim().toUpperCase();

    if (!grupos[codigo]) {
      grupos[codigo] = {
        id: p.id, // Usar el ID del primer item
        codigo: p.codigo,
        descripcion: p.descripcion,
        ubicaciones: [],
        cantidad: 0,
        precio: p.precio,
        items: []
      };
    }

    grupos[codigo].cantidad += p.cantidad;
    grupos[codigo].items.push(p);

    // Agregar ubicación si no está vacía y no está duplicada
    const ubicacion = p.ubicacion.trim();
    if (ubicacion && !grupos[codigo].ubicaciones.includes(ubicacion)) {
      grupos[codigo].ubicaciones.push(ubicacion);
    }
  });

  // Convertir a array y formatear ubicaciones
  return Object.values(grupos).map(g => ({
    id: g.id,
    codigo: g.codigo,
    descripcion: g.descripcion,
    ubicacion: formatearUbicaciones(g.ubicaciones),
    cantidad: g.cantidad,
    precio: g.precio,
    importe: g.cantidad * g.precio,
    esAgrupado: g.items.length > 1,
    cantidadItems: g.items.length
  }));
}

// Formatear lista de ubicaciones: "1, 6 y 12"
function formatearUbicaciones(ubicaciones) {
  if (ubicaciones.length === 0) return '';
  if (ubicaciones.length === 1) return ubicaciones[0];
  if (ubicaciones.length === 2) return `${ubicaciones[0]} y ${ubicaciones[1]}`;

  // Más de 2: "1, 6 y 12"
  const ultimas = ubicaciones.slice(-1)[0];
  const anteriores = ubicaciones.slice(0, -1).join(', ');
  return `${anteriores} y ${ultimas}`;
}

// Toggle agrupamiento
function toggleAgrupar() {
  estaAgrupado = !estaAgrupado;
  filtrarProductos(); // Re-renderizar con búsqueda activa si existe

  if (estaAgrupado) {
    mostrarMensaje('📂 Vista agrupada por código activada');
  } else {
    mostrarMensaje('📋 Vista detallada activada');
  }
}

// Actualizar texto del botón agrupar
function actualizarBotonAgrupar() {
  if (estaAgrupado) {
    btnAgrupar.innerHTML = '📋 Desagrupar';
    btnAgrupar.classList.add('btn-active');
  } else {
    btnAgrupar.innerHTML = '🗂️ Agrupar';
    btnAgrupar.classList.remove('btn-active');
  }
}

// Cargar productos desde API
async function cargarProductos() {
  try {
    const response = await fetch('/api/productos');
    productos = await response.json();
    renderizarTabla();
  } catch (error) {
    mostrarMensaje('Error al cargar productos', 'error');
  }
}

// Abrir modal para nuevo producto
function abrirModalNuevo() {
  document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
  document.getElementById('productoId').value = '';
  formProducto.reset();
  actualizarImportePreview();
  modal.classList.remove('hidden');
}

// Abrir modal para editar producto
function editarProducto(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  document.getElementById('modalTitulo').textContent = 'Editar Producto';
  document.getElementById('productoId').value = id;
  document.getElementById('codigo').value = producto.codigo;
  document.getElementById('descripcion').value = producto.descripcion;
  document.getElementById('ubicacion').value = producto.ubicacion;
  document.getElementById('cantidad').value = producto.cantidad;
  document.getElementById('precio').value = producto.precio;

  actualizarImportePreview();
  modal.classList.remove('hidden');
}

// Cerrar modal
function cerrarModal() {
  modal.classList.add('hidden');
}

// Actualizar preview del importe
function actualizarImportePreview() {
  const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const importe = cantidad * precio;
  document.getElementById('importeCalculado').textContent = formatearMoneda(importe);
}

// Guardar producto (crear o actualizar)
async function guardarProducto(event) {
  event.preventDefault();

  const id = document.getElementById('productoId').value;
  const datos = {
    codigo: document.getElementById('codigo').value,
    descripcion: document.getElementById('descripcion').value,
    ubicacion: document.getElementById('ubicacion').value,
    cantidad: document.getElementById('cantidad').value,
    precio: document.getElementById('precio').value
  };

  try {
    let response;
    if (id) {
      // Actualizar existente
      response = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
    } else {
      // Crear nuevo
      response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
    }

    const result = await response.json();

    if (result.success) {
      await cargarProductos();
      cerrarModal();
      mostrarMensaje(id ? 'Producto actualizado' : 'Producto agregado');
    } else {
      mostrarMensaje(result.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al guardar producto', 'error');
  }
}

// Eliminar producto
async function eliminarProducto(id) {
  const producto = productos.find(p => p.id === id);
  if (!confirm(`¿Eliminar "${producto.descripcion}"?`)) return;

  try {
    const response = await fetch(`/api/productos/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      await cargarProductos();
      mostrarMensaje('Producto eliminado');
    } else {
      mostrarMensaje(result.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al eliminar producto', 'error');
  }
}

// Guardar a Excel y descargar
async function guardarExcel() {
  try {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    // Descargar el archivo directamente
    const response = await fetch('/api/descargar');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al descargar');
    }

    // Obtener el nombre del archivo del header
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'stock.xlsx';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) fileName = match[1];
    }

    // Crear blob y descargar
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    mostrarMensaje(`✅ Stock guardado y descargado: ${fileName}`);
  } catch (error) {
    mostrarMensaje(error.message || 'Error al guardar Excel', 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar Excel';
  }
}

// Recargar desde Excel
async function recargarExcel() {
  if (!confirm('¿Recargar datos desde el último Excel guardado?\nLos cambios no guardados se perderán.')) return;

  try {
    const response = await fetch('/api/recargar', {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      await cargarProductos();
      mostrarMensaje(`✅ ${result.mensaje} (${result.cantidad} productos)`);
    } else {
      mostrarMensaje(result.error || 'Error al recargar', 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al recargar Excel', 'error');
  }
}

// Filtrar productos
function filtrarProductos() {
  const termino = searchInput.value.toLowerCase().trim();

  if (!termino) {
    renderizarTabla();
    return;
  }

  const filtrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(termino) ||
    p.descripcion.toLowerCase().includes(termino) ||
    p.ubicacion.toLowerCase().includes(termino)
  );

  renderizarTabla(filtrados);
}

// === FUNCIONES DE IMPORTACIÓN ===

// Variable para guardar el archivo seleccionado
let archivoSeleccionado = null;

// Abrir modal de importación
function abrirModalImportar() {
  archivoImportar.value = '';
  archivoSeleccionado = null;
  document.getElementById('previewImportar').classList.add('hidden');
  document.querySelector('input[name="importMode"][value="agregar"]').checked = true;
  btnConfirmarImportar.disabled = true;
  modalImportar.classList.remove('hidden');
}

// Cerrar modal de importación
function cerrarModalImportar() {
  modalImportar.classList.add('hidden');
  archivoImportar.value = '';
  archivoSeleccionado = null;
}

// Manejar selección de archivo
async function manejarArchivoSeleccionado(event) {
  const file = event.target.files[0];
  if (!file) {
    btnConfirmarImportar.disabled = true;
    document.getElementById('previewImportar').classList.add('hidden');
    return;
  }

  archivoSeleccionado = file;

  // Mostrar preview
  try {
    const preview = await leerArchivoParaPreview(file);
    mostrarPreview(preview, file.name);
    btnConfirmarImportar.disabled = false;
  } catch (error) {
    mostrarMensaje('Error al leer el archivo: ' + error.message, 'error');
    btnConfirmarImportar.disabled = true;
  }
}

// Leer archivo para preview usando FileReader
function leerArchivoParaPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

// Mostrar preview de los datos
function mostrarPreview(data, fileName) {
  const previewDiv = document.getElementById('previewImportar');
  const previewInfo = document.getElementById('previewInfo');
  const tablaPreview = document.getElementById('tablaPreview');

  previewInfo.innerHTML = `<strong>${fileName}</strong> - ${data.length} productos encontrados`;

  // Mostrar primeros 5 registros
  const muestra = data.slice(0, 5);

  if (muestra.length > 0) {
    const columnas = Object.keys(muestra[0]);

    // Header
    tablaPreview.querySelector('thead').innerHTML = `
      <tr>${columnas.map(col => `<th>${col}</th>`).join('')}</tr>
    `;

    // Body
    tablaPreview.querySelector('tbody').innerHTML = muestra.map(row => `
      <tr>${columnas.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}</tr>
    `).join('');

    if (data.length > 5) {
      tablaPreview.querySelector('tbody').innerHTML += `
        <tr><td colspan="${columnas.length}" style="text-align:center;font-style:italic;">... y ${data.length - 5} productos más</td></tr>
      `;
    }
  }

  previewDiv.classList.remove('hidden');
}

// Confirmar importación
async function confirmarImportacion() {
  if (!archivoSeleccionado) {
    mostrarMensaje('No hay archivo seleccionado', 'error');
    return;
  }

  const modo = document.querySelector('input[name="importMode"]:checked').value;
  const endpoint = modo === 'reemplazar' ? '/api/importar-reemplazar' : '/api/importar';

  const formData = new FormData();
  formData.append('archivo', archivoSeleccionado);

  try {
    btnConfirmarImportar.disabled = true;
    btnConfirmarImportar.textContent = 'Importando...';

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      await cargarProductos();
      cerrarModalImportar();
      mostrarResultadoImportacion(result.estadisticas, true, modo);
    } else {
      if (result.estadisticas) {
        cerrarModalImportar();
        mostrarResultadoImportacion(result.estadisticas, false, modo, result.error);
      } else {
        mostrarMensaje(result.error || 'Error al importar', 'error');
      }
    }
  } catch (error) {
    mostrarMensaje('Error al importar archivo', 'error');
  } finally {
    btnConfirmarImportar.disabled = false;
    btnConfirmarImportar.textContent = 'Importar';
  }
}

// Mostrar modal de resultado de importación
function mostrarResultadoImportacion(estadisticas, exito, modo, errorMsg = null) {
  const titulo = document.getElementById('resultadoTitulo');
  const mensaje = document.getElementById('resultadoMensaje');
  const header = document.querySelector('.resultado-header');

  // Actualizar estadísticas
  document.getElementById('statTotalArchivo').textContent = estadisticas.totalArchivo;
  document.getElementById('statValidos').textContent = estadisticas.registrosValidos;
  document.getElementById('statVacios').textContent = estadisticas.registrosVacios;
  document.getElementById('statValorTotal').textContent = formatearMoneda(estadisticas.valorTotal);

  // Configurar según éxito o error
  if (exito) {
    titulo.textContent = '✅ Importación Exitosa';
    header.classList.remove('resultado-error');
    header.classList.add('resultado-exito');

    const accion = modo === 'reemplazar' ? 'reemplazado' : 'agregado al';
    mensaje.innerHTML = `
      <p>✅ La importación se realizó correctamente.</p>
      <p>Se han ${accion} stock <strong>${estadisticas.registrosValidos}</strong> productos.</p>
      ${estadisticas.registrosVacios > 0 ? `<p class="text-warning">⚠️ Se descartaron ${estadisticas.registrosVacios} registros vacíos o sin cantidad.</p>` : ''}
    `;
  } else {
    titulo.textContent = '❌ Error en la Importación';
    header.classList.remove('resultado-exito');
    header.classList.add('resultado-error');

    mensaje.innerHTML = `
      <p>❌ ${errorMsg || 'No se pudo completar la importación.'}</p>
      <p>El archivo contenía ${estadisticas.totalArchivo} registros, pero todos fueron descartados por estar vacíos o sin cantidad válida.</p>
    `;
  }

  modalResultadoImport.classList.remove('hidden');
}

// Cerrar modal de resultado
function cerrarModalResultado() {
  modalResultadoImport.classList.add('hidden');
}

// Event Listeners
btnNuevo.addEventListener('click', abrirModalNuevo);
btnGuardar.addEventListener('click', guardarExcel);
btnRecargar.addEventListener('click', recargarExcel);
btnImportar.addEventListener('click', abrirModalImportar);
btnAgrupar.addEventListener('click', toggleAgrupar);
btnCerrarModal.addEventListener('click', cerrarModal);
btnCancelar.addEventListener('click', cerrarModal);
btnCerrarModalImportar.addEventListener('click', cerrarModalImportar);
btnCancelarImportar.addEventListener('click', cerrarModalImportar);
btnConfirmarImportar.addEventListener('click', confirmarImportacion);
btnCerrarResultado.addEventListener('click', cerrarModalResultado);
btnAceptarResultado.addEventListener('click', cerrarModalResultado);
archivoImportar.addEventListener('change', manejarArchivoSeleccionado);
formProducto.addEventListener('submit', guardarProducto);
searchInput.addEventListener('input', filtrarProductos);

// Event listeners para ordenamiento
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const columna = th.dataset.sort;
    cambiarOrden(columna);
  });
});

// Actualizar importe al cambiar cantidad o precio
document.getElementById('cantidad').addEventListener('input', actualizarImportePreview);
document.getElementById('precio').addEventListener('input', actualizarImportePreview);

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modal.classList.contains('hidden')) {
      cerrarModal();
    }
    if (!modalImportar.classList.contains('hidden')) {
      cerrarModalImportar();
    }
  }
});

// Cerrar modal al hacer clic fuera
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    cerrarModal();
  }
});

modalImportar.addEventListener('click', (e) => {
  if (e.target === modalImportar) {
    cerrarModalImportar();
  }
});

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
});
