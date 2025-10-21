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
        throw new Error('Los datos del tablero no son validos para A*.');
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

class PriorityQueue {
    constructor(comparator = (a, b) => a - b) {
        this.heap = [];
        this.compare = comparator;
    }

    push(value) {
        this.heap.push(value);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) {
            return undefined;
        }

        const top = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0 && last !== undefined) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }

        return top;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    get size() {
        return this.heap.length;
    }

    bubbleUp(index) {
        let currentIndex = index;
        while (currentIndex > 0) {
            const parentIndex = Math.floor((currentIndex - 1) / 2);
            if (this.compare(this.heap[currentIndex], this.heap[parentIndex]) < 0) {
                [this.heap[currentIndex], this.heap[parentIndex]] = [
                    this.heap[parentIndex],
                    this.heap[currentIndex],
                ];
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    bubbleDown(index) {
        let currentIndex = index;
        const length = this.heap.length;

        while (true) {
            const leftIndex = currentIndex * 2 + 1;
            const rightIndex = currentIndex * 2 + 2;
            let smallest = currentIndex;

            if (
                leftIndex < length &&
                this.compare(this.heap[leftIndex], this.heap[smallest]) < 0
            ) {
                smallest = leftIndex;
            }

            if (
                rightIndex < length &&
                this.compare(this.heap[rightIndex], this.heap[smallest]) < 0
            ) {
                smallest = rightIndex;
            }

            if (smallest === currentIndex) {
                break;
            }

            [this.heap[currentIndex], this.heap[smallest]] = [
                this.heap[smallest],
                this.heap[currentIndex],
            ];
            currentIndex = smallest;
        }
    }
}

const heuristic = (context, positions) => {
    const goalVehicle = context.vehicles[context.goalIndex];
    const goalPosition = positions[context.goalIndex];

    if (!goalVehicle || !goalPosition) {
        return 0;
    }

    const matrix = buildOccupancyMatrix(context, positions);

    if (goalVehicle.orientation === 'horizontal') {
        const row = goalPosition.row;
        const frontCol = goalPosition.col;
        const rearCol = goalPosition.col + goalVehicle.length - 1;

        if (row !== context.exit.row) {
            return (
                Math.abs(context.exit.row - row) +
                Math.abs(context.exit.col - frontCol)
            );
        }

        if (context.exit.col >= frontCol && context.exit.col <= rearCol) {
            return 0;
        }

        if (context.exit.col > rearCol) {
            let blocking = 0;
            for (
                let col = rearCol + 1;
                col <= context.exit.col && col < context.columns;
                col += 1
            ) {
                if (matrix[row][col] !== -1) {
                    blocking += 1;
                }
            }
            return context.exit.col - rearCol + blocking * 2;
        }

        let blocking = 0;
        for (
            let col = frontCol - 1;
            col >= context.exit.col && col >= 0;
            col -= 1
        ) {
            if (matrix[row][col] !== -1) {
                blocking += 1;
            }
        }
        return frontCol - context.exit.col + blocking * 2;
    }

    if (goalVehicle.orientation === 'vertical') {
        const col = goalPosition.col;
        const topRow = goalPosition.row;
        const bottomRow = goalPosition.row + goalVehicle.length - 1;

        if (col !== context.exit.col) {
            return (
                Math.abs(context.exit.col - col) +
                Math.abs(context.exit.row - topRow)
            );
        }

        if (context.exit.row >= topRow && context.exit.row <= bottomRow) {
            return 0;
        }

        if (context.exit.row > bottomRow) {
            let blocking = 0;
            for (
                let row = bottomRow + 1;
                row <= context.exit.row && row < context.rows;
                row += 1
            ) {
                if (matrix[row][col] !== -1) {
                    blocking += 1;
                }
            }
            return context.exit.row - bottomRow + blocking * 2;
        }

        let blocking = 0;
        for (
            let row = topRow - 1;
            row >= context.exit.row && row >= 0;
            row -= 1
        ) {
            if (matrix[row][col] !== -1) {
                blocking += 1;
            }
        }
        return topRow - context.exit.row + blocking * 2;
    }

    return (
        Math.abs(context.exit.row - goalPosition.row) +
        Math.abs(context.exit.col - goalPosition.col)
    );
};

const solveWithAStar = async (boardData, options = {}) => {
    const context = createContext(boardData);
    const initialPositions = context.vehicles.map((vehicle) => vehicle.initialPosition);
    const startKey = stateKey(initialPositions);

    const openSet = new PriorityQueue((a, b) => {
        if (a.f !== b.f) {
            return a.f - b.f;
        }

        return a.h - b.h;
    });

    const startNode = {
        positions: clonePositions(initialPositions),
        path: [],
        g: 0,
        h: heuristic(context, initialPositions),
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    const bestCosts = new Map([[startKey, 0]]);
    const progressCallback = typeof options.onProgress === 'function' ? options.onProgress : null;

    const startTime = now();
    let nodesExplored = 0;
    let solutionNode = null;
    let aborted = false;

    while (!openSet.isEmpty()) {
        if (options.signal?.aborted) {
            aborted = true;
            break;
        }

        const currentNode = openSet.pop();
        const currentKey = stateKey(currentNode.positions);
        const knownCost = bestCosts.get(currentKey);

        if (knownCost !== undefined && currentNode.g > knownCost) {
            continue;
        }

        nodesExplored += 1;

        if (isGoalState(context, currentNode.positions)) {
            solutionNode = currentNode;
            break;
        }

        const moves = generateMoves(context, currentNode.positions);

        for (const move of moves) {
            const nextPositions = applyMove(currentNode.positions, move);
            const nextKey = stateKey(nextPositions);
            const tentativeG = currentNode.g + 1;

            if (tentativeG >= (bestCosts.get(nextKey) ?? Infinity)) {
                continue;
            }

            bestCosts.set(nextKey, tentativeG);
            const h = heuristic(context, nextPositions);
            const nextNode = {
                positions: nextPositions,
                path: currentNode.path.concat(move),
                g: tentativeG,
                h,
            };
            nextNode.f = tentativeG + h;
            openSet.push(nextNode);
        }

        if (progressCallback && nodesExplored % PROGRESS_INTERVAL === 0) {
            const elapsed = Math.round(now() - startTime);
            progressCallback({
                explored: nodesExplored,
                frontier: openSet.size,
                depth: currentNode.path.length,
                timeMs: elapsed,
            });

            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
        }
    }

    const elapsedTime = Math.round(now() - startTime);
    const metrics = {
        explored: nodesExplored,
        frontier: openSet.size,
        depth: solutionNode ? solutionNode.path.length : 0,
        timeMs: elapsedTime,
    };

    if (aborted) {
        progressCallback?.(metrics);
        return {
            status: 'aborted',
            moves: [],
            stateHistory: [clonePositions(initialPositions)],
            actions: [],
            metrics,
            vehicleLabels: context.vehicles.map((vehicle) => vehicle.label),
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
            vehicleLabels: context.vehicles.map((vehicle) => vehicle.label),
        };
    }

    const stateHistory = buildStateHistory(initialPositions, solutionNode.path);
    const actions = solutionNode.path.map((move) =>
        describeMove(context.vehicles[move.vehicleIndex], move),
    );

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
        vehicleLabels: context.vehicles.map((vehicle) => vehicle.label),
    };
};

export { solveWithAStar };
