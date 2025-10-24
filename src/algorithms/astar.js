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

/**
 * The `createContext` function processes board data to extract vehicle information and identify the
 * goal vehicle.
 * @param boardData - The `boardData` parameter is an object that contains information about the
 * vehicles on a game board. It should have the following structure:
 * @returns The `createContext` function returns an object with the following properties:
 * - `rows`: the number of rows in the board
 * - `columns`: the number of columns in the board
 * - `exit`: the exit position on the board
 * - `vehicles`: an array of objects representing vehicles on the board, each with properties:
 *   - `orientation`: the orientation of the vehicle
 *   -
 */
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

/**
 * The function `buildOccupancyMatrix` creates a matrix representing the occupancy of vehicles in a
 * given context based on their positions.
 * @param context - The `context` parameter in the `buildOccupancyMatrix` function represents the
 * context in which the vehicles are placed on a grid. It contains information about the grid
 * dimensions (rows and columns) and the vehicles present in the context. The structure of the
 * `context` object might look something like this
 * @param positions - The `positions` parameter in the `buildOccupancyMatrix` function is an array that
 * contains the positions of vehicles on a grid. Each element in the `positions` array corresponds to a
 * vehicle and contains the row and column coordinates where the vehicle is located on the grid. The
 * function uses this information
 * @returns The function `buildOccupancyMatrix` returns a matrix representing the occupancy of vehicles
 * in a given context based on their positions. Each cell in the matrix contains the index of the
 * vehicle occupying that position, or -1 if the cell is empty.
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
 * The function `generateMoves` calculates possible moves for vehicles on a game board based on their
 * current positions and orientations.
 * @param context - The `context` parameter in the `generateMoves` function likely contains information
 * about the game board or grid where the vehicles are positioned. It may include details such as the
 * number of rows and columns in the grid, as well as other relevant information needed to determine
 * valid moves for the vehicles.
 * @param positions - It seems like you were about to provide some information about the `positions`
 * parameter in the `generateMoves` function. Could you please provide more details or complete the
 * sentence so that I can assist you further?
 * @returns The `generateMoves` function returns an array of objects representing possible moves for
 * each vehicle in the context based on the current positions. Each object in the array contains
 * information about the vehicle index, direction of movement (left, right, up, down), and the number
 * of steps for that movement.
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
 * The `applyMove` function updates the positions of vehicles based on a move object containing
 * direction and steps.
 * @param positions - The `positions` parameter in the `applyMove` function represents an array of
 * objects where each object contains information about the position of a vehicle. Each object has
 * `row` and `col` properties indicating the row and column of the vehicle on a grid.
 * @param move - The `move` parameter in the `applyMove` function represents an object that contains
 * information about the direction and steps to move a vehicle on a grid. It has the following
 * structure:
 * @returns The `applyMove` function takes in an array of positions and a move object. It calculates
 * the new positions of the vehicles based on the move direction and steps specified in the move
 * object. It returns a new array of positions with the updated coordinates for the vehicles based on
 * the move.
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
 * The `stateKey` function takes an array of positions and returns a string representation of those
 * positions.
 * @param positions - An array of objects representing positions. Each object has two properties: `row`
 * and `col`, which indicate the row and column of a position.
 */
const stateKey = (positions) =>
    positions.map((position) => `${position.row},${position.col}`).join('|');

/**
 * The function `isGoalState` checks if a given vehicle is in the goal position in a puzzle game
 * context.
 * @param context - The `context` parameter in the `isGoalState` function represents the context of the
 * puzzle or game state. It contains information about the vehicles on the board, the goal index, the
 * exit position, and other relevant details needed to determine if the current state is the goal
 * state.
 * @param positions - The `positions` parameter in the `isGoalState` function represents the current
 * positions of the vehicles on the game board. It is an array that contains the positions of each
 * vehicle on the board. Each position object typically has `row` and `col` properties indicating the
 * row and column where the
 * @returns The function `isGoalState` returns a boolean value indicating whether the current state of
 * the game matches the goal state. If the goal vehicle is oriented horizontally, it checks if the
 * vehicle spans the exit column. If the goal vehicle is oriented vertically, it checks if the vehicle
 * spans the exit row. If the goal vehicle is oriented neither horizontally nor vertically, it checks
 * if the goal position matches the exit
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
 * The function `buildStateHistory` takes initial positions and a series of moves as input, and returns
 * a history of positions after each move.
 * @param initialPositions - The `initialPositions` parameter represents the starting positions of a
 * game or simulation. It could be an array, object, or any data structure that holds the initial state
 * of the game or simulation.
 * @param moves - Moves is an array of moves that need to be applied to the initial positions in order
 * to build the state history. Each move represents a change in the positions of elements in the state.
 * @returns The `buildStateHistory` function returns an array containing the history of positions after
 * applying each move.
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
 * The function `describeMove` takes a vehicle and a move object as parameters and returns a
 * description of the move in Spanish.
 * @param vehicle - The `vehicle` parameter in the `describeMove` function represents the vehicle that
 * is being moved. It likely contains information such as the label or name of the vehicle.
 * @param move - The `move` parameter seems to be an object containing information about a movement,
 * such as the direction and number of steps. It likely has properties like `direction` and `steps`.
 * @returns The function `describeMove` returns a string that describes a move of a vehicle in a
 * specific direction and number of steps. The format of the returned string is either "mover [vehicle
 * label] [direction text]" if the number of steps is 1 or "mover [vehicle label] [direction text]
 * [number of steps] [step label]" if the number of steps is greater
 */
const describeMove = (vehicle, move) => {
    const directionText = DIRECTION_DESCRIPTIONS[move.direction] ?? move.direction;

    if (move.steps <= 1) {
        return `mover ${vehicle.label} ${directionText}`;
    }

    const stepLabel = move.steps === 1 ? 'espacio' : 'espacios';
    return `mover ${vehicle.label} ${directionText} ${move.steps} ${stepLabel}`;
};

/* The class PriorityQueue implements a priority queue data structure using a binary heap to
efficiently store and retrieve elements based on a specified comparator function. */
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

/**
 * The `heuristic` function calculates the heuristic value for a given context and positions in a
 * puzzle-solving scenario.
 * @param context - The `context` parameter in the `heuristic` function seems to contain information
 * about the current state of the puzzle or game. It likely includes details such as the vehicles
 * present, their orientations, lengths, positions, the goal index, the exit position, number of rows,
 * and number of columns.
 * @param positions - It seems like you were about to provide some information about the `positions`
 * parameter but it got cut off. Could you please provide more details or let me know how I can assist
 * you further with the `positions` parameter?
 * @returns The heuristic function returns a value that represents the estimated cost or distance from
 * the current state to the goal state in a specific scenario. The exact value returned depends on the
 * orientation of the goal vehicle (horizontal or vertical) and its position relative to the exit
 * position. The function calculates this value based on various conditions and calculations involving
 * distances, positions, and occupancy matrix of the context.
 */

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

/**
 * The function `solveWithAStar` uses the A* algorithm to find a solution for a given board game state
 * with optional progress tracking.
 * @param boardData - The `boardData` parameter in the `solveWithAStar` function represents the data of
 * the game board or puzzle that you want to solve using the A* algorithm. This data typically includes
 * information about the layout of the board, the positions of different elements on the board, and any
 * constraints or
 * @param [options] - The `options` parameter in the `solveWithAStar` function is an object that can
 * contain the following properties:
 * @returns The `solveWithAStar` function returns an object with the following properties:
 */

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
