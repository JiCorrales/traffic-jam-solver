import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parsePuzzle } from '../src/models/boardRenderer.js';
import { solveWithBfs } from '../src/algorithms/bfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let board = null;
let goalIndex = -1;

before(async () => {
    const puzzlePath = join(__dirname, 'boards', 'Puzzle1.txt');
    const puzzleText = await readFile(puzzlePath, 'utf8');
    board = parsePuzzle(puzzleText);
    goalIndex = board.vehicles.findIndex((vehicle) => vehicle.isGoal);
});

describe('solveWithBfs', () => {
    test('encuentra una solucion optima para el puzzle 1', async () => {
        const result = await solveWithBfs(board);

        assert.equal(result.status, 'solved');
        assert.equal(result.moves.length, 3);
        assert.equal(result.metrics.depth, result.moves.length);
        assert.equal(result.stateHistory.length, result.moves.length + 1);
        assert.equal(result.vehicleLabels.length, board.vehicles.length);
        assert.ok(result.actions.every((action) => typeof action === 'string' && action.length > 0));

        const finalState = result.stateHistory.at(-1);
        const goalVehicle = board.vehicles[goalIndex];
        const goalPosition = finalState[goalIndex];
        const tailCol = goalPosition.col + goalVehicle.length - 1;

        assert.equal(goalPosition.row, board.exit.row);
        assert.equal(tailCol, board.exit.col);
    });

    test('respeta el AbortSignal antes de iniciar', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await solveWithBfs(board, { signal: controller.signal });

        assert.equal(result.status, 'aborted');
        assert.deepEqual(result.moves, []);
        assert.equal(result.stateHistory.length, 1);
        assert.equal(result.metrics.depth, 0);
    });
});
