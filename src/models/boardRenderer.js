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


/**
 * The function `createGrid` takes an array of strings representing rows and returns a 2D grid by
 * splitting each row into tokens.
 * @param rows - The `rows` parameter in the `createGrid` function represents an array of strings where
 * each string contains space-separated values. The function processes each string by trimming leading
 * and trailing whitespace, splitting it into an array of tokens based on one or more whitespace
 * characters, and then filtering out any empty tokens before
 */
const createGrid = (rows) =>
    rows.map((line) =>
        line
            .trim()
            .split(/\s+/)
            .filter((token) => token.length > 0),
    );

/**
 * The function `isInsideGrid` checks if a given row and column are within the bounds of a 2D grid.
 * @param grid - The `grid` parameter represents a two-dimensional array or grid structure. Each
 * element in the `grid` array is itself an array representing a row in the grid.
 * @param row - The `row` parameter represents the index of the row in the grid that you want to check.
 * @param col - The `col` parameter represents the column index within the grid. It is used to check if
 * a given row and column index is inside the grid boundaries.
 */
const isInsideGrid = (grid, row, col) =>
    row >= 0 && row < grid.length && col >= 0 && col < grid[row].length;

/**
 * The function `keyFromPosition` takes a row and column as input and returns a string combining them
 * with a colon.
 * @param row - The `row` parameter represents the row position in a grid or matrix. It is typically a
 * numerical value indicating the row index.
 * @param col - Column position
 */
const keyFromPosition = (row, col) => `${row}:${col}`;

/**
 * The function `determineOrientation` analyzes a token in a grid and determines if it belongs to a
 * vertical, horizontal, or single orientation based on its neighboring tokens.
 * @param grid - The `grid` parameter represents a 2D grid or matrix where elements are stored in rows
 * and columns. Each element in the grid corresponds to a specific location identified by its row and
 * column indices.
 * @param row - The `row` parameter in the `determineOrientation` function represents the index of the
 * row in the grid where you want to determine the orientation of a token. It is used to access a
 * specific row in the grid array to check the token at that particular position.
 * @param col - The `col` parameter in the `determineOrientation` function represents the column index
 * within the grid where you want to determine the orientation of a token. It is used to access the
 * specific element in the grid array at the given row and column coordinates.
 * @returns The function `determineOrientation` returns a string indicating the orientation of a token
 * in a grid at a specific row and column. The possible return values are 'vertical', 'horizontal', or
 * 'single' based on the presence of neighboring tokens in the grid.
 */
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

/**
 * The function `collectHorizontalVehicle` in JavaScript collects and returns information about a
 * horizontal vehicle on a grid based on the provided row and column position.
 * @param grid - The `grid` parameter in the `collectHorizontalVehicle` function represents a 2D grid
 * or matrix where vehicles are placed. Each cell in the grid contains a token representing a vehicle
 * or empty space. The function iterates horizontally from a specified starting position (row, col) to
 * collect all contiguous
 * @param visited - Visited is a Set data structure that keeps track of the positions that have already
 * been visited in the grid. This helps in avoiding revisiting the same positions during traversal or
 * collection of vehicles in the grid.
 * @param row - Row is the row index of the current cell in the grid where you are searching for a
 * horizontal vehicle.
 * @param col - The `col` parameter in the `collectHorizontalVehicle` function represents the column
 * index where the horizontal vehicle is located in the grid. The function then collects and returns
 * all the cells occupied by the horizontal vehicle starting from the specified column index.
 * @returns The `collectHorizontalVehicle` function returns an array of objects representing the cells
 * of a horizontal vehicle on a grid. Each object in the array contains the `row`, `col`, and `token`
 * properties of a cell in the horizontal vehicle.
 */
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

/**
 * The function `collectVerticalVehicle` in JavaScript collects and returns a vertical sequence of
 * cells with specific tokens from a grid while updating a set of visited positions.
 * @param grid - The `grid` parameter in the `collectVerticalVehicle` function represents a 2D grid or
 * matrix where vehicles are placed. Each cell in the grid contains a token representing a vehicle or
 * empty space. The function is designed to collect and return a vertical sequence of cells that form a
 * vehicle starting from
 * @param visited - Visited is a Set data structure that keeps track of the positions that have already
 * been visited in the grid. It is used to avoid revisiting the same cell multiple times during
 * traversal or collection of vehicles in the grid.
 * @param row - The `row` parameter in the `collectVerticalVehicle` function represents the current row
 * position in the grid where a vertical vehicle is located. The function then collects all the cells
 * that belong to this vertical vehicle by iterating through the rows above and below the initial row
 * position until it reaches the boundaries of the
 * @param col - The `col` parameter in the `collectVerticalVehicle` function represents the column
 * index in a grid where a vertical vehicle is located. The function collects and returns information
 * about the vertical vehicle starting from the specified column index.
 * @returns The `collectVerticalVehicle` function returns an array of objects representing the cells of
 * a vertical vehicle on a grid. Each object in the array contains the row, column, and token value of
 * a cell that belongs to the vertical vehicle.
 */
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

/**
 * The function `collectVehicle` determines the orientation of a vehicle on a grid and collects its
 * cells accordingly.
 * @param grid - The `grid` parameter in the `collectVehicle` function represents the game board or
 * grid where vehicles are placed. It is a two-dimensional array that contains information about the
 * positions of vehicles on the grid. Each element in the grid represents a cell on the board, and the
 * value of the cell may
 * @param visited - Visited is a Set data structure that keeps track of the positions that have already
 * been visited during the traversal of the grid. It helps prevent revisiting the same position
 * multiple times and ensures efficient exploration of the grid.
 * @param row - The `row` parameter in the `collectVehicle` function represents the row index of the
 * current cell in the grid that is being processed.
 * @param col - The `col` parameter in the `collectVehicle` function represents the column index in a
 * grid. It is used to specify the column position within the grid where a vehicle is located or where
 * the collection of cells should start.
 * @returns The `collectVehicle` function returns an object with the following structure:
 * - If the orientation of the vehicle at the given position is horizontal, it returns an object with
 * the orientation key set to 'horizontal' and the cells key containing an array of cells representing
 * the horizontal vehicle.
 * - If the orientation of the vehicle at the given position is vertical, it returns an object with the
 * orientation key set to '
 */
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

/**
 * The `parseExit` function parses a line of text to extract row and column coordinates for an exit in
 * a puzzle.
 * @param line - The `parseExit` function takes a `line` parameter which is a string representing the
 * coordinates of an exit in a puzzle. The format of the `line` parameter should be in the following
 * format: "Exit: row, col" where `row` and `col` are the coordinates of
 * @returns The `parseExit` function returns an object with `row` and `col` properties representing the
 * row and column coordinates parsed from the input line.
 */
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

/**
 * The function `assignVehicleColors` assigns colors and names to vehicles based on certain conditions.
 * @param vehicles - An array of objects representing vehicles. Each vehicle object has the following
 * properties:
 * @returns The `assignVehicleColors` function returns an array of objects where each object represents
 * a vehicle with additional properties `isGoal`, `color`, and `name` assigned based on the logic
 * inside the `map` function.
 */
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

/**
 * The function `buildVehicles` processes a grid to identify and collect vehicles based on their cells
 * and assigns colors to the vehicles.
 * @param grid - The `grid` parameter in the `buildVehicles` function represents a 2D array that
 * contains tokens representing different elements on a grid. The function iterates over this grid to
 * build vehicles based on the tokens present in the grid.
 * @returns The `buildVehicles` function returns an array of objects representing vehicles on a grid.
 * Each object in the array contains information about a vehicle, including its cells and length. The
 * function also assigns colors to the vehicles before returning the final array.
 */
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

/**
 * The `parsePuzzle` function parses a puzzle text to extract grid information, exit location, and
 * vehicles.
 * @param puzzleText - The `parsePuzzle` function takes a `puzzleText` parameter, which is expected to
 * be a string representing a puzzle. The function then processes this text to extract relevant
 * information such as the board layout, exit position, and vehicles present on the board. The function
 * follows a series of steps
 * @returns The `parsePuzzle` function is returning an object with the following properties:
 * - `grid`: The grid representation of the puzzle board.
 * - `rows`: The number of rows in the grid.
 * - `columns`: The number of columns in the grid.
 * - `exit`: The exit position on the puzzle board.
 * - `vehicles`: An array of vehicles present on the puzzle board.
 */
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

/**
 * The function `ensureBoardElement` checks if a given element is a valid HTML element and throws an
 * error if it is not.
 * @param boardElement - The `boardElement` parameter is expected to be an HTMLElement, representing an
 * element in the DOM that is part of a game board. The `ensureBoardElement` function is used to
 * validate that the provided `boardElement` is indeed an HTMLElement, and if not, it throws an error
 * indicating that
 */
const ensureBoardElement = (boardElement) => {
    if (!(boardElement instanceof HTMLElement)) {
        throw new Error('El elemento del tablero no es valido.');
    }
};

/**
 * The function `updateBoardSizeStyles` updates the size of a board element based on the specified
 * number of rows and columns.
 * @param boardElement - The `boardElement` parameter is the HTML element that represents the game
 * board on the webpage. It is the element that will be updated with the new size styles based on the
 * `rows` and `columns` parameters.
 * @param rows - The `rows` parameter in the `updateBoardSizeStyles` function represents the number of
 * rows in the board layout. It is used to set the custom property `--board-rows` on the `boardElement`
 * to control the styling of the board.
 * @param columns - The `columns` parameter in the `updateBoardSizeStyles` function represents the
 * number of columns in the board layout. It is used to set the `--board-columns` custom property in
 * the CSS styles of the `boardElement`.
 */
const updateBoardSizeStyles = (boardElement, rows, columns) => {
    ensureBoardElement(boardElement);
    boardElement.style.setProperty('--board-rows', rows);
    boardElement.style.setProperty('--board-columns', columns);
    document.documentElement.style.setProperty('--board-size', Math.max(rows, columns));
};

/**
 * The `clearBoard` function in JavaScript clears all children elements from a specified board element.
 * @param boardElement - The `boardElement` parameter is a reference to the HTML element that
 * represents the game board on the webpage.
 */
const clearBoard = (boardElement) => {
    ensureBoardElement(boardElement);
    boardElement.replaceChildren();
};

/**
 * The function `createVehicleElement` creates a div element representing a vehicle with specific
 * properties and styling.
 * @param vehicle - The `createVehicleElement` function takes a `vehicle` object as a parameter. The
 * `vehicle` object should have the following properties:
 * @returns The `createVehicleElement` function returns a dynamically created HTML element (div)
 * representing a vehicle. The element has various properties and attributes set based on the `vehicle`
 * object passed to the function.
 */
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

/**
 * The function `positionVehicleElement` calculates and sets the position and dimensions of a vehicle
 * element based on its cells and orientation.
 * @param element - Element is the HTML element representing the vehicle on the game board. It will be
 * positioned based on the information provided by the vehicle object.
 * @param vehicle - The `vehicle` parameter in the `positionVehicleElement` function represents an
 * object that contains information about a vehicle in a game. It includes properties such as:
 */
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

/**
 * The function `createExitMarker` creates a div element representing an exit marker at a specified row
 * and column position.
 * @param exit - The `exit` parameter in the `createExitMarker` function is an object that represents
 * the exit location in a grid. It likely has `row` and `col` properties indicating the row and column
 * coordinates of the exit within the grid.
 * @returns The `createExitMarker` function returns a newly created `<div>` element with the class
 * `exit-marker`. It sets the `top` and `left` styles of the element based on the `row` and `col`
 * properties of the `exit` parameter. Additionally, it sets the `aria-hidden` attribute to 'true'
 * before returning the element.
 */
const createExitMarker = (exit) => {
    const element = document.createElement('div');
    element.classList.add('exit-marker');
    element.style.top = `calc(var(--cell-size) * ${exit.row})`;
    element.style.left = `calc(var(--cell-size) * ${exit.col})`;
    element.setAttribute('aria-hidden', 'true');
    return element;
};

/**
 * The `renderBoard` function updates a board element with data including rows, columns, vehicles, and
 * an exit marker.
 * @param boardElement - The `boardElement` parameter is the HTML element that represents the game
 * board where vehicles will be displayed. It could be a `<div>`, `<section>`, or any other suitable
 * container element on the webpage.
 * @param boardData - The `boardData` parameter in the `renderBoard` function contains information
 * about the board and vehicles to be rendered on the board. It includes the following properties:
 */
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


export { parsePuzzle, renderBoard, clearBoard };
