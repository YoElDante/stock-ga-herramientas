const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');

// Asegurar que existe la carpeta data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Obtiene el archivo de stock más reciente
 */
function getLatestStockFile() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('stock_') && f.endsWith('.xlsx'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(DATA_DIR, files[0]) : null;
}

/**
 * Lee el stock desde el Excel más reciente
 */
function loadStock() {
  const filePath = getLatestStockFile();

  if (!filePath || !fs.existsSync(filePath)) {
    // Retornar array vacío si no existe archivo
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convertir a JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  // Mapear a nuestro formato interno
  return rawData.map((row, index) => ({
    id: index + 1,
    codigo: row['Codigo'] || row['codigo'] || '',
    descripcion: row['Descripcion'] || row['descripcion'] || '',
    ubicacion: row['Ubicacion'] || row['ubicacion'] || row['Caja'] || row['caja'] || '',
    cantidad: parseFloat(row['Cantidad'] || row['cantidad'] || 0),
    precio: parseFloat(row['Precio'] || row['precio'] || 0),
    importe: parseFloat(row['Importe'] || row['importe'] || 0)
  }));
}

/**
 * Guarda el stock en un nuevo archivo Excel con timestamp
 */
function saveStock(productos) {
  // Generar nombre con timestamp: stock_DDMMAAHHMMSS.xlsx
  const now = new Date();
  const timestamp = [
    String(now.getDate()).padStart(2, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getFullYear()).slice(-2),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');

  const fileName = `stock_${timestamp}.xlsx`;
  const filePath = path.join(DATA_DIR, fileName);

  // Preparar datos para Excel con importe calculado
  const data = productos.map(p => ({
    'Codigo': p.codigo,
    'Descripcion': p.descripcion,
    'Ubicacion': p.ubicacion,
    'Cantidad': p.cantidad,
    'Precio': p.precio,
    'Importe': p.cantidad * p.precio
  }));

  // Crear workbook y worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Configurar anchos de columna
  worksheet['!cols'] = [
    { wch: 12 },  // Codigo
    { wch: 40 },  // Descripcion
    { wch: 15 },  // Ubicacion
    { wch: 10 },  // Cantidad
    { wch: 15 },  // Precio
    { wch: 15 }   // Importe
  ];

  // Aplicar formato de moneda argentina a Precio e Importe
  // Formato: $ con separador de miles (.) y decimales (,) - Español Argentina
  // El código de formato que Excel reconoce como "Moneda" es: [$AR$-2C0A] o simplemente usar formato numérico
  const formatoMonedaAR = '"$"#,##0.00'; // Formato estándar que Excel interpreta como moneda

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let row = 1; row <= range.e.r; row++) {
    // Columna E (Precio) y F (Importe)
    const precioCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 4 })];
    const importeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 5 })];

    if (precioCell) {
      precioCell.z = formatoMonedaAR;
    }
    if (importeCell) {
      importeCell.z = formatoMonedaAR;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

  // Guardar archivo en el servidor
  XLSX.writeFile(workbook, filePath);

  // Generar buffer para descarga
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return { fileName, filePath, buffer };
}

/**
 * Lista todos los archivos de stock guardados
 */
function listStockFiles() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('stock_') && f.endsWith('.xlsx'))
    .sort()
    .reverse();
}

/**
 * Procesa un archivo importado (Excel o CSV) y retorna los productos
 * Filtra registros vacíos y retorna estadísticas
 */
function processImportedFile(fileBuffer, fileName) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convertir a JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  const totalRegistrosArchivo = rawData.length;

  // Mapear a nuestro formato interno (flexible con nombres de columnas)
  const todosLosProductos = rawData.map((row, index) => {
    // Buscar columnas con nombres similares
    const codigo = row['Codigo'] || row['codigo'] || row['CODIGO'] || row['Código'] || row['código'] || row['SKU'] || row['sku'] || '';
    const descripcion = row['Descripcion'] || row['descripcion'] || row['DESCRIPCION'] || row['Descripción'] || row['descripción'] || row['Nombre'] || row['nombre'] || row['NOMBRE'] || row['Producto'] || row['producto'] || '';
    const ubicacion = row['Ubicacion'] || row['ubicacion'] || row['UBICACION'] || row['Ubicación'] || row['ubicación'] || row['Caja'] || row['caja'] || row['CAJA'] || row['Estante'] || row['estante'] || row['Sector'] || row['sector'] || '';
    const cantidad = parseFloat(row['Cantidad'] || row['cantidad'] || row['CANTIDAD'] || row['Stock'] || row['stock'] || row['STOCK'] || row['Qty'] || 0) || 0;
    const precio = parseFloat(row['Precio'] || row['precio'] || row['PRECIO'] || row['Price'] || row['price'] || row['Costo'] || row['costo'] || 0) || 0;

    return {
      id: index + 1,
      codigo: String(codigo).trim(),
      descripcion: String(descripcion).trim(),
      ubicacion: String(ubicacion).trim(),
      cantidad,
      precio,
      importe: cantidad * precio
    };
  });

  // Filtrar registros válidos (que tengan código O descripción, Y cantidad > 0)
  const productosValidos = todosLosProductos.filter(p => {
    const tieneCodigo = p.codigo && p.codigo.length > 0;
    const tieneDescripcion = p.descripcion && p.descripcion.length > 0;
    const tieneCantidad = p.cantidad > 0;

    // Un registro es válido si tiene (código O descripción) Y cantidad > 0
    return (tieneCodigo || tieneDescripcion) && tieneCantidad;
  });

  // Reasignar IDs secuenciales
  productosValidos.forEach((p, index) => {
    p.id = index + 1;
  });

  // Calcular valor total
  const valorTotal = productosValidos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
  const registrosVacios = totalRegistrosArchivo - productosValidos.length;

  return {
    productos: productosValidos,
    estadisticas: {
      totalArchivo: totalRegistrosArchivo,
      registrosValidos: productosValidos.length,
      registrosVacios: registrosVacios,
      valorTotal: valorTotal
    }
  };
}

module.exports = {
  loadStock,
  saveStock,
  listStockFiles,
  getLatestStockFile,
  processImportedFile,
  DATA_DIR
};
