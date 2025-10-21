import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parsePuzzle } from '../src/models/boardRenderer.js';
import { solveWithBacktracking } from '../src/algorithms/backtracking.js';
import { solveWithBfs } from '../src/algorithms/bfs.js';
import { solveWithAStar } from '../src/algorithms/astar.js';
import { solveWithDfs } from '../src/algorithms/dfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let puzzle1Board = null;
let puzzle1GoalIndex = -1;
let leftExitBoard = null;
let leftExitGoalIndex = -1;

before(async () => {
    const puzzle1Path = join(__dirname, 'boards', 'Puzzle1.txt');
    const puzzle1Text = await readFile(puzzle1Path, 'utf8');
    puzzle1Board = parsePuzzle(puzzle1Text);
    puzzle1GoalIndex = puzzle1Board.vehicles.findIndex((vehicle) => vehicle.isGoal);

    const leftExitPath = join(__dirname, 'boards', 'PuzzleLeftExit.txt');
    const leftExitText = await readFile(leftExitPath, 'utf8');
    leftExitBoard = parsePuzzle(leftExitText);
    leftExitGoalIndex = leftExitBoard.vehicles.findIndex((vehicle) => vehicle.isGoal);
});

const expectSolved = (boardData, goalVehicleIndex, result, { expectedLength = null } = {}) => {
    assert.equal(result.status, 'solved');
    assert.ok(result.moves.length > 0);
    if (expectedLength !== null) {
        assert.equal(result.moves.length, expectedLength);
    }
    assert.equal(result.metrics.depth, result.moves.length);
    assert.equal(result.stateHistory.length, result.moves.length + 1);
    assert.equal(result.vehicleLabels.length, boardData.vehicles.length);
    assert.ok(result.actions.every((action) => typeof action === 'string' && action.length > 0));

    const finalState = result.stateHistory.at(-1);
    const goalVehicle = boardData.vehicles[goalVehicleIndex];
    const goalPosition = finalState[goalVehicleIndex];

    assert.ok(goalVehicle, 'Vehiculo objetivo no encontrado en el tablero de prueba.');
    assert.ok(goalPosition, 'No se registro la posicion final del vehiculo objetivo.');

    if (goalVehicle.orientation === 'horizontal') {
        assert.equal(goalPosition.row, boardData.exit.row);
        const frontCol = goalPosition.col;
        const rearCol = goalPosition.col + goalVehicle.length - 1;
        assert.ok(
            boardData.exit.col >= frontCol && boardData.exit.col <= rearCol,
            'La salida debe coincidir con alguna posicion horizontal del vehiculo objetivo.',
        );
        return;
    }

    if (goalVehicle.orientation === 'vertical') {
        assert.equal(goalPosition.col, boardData.exit.col);
        const topRow = goalPosition.row;
        const bottomRow = goalPosition.row + goalVehicle.length - 1;
        assert.ok(
            boardData.exit.row >= topRow && boardData.exit.row <= bottomRow,
            'La salida debe coincidir con alguna posicion vertical del vehiculo objetivo.',
        );
        return;
    }

    assert.equal(goalPosition.row, boardData.exit.row);
    assert.equal(goalPosition.col, boardData.exit.col);
};

describe('solveWithBfs', () => {
    test('encuentra una solucion optima para el puzzle 1', async () => {
        const result = await solveWithBfs(puzzle1Board);
        expectSolved(puzzle1Board, puzzle1GoalIndex, result, { expectedLength: 3 });
    });

    test('respeta el AbortSignal antes de iniciar', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await solveWithBfs(puzzle1Board, { signal: controller.signal });

        assert.equal(result.status, 'aborted');
        assert.deepEqual(result.moves, []);
        assert.equal(result.stateHistory.length, 1);
        assert.equal(result.metrics.depth, 0);
    });
});

describe('solveWithAStar', () => {
    test('encuentra una solucion para el puzzle 1', async () => {
        const result = await solveWithAStar(puzzle1Board);
        expectSolved(puzzle1Board, puzzle1GoalIndex, result);
    });

    test('respeta el AbortSignal antes de iniciar', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await solveWithAStar(puzzle1Board, { signal: controller.signal });

        assert.equal(result.status, 'aborted');
        assert.deepEqual(result.moves, []);
        assert.equal(result.stateHistory.length, 1);
        assert.equal(result.metrics.depth, 0);
    });
});

describe('solveWithBacktracking', () => {
    test('encuentra una solucion para el puzzle 1', async () => {
        const result = await solveWithBacktracking(puzzle1Board);
        expectSolved(puzzle1Board, puzzle1GoalIndex, result);
    });

    test('respeta el AbortSignal antes de iniciar', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await solveWithBacktracking(puzzle1Board, { signal: controller.signal });

        assert.equal(result.status, 'aborted');
        assert.deepEqual(result.moves, []);
        assert.equal(result.stateHistory.length, 1);
        assert.equal(result.metrics.depth, 0);
    });
});

describe('solveWithDfs', () => {
    test('encuentra una solucion para el puzzle 1', async () => {
        const result = await solveWithDfs(puzzle1Board);
        expectSolved(puzzle1Board, puzzle1GoalIndex, result);
    });

    test('respeta el AbortSignal antes de iniciar', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await solveWithDfs(puzzle1Board, { signal: controller.signal });

        assert.equal(result.status, 'aborted');
        assert.deepEqual(result.moves, []);
        assert.equal(result.stateHistory.length, 1);
        assert.equal(result.metrics.depth, 0);
    });
});

describe('Puzzles con salida hacia la izquierda', () => {
    test('BFS resuelve un puzzle con salida a la izquierda', async () => {
        assert.ok(leftExitBoard, 'No se pudo cargar el puzzle con salida izquierda.');
        const result = await solveWithBfs(leftExitBoard);
        expectSolved(leftExitBoard, leftExitGoalIndex, result, { expectedLength: 1 });
    });

    test('A* resuelve un puzzle con salida a la izquierda', async () => {
        assert.ok(leftExitBoard, 'No se pudo cargar el puzzle con salida izquierda.');
        const result = await solveWithAStar(leftExitBoard);
        expectSolved(leftExitBoard, leftExitGoalIndex, result, { expectedLength: 1 });
    });

    test('Backtracking resuelve un puzzle con salida a la izquierda', async () => {
        assert.ok(leftExitBoard, 'No se pudo cargar el puzzle con salida izquierda.');
        const result = await solveWithBacktracking(leftExitBoard);
        expectSolved(leftExitBoard, leftExitGoalIndex, result, { expectedLength: 1 });
    });
});
