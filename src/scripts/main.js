import {
    discoverPuzzles,
    fetchPuzzle,
    PuzzleNotFoundError,
} from './puzzleLoader.js';
import {
    parsePuzzle,
    renderBoard,
    clearBoard,
} from './boardRenderer.js';

/** @type {HTMLSelectElement|null} */
const puzzleSelect = document.getElementById('puzzle-select');

/** @type {HTMLElement|null} */
const statusMessage = document.getElementById('status-message');

/** @type {HTMLElement|null} */
const boardElement = document.getElementById('board');

/**
 * Cache local de puzzles ya cargados.
 * @type {Map<number, import('./puzzleLoader.js').PuzzleData>}
 */
const loadedPuzzles = new Map();

/**
 * Cache de tableros parseados listos para renderizar.
 * @type {Map<number, import('./boardRenderer.js').ParsedBoard>}
 */
const parsedBoards = new Map();

/**
 * Actualiza el mensaje de estado visible en la interfaz.
 *
 * @param {string} message - Texto a mostrar en el area de estado.
 * @param {{ isError?: boolean }} [options={}] - Opciones de visualizacion.
 */
const setStatus = (message, { isError = false } = {}) => {
    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message ?? '';
    statusMessage.classList.toggle('status-error', Boolean(isError));
};

/**
 * Agrega una opcion al menu desplegable de puzzles.
 *
 * @param {{ id: number|string, name: string }} puzzle - Puzzle con identificador y nombre descriptivo.
 */
const addPuzzleOption = ({ id, name }) => {
    if (!puzzleSelect) {
        return;
    }
    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = name;
    puzzleSelect.appendChild(option);
};

/**
 * Toma los datos brutos del puzzle, los transforma en un tablero y lo renderiza.
 *
 * @param {number} puzzleId - Identificador numerico del puzzle.
 * @param {import('./puzzleLoader.js').PuzzleData} puzzle - Datos cargados del puzzle.
 * @returns {import('./boardRenderer.js').ParsedBoard|null}
 */
const parseAndRenderPuzzle = (puzzleId, puzzle) => {
    if (!boardElement) {
        console.warn('No se encontro el contenedor del tablero.');
        return null;
    }

    if (!parsedBoards.has(puzzleId)) {
        const parsed = parsePuzzle(puzzle.content);
        parsedBoards.set(puzzleId, parsed);
    }

    const boardData = parsedBoards.get(puzzleId);
    renderBoard(boardElement, boardData);
    return boardData;
};

/**
 * Manejador del evento de seleccion de puzzle.
 * Carga el puzzle seleccionado, lo guarda en cache, lo parsea y despacha el evento `puzzle:selected`.
 *
 * @async
 * @param {Event} event - Evento `change` proveniente del elemento `<select>`.
 */
const handlePuzzleSelection = async (event) => {
    const selectedId = Number.parseInt(event.target.value, 10);

    if (Number.isNaN(selectedId)) {
        return;
    }

    try {
        const puzzle = await fetchPuzzle(selectedId);
        loadedPuzzles.set(selectedId, puzzle);

        const boardData = parseAndRenderPuzzle(selectedId, puzzle);

        if (!boardData) {
            setStatus('No fue posible renderizar el puzzle seleccionado.', {
                isError: true,
            });
            return;
        }

        const selectionEvent = new CustomEvent('puzzle:selected', {
            detail: {
                puzzle,
                board: boardData,
            },
        });
        document.dispatchEvent(selectionEvent);

        setStatus(`Puzzle "${puzzle.name}" listo y renderizado.`);
    } catch (error) {
        console.error('No se pudo cargar el puzzle seleccionado:', error);
        if (boardElement) {
            clearBoard(boardElement);
        }
        const isKnown = error instanceof PuzzleNotFoundError;
        setStatus(
            isKnown
                ? 'El puzzle seleccionado no esta disponible.'
                : 'Ocurrio un error al cargar el puzzle.',
            { isError: true },
        );
    }
};

/**
 * Descubre los puzzles disponibles, los carga en memoria y llena el menu desplegable.
 * Si encuentra al menos uno, selecciona automaticamente el primero.
 *
 * @async
 * @returns {Promise<void>}
 */
const initializePuzzles = async () => {
    if (!puzzleSelect) {
        console.warn('No se encontro el elemento select de puzzles.');
        return;
    }

    puzzleSelect.disabled = true;
    setStatus('Cargando puzzles disponibles...');

    try {
        const puzzles = await discoverPuzzles({ max: 25 });

        if (!puzzles.length) {
            setStatus('No se encontraron puzzles en la carpeta indicada.', {
                isError: true,
            });
            return;
        }

        puzzleSelect.innerHTML = '';
        puzzles.forEach((puzzle) => {
            loadedPuzzles.set(puzzle.id, puzzle);
            addPuzzleOption(puzzle);
        });

        puzzleSelect.disabled = false;
        puzzleSelect.value = String(puzzles[0].id);

        const initialEvent = new Event('change');
        puzzleSelect.dispatchEvent(initialEvent);
    } catch (error) {
        console.error('Error al descubrir puzzles disponibles:', error);
        setStatus(
            'No fue posible cargar la lista de puzzles. Consulte la consola.',
            { isError: true },
        );
    }
};

/**
 * Inicializa los eventos y carga los puzzles al cargar el documento.
 */
document.addEventListener('DOMContentLoaded', () => {
    puzzleSelect?.addEventListener('change', handlePuzzleSelection);
    initializePuzzles();
});
