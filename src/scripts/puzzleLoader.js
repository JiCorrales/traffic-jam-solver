const PUZZLE_DIRECTORY = '../tests/boards';
const PUZZLE_PREFIX = 'Puzzle';
const PUZZLE_EXTENSION = '.txt';
const DEFAULT_MAX_PUZZLES = 50;

/**
 * Error personalizado lanzado cuando un puzzle no se encuentra o la solicitud falla.
 */
class PuzzleNotFoundError extends Error {
    /**
     * @param {number|string} puzzleId - Identificador del puzzle solicitado.
     * @param {number} [status] - Codigo de estado HTTP devuelto por fetch.
     */
    constructor(puzzleId, status) {
        super(`Puzzle "${puzzleId}" no encontrado (status ${status ?? 'desconocido'}).`);
        this.name = 'PuzzleNotFoundError';
        this.puzzleId = puzzleId;
        this.status = status;
    }
}

/**
 * Cache interna para almacenar puzzles ya cargados.
 * @type {Map<number|string, PuzzleData>}
 */
const puzzleCache = new Map();

const buildPuzzlePath = (puzzleId) =>
    `${PUZZLE_DIRECTORY}/${PUZZLE_PREFIX}${puzzleId}${PUZZLE_EXTENSION}`;

/**
 * @typedef {Object} PuzzleData
 * @property {number|string} id - Identificador numerico del puzzle.
 * @property {string} name - Nombre descriptivo del puzzle.
 * @property {string} path - Ruta relativa al archivo de puzzle.
 * @property {string} content - Contenido textual del puzzle.
 */

/**
 * Carga un puzzle del directorio configurado y lo almacena en cache.
 *
 * @async
 * @param {number|string} puzzleId - Identificador del puzzle (sin prefijo ni extension).
 * @returns {Promise<PuzzleData>} Objeto con los datos basicos del puzzle.
 * @throws {PuzzleNotFoundError} Si el recurso no esta disponible.
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
 * Descubre puzzles siguiendo la nomenclatura Puzzle1, Puzzle2, ...
 *
 * @async
 * @param {Object} [options={}] - Configuracion de la busqueda.
 * @param {number} [options.start=1] - Numero inicial desde el que se intentara cargar.
 * @param {number} [options.max=DEFAULT_MAX_PUZZLES] - Numero maximo de intentos.
 * @param {boolean} [options.stopOnFirstGap=true] - Detenerse ante el primer faltante.
 * @returns {Promise<PuzzleData[]>} Lista de puzzles cargados exitosamente.
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
 * Limpia la cache interna de puzzles.
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

