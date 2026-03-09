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
    
    // Evaluate Difficulty
    // Currently, all difficulties fall back to random until Minimax is fully implemented. 
    // This is where 'easy/normal/hard/extreme/impossible' logic goes.
    
    let available = [];
    scene.children.forEach(obj => {
        if (obj.userData && obj.userData.owner === 0 && obj.geometry instanceof THREE.BoxGeometry) available.push(obj);
    });

    if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        makeMove(pick, 2);
        if (!checkWin(2)) {
            currentPlayer = 1;
            document.getElementById('status').innerText = 'Player 1 Turn';
        } else {
            triggerGameOver(2);
        }
    }
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
