/**
 * @fileoverview
 * Módulo de gestión de puzzles para el proyecto Traffic Jam.
 * Permite descubrir, cargar y almacenar en caché tableros de prueba
 * ubicados en la carpeta `../tests/boards`.
 *
 * Este módulo proporciona funciones para:
 *  - Construir la ruta completa de un puzzle.
 *  - Cargar puzzles individuales desde archivos `.txt`.
 *  - Descubrir automáticamente múltiples puzzles existentes.
 *  - Limpiar la caché local de puzzles cargados.
 *
 * @module puzzles/loader
 */

const PUZZLE_DIRECTORY = '../tests/boards';
const PUZZLE_PREFIX = 'Puzzle';
const PUZZLE_EXTENSION = '.txt';
const DEFAULT_MAX_PUZZLES = 50;

/**
 * Error personalizado lanzado cuando un puzzle no se encuentra o no puede ser cargado.
 * @extends Error
 */
class PuzzleNotFoundError extends Error {
  /**
   * @param {number|string} puzzleId - Identificador del puzzle buscado.
   * @param {number} [status] - Código de estado HTTP devuelto por `fetch`.
   */
  constructor(puzzleId, status) {
    super(`Puzzle "${puzzleId}" no encontrado (status ${status ?? 'desconocido'}).`);
    this.name = 'PuzzleNotFoundError';
    this.puzzleId = puzzleId;
    this.status = status;
  }
}

/**
 * Caché interna para almacenar puzzles ya cargados y evitar múltiples lecturas.
 * @type {Map<number|string, PuzzleData>}
 * @private
 */
const puzzleCache = new Map();

/**
 * Construye la ruta completa del archivo correspondiente a un puzzle.
 * @param {number|string} puzzleId - Identificador numérico o texto del puzzle.
 * @returns {string} Ruta relativa al archivo del puzzle.
 */
const buildPuzzlePath = (puzzleId) =>
  `${PUZZLE_DIRECTORY}/${PUZZLE_PREFIX}${puzzleId}${PUZZLE_EXTENSION}`;

/**
 * @typedef {Object} PuzzleData
 * @property {number|string} id - Identificador numérico del puzzle.
 * @property {string} name - Nombre descriptivo del puzzle (e.g. "Puzzle 3").
 * @property {string} path - Ruta relativa al archivo de texto.
 * @property {string} content - Contenido textual del puzzle (sin saltos de línea finales).
 */

/**
 * Carga un puzzle desde el directorio especificado. Utiliza la caché si ya fue cargado.
 *
 * @async
 * @param {number|string} puzzleId - Identificador del puzzle (sin prefijo ni extensión).
 * @returns {Promise<PuzzleData>} Objeto con la información y contenido del puzzle.
 * @throws {PuzzleNotFoundError} Si el archivo del puzzle no existe o devuelve error HTTP.
 */
async function fetchPuzzle(puzzleId) {
  if (puzzleCache.has(puzzleId)) {
    return puzzleCache.get(puzzleId);
  }

  const url = buildPuzzlePath(puzzleId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new PuzzleNotFoundError(puzzleId, response.status);
  }

  const text = await response.text();
  const puzzleData = {
    id: puzzleId,
    name: `${PUZZLE_PREFIX} ${puzzleId}`,
    path: url,
    content: text.trimEnd(),
  };

  puzzleCache.set(puzzleId, puzzleData);
  return puzzleData;
}

/**
 * Descubre automáticamente puzzles existentes en el directorio `tests/boards`.
 * Realiza intentos secuenciales (Puzzle1, Puzzle2, ...) hasta alcanzar el límite o encontrar huecos.
 *
 * @async
 * @param {Object} [options={}] - Configuración opcional de búsqueda.
 * @param {number} [options.start=1] - Número inicial de puzzle para comenzar la búsqueda.
 * @param {number} [options.max=DEFAULT_MAX_PUZZLES] - Máximo de intentos o puzzles a buscar.
 * @param {boolean} [options.stopOnFirstGap=true] - Si se detiene al primer hueco o error consecutivo.
 * @returns {Promise<PuzzleData[]>} Arreglo de puzzles encontrados y cargados exitosamente.
 * @throws {Error} Si ocurre un error distinto de `PuzzleNotFoundError` durante la carga.
 */
async function discoverPuzzles({
  start = 1,
  max = DEFAULT_MAX_PUZZLES,
  stopOnFirstGap = true,
} = {}) {
  const discovered = [];
  let consecutiveMisses = 0;

  for (let i = start; i < start + max; i += 1) {
    try {
      const puzzle = await fetchPuzzle(i);
      discovered.push(puzzle);
      consecutiveMisses = 0;
    } catch (error) {
      if (!(error instanceof PuzzleNotFoundError)) {
        throw error;
      }

      consecutiveMisses += 1;
      if (stopOnFirstGap || consecutiveMisses > 3) {
        break;
      }
    }
  }

  return discovered;
}

/**
 * Limpia completamente la caché interna de puzzles.
 * Útil si se actualizan los archivos o se desea forzar una recarga desde disco/red.
 */
function clearPuzzleCache() {
  puzzleCache.clear();
}

export {
  PuzzleNotFoundError,
  discoverPuzzles,
  fetchPuzzle,
  clearPuzzleCache,
};

