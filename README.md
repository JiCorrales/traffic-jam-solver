Traffic Jam Solver
==================

Aplicación web y conjunto de algoritmos para resolver variantes del rompecabezas *Traffic Jam* (Rush Hour). Permite cargar tableros predefinidos, ejecutar distintos algoritmos de búsqueda y observar la solución paso a paso desde una interfaz basada en HTML/CSS/JS.

## Requisitos

- Node.js >= 20 (se aprovecha el runner de pruebas integrado y soporte ES Modules).
- Un servidor estático simple para visualizar la interfaz (por ejemplo `npx http-server`, Live Server en VS Code o cualquier alternativa similar).

## Estructura principal

```
assets/               # Estilos de la interfaz.
src/
  index.html          # Página principal de la aplicación.
  scripts/main.js     # Lógica de UI, carga de puzzles y animación de soluciones.
  algorithms/         # Implementaciones de Backtracking, BFS, DFS y A*.
  models/boardRenderer.js
                      # Parseo del formato de puzzle y render del tablero.
  utils/              # Helpers compartidos.
tests/
  boards/             # Colección de tableros de prueba en formato textual.
  algorithms.test.js  # Pruebas automatizadas de los algoritmos.
tools/
  scramblePuzzle.mjs  # Generador CLI de puzzles aleatoriamente mezclados.
```

## Cómo ejecutar la aplicación

1. Instala dependencias opcionales (no se requiere `npm install`, se usa Node puro).
2. Desde la carpeta del proyecto:
   ```bash
   npx http-server src
   # o cualquier servidor estático que exponga el contenido de src/
   ```
3. Visita la URL indicada (`http://127.0.0.1:8080` por defecto).  
4. Elige un tablero, selecciona un algoritmo y presiona **Resolver** para iniciar la búsqueda.  
5. Ajusta la velocidad de animación o detén la ejecución con los controles laterales.

> **Nota:** Los tableros disponibles se obtienen desde `tests/boards/`. Puedes añadir nuevos archivos siguiendo el formato descrito más abajo; la interfaz los descubrirá automáticamente (`Puzzle1.txt`, `Puzzle2.txt`, etc.).

## Ejecución de pruebas automáticas

```bash
node --test tests/algorithms.test.js
```

Las pruebas verifican:
- Correcta resolución del Puzzle 1 por BFS, DFS, Backtracking y A*.
- Respeto del `AbortSignal` (permite cancelar búsquedas).
- Soporte de puzzles donde la salida se ubica a la izquierda del vehículo objetivo.

## Algoritmos implementados

Cada algoritmo comparte la misma API asíncrona:

```js
const result = await solveWithBfs(board, {
  signal,          // opcional AbortSignal para cancelar
  onProgress,      // callback para métricas durante la búsqueda
  maxDepth,        // sólo en DFS: límite de profundidad
});
```

- **Búsqueda en Anchura (BFS)**: encuentra la solución de menor profundidad. Útil como baseline y para puzzles pequeños/medianos.
- **Búsqueda en Profundidad (DFS)**: explora la rama más profunda posible usando una pila. Admite `maxDepth` para limitar exploración.
- **Backtracking (DFS con memoización)**: similar a DFS pero evita revisitar estados ya explorados.
- **A\***: usa una heurística admisible basada en la distancia del vehículo objetivo a la salida y los bloqueos intermedios.

Todos los algoritmos devuelven:
- `status`: `solved`, `unsolved` o `aborted`.
- `moves`: lista de movimientos aplicados.
- `stateHistory`: snapshots del tablero tras cada movimiento.
- `actions`: descripciones legibles para la UI.
- `metrics`: nodos explorados, tamaño de la frontera, profundidad y tiempo.

## Formato de los puzzles

Cada archivo contiene una cuadrícula de tokens separados por espacios y una línea final con la salida:

```
- - - B . . .
. . . . . . .
| . . - - >
| . . . . .
v . . . - - >
. . . . . . .
. . . . . . .
Salida: 0,3
```

Tokens:

| Token | Significado                        |
|-------|------------------------------------|
| `.`   | Celda vacía                        |
| `-`   | Segmento horizontal intermedio     |
| `>`   | Segmento horizontal delantero      |
| `<`   | Segmento horizontal trasero        |
| `|`   | Segmento vertical intermedio       |
| `v`   | Segmento vertical inferior         |
| `B`   | Extremo del vehículo objetivo      |

La línea `Salida: fila,columna` indica la celda por la que debe salir el vehículo objetivo (puede estar a la izquierda o derecha/arriba/abajo del vehículo).

## Generador de puzzles (`tools/scramblePuzzle.mjs`)

Permite mezclar un puzzle existente realizando movimientos aleatorios y verificando que siga siendo resoluble.

Usage:

```bash
node tools/scramblePuzzle.mjs tests/boards/Puzzle5.txt 80 5 nuevoPuzzle.txt
```

Parámetros:
1. Ruta al puzzle base.
2. Número de pasos de mezcla (default 40).
3. Profundidad mínima exigida al resultado (default 1).
4. Ruta de salida opcional para guardar el nuevo tablero.

El script repetirá la mezcla hasta que el puzzle generado tenga al menos la profundidad deseada según BFS.

## Buenas prácticas y contribuciones

- Mantén los algoritmos puros y libres de efectos secundarios; la UI se encarga de animar los resultados.
- Asegura la compatibilidad con los tests existentes (`node --test ...`).
- Cuando agregues nuevos puzzles, sigue la convención `PuzzleN.txt` para que el cargador los descubra.
- En soluciones nuevas, procura actualizar el README y, de ser posible, añadir casos a `tests/algorithms.test.js`.

¡Feliz resolución de embotellamientos!
