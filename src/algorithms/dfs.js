const DIRECTION_OFFSETS = {
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
};

const DIRECTION_DESCRIPTIONS = {
    left: 'hacia la izquierda',
    right: 'hacia la derecha',
    up: 'hacia arriba',
    down: 'hacia abajo',
};

const PROGRESS_INTERVAL = 150;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const clonePositions = (positions) =>
    positions.map((position) => ({ row: position.row, col: position.col }));

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

const stateKey = (positions) =>
    positions.map((position) => `${position.row},${position.col}`).join('|');

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

const buildStateHistory = (initialPositions, moves) => {
    const history = [clonePositions(initialPositions)];
    let current = clonePositions(initialPositions);

    moves.forEach((move) => {
        current = applyMove(current, move);
        history.push(current);
    });

    return history;
};

const describeMove = (vehicle, move) => {
    const directionText = DIRECTION_DESCRIPTIONS[move.direction] ?? move.direction;

    if (move.steps <= 1) {
        return `mover ${vehicle.label} ${directionText}`;
    }

    const stepLabel = move.steps === 1 ? 'espacio' : 'espacios';
    return `mover ${vehicle.label} ${directionText} ${move.steps} ${stepLabel}`;
};

/**
 * Ejecuta una busqueda en profundidad para encontrar una solucion al puzzle.
 *
 * @param {import('../models/boardRenderer.js').ParsedBoard} boardData
 * @param {{
 *     signal?: AbortSignal,
 *     onProgress?: (metrics: {
 *         explored: number,
 *         frontier: number,
 *         depth: number,
 *         timeMs: number,
 *     }) => void,
 *     maxDepth?: number,
 * }} [options]
 * @returns {Promise<{
 *     status: 'solved' | 'unsolved' | 'aborted',
 *     moves: Array<{ vehicleIndex: number, direction: keyof typeof DIRECTION_OFFSETS, steps: number }>,
 *     stateHistory: Array<Array<{ row: number, col: number }>>,
 *     actions: string[],
 *     metrics: {
 *         explored: number,
 *         frontier: number,
 *         depth: number,
 *         timeMs: number,
 *     },
 *     vehicleLabels: string[],
 * }>}
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
