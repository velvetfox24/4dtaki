let scene, camera, renderer, board = [];
let controls;
const SIZE = 4;
let currentPlayer = 1; // 1 = User 1, 2 = AI / User 2
let lastMove = null;
let selectedCube = null; // Cube currently highlighted (1st click)
let highlightedLines = []; // Arrays of cubes currently highlighted for intersections

// Light cycles
let lightCycles = [];
let explosions = [];

let gameMode = 'ai'; // 'ai' or 'pvp'
let aiDifficulty = 'normal'; // easy, normal, hard, extreme, impossible
let gameRunning = false;

// Precompute win lines for fast evaluation
const WIN_LINES = [];
(function precomputeWinLines() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            WIN_LINES.push([[0,i,j], [1,i,j], [2,i,j], [3,i,j]]);
            WIN_LINES.push([[i,0,j], [i,1,j], [i,2,j], [i,3,j]]);
            WIN_LINES.push([[i,j,0], [i,j,1], [i,j,2], [i,j,3]]);
        }
    }
    for (let i = 0; i < 4; i++) {
        WIN_LINES.push([[i,0,0], [i,1,1], [i,2,2], [i,3,3]]);
        WIN_LINES.push([[i,3,0], [i,2,1], [i,1,2], [i,0,3]]);
        WIN_LINES.push([[0,i,0], [1,i,1], [2,i,2], [3,i,3]]);
        WIN_LINES.push([[3,i,0], [2,i,1], [1,i,2], [0,i,3]]);
        WIN_LINES.push([[0,0,i], [1,1,i], [2,2,i], [3,3,i]]);
        WIN_LINES.push([[3,0,i], [2,1,i], [1,2,i], [0,3,i]]);
    }
    WIN_LINES.push([[0,0,0], [1,1,1], [2,2,2], [3,3,3]]);
    WIN_LINES.push([[3,0,0], [2,1,1], [1,2,2], [0,3,3]]);
    WIN_LINES.push([[0,3,0], [1,2,1], [2,1,2], [3,0,3]]);
    WIN_LINES.push([[0,0,3], [1,1,2], [2,2,1], [3,3,0]]);
})();


let player1Wins = 0;
let player2Wins = 0;

// init() and animate() will now be called by the menu start button
let isInitialized = false;

function startGame(mode, difficulty) {
    gameMode = mode;
    aiDifficulty = difficulty;
    gameRunning = true;
    
    document.getElementById('setup-menu').style.display = 'none';
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'block';

    if (!isInitialized) {
        init();
        animate();
        isInitialized = true;
    } else {
        resetGameInternal();
    }
}

function showMainMenu() {
    gameRunning = false;
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('setup-menu').style.display = 'flex';
}

function resetGame() {
    // Called from Play Again button
    document.getElementById('game-over-overlay').style.display = 'none';
    resetGameInternal();
}

function resetGameInternal() {
    // Clear board logically and visually
    for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
            for (let z = 0; z < SIZE; z++) {
                const cube = board[x][y][z];
                cube.userData.owner = 0;
                cube.material.wireframe = true;
                cube.material.opacity = 0.15;
                cube.material.color.setHex(0x88ccff);
                if (cube.material.emissive) cube.material.emissive.setHex(0x000000);
            }
        }
    }
    
    // Reset state
    lastMove = null;
    clearSelection();
    currentPlayer = 1;
    gameRunning = true;
    
    document.getElementById('status').innerText = 'Player 1 Turn';
}

function triggerGameOver(winner) {
    gameRunning = false;
    let message = '';
    
    if (winner === 1) {
        player1Wins++;
        document.getElementById('win-count').innerText = player1Wins;
        message = 'Player 1 Wins!';
    } else {
        player2Wins++;
        document.getElementById('loss-count').innerText = player2Wins;
        message = gameMode === 'ai' ? 'CPU Wins!' : 'Player 2 Wins!';
    }
    
    document.getElementById('status').innerText = message;
    document.getElementById('game-over-text').innerText = message;
    
    // Show overlay after a brief delay
    setTimeout(() => {
        document.getElementById('game-over-overlay').style.display = 'flex';
    }, 1000);
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); // Pitch black
    scene.fog = new THREE.FogExp2(0x050505, 0.03); // Fog for depth

    // Cyber Floor Grid (Dimmed)
    const gridHelper = new THREE.GridHelper(50, 50, 0x0088cc, 0x002244);
    gridHelper.position.set(2.25, -6, 2.25); // Far below the 4x4x4 grid
    // Make grid semi-transparent
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Arena Walls
    const wallOpacity = 0.05;
    
    const wallBack = new THREE.GridHelper(50, 50, 0x0088cc, 0x002244);
    wallBack.rotation.x = Math.PI / 2;
    wallBack.position.set(2.25, 19, -22.75); // Moved back and up
    wallBack.material.opacity = wallOpacity;
    wallBack.material.transparent = true;
    scene.add(wallBack);

    const wallFront = new THREE.GridHelper(50, 50, 0x0088cc, 0x002244);
    wallFront.rotation.x = Math.PI / 2;
    wallFront.position.set(2.25, 19, 27.25); 
    wallFront.material.opacity = wallOpacity;
    wallFront.material.transparent = true;
    scene.add(wallFront);
    
    const wallLeft = new THREE.GridHelper(50, 50, 0x0088cc, 0x002244);
    wallLeft.rotation.z = Math.PI / 2;
    wallLeft.position.set(-22.75, 19, 2.25);
    wallLeft.material.opacity = wallOpacity;
    wallLeft.material.transparent = true;
    scene.add(wallLeft);

    const wallRight = new THREE.GridHelper(50, 50, 0x0088cc, 0x002244);
    wallRight.rotation.z = Math.PI / 2;
    wallRight.position.set(27.25, 19, 2.25);
    wallRight.material.opacity = wallOpacity;
    wallRight.material.transparent = true;
    scene.add(wallRight);

    // Spawn Light Cycles
    createLightCycle(0x00ffff, -15, -5.9, -15, 1, 0); // Cyan
    createLightCycle(0xff8800, 15, -5.9, 15, -1, 0);  // Orange

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 7, 10);
    camera.lookAt(2, 2, 2);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Add OrbitControls for drag rotation
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(2.25, 2.25, 2.25); // Center of the 4x4x4 grid (1.5 * 1.5)
    controls.update();

    // Create 4x4x4 Grid
    for (let x = 0; x < SIZE; x++) {
        board[x] = [];
        for (let y = 0; y < SIZE; y++) {
            board[x][y] = [];
            for (let z = 0; z < SIZE; z++) {
                const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                // Make wireframes sharper and brighter for neon aesthetic
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0x88ccff, 
                    wireframe: true, 
                    opacity: 0.15, 
                    transparent: true 
                });
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x * 1.5, y * 1.5, z * 1.5);
                cube.userData = { x, y, z, owner: 0 };
                scene.add(cube);
                board[x][y][z] = cube;
            }
        }
    }

    // Replace mousedown with a pointerdown that differentiates click vs drag
    window.addEventListener('pointerdown', onPointerDown);
}

let pointerDownTime = 0;
function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return; // Only left click
    pointerDownTime = performance.now();
    window.addEventListener('pointerup', onPointerUp, { once: true });
}

function onPointerUp(event) {
    if (!gameRunning) return;
    const clickDuration = performance.now() - pointerDownTime;
    if (clickDuration > 200) return; // Likely a drag/rotate, not a click

    // If PVP, allow clicks for player 2 as well. If AI, only allow player 1.
    if (gameMode === 'ai' && currentPlayer !== 1) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        
        if (target.userData.owner === 0) {
            // First click: select and highlight
            if (selectedCube !== target) {
                clearSelection();
                selectCube(target);
            } 
            // Second click on the same cube: confirm move
            else {
                clearSelection();
                makeMove(target, currentPlayer);
                if (!checkWin(currentPlayer)) {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    
                    document.getElementById('status').innerText = currentPlayer === 1 ? 'Player 1 Turn' : (gameMode === 'ai' ? 'CPU Turn' : 'Player 2 Turn');

                    if (gameMode === 'ai' && currentPlayer === 2) {
                        setTimeout(aiMove, 500);
                    }
                } else {
                    triggerGameOver(currentPlayer);
                }
            }
        }
    } else {
        // Clicked outside, clear selection
        clearSelection();
    }
}

function selectCube(cube) {
    selectedCube = cube;
    
    // Make the selected cube more opaque and glow cyan
    cube.material.opacity = 0.9;
    cube.material.color.setHex(0x00ffff); // Cyan highlight color
    
    // Highlight intersecting x, y, and z lines
    const { x, y, z } = cube.userData;
    
    for (let i = 0; i < SIZE; i++) {
        highlightAxisCube(board[i][y][z]); // X-axis line
        highlightAxisCube(board[x][i][z]); // Y-axis line
        highlightAxisCube(board[x][y][i]); // Z-axis line
    }
}

function highlightAxisCube(cube) {
    if (cube === selectedCube || cube.userData.owner !== 0) return;
    
    // Save original opacity/color if needed, but here we just bump opacity
    cube.material.opacity = 0.4;
    cube.material.color.setHex(0x0088ff); // Darker blue for intersecting lines
    highlightedLines.push(cube);
}

function clearSelection() {
    if (selectedCube && selectedCube.userData.owner === 0) {
        selectedCube.material.opacity = 0.15;
        selectedCube.material.color.setHex(0x88ccff);
    }
    
    highlightedLines.forEach(cube => {
        if (cube.userData.owner === 0) {
            cube.material.opacity = 0.15;
            cube.material.color.setHex(0x88ccff);
        }
    });
    
    highlightedLines = [];
    selectedCube = null;
}

function makeMove(cube, player) {
    cube.userData.owner = player;
    cube.material.wireframe = false;
    cube.material.opacity = 1;
    cube.material.color.setHex(player === 1 ? 0x0066ff : 0xff2222); // Blue for P1, Red for P2/AI
    
    // Highlight last move
    if (lastMove) lastMove.material.emissive?.setHex(0x000000);
    lastMove = cube;
}

function checkWin(p) {
    const b = board;
    
    // 16 lines along X, Y, Z
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            // x varies (16 rows)
            if (checkLine(p, b[0][i][j], b[1][i][j], b[2][i][j], b[3][i][j])) return true;
            // y varies (16 rows)
            if (checkLine(p, b[i][0][j], b[i][1][j], b[i][2][j], b[i][3][j])) return true;
            // z varies (16 rows)
            if (checkLine(p, b[i][j][0], b[i][j][1], b[i][j][2], b[i][j][3])) return true;
        }
    }

    // 24 face diagonals (8 in each orthogonal plane direction)
    for (let i = 0; i < 4; i++) {
        // Fixed X planes (YZ diagonals)
        if (checkLine(p, b[i][0][0], b[i][1][1], b[i][2][2], b[i][3][3])) return true;
        if (checkLine(p, b[i][3][0], b[i][2][1], b[i][1][2], b[i][0][3])) return true;

        // Fixed Y planes (XZ diagonals)
        if (checkLine(p, b[0][i][0], b[1][i][1], b[2][i][2], b[3][i][3])) return true;
        if (checkLine(p, b[3][i][0], b[2][i][1], b[1][i][2], b[0][i][3])) return true;

        // Fixed Z planes (XY diagonals)
        if (checkLine(p, b[0][0][i], b[1][1][i], b[2][2][i], b[3][3][i])) return true;
        if (checkLine(p, b[3][0][i], b[2][1][i], b[1][2][i], b[0][3][i])) return true;
    }

    // 4 main cross-cube diagonals
    if (checkLine(p, b[0][0][0], b[1][1][1], b[2][2][2], b[3][3][3])) return true;
    if (checkLine(p, b[3][0][0], b[2][1][1], b[1][2][2], b[0][3][3])) return true;
    if (checkLine(p, b[0][3][0], b[1][2][1], b[2][1][2], b[3][0][3])) return true;
    if (checkLine(p, b[0][0][3], b[1][1][2], b[2][2][1], b[3][3][0])) return true;

    return false;
}

function checkLine(p, c1, c2, c3, c4) {
    return (c1.userData.owner === p && c2.userData.owner === p && c3.userData.owner === p && c4.userData.owner === p);
}

function aiMove() {
    if (!gameRunning) return;
    
    let bestMove = null;
    let available = [];
    
    for(let x=0; x<SIZE; x++) {
        for(let y=0; y<SIZE; y++) {
            for(let z=0; z<SIZE; z++) {
                if(board[x][y][z].userData.owner === 0) {
                    available.push(board[x][y][z]);
                }
            }
        }
    }

    if (available.length === 0) return;

    if (aiDifficulty === 'easy') {
        bestMove = available[Math.floor(Math.random() * available.length)];
    } else {
        let depth = 0;
        let randomness = 0;
        if (aiDifficulty === 'normal') { depth = 1; randomness = 0.5; }
        else if (aiDifficulty === 'hard') { depth = 2; randomness = 0.2; }
        else if (aiDifficulty === 'extreme') { depth = 3; randomness = 0.05; }
        else if (aiDifficulty === 'impossible') { depth = 3; randomness = 0; } // 3-ply + Alpha-Beta is generally tough enough and avoids freezing
        
        // Sometimes just pick randomly if not impossible, to simulate mistakes
        if (Math.random() < randomness) {
            bestMove = available[Math.floor(Math.random() * available.length)];
        } else {
            bestMove = getBestMoveMinimax(2, depth, available);
        }
    }

    if (bestMove) {
        makeMove(bestMove, 2);
        if (!checkWin(2)) {
            currentPlayer = 1;
            document.getElementById('status').innerText = 'Player 1 Turn';
        } else {
            triggerGameOver(2);
        }
    }
}

function getBestMoveMinimax(player, maxDepth, availableCubes) {
    let bestScore = -Infinity;
    let bestMove = null;
    
    // Sort available moves by center proximity heuristic to improve alpha-beta pruning
    availableCubes.sort((a, b) => {
        const distA = Math.abs(1.5 - a.userData.x) + Math.abs(1.5 - a.userData.y) + Math.abs(1.5 - a.userData.z);
        const distB = Math.abs(1.5 - b.userData.x) + Math.abs(1.5 - b.userData.y) + Math.abs(1.5 - b.userData.z);
        return distA - distB;
    });

    for (let move of availableCubes) {
        move.userData.owner = player;
        let score = minimax(maxDepth - 1, false, -Infinity, Infinity, player);
        move.userData.owner = 0;
        
        if (score > bestScore || bestMove === null) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove || availableCubes[0];
}

function minimax(depth, isMaximizing, alpha, beta, aiPlayer) {
    const oppPlayer = aiPlayer === 1 ? 2 : 1;
    
    // Fast win check using precomputed lines
    if (fastCheckWin(aiPlayer)) return 100000 + depth;
    if (fastCheckWin(oppPlayer)) return -100000 - depth;
    
    if (depth <= 0) {
        return evaluateBoard(aiPlayer);
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for(let x=0; x<SIZE; x++) {
            for(let y=0; y<SIZE; y++) {
                for(let z=0; z<SIZE; z++) {
                    const cell = board[x][y][z];
                    if(cell.userData.owner === 0) {
                        cell.userData.owner = aiPlayer;
                        let evaluation = minimax(depth - 1, false, alpha, beta, aiPlayer);
                        cell.userData.owner = 0;
                        maxEval = Math.max(maxEval, evaluation);
                        alpha = Math.max(alpha, evaluation);
                        if (beta <= alpha) return maxEval;
                    }
                }
            }
        }
        // If no moves, draw
        if (maxEval === -Infinity) return 0;
        return maxEval;
    } else {
        let minEval = Infinity;
        for(let x=0; x<SIZE; x++) {
            for(let y=0; y<SIZE; y++) {
                for(let z=0; z<SIZE; z++) {
                    const cell = board[x][y][z];
                    if(cell.userData.owner === 0) {
                        cell.userData.owner = oppPlayer;
                        let evaluation = minimax(depth - 1, true, alpha, beta, aiPlayer);
                        cell.userData.owner = 0;
                        minEval = Math.min(minEval, evaluation);
                        beta = Math.min(beta, evaluation);
                        if (beta <= alpha) return minEval;
                    }
                }
            }
        }
        if (minEval === Infinity) return 0;
        return minEval;
    }
}

function fastCheckWin(player) {
    for (let line of WIN_LINES) {
        if (board[line[0][0]][line[0][1]][line[0][2]].userData.owner === player &&
            board[line[1][0]][line[1][1]][line[1][2]].userData.owner === player &&
            board[line[2][0]][line[2][1]][line[2][2]].userData.owner === player &&
            board[line[3][0]][line[3][1]][line[3][2]].userData.owner === player) {
            return true;
        }
    }
    return false;
}

function evaluateBoard(aiPlayer) {
    let score = 0;
    const oppPlayer = aiPlayer === 1 ? 2 : 1;
    
    for (let line of WIN_LINES) {
        let aiCount = 0;
        let oppCount = 0;
        for (let [x, y, z] of line) {
            const owner = board[x][y][z].userData.owner;
            if (owner === aiPlayer) aiCount++;
            else if (owner === oppPlayer) oppCount++;
        }
        
        if (aiCount > 0 && oppCount === 0) {
            if (aiCount === 1) score += 1;
            else if (aiCount === 2) score += 10;
            else if (aiCount === 3) score += 500;
        } else if (oppCount > 0 && aiCount === 0) {
            if (oppCount === 1) score -= 1;
            else if (oppCount === 2) score -= 10;
            else if (oppCount === 3) score -= 1000; // Prioritize blocking
        }
    }
    return score;
}

function createLightCycle(colorHex, startX, y, startZ, dirX, dirZ) {
    const cycle = {
        pos: new THREE.Vector3(startX, y, startZ),
        dir: new THREE.Vector3(dirX, 0, dirZ),
        speed: 0.2,
        color: colorHex,
        trail: [],
        trailMaxLen: 120, // Much longer trail
        mesh: null,
        dead: false
    };
    
    // The head (the bike)
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.6);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    cycle.mesh = new THREE.Mesh(geo, mat);
    cycle.mesh.position.copy(cycle.pos);
    scene.add(cycle.mesh);
    
    // The trail
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
    cycle.trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(cycle.trailLine);
    
    lightCycles.push(cycle);
}

function createExplosion(pos, color) {
    const geo = new THREE.SphereGeometry(0.3, 16, 16); // Smaller base explosion
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    explosions.push({ mesh, life: 1.0 });
}

function updateLightCycles() {
    // Process explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.life -= 0.08; // Fade faster
        exp.mesh.scale.multiplyScalar(1.1); // Expand slower
        exp.mesh.material.opacity = exp.life;
        if (exp.life <= 0) {
            scene.remove(exp.mesh);
            explosions.splice(i, 1);
        }
    }

    lightCycles.forEach(cycle => {
        if (cycle.dead) return;

        cycle.pos.add(cycle.dir.clone().multiplyScalar(cycle.speed));
        cycle.mesh.position.copy(cycle.pos);
        cycle.mesh.lookAt(cycle.pos.clone().add(cycle.dir));

        cycle.trail.push(cycle.pos.clone());
        if (cycle.trail.length > cycle.trailMaxLen) cycle.trail.shift();
        if (cycle.trail.length > 1) cycle.trailLine.geometry.setFromPoints(cycle.trail);
        
        let crashed = false;

        // Check Trail Collisions (Only against OPPONENT trails)
        for (const other of lightCycles) {
            if (other.dead || other === cycle) continue; // Don't crash into self
            
            for (let i = 0; i < other.trail.length; i++) {
                if (cycle.pos.distanceTo(other.trail[i]) < 0.6) {
                    crashed = true;
                    break;
                }
            }
            if (crashed) break;
        }

        // Check Wall Bounds Crash
        if (Math.abs(cycle.pos.x - 2.25) > 20 || Math.abs(cycle.pos.z - 2.25) > 20) {
            // Instead of exploding on walls, just force a turn and clear trail
            const newDir = new THREE.Vector3();
            if (cycle.dir.x !== 0) {
                newDir.z = Math.random() > 0.5 ? 1 : -1;
                cycle.dir.x = 0;
            } else {
                newDir.x = Math.random() > 0.5 ? 1 : -1;
                cycle.dir.z = 0;
            }
            cycle.dir.copy(newDir);
            
            // Re-bound
            cycle.pos.x = Math.max(-17.75, Math.min(22.25, cycle.pos.x));
            cycle.pos.z = Math.max(-17.75, Math.min(22.25, cycle.pos.z));
            
            cycle.trail = [cycle.pos.clone()];
        } else if (crashed) {
            cycle.dead = true;
            createExplosion(cycle.pos, cycle.color);
            scene.remove(cycle.mesh);
            scene.remove(cycle.trailLine);
            
            // Respawn after delay
            setTimeout(() => {
                const spawnColor = cycle.color;
                
                // Remove fully from array
                const idx = lightCycles.indexOf(cycle);
                if (idx > -1) lightCycles.splice(idx, 1);
                
                // Random spawn edge
                const side = Math.floor(Math.random() * 4);
                let sx = 2.25, sz = 2.25, dx = 0, dz = 0;
                if (side === 0) { sx = -16; sz = Math.random()*30 - 15; dx = 1; }
                if (side === 1) { sx = 20; sz = Math.random()*30 - 15; dx = -1; }
                if (side === 2) { sz = -16; sx = Math.random()*30 - 15; dz = 1; }
                if (side === 3) { sz = 20; sx = Math.random()*30 - 15; dz = -1; }
                
                createLightCycle(spawnColor, sx, -5.9, sz, dx, dz);
            }, 2000);
        } else {
            // Random chance to turn naturally if there is room to do so safely
            if (Math.random() < 0.005) { // Lowered chance to turn frequently
                const newDir = new THREE.Vector3();
                if (cycle.dir.x !== 0) {
                    newDir.z = Math.random() > 0.5 ? 1 : -1;
                    cycle.dir.x = 0;
                } else {
                    newDir.x = Math.random() > 0.5 ? 1 : -1;
                    cycle.dir.z = 0;
                }
                const testPos = cycle.pos.clone().add(newDir.clone().multiplyScalar(3));
                if (Math.abs(testPos.x - 2.25) <= 18 && Math.abs(testPos.z - 2.25) <= 18) {
                    cycle.dir.copy(newDir);
                }
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    if(controls) controls.update();
    updateLightCycles();
    renderer.render(scene, camera);
}
