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
 * The function `fetchPuzzle` asynchronously fetches puzzle data based on a given puzzle ID, caching
 * the data if available.
 * @param puzzleId - The `puzzleId` parameter is the unique identifier of the puzzle that you want to
 * fetch. It is used to determine which puzzle to retrieve from the cache or fetch from the server if
 * it's not already cached.
 * @returns The `fetchPuzzle` function returns a Promise that resolves to the puzzle data object
 * fetched from the server or retrieved from the cache. If the puzzle with the specified `puzzleId` is
 * found in the cache, it is returned directly from the cache. Otherwise, a network request is made to
 * fetch the puzzle data, and upon successful retrieval, the data is stored in the cache before being
 * returned
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
 * The `discoverPuzzles` function asynchronously fetches puzzles starting from a specified index, with
 * an option to stop on the first gap or after a certain number of consecutive misses.
 * @param [] - 1. `start`: The starting index for discovering puzzles. Defaults to 1 if not provided.
 * @returns The `discoverPuzzles` function returns an array of discovered puzzles.
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
 * The function `clearPuzzleCache` clears the cache used for storing puzzle data.
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

