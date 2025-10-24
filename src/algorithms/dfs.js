/**
 * @typedef {Object} Position
 * @property {number} row - Zero-based row index on the board.
 * @property {number} col - Zero-based column index on the board.
 */

/**
 * @typedef {'horizontal' | 'vertical' | 'single'} Orientation
 */

/**
 * @typedef {Object} Vehicle
 * @property {Orientation} orientation - Movement orientation of the vehicle.
 * @property {number} length - Number of contiguous cells occupied by the vehicle.
 * @property {boolean} isGoal - Whether this is the goal vehicle.
 * @property {string} label - Human-readable label for logs and UI.
 * @property {Position} initialPosition - Anchor (top-most/left-most) position of the vehicle.
 */

/**
 * @typedef {'left' | 'right' | 'up' | 'down'} Direction
 */

/**
 * @typedef {Object} Move
 * @property {number} vehicleIndex - Index of the vehicle in the context's vehicle list.
 * @property {Direction} direction - Direction of the movement.
 * @property {number} steps - Number of grid cells to move (>= 1).
 */

/**
 * @typedef {Object} Context
 * @property {number} rows - Total number of rows in the board.
 * @property {number} columns - Total number of columns in the board.
 * @property {Position} exit - Exit cell position that solves the puzzle.
 * @property {Vehicle[]} vehicles - All vehicles on the board.
 * @property {number} goalIndex - Index of the goal vehicle in {@link Context.vehicles}.
 */

/**
 * @typedef {Object} Metrics
 * @property {number} explored - Total number of nodes (states) explored so far.
 * @property {number} frontier - Current frontier size (stack length for DFS).
 * @property {number} depth - Depth of the found solution (or 0 if none).
 * @property {number} timeMs - Elapsed time in milliseconds.
 */

/**
 * Offsets per direction expressed as row/col deltas.
 * @constant
 * @type {Record<Direction, {row:number, col:number}>}
 */
const DIRECTION_OFFSETS = {
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
};

/**
 * Human-friendly direction descriptions (Spanish, UI-facing).
 * @constant
 * @type {Record<Direction, string>}
 */
const DIRECTION_DESCRIPTIONS = {
    left: 'hacia la izquierda',
    right: 'hacia la derecha',
    up: 'hacia arriba',
    down: 'hacia abajo',
};

/**
 * Node-exploration interval (in ms) to report progress via callbacks.
 * @constant
 * @type {number}
 */
const PROGRESS_INTERVAL = 150;

/**
 * High-resolution timestamp provider (falls back to Date.now in non-browser envs).
 * @returns {number} Current time in milliseconds.
 */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Creates a deep copy of an array of positions.
 * @param {Position[]} positions - Positions to clone.
 * @returns {Position[]} New array with cloned position objects.
 */
const clonePositions = (positions) =>
    positions.map((position) => ({ row: position.row, col: position.col }));

/**
 * Builds a solver context from parsed board data.
 * Validates the board, labels vehicles, and locates the goal vehicle index.
 *
 * @param {import('../models/boardRenderer.js').ParsedBoard} boardData - Parsed board input.
 * @throws {Error} If board data is invalid or the goal vehicle is missing.
 * @returns {Context} The prepared, immutable solving context.
 */
const createContext = (boardData) => {
    if (!boardData || !Array.isArray(boardData.vehicles)) {
        throw new Error('Los datos del tablero no son validos para DFS.');
    }

    let vehicleCounter = 1;
    const vehicles = boardData.vehicles.map((vehicle) => {
        const anchorRow = Math.min(...vehicle.cells.map((cell) => cell.row));
        const anchorCol = Math.min(...vehicle.cells.map((cell) => cell.col));
        const label = vehicle.isGoal ? 'carro objetivo' : `carro ${vehicleCounter}`;

        if (!vehicle.isGoal) {
            vehicleCounter += 1;
        }

        return {
            orientation: vehicle.orientation,
            length: vehicle.length,
            isGoal: vehicle.isGoal,
            label,
            initialPosition: { row: anchorRow, col: anchorCol },
        };
    });

    const goalIndex = vehicles.findIndex((vehicle) => vehicle.isGoal);

    if (goalIndex === -1) {
        throw new Error('No se encontro el carro objetivo en el tablero.');
    }

    return {
        rows: boardData.rows,
        columns: boardData.columns,
        exit: boardData.exit,
        vehicles,
        goalIndex,
    };
};

/**
 * Builds an occupancy matrix for the current state.
 *
 * @param {Context} context - The solving context.
 * @param {Position[]} positions - Current anchor positions of all vehicles.
 * @returns {number[][]} Matrix of size rows×columns where -1 means empty and any non-negative value is a vehicle index.
 */
const buildOccupancyMatrix = (context, positions) => {
    const matrix = Array.from({ length: context.rows }, () =>
        Array.from({ length: context.columns }, () => -1),
    );

    context.vehicles.forEach((vehicle, index) => {
        const { row, col } = positions[index];
        const deltaRow = vehicle.orientation === 'vertical' ? 1 : 0;
        const deltaCol = vehicle.orientation === 'horizontal' ? 1 : 0;

        for (let offset = 0; offset < vehicle.length; offset += 1) {
            const currentRow = row + deltaRow * offset;
            const currentCol = col + deltaCol * offset;
            matrix[currentRow][currentCol] = index;
        }
    });

    return matrix;
};

/**
 * Generates all legal moves from a given state.
 * The result is NOT deduplicated and does not consider visited sets.
 *
 * @param {Context} context - The solving context.
 * @param {Position[]} positions - Current anchor positions of all vehicles.
 * @returns {Move[]} A list of candidate moves for DFS expansion.
 */
const generateMoves = (context, positions) => {
    const moves = [];
    const matrix = buildOccupancyMatrix(context, positions);

    context.vehicles.forEach((vehicle, index) => {
        const { row, col } = positions[index];

        if (vehicle.orientation === 'horizontal' || vehicle.orientation === 'single') {
            let step = 1;
            while (col - step >= 0 && matrix[row][col - step] === -1) {
                moves.push({ vehicleIndex: index, direction: 'left', steps: step });
                step += 1;
            }

            const tailCol = col + vehicle.length - 1;
            step = 1;
            while (tailCol + step < context.columns && matrix[row][tailCol + step] === -1) {
                moves.push({ vehicleIndex: index, direction: 'right', steps: step });
                step += 1;
            }
        }

        if (vehicle.orientation === 'vertical' || vehicle.orientation === 'single') {
            let step = 1;
            while (row - step >= 0 && matrix[row - step][col] === -1) {
                moves.push({ vehicleIndex: index, direction: 'up', steps: step });
                step += 1;
            }

            const tailRow = row + vehicle.length - 1;
            step = 1;
            while (tailRow + step < context.rows && matrix[tailRow + step][col] === -1) {
                moves.push({ vehicleIndex: index, direction: 'down', steps: step });
                step += 1;
            }
        }
    });

    return moves;
};

/**
 * Applies a move to a positions array, returning a new positions array (immutable).
 *
 * @param {Position[]} positions - Current positions.
 * @param {Move} move - Move to apply.
 * @returns {Position[]} New positions after applying the move.
 */
const applyMove = (positions, move) => {
    const delta = DIRECTION_OFFSETS[move.direction];

    return positions.map((position, index) => {
        if (index !== move.vehicleIndex) {
            return { row: position.row, col: position.col };
        }

        return {
            row: position.row + delta.row * move.steps,
            col: position.col + delta.col * move.steps,
        };
    });
};

/**
 * Creates a unique, order-dependent string key for a positions array.
 *
 * @param {Position[]} positions - Positions to encode.
 * @returns {string} Canonical state key (e.g., "r,c|r,c|...").
 */
const stateKey = (positions) =>
    positions.map((position) => `${position.row},${position.col}`).join('|');

/**
 * Checks whether the current state is a goal state (goal vehicle overlaps the exit).
 *
 * @param {Context} context - The solving context.
 * @param {Position[]} positions - Current vehicle positions.
 * @returns {boolean} True if the goal condition is satisfied.
 */
const isGoalState = (context, positions) => {
    const goalVehicle = context.vehicles[context.goalIndex];
    const goalPosition = positions[context.goalIndex];

    if (!goalVehicle || !goalPosition) {
        return false;
    }

    if (goalVehicle.orientation === 'horizontal') {
        if (goalPosition.row !== context.exit.row) {
            return false;
        }

        const frontCol = goalPosition.col;
        const rearCol = goalPosition.col + goalVehicle.length - 1;
        return context.exit.col >= frontCol && context.exit.col <= rearCol;
    }

    if (goalVehicle.orientation === 'vertical') {
        if (goalPosition.col !== context.exit.col) {
            return false;
        }

        const topRow = goalPosition.row;
        const bottomRow = goalPosition.row + goalVehicle.length - 1;
        return context.exit.row >= topRow && context.exit.row <= bottomRow;
    }

    return goalPosition.row === context.exit.row && goalPosition.col === context.exit.col;
};

/**
 * Reconstructs the sequence of states from an initial position and a list of moves.
 *
 * @param {Position[]} initialPositions - Starting positions (will not be mutated).
 * @param {Move[]} moves - Moves to apply in order.
 * @returns {Position[][]} Array of states, including the initial state at index 0.
 */
const buildStateHistory = (initialPositions, moves) => {
    const history = [clonePositions(initialPositions)];
    let current = clonePositions(initialPositions);

    moves.forEach((move) => {
        current = applyMove(current, move);
        history.push(current);
    });

    return history;
};

/**
 * Produces a human-readable description for a move (Spanish UI string).
 *
 * @param {Vehicle} vehicle - The vehicle being moved.
 * @param {Move} move - The move to describe.
 * @returns {string} A readable action like "mover carro 2 hacia la izquierda 2 espacios".
 */
const describeMove = (vehicle, move) => {
    const directionText = DIRECTION_DESCRIPTIONS[move.direction] ?? move.direction;

    if (move.steps <= 1) {
        return `mover ${vehicle.label} ${directionText}`;
    }

    const stepLabel = move.steps === 1 ? 'espacio' : 'espacios';
    return `mover ${vehicle.label} ${directionText} ${move.steps} ${stepLabel}`;
};

/**
 * Depth-First Search solver for the sliding-block/Rush Hour-like board.
 * Uses a LIFO stack (explicit DFS), optional max depth cut-off, and progress callbacks.
 *
 * @param {import('../models/boardRenderer.js').ParsedBoard} boardData - Parsed board with vehicles and exit.
 * @param {Object} [options] - Optional solver configuration.
 * @param {AbortSignal} [options.signal] - Abort signal to cancel the search.
 * @param {(metrics: Metrics) => void} [options.onProgress] - Progress callback (sampled every ~PROGRESS_INTERVAL ms).
 * @param {number} [options.maxDepth] - Maximum search depth (∞ by default).
 * @returns {Promise<{
 *   status: 'solved' | 'unsolved' | 'aborted',
 *   moves: Move[],
 *   stateHistory: Position[][],
 *   actions: string[],
 *   metrics: Metrics,
 *   vehicleLabels: string[],
 * }>} Solver result and telemetry.
 */
const solveWithDfs = async (boardData, options = {}) => {
    const context = createContext(boardData);
    const initialPositions = context.vehicles.map((vehicle) => vehicle.initialPosition);
    const startKey = stateKey(initialPositions);
    const visited = new Set([startKey]);
    const toVisit = [
        {
            positions: clonePositions(initialPositions),
            path: [],
            depth: 0,
        },
    ];

    const maxDepth = Number.isInteger(options.maxDepth)
        ? Math.max(0, options.maxDepth)
        : Number.POSITIVE_INFINITY;

    const progressCallback = typeof options.onProgress === 'function' ? options.onProgress : null;

    const startTime = now();
    let nodesExplored = 0;
    let solutionNode = null;
    let aborted = false;
    let maxFrontier = toVisit.length;

    while (toVisit.length > 0) {
        if (options.signal?.aborted) {
            aborted = true;
            break;
        }

        const currentNode = toVisit.pop();
        nodesExplored += 1;
        maxFrontier = Math.max(maxFrontier, toVisit.length);

        if (isGoalState(context, currentNode.positions)) {
            solutionNode = currentNode;
            break;
        }

        if (currentNode.depth >= maxDepth) {
            continue;
        }

        const moves = generateMoves(context, currentNode.positions).sort((a, b) => {
            if (a.vehicleIndex !== b.vehicleIndex) {
                return a.vehicleIndex - b.vehicleIndex;
            }
            return a.direction.localeCompare(b.direction);
        });

        for (const move of moves) {
            const nextPositions = applyMove(currentNode.positions, move);
            const key = stateKey(nextPositions);

            if (visited.has(key)) {
                continue;
            }

            visited.add(key);
            toVisit.push({
                positions: nextPositions,
                path: currentNode.path.concat(move),
                depth: currentNode.depth + 1,
            });
        }

        if (progressCallback && nodesExplored % PROGRESS_INTERVAL === 0) {
            const elapsed = Math.round(now() - startTime);
            progressCallback({
                explored: nodesExplored,
                frontier: toVisit.length,
                depth: currentNode.depth,
                timeMs: elapsed,
            });

            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    const elapsedTime = Math.round(now() - startTime);
    const metrics = {
        explored: nodesExplored,
        frontier: toVisit.length,
        depth: solutionNode ? solutionNode.path.length : 0,
        timeMs: elapsedTime,
    };

    const vehicleLabels = context.vehicles.map((vehicle) => vehicle.label);

    if (aborted) {
        progressCallback?.(metrics);
        return {
            status: 'aborted',
            moves: [],
            stateHistory: [clonePositions(initialPositions)],
            actions: [],
            metrics,
            vehicleLabels,
        };
    }

    if (!solutionNode) {
        progressCallback?.(metrics);
        return {
            status: 'unsolved',
            moves: [],
            stateHistory: [clonePositions(initialPositions)],
            actions: [],
            metrics,
            vehicleLabels,
        };
    }

    const stateHistory = buildStateHistory(initialPositions, solutionNode.path);
    const actions = solutionNode.path.map((move) =>
        describeMove(context.vehicles[move.vehicleIndex], move),
    );

    metrics.depth = solutionNode.path.length;

    progressCallback?.({
        explored: metrics.explored,
        frontier: metrics.frontier,
        depth: metrics.depth,
        timeMs: metrics.timeMs,
    });

    return {
        status: 'solved',
        moves: solutionNode.path,
        stateHistory,
        actions,
        metrics,
        vehicleLabels,
    };
};

export { solveWithDfs };
