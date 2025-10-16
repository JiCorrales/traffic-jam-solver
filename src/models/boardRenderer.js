const HORIZONTAL_TOKENS = new Set(['-', '>', 'B']);
const VERTICAL_TOKENS = new Set(['|', 'v', 'B']);
const EMPTY_TOKEN = '.';

const VEHICLE_COLORS = [
    '#1E88E5',
    '#43A047',
    '#FB8C00',
    '#8E24AA',
    '#00ACC1',
    '#F4511E',
    '#3949AB',
];

const GOAL_COLOR = '#D81B60';

const createGrid = (rows) =>
    rows.map((line) =>
        line
            .trim()
            .split(/\s+/)
            .filter((token) => token.length > 0),
    );

const isInsideGrid = (grid, row, col) =>
    row >= 0 && row < grid.length && col >= 0 && col < grid[row].length;

const keyFromPosition = (row, col) => `${row}:${col}`;

const determineOrientation = (grid, row, col) => {
    const token = grid[row][col];

    if (VERTICAL_TOKENS.has(token) && !HORIZONTAL_TOKENS.has(token)) {
        return 'vertical';
    }

    if (HORIZONTAL_TOKENS.has(token) && !VERTICAL_TOKENS.has(token)) {
        return 'horizontal';
    }

    const horizontalNeighbor =
        (isInsideGrid(grid, row, col - 1) && HORIZONTAL_TOKENS.has(grid[row][col - 1])) ||
        (isInsideGrid(grid, row, col + 1) && HORIZONTAL_TOKENS.has(grid[row][col + 1]));

    if (horizontalNeighbor) {
        return 'horizontal';
    }

    const verticalNeighbor =
        (isInsideGrid(grid, row - 1, col) && VERTICAL_TOKENS.has(grid[row - 1][col])) ||
        (isInsideGrid(grid, row + 1, col) && VERTICAL_TOKENS.has(grid[row + 1][col]));

    if (verticalNeighbor) {
        return 'vertical';
    }

    return 'single';
};

const collectHorizontalVehicle = (grid, visited, row, col) => {
    let startCol = col;
    let endCol = col;

    while (isInsideGrid(grid, row, startCol - 1) && HORIZONTAL_TOKENS.has(grid[row][startCol - 1])) {
        startCol -= 1;
    }

    while (isInsideGrid(grid, row, endCol + 1) && HORIZONTAL_TOKENS.has(grid[row][endCol + 1])) {
        endCol += 1;
    }

    const cells = [];

    for (let current = startCol; current <= endCol; current += 1) {
        visited.add(keyFromPosition(row, current));
        cells.push({ row, col: current, token: grid[row][current] });
    }

    return cells;
};

const collectVerticalVehicle = (grid, visited, row, col) => {
    let startRow = row;
    let endRow = row;

    while (isInsideGrid(grid, startRow - 1, col) && VERTICAL_TOKENS.has(grid[startRow - 1][col])) {
        startRow -= 1;
    }

    while (isInsideGrid(grid, endRow + 1, col) && VERTICAL_TOKENS.has(grid[endRow + 1][col])) {
        endRow += 1;
    }

    const cells = [];

    for (let current = startRow; current <= endRow; current += 1) {
        visited.add(keyFromPosition(current, col));
        cells.push({ row: current, col, token: grid[current][col] });
    }

    return cells;
};

const collectVehicle = (grid, visited, row, col) => {
    const orientation = determineOrientation(grid, row, col);

    if (orientation === 'horizontal') {
        return {
            orientation,
            cells: collectHorizontalVehicle(grid, visited, row, col),
        };
    }

    if (orientation === 'vertical') {
        return {
            orientation,
            cells: collectVerticalVehicle(grid, visited, row, col),
        };
    }

    visited.add(keyFromPosition(row, col));
    return {
        orientation: 'single',
        cells: [{ row, col, token: grid[row][col] }],
    };
};

const parseExit = (line) => {
    const [, coordinates] = line.split(':');

    if (!coordinates) {
        throw new Error('Formato de salida invalido en el puzzle.');
    }

    const [rowText, colText] = coordinates.split(',').map((value) => value.trim());
    const row = Number.parseInt(rowText, 10);
    const col = Number.parseInt(colText, 10);

    if (Number.isNaN(row) || Number.isNaN(col)) {
        throw new Error('Coordenadas de salida invalidas en el puzzle.');
    }

    return { row, col };
};

const assignVehicleColors = (vehicles) => {
    let colorIndex = 0;

    return vehicles.map((vehicle) => {
        const isGoal = vehicle.cells.some((cell) => cell.token === 'B');
        const color = isGoal ? GOAL_COLOR : VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];
        const name = isGoal ? 'Carro objetivo' : `Vehiculo ${colorIndex + 1}`;

        if (!isGoal) {
            colorIndex += 1;
        }

        return {
            ...vehicle,
            isGoal,
            color,
            name,
        };
    });
};

const buildVehicles = (grid) => {
    const vehicles = [];
    const visited = new Set();

    for (let row = 0; row < grid.length; row += 1) {
        for (let col = 0; col < grid[row].length; col += 1) {
            const token = grid[row][col];
            if (token === EMPTY_TOKEN || visited.has(keyFromPosition(row, col))) {
                continue;
            }

            const vehicle = collectVehicle(grid, visited, row, col);
            if (vehicle.cells.length > 0) {
                vehicles.push({
                    ...vehicle,
                    length: vehicle.cells.length,
                });
            }
        }
    }

    return assignVehicleColors(vehicles);
};

const parsePuzzle = (puzzleText) => {
    const rawLines = puzzleText
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);

    if (!rawLines.length) {
        throw new Error('El puzzle esta vacio.');
    }

    const exitIndex = rawLines.findIndex((line) => /^Salida\s*:/i.test(line));

    if (exitIndex === -1) {
        throw new Error('No se encontro la linea de salida en el puzzle.');
    }

    const boardLines = rawLines.slice(0, exitIndex);
    const exitLine = rawLines[exitIndex];

    if (!boardLines.length) {
        throw new Error('El puzzle no contiene una representacion de tablero.');
    }

    const grid = createGrid(boardLines);
    const exit = parseExit(exitLine);
    const vehicles = buildVehicles(grid);

    return {
        grid,
        rows: grid.length,
        columns: grid[0]?.length ?? 0,
        exit,
        vehicles,
    };
};

const ensureBoardElement = (boardElement) => {
    if (!(boardElement instanceof HTMLElement)) {
        throw new Error('El elemento del tablero no es valido.');
    }
};

const updateBoardSizeStyles = (boardElement, rows, columns) => {
    ensureBoardElement(boardElement);
    boardElement.style.setProperty('--board-rows', rows);
    boardElement.style.setProperty('--board-columns', columns);
    document.documentElement.style.setProperty('--board-size', Math.max(rows, columns));
};

const clearBoard = (boardElement) => {
    ensureBoardElement(boardElement);
    boardElement.replaceChildren();
};

const createVehicleElement = (vehicle) => {
    const element = document.createElement('div');
    element.classList.add('vehicle');
    if (vehicle.isGoal) {
        element.classList.add('goal');
    }

    element.style.setProperty('--vehicle-length', vehicle.length);
    element.style.setProperty('--vehicle-color', vehicle.color);
    element.style.backgroundColor = vehicle.color;
    element.dataset.orientation = vehicle.orientation;
    element.dataset.length = String(vehicle.length);
    element.dataset.name = vehicle.name;

    if (!vehicle.isGoal) {
        element.dataset.vehicleRole = 'obstacle';
    } else {
        element.dataset.vehicleRole = 'goal';
    }

    const label = document.createElement('span');
    label.classList.add('vehicle-label');
    label.textContent = vehicle.isGoal ? 'B' : '';
    element.appendChild(label);

    return element;
};

const positionVehicleElement = (element, vehicle) => {
    const top = Math.min(...vehicle.cells.map((cell) => cell.row));
    const left = Math.min(...vehicle.cells.map((cell) => cell.col));
    const height = vehicle.orientation === 'vertical' ? vehicle.length : 1;
    const width = vehicle.orientation === 'horizontal' ? vehicle.length : 1;

    element.style.top = `calc(var(--cell-size) * ${top})`;
    element.style.left = `calc(var(--cell-size) * ${left})`;
    element.style.width = `calc(var(--cell-size) * ${width})`;
    element.style.height = `calc(var(--cell-size) * ${height})`;
    element.setAttribute('aria-label', `${vehicle.name}. Posicion ${top}, ${left}`);
    element.dataset.row = String(top);
    element.dataset.col = String(left);
};

const createExitMarker = (exit) => {
    const element = document.createElement('div');
    element.classList.add('exit-marker');
    element.style.top = `calc(var(--cell-size) * ${exit.row})`;
    element.style.left = `calc(var(--cell-size) * ${exit.col})`;
    element.setAttribute('aria-hidden', 'true');
    return element;
};

const renderBoard = (boardElement, boardData) => {
    ensureBoardElement(boardElement);
    clearBoard(boardElement);

    updateBoardSizeStyles(boardElement, boardData.rows, boardData.columns);

    boardElement.dataset.rows = String(boardData.rows);
    boardElement.dataset.columns = String(boardData.columns);
    boardElement.setAttribute(
        'aria-label',
        `Tablero ${boardData.rows} por ${boardData.columns} con ${boardData.vehicles.length} vehiculos`,
    );

    const exitMarker = createExitMarker(boardData.exit);
    boardElement.appendChild(exitMarker);

    boardData.vehicles.forEach((vehicle) => {
        const vehicleElement = createVehicleElement(vehicle);
        positionVehicleElement(vehicleElement, vehicle);
        boardElement.appendChild(vehicleElement);
    });
};

/**
 * @typedef {ReturnType<typeof parsePuzzle>} ParsedBoard
 */

export { parsePuzzle, renderBoard, clearBoard };
