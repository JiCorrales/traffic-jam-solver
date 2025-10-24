/*  `DIRECTION_OFFSETS` stores directional offsets for left, right, up, and down movements. 
Each direction is represented as a key in the object, with corresponding row and column offsets 
specified as values. This object can be used in a game or application to determine how an object
 should move in different directions. */
const DIRECTION_OFFSETS = {
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
};

/* `DIRECTION_DESCRIPTIONS`  contains descriptions for different directions. Each key in 
the object represents a direction (left, right, up, down) and its corresponding value is 
a string describing that direction in Spanish. */
const DIRECTION_DESCRIPTIONS = {
    left: 'hacia la izquierda',
    right: 'hacia la derecha',
    up: 'hacia arriba',
    down: 'hacia abajo',
};

const PROGRESS_INTERVAL = 150;

/**
 * The `clonePositions` function creates a new array of position objects by cloning each position
 * object in the input array.
 */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * The `clonePositions` function creates a new array of positions by cloning each position object in
 * the input array.
 * @param positions - An array of objects representing positions, where each object has properties
 * `row` and `col`.
 */
const clonePositions = (positions) =>
    positions.map((position) => ({ row: position.row, col: position.col }));

/**
 * The `createContext` function processes board data to create a context object for a breadth-first
 * search algorithm.
 * @param boardData - The `boardData` parameter is an object that contains information about the game
 * board and its vehicles. It should have the following properties:
 * @returns The `createContext` function returns an object with the following properties:
 * - `rows`: Number of rows in the board
 * - `columns`: Number of columns in the board
 * - `exit`: Exit position on the board
 * - `vehicles`: Array of objects representing vehicles on the board, each with properties:
 *   - `orientation`: Orientation of the vehicle
 *   - `length`: Length of
 */
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

/**
 * The function `buildOccupancyMatrix` creates a matrix representing the occupancy of vehicles in a
 * grid based on their positions and orientations.
 * @param context - The `context` parameter in the `buildOccupancyMatrix` function represents the
 * context in which the vehicles are placed on a grid. It contains information about the grid
 * dimensions (rows and columns) and the vehicles present in the context.
 * @param positions - The `positions` parameter in the `buildOccupancyMatrix` function is an array that
 * contains the positions of each vehicle on the game board. Each element in the `positions` array
 * corresponds to a vehicle and contains the row and column coordinates where the vehicle is located on
 * the board. The function uses
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
 * positions and orientations.
 * @param context - The `context` parameter in the `generateMoves` function likely contains information
 * about the game board or grid where the vehicles are positioned. It may include details such as the
 * number of rows and columns in the grid, as well as other relevant information needed to determine
 * valid moves for the vehicles.
 * @param positions - It seems like you were about to provide some information about the `positions`
 * parameter in the `generateMoves` function. Could you please provide more details or complete the
 * sentence so that I can assist you further?
 * @returns The `generateMoves` function returns an array of move objects. Each move object contains
 * information about a possible move for a vehicle on the game board. The move object includes the
 * index of the vehicle, the direction of the move (left, right, up, down), and the number of steps for
 * the move.
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
 * The `applyMove` function updates the positions of vehicles based on a given move in a grid-like
 * structure.
 * @param positions - An array of objects representing the current positions of vehicles on a grid.
 * Each object has properties `row` and `col` indicating the row and column of the vehicle on the grid.
 * @param move - The `move` parameter is an object that contains information about the direction and
 * steps to move a vehicle on a grid. It has the following properties:
 * @returns The `applyMove` function returns a new array of positions after applying the specified move
 * to the vehicle at the given index. Each position in the array is either the same as the original
 * position (if it does not correspond to the moved vehicle) or updated based on the move's direction
 * and steps.
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
 * The function `stateKey` takes an array of positions and returns a string representation of those
 * positions by concatenating the row and column values.
 * @param positions - An array of objects representing positions. Each object has `row` and `col`
 * properties indicating the row and column of the position.
 */

const stateKey = (positions) =>
    positions.map((position) => `${position.row},${position.col}`).join('|');

/**
 * The function `isGoalState` checks if a specific vehicle is in the goal position in a given context.
 * @param context - The `context` parameter in the `isGoalState` function seems to contain information
 * related to the current state of a puzzle or game. It likely includes details such as the vehicles
 * present, their orientations, lengths, positions, the goal index, and the exit position.
 * @param positions - It seems like you were about to provide some information about the `positions`
 * parameter in the `isGoalState` function, but the information is missing. Could you please provide
 * the details or let me know how I can assist you further with this code snippet?
 * @returns The function `isGoalState` is checking if the current state of the game matches the goal
 * state. It returns a boolean value - `true` if the goal state is reached, and `false` otherwise.
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
 * The function `buildStateHistory` takes initial positions and a list of moves, then returns a history
 * array tracking the state after each move.
 * @param initialPositions - Initial positions of a game board or any other state that needs to be
 * tracked.
 * @param moves - It looks like you were about to provide some information about the `moves` parameter
 * in the `buildStateHistory` function. Could you please complete your sentence or provide more context
 * so that I can assist you better?
 * @returns The `buildStateHistory` function returns an array containing the history of positions after
 * applying each move. Each element in the array represents the positions after a specific move has
 * been applied.
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
 * is being moved. It likely contains information such as the type of vehicle (e.g., car, truck,
 * bicycle) and any additional properties that describe the vehicle.
 * @param move - The `move` parameter in the `describeMove` function seems to be an object containing
 * information about a movement. It likely has properties such as `direction` (indicating the direction
 * of movement) and `steps` (indicating the number of steps to move). The function uses this
 * information to
 * @returns The `describeMove` function returns a string describing a move for a vehicle. The returned
 * string includes the vehicle's label, the direction of the move, and the number of steps in that
 * direction. If the number of steps is 1, it uses the singular form "espacio", otherwise, it uses the
 * plural form "espacios".
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
 * The `reconstructPath` function takes an array of nodes and a solution index, then reconstructs the
 * path by tracing back through the nodes' parent indexes and collecting the moves made.
 * @param nodes - The `nodes` parameter in the `reconstructPath` function is an array that represents
 * the nodes in a graph or a pathfinding algorithm. Each node in the array contains information such as
 * the parent index, move, or any other relevant data needed to reconstruct the path.
 * @param solutionIndex - The `solutionIndex` parameter in the `reconstructPath` function is the index
 * of the node in the `nodes` array that represents the solution path. This index is used to trace back
 * the path from the solution node to the starting node by following the parent indexes of each node in
 * the path
 * @returns The `reconstructPath` function returns an array of moves that represent the path from the
 * starting node to the solution node in a graph or tree structure.
 */
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


/**
 * The function `solveWithBfs` implements a breadth-first search algorithm to solve a puzzle game with
 * vehicles on a board.
 * @param boardData - The `solveWithBfs` function you provided is an asynchronous function that uses
 * breadth-first search to solve a puzzle on a board. It takes in `boardData` as the main parameter,
 * which likely represents the initial state of the puzzle board. The function also accepts an optional
 * `options` object
 * @param [options] - The `options` parameter in the `solveWithBfs` function allows you to provide
 * additional settings or configurations for the breadth-first search algorithm. Here are the possible
 * options that can be passed:
 * @returns The `solveWithBfs` function returns an object with the following properties:
 */
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
