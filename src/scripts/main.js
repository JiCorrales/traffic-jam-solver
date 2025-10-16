import {
    discoverPuzzles,
    fetchPuzzle,
    PuzzleNotFoundError,
} from './puzzleLoader.js';
import {
    parsePuzzle,
    renderBoard,
    clearBoard,
} from '../models/boardRenderer.js';
import { solveWithBacktracking } from '../algorithms/backtracking.js';

/** @type {HTMLSelectElement|null} */
const puzzleSelect = document.getElementById('puzzle-select');

/** @type {HTMLSelectElement|null} */
const algorithmSelect = document.getElementById('algorithm-select');

/** @type {HTMLInputElement|null} */
const speedSlider = document.getElementById('animation-speed');

/** @type {HTMLButtonElement|null} */
const solveButton = document.getElementById('solve-button');

/** @type {HTMLButtonElement|null} */
const stopButton = document.getElementById('stop-button');

/** @type {HTMLButtonElement|null} */
const resetButton = document.getElementById('reset-board');

/** @type {HTMLElement|null} */
const statusMessage = document.getElementById('status-message');

/** @type {HTMLElement|null} */
const boardElement = document.getElementById('board');

/** @type {HTMLTextAreaElement|null} */
const actionLog = document.getElementById('action-log');

const metricVisited = document.getElementById('metric-visited');
const metricFrontier = document.getElementById('metric-frontier');
const metricDepth = document.getElementById('metric-depth');
const metricTime = document.getElementById('metric-time');

/**
 * Cache local de puzzles ya cargados.
 * @type {Map<number, import('./puzzleLoader.js').PuzzleData>}
 */
const loadedPuzzles = new Map();

/**
 * Cache de tableros parseados listos para renderizar.
 * @type {Map<number, import('../models/boardRenderer.js').ParsedBoard>}
 */
const parsedBoards = new Map();

let currentBoard = null;
let currentPuzzleId = null;

const runState = {
    running: false,
    abortController: null,
    animationTimeout: null,
    cancelled: false,
};

const setStatus = (message, { isError = false } = {}) => {
    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message ?? '';
    statusMessage.classList.toggle('status-error', Boolean(isError));
};

const updateMetrics = ({ explored = 0, frontier = 0, depth = 0, timeMs = 0 } = {}) => {
    if (metricVisited) {
        metricVisited.textContent = String(explored);
    }
    if (metricFrontier) {
        metricFrontier.textContent = String(frontier);
    }
    if (metricDepth) {
        metricDepth.textContent = String(depth);
    }
    if (metricTime) {
        metricTime.textContent = String(timeMs);
    }
};

const clearMetrics = () => {
    updateMetrics({ explored: 0, frontier: 0, depth: 0, timeMs: 0 });
};

const writeActions = (actions = []) => {
    if (!actionLog) {
        return;
    }

    actionLog.value = actions.length ? actions.join('\n') : '';
};

const clearActions = () => {
    writeActions([]);
};

const stopCurrentRun = ({ fromUser = false } = {}) => {
    if (runState.abortController && !runState.abortController.signal.aborted) {
        runState.abortController.abort();
    }

    if (runState.animationTimeout !== null) {
        clearTimeout(runState.animationTimeout);
        runState.animationTimeout = null;
    }

    if (fromUser && runState.running) {
        setStatus('Resolucion detenida por el usuario.');
    }

    runState.running = false;
    runState.cancelled = true;
    runState.abortController = null;

    solveButton && (solveButton.disabled = false);
    stopButton && (stopButton.disabled = true);
    puzzleSelect && (puzzleSelect.disabled = false);
    algorithmSelect && (algorithmSelect.disabled = false);
    speedSlider && (speedSlider.disabled = false);
};

const applyBoardState = (boardData, positions) => {
    if (!boardElement || !boardData) {
        return;
    }

    const vehicleElements = boardElement.querySelectorAll('.vehicle');

    positions.forEach((position, index) => {
        const vehicleElement = vehicleElements[index];
        if (!vehicleElement) {
            return;
        }

        vehicleElement.style.top = `calc(var(--cell-size) * ${position.row})`;
        vehicleElement.style.left = `calc(var(--cell-size) * ${position.col})`;
        vehicleElement.dataset.row = String(position.row);
        vehicleElement.dataset.col = String(position.col);
    });
};

const animateSolution = (boardData, history, delayMs) =>
    new Promise((resolve, reject) => {
        if (!history.length) {
            resolve();
            return;
        }

        let stepIndex = 0;
        runState.animationTimeout = null;

        const scheduleNext = () => {
            if (runState.cancelled) {
                reject(new Error('Animacion cancelada.'));
                return;
            }

            applyBoardState(boardData, history[stepIndex]);

            if (stepIndex >= history.length - 1) {
                runState.animationTimeout = null;
                resolve();
                return;
            }

            stepIndex += 1;
            runState.animationTimeout = setTimeout(scheduleNext, delayMs);
        };

        scheduleNext();
    });

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

const handlePuzzleSelection = async (event) => {
    const selectedId = Number.parseInt(event.target.value, 10);

    if (Number.isNaN(selectedId)) {
        return;
    }

    stopCurrentRun();
    clearMetrics();
    clearActions();

    try {
        const puzzle = await fetchPuzzle(selectedId);
        loadedPuzzles.set(selectedId, puzzle);

        const boardData = parseAndRenderPuzzle(selectedId, puzzle);
        currentBoard = boardData;
        currentPuzzleId = selectedId;

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
            const option = document.createElement('option');
            option.value = String(puzzle.id);
            option.textContent = puzzle.name;
            puzzleSelect.appendChild(option);
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

const runBacktracking = async () => {
    if (!currentBoard) {
        setStatus('Debe seleccionar un puzzle antes de resolver.', { isError: true });
        return;
    }

    const delayMs = Number.parseInt(speedSlider?.value ?? '600', 10) || 600;

    stopCurrentRun();
    clearMetrics();
    clearActions();

    runState.running = true;
    runState.cancelled = false;
    runState.abortController = new AbortController();

    solveButton && (solveButton.disabled = true);
    stopButton && (stopButton.disabled = false);
    puzzleSelect && (puzzleSelect.disabled = true);
    algorithmSelect && (algorithmSelect.disabled = true);
    speedSlider && (speedSlider.disabled = true);

    setStatus('Ejecutando Backtracking...');

    try {
        const result = await solveWithBacktracking(currentBoard, {
            signal: runState.abortController.signal,
            onProgress: updateMetrics,
        });

        if (runState.cancelled) {
            return;
        }

        updateMetrics(result.metrics);

        if (result.status === 'aborted') {
            setStatus('Resolucion cancelada.', { isError: true });
            return;
        }

        if (result.status === 'unsolved') {
            setStatus('No se encontro solucion con Backtracking.', { isError: true });
            return;
        }

        setStatus(`Solucion encontrada en ${result.metrics.depth} movimientos.`);
        writeActions(result.actions);

        await animateSolution(currentBoard, result.stateHistory, delayMs);
    } catch (error) {
        if (runState.cancelled || runState.abortController?.signal.aborted) {
            setStatus('Resolucion detenida.');
            return;
        }

        console.error('Error durante la ejecucion del algoritmo:', error);
        setStatus('Ocurrio un error al ejecutar Backtracking.', { isError: true });
    } finally {
        runState.running = false;
        runState.abortController = null;

        solveButton && (solveButton.disabled = false);
        stopButton && (stopButton.disabled = true);
        puzzleSelect && (puzzleSelect.disabled = false);
        algorithmSelect && (algorithmSelect.disabled = false);
        speedSlider && (speedSlider.disabled = false);
    }
};

const handleSolveClick = () => {
    if (!algorithmSelect) {
        setStatus('No se pudo determinar el algoritmo seleccionado.', { isError: true });
        return;
    }

    const algorithm = algorithmSelect.value;

    if (algorithm !== 'backtracking') {
        setStatus('Este algoritmo aun no esta implementado. Seleccione Backtracking.', {
            isError: true,
        });
        return;
    }

    runBacktracking();
};

const handleStopClick = () => {
    stopCurrentRun({ fromUser: true });
};

const handleResetClick = () => {
    if (!currentPuzzleId) {
        return;
    }

    const puzzle = loadedPuzzles.get(currentPuzzleId);
    if (!puzzle) {
        return;
    }

    stopCurrentRun();
    clearActions();
    clearMetrics();
    parseAndRenderPuzzle(currentPuzzleId, puzzle);
    setStatus('Tablero restablecido.');
};

document.addEventListener('DOMContentLoaded', () => {
    puzzleSelect?.addEventListener('change', handlePuzzleSelection);
    solveButton?.addEventListener('click', handleSolveClick);
    stopButton?.addEventListener('click', handleStopClick);
    resetButton?.addEventListener('click', handleResetClick);
    initializePuzzles();
});
