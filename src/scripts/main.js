/**
 * @fileoverview
 * Módulo principal para la gestión y carga de puzzles desde la interfaz de usuario.
 * Este script se encarga de:
 *  - Descubrir automáticamente los puzzles disponibles.
 *  - Poblar el menú desplegable con los puzzles encontrados.
 *  - Manejar la selección del usuario y despachar el evento `puzzle:selected`.
 *  - Mostrar mensajes de estado y error en la interfaz.
 *
 * @module ui/puzzleSelector
 */

import {
  discoverPuzzles,
  fetchPuzzle,
  PuzzleNotFoundError,
} from './puzzleLoader.js';

/** @type {HTMLSelectElement|null} */
const puzzleSelect = document.getElementById('puzzle-select');

/** @type {HTMLElement|null} */
const statusMessage = document.getElementById('status-message');

/**
 * Caché local de puzzles ya cargados.
 * @type {Map<number, import('./puzzleLoader.js').PuzzleData>}
 * @private
 */
const loadedPuzzles = new Map();

/**
 * Actualiza el mensaje de estado visible en la interfaz.
 *
 * @param {string} message - Texto a mostrar en el área de estado.
 * @param {{ isError?: boolean }} [options={}] - Opciones de visualización.
 * @param {boolean} [options.isError=false] - Si el mensaje representa un error (añade la clase `status-error`).
 */
const setStatus = (message, { isError = false } = {}) => {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message ?? '';
  statusMessage.classList.toggle('status-error', Boolean(isError));
};

/**
 * Agrega una opción al menú desplegable de puzzles.
 *
 * @param {{ id: number|string, name: string }} puzzle - Puzzle con identificador y nombre descriptivo.
 */
const addPuzzleOption = ({ id, name }) => {
  const option = document.createElement('option');
  option.value = String(id);
  option.textContent = name;
  puzzleSelect.appendChild(option);
};

/**
 * Manejador del evento de selección de puzzle.
 * Carga el puzzle seleccionado, lo guarda en caché y despacha el evento `puzzle:selected`.
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

    /**
     * Evento personalizado emitido cuando un puzzle se ha cargado correctamente.
     * @event puzzle:selected
     * @type {CustomEvent}
     * @property {import('./puzzleLoader.js').PuzzleData} detail - Datos del puzzle cargado.
     */
    const selectionEvent = new CustomEvent('puzzle:selected', {
      detail: puzzle,
    });
    document.dispatchEvent(selectionEvent);

    setStatus(`Puzzle "${puzzle.name}" listo para usarse.`);
  } catch (error) {
    console.error('No se pudo cargar el puzzle seleccionado:', error);
    const isKnown = error instanceof PuzzleNotFoundError;
    setStatus(
      isKnown
        ? 'El puzzle seleccionado no está disponible.'
        : 'Ocurrió un error al cargar el puzzle.',
      { isError: true },
    );
  }
};

/**
 * Descubre los puzzles disponibles, los carga en memoria y llena el menú desplegable.
 * Si encuentra al menos uno, selecciona automáticamente el primero.
 *
 * @async
 * @returns {Promise<void>}
 */
const initializePuzzles = async () => {
  if (!puzzleSelect) {
    console.warn('No se encontró el elemento select de puzzles.');
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

    // Disparar un cambio inicial para cargar el primer puzzle automáticamente
    const initialEvent = new Event('change');
    puzzleSelect.dispatchEvent(initialEvent);

    setStatus('Seleccione un puzzle para comenzar.');
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
 * Escucha el evento `DOMContentLoaded` y ejecuta la configuración inicial.
 */
document.addEventListener('DOMContentLoaded', () => {
  puzzleSelect?.addEventListener('change', handlePuzzleSelection);
  initializePuzzles();
});
