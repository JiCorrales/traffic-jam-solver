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
        throw new Error('Los datos del tablero no son validos para BFS.');
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
        const tailCol = goalPosition.col + goalVehicle.length - 1;
        return goalPosition.row === context.exit.row && tailCol === context.exit.col;
    }

    if (goalVehicle.orientation === 'vertical') {
        const tailRow = goalPosition.row + goalVehicle.length - 1;
        return goalPosition.col === context.exit.col && tailRow === context.exit.row;
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

const reconstructPath = (nodes, solutionIndex) => {
    const path = [];
    let currentIndex = solutionIndex;

    while (currentIndex !== -1) {
        const node = nodes[currentIndex];
        if (node.move) {
            path.push(node.move);
        }
        currentIndex = node.parentIndex;
    }

    return path.reverse();
};

const solveWithBfs = async (boardData, options = {}) => {
    const context = createContext(boardData);
    const initialPositions = context.vehicles.map((vehicle) => vehicle.initialPosition);
    const visited = new Set([stateKey(initialPositions)]);

    const queue = [
        {
            positions: clonePositions(initialPositions),
            parentIndex: -1,
            move: null,
            depth: 0,
        },
    ];

    let frontIndex = 0;
    let solutionIndex = -1;
    let nodesExplored = 0;
    let maxDepth = 0;
    let aborted = false;

    const startTime = now();
    const progressCallback = typeof options.onProgress === 'function' ? options.onProgress : null;

    while (frontIndex < queue.length) {
        if (options.signal?.aborted) {
            aborted = true;
            break;
        }

        const currentNode = queue[frontIndex];
        frontIndex += 1;
        nodesExplored += 1;
        maxDepth = Math.max(maxDepth, currentNode.depth);

        if (isGoalState(context, currentNode.positions)) {
            solutionIndex = frontIndex - 1;
            break;
        }

        const moves = generateMoves(context, currentNode.positions);
        for (const move of moves) {
            const nextPositions = applyMove(currentNode.positions, move);
            const key = stateKey(nextPositions);

            if (visited.has(key)) {
                continue;
            }

            visited.add(key);
            queue.push({
                positions: nextPositions,
                parentIndex: frontIndex - 1,
                move,
                depth: currentNode.depth + 1,
            });
        }

        if (progressCallback && nodesExplored % PROGRESS_INTERVAL === 0) {
            const elapsed = Math.round(now() - startTime);
            progressCallback({
                explored: nodesExplored,
                frontier: queue.length - frontIndex,
                depth: maxDepth,
                timeMs: elapsed,
            });

            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
        }
    }

    const elapsedTime = Math.round(now() - startTime);
    const frontierSize = queue.length - frontIndex;

    const metrics = {
        explored: nodesExplored,
        frontier: Math.max(frontierSize, 0),
        depth: 0,
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

    if (solutionIndex === -1) {
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

    const moves = reconstructPath(queue, solutionIndex);
    const stateHistory = buildStateHistory(initialPositions, moves);
    const actions = moves.map((move) => describeMove(context.vehicles[move.vehicleIndex], move));

    metrics.depth = moves.length;

    progressCallback?.({
        explored: metrics.explored,
        frontier: metrics.frontier,
        depth: metrics.depth,
        timeMs: metrics.timeMs,
    });

    return {
        status: 'solved',
        moves,
        stateHistory,
        actions,
        metrics,
        vehicleLabels,
    };
};

export { solveWithBfs };
