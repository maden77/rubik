// Game State
let cubeSize = 3;
let cube = {};
let isSoundOn = true;
let audioContext;
let selectedFace = null;
let selectedColor = '#00ff00';
let isDarkTheme = false;
let startTime = 0;
let timerInterval = null;
let moveCount = 0;
let score = 0;
let bestTime = localStorage.getItem('bestTime') || null;
let bestMoves = localStorage.getItem('bestMoves') || null;

// Initialize the game
function initGame() {
    createCube();
    setupEventListeners();
    initAudioContext();
    updateStatsDisplay();
    loadPreferences();
    
    // Initialize timer display
    updateTimerDisplay();
}

// Create cube based on selected size
function createCube() {
    const cubeContainer = document.getElementById('cube-container');
    cubeContainer.innerHTML = '';
    
    // Reset game stats
    resetGameStats();
    
    // Create cube faces
    const cubeElement = document.createElement('div');
    cubeElement.className = 'cube';
    cubeElement.id = 'cube';
    
    const facePositions = [
        { name: 'front', rotation: 'rotateY(0deg)', color: 'green' },
        { name: 'back', rotation: 'rotateY(180deg)', color: 'blue' },
        { name: 'right', rotation: 'rotateY(90deg)', color: 'red' },
        { name: 'left', rotation: 'rotateY(-90deg)', color: 'orange' },
        { name: 'top', rotation: 'rotateX(90deg)', color: 'white' },
        { name: 'bottom', rotation: 'rotateX(-90deg)', color: 'yellow' }
    ];
    
    const cubeWidth = cubeSize * 30;
    const cubeHeight = cubeSize * 30;
    const cubeDepth = cubeSize * 30;
    
    cubeElement.style.width = `${cubeWidth}px`;
    cubeElement.style.height = `${cubeHeight}px`;
    
    // Initialize cube state
    cube = {
        size: cubeSize,
        faces: {}
    };
    
    facePositions.forEach(pos => {
        const face = document.createElement('div');
        face.className = 'face';
        face.id = pos.name;
        face.dataset.face = pos.name;
        
        face.style.width = `${cubeWidth}px`;
        face.style.height = `${cubeHeight}px`;
        face.style.transform = `${pos.rotation} translateZ(${cubeDepth/2}px)`;
        face.style.gridTemplateColumns = `repeat(${cubeSize}, 1fr)`;
        face.style.gridTemplateRows = `repeat(${cubeSize}, 1fr)`;
        
        // Initialize face colors
        cube.faces[pos.name] = Array(cubeSize).fill().map(() => Array(cubeSize).fill(''));
        
        for (let i = 0; i < cubeSize; i++) {
            for (let j = 0; j < cubeSize; j++) {
                const sticker = document.createElement('div');
                sticker.className = 'sticker';
                sticker.dataset.face = pos.name;
                sticker.dataset.row = i;
                sticker.dataset.col = j;
                
                // Set default colors
                sticker.style.backgroundColor = pos.color;
                cube.faces[pos.name][i][j] = pos.color;
                
                // Add click event for color changing
                sticker.addEventListener('click', (e) => {
                    if (selectedFace) {
                        changeStickerColor(pos.name, i, j);
                        e.stopPropagation();
                    }
                });
                
                face.appendChild(sticker);
            }
        }
        
        // Add face selection
        face.addEventListener('click', () => {
            selectFace(pos.name);
        });
        
        cubeElement.appendChild(face);
    });
    
    cubeContainer.appendChild(cubeElement);
    
    // Enable drag rotation for 3D effect
    enableDragRotation(cubeElement);
    
    // Enable keyboard controls
    enableKeyboardControls();
}

// Setup event listeners
function setupEventListeners() {
    // Level selector
    document.getElementById('level').addEventListener('change', function() {
        cubeSize = parseInt(this.value);
        createCube();
        playSound('click');
    });
    
    // Game controls
    document.getElementById('shuffle').addEventListener('click', function() {
        shuffleCube();
        playSound('shuffle');
    });
    
    document.getElementById('solve').addEventListener('click', function() {
        solveCube();
        playSound('solve');
    });
    
    document.getElementById('hint').addEventListener('click', function() {
        showHint();
        playSound('click');
    });
    
    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', function() {
        isSoundOn = !isSoundOn;
        this.textContent = `Suara: ${isSoundOn ? 'ON' : 'OFF'}`;
        localStorage.setItem('soundPreference', isSoundOn);
        playSound('click');
    });
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', function() {
        isDarkTheme = !isDarkTheme;
        document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
        this.textContent = `Tema: ${isDarkTheme ? 'Gelap' : 'Terang'}`;
        localStorage.setItem('themePreference', isDarkTheme);
        playSound('click');
    });
    
    // 3D rotation controls
    document.getElementById('rotate-up').addEventListener('click', () => rotateCube('up'));
    document.getElementById('rotate-down').addEventListener('click', () => rotateCube('down'));
    document.getElementById('rotate-left').addEventListener('click', () => rotateCube('left'));
    document.getElementById('rotate-right').addEventListener('click', () => rotateCube('right'));
    document.getElementById('rotate-reset').addEventListener('click', () => rotateCube('reset'));
    
    // Color selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedFace = this.dataset.face;
            playSound('click');
        });
    });
    
    // Color picker
    document.getElementById('color-picker').addEventListener('input', function() {
        selectedColor = this.value;
    });
    
    // Tutorial
    document.getElementById('show-tutorial').addEventListener('click', function() {
        document.getElementById('tutorial').classList.remove('hidden');
        playSound('click');
    });
    
    document.getElementById('close-tutorial').addEventListener('click', function() {
        document.getElementById('tutorial').classList.add('hidden');
        playSound('click');
    });
}

// Audio functions
function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API not supported');
    }
}

function playSound(type) {
    if (!isSoundOn) return;
    
    const soundMap = {
        'move': document.getElementById('move-sound'),
        'shuffle': document.getElementById('shuffle-sound'),
        'solve': document.getElementById('solve-sound'),
        'click': document.getElementById('click-sound'),
        'complete': document.getElementById('complete-sound'),
        'error': document.getElementById('error-sound')
    };
    
    const sound = soundMap[type];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Cube manipulation functions
function shuffleCube() {
    resetGameStats();
    startTimer();
    
    const moves = 20 + cubeSize * 5; // More moves for bigger cubes
    
    // Disable controls during shuffle
    document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
    
    let i = 0;
    const shuffleInterval = setInterval(() => {
        if (i >= moves) {
            clearInterval(shuffleInterval);
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);
            return;
        }
        
        const face = ['front', 'back', 'right', 'left', 'top', 'bottom'][Math.floor(Math.random() * 6)];
        const rowCol = Math.floor(Math.random() * cubeSize);
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        rotateSlice(face, rowCol, direction);
        i++;
    }, 100);
}

function rotateSlice(face, index, direction) {
    // Visual rotation animation
    const cubeElement = document.getElementById('cube');
    let transform = '';
    
    if (face === 'front' || face === 'back') {
        const axis = face === 'front' ? 'Y' : 'Y';
        transform = `rotate${axis}(${direction * 90}deg)`;
    } else if (face === 'right' || face === 'left') {
        const axis = face === 'right' ? 'X' : 'X';
        transform = `rotate${axis}(${direction * 90}deg)`;
    } else if (face === 'top' || face === 'bottom') {
        const axis = face === 'top' ? 'Z' : 'Z';
        transform = `rotate${axis}(${direction * 90}deg)`;
    }
    
    cubeElement.style.transform = `rotateX(-20deg) rotateY(-30deg) ${transform}`;
    
    // Update cube state after animation
    setTimeout(() => {
        updateCubeState(face, index, direction);
        cubeElement.style.transform = 'rotateX(-20deg) rotateY(-30deg)';
        
        // Update move count
        moveCount++;
        document.getElementById('moves').textContent = `${moveCount} moves`;
        
        // Check if solved
        if (isCubeSolved()) {
            cubeSolved();
        }
    }, 300);
    
    playSound('move');
}

function updateCubeState(face, index, direction) {
    // This is a simplified implementation - actual cube rotation logic is complex
    // For a real Rubik's cube, you'd need to update all affected faces
    
    // For demonstration, we'll just rotate the stickers on the selected face
    const faceData = cube.faces[face];
    const newFace = Array(cubeSize).fill().map(() => Array(cubeSize).fill(''));
    
    if (direction === 1) { // Clockwise
        for (let i = 0; i < cubeSize; i++) {
            for (let j = 0; j < cubeSize; j++) {
                newFace[j][cubeSize - 1 - i] = faceData[i][j];
            }
        }
    } else { // Counter-clockwise
        for (let i = 0; i < cubeSize; i++) {
            for (let j = 0; j < cubeSize; j++) {
                newFace[cubeSize - 1 - j][i] = faceData[i][j];
            }
        }
    }
    
    cube.faces[face] = newFace;
    
    // Update the stickers visually
    const faceElement = document.getElementById(face);
    const stickers = faceElement.querySelectorAll('.sticker');
    
    stickers.forEach(sticker => {
        const row = parseInt(sticker.dataset.row);
        const col = parseInt(sticker.dataset.col);
        sticker.style.backgroundColor = newFace[row][col];
    });
}

function solveCube() {
    stopTimer();
    
    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    const defaultColors = {
        'front': 'green',
        'back': 'blue',
        'right': 'red',
        'left': 'orange',
        'top': 'white',
        'bottom': 'yellow'
    };
    
    faces.forEach(face => {
        const faceElement = document.getElementById(face);
        const stickers = faceElement.querySelectorAll('.sticker');
        
        stickers.forEach(sticker => {
            const row = parseInt(sticker.dataset.row);
            const col = parseInt(sticker.dataset.col);
            const color = defaultColors[face];
            
            sticker.style.backgroundColor = color;
            cube.faces[face][row][col] = color;
        });
    });
    
    // Celebrate
    const cubeElement = document.getElementById('cube');
    cubeElement.classList.add('solved');
    playSound('complete');
    
    setTimeout(() => {
        cubeElement.classList.remove('solved');
    }, 2000);
}

function showHint() {
    // Find a face that's not all the same color
    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    let hintFace = null;
    
    for (const face of faces) {
        const firstColor = cube.faces[face][0][0];
        let allSame = true;
        
        for (let i = 0; i < cubeSize; i++) {
            for (let j = 0; j < cubeSize; j++) {
                if (cube.faces[face][i][j] !== firstColor) {
                    allSame = false;
                    break;
                }
            }
            if (!allSame) break;
        }
        
        if (!allSame) {
            hintFace = face;
            break;
        }
    }
    
    if (hintFace) {
        alert(`Coba fokus pada sisi ${hintFace} dan coba samakan warnanya!`);
    } else {
        alert("Kubus sudah terselesaikan!");
    }
}

function isCubeSolved() {
    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    
    for (const face of faces) {
        const firstColor = cube.faces[face][0][0];
        
        for (let i = 0; i < cubeSize; i++) {
            for (let j = 0; j < cubeSize; j++) {
                if (cube.faces[face][i][j] !== firstColor) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

function cubeSolved() {
    stopTimer();
    playSound('complete');
    
    // Calculate score
    const timeInSeconds = Math.floor((Date.now() - startTime) / 1000);
    score = Math.max(1, 10000 - (timeInSeconds * 10 + moveCount * 5));
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Update best records
    if (!bestTime || timeInSeconds < bestTime) {
        bestTime = timeInSeconds;
        localStorage.setItem('bestTime', bestTime);
    }
    
    if (!bestMoves || moveCount < bestMoves) {
        bestMoves = moveCount;
        localStorage.setItem('bestMoves', bestMoves);
    }
    
    updateStatsDisplay();
    
    // Celebrate
    const cubeElement = document.getElementById('cube');
    cubeElement.classList.add('solved');
    
    setTimeout(() => {
        cubeElement.classList.remove('solved');
    }, 2000);
}

// 3D rotation functions
function enableDragRotation(cubeElement) {
    let isDragging = false;
    let startX, startY;
    let rotateX = -20, rotateY = -30;
    
    cubeElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    cubeElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        playSound('click');
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;
        
        cubeElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        startX = e.clientX;
        startY = e.clientY;
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Touch support
    cubeElement.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        playSound('click');
        e.preventDefault();
    });
    
    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;
        
        cubeElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        e.preventDefault();
    });
    
    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function rotateCube(direction) {
    const cubeElement = document.getElementById('cube');
    const currentTransform = cubeElement.style.transform;
    let rotateX = -20, rotateY = -30;
    
    // Extract current rotation values
    const matches = currentTransform.match(/rotateX\(([-\d.]+)deg\).*rotateY\(([-\d.]+)deg\)/);
    if (matches && matches.length >= 3) {
        rotateX = parseFloat(matches[1]);
        rotateY = parseFloat(matches[2]);
    }
    
    switch (direction) {
        case 'up':
            rotateX = (rotateX - 15) % 360;
            break;
        case 'down':
            rotateX = (rotateX + 15) % 360;
            break;
        case 'left':
            rotateY = (rotateY - 15) % 360;
            break;
        case 'right':
            rotateY = (rotateY + 15) % 360;
            break;
        case 'reset':
            rotateX = -20;
            rotateY = -30;
            break;
    }
    
    cubeElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    playSound('click');
}

// Color customization
function selectFace(face) {
    if (!selectedFace) return;
    
    const faceElement = document.getElementById(face);
    const stickers = faceElement.querySelectorAll('.sticker');
    
    stickers.forEach(sticker => {
        const row = parseInt(sticker.dataset.row);
        const col = parseInt(sticker.dataset.col);
        
        sticker.style.backgroundColor = selectedColor;
        cube.faces[face][row][col] = selectedColor;
    });
    
    playSound('click');
}

function changeStickerColor(face, row, col) {
    const sticker = document.querySelector(`.sticker[data-face="${face}"][data-row="${row}"][data-col="${col}"]`);
    sticker.style.backgroundColor = selectedColor;
    cube.faces[face][row][col] = selectedColor;
    playSound('click');
}

// Keyboard controls
function enableKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        const key = e.key.toUpperCase();
        const shift = e.shiftKey;
        
        // Face rotations
        const faceMap = {
            'F': 'front',
            'B': 'back',
            'R': 'right',
            'L': 'left',
            'U': 'top',
            'D': 'bottom'
        };
        
        if (faceMap[key]) {
            const face = faceMap[key];
            const direction = shift ? -1 : 1;
            const rowCol = Math.floor(cubeSize / 2); // Middle layer for odd, or edge for even
            
            rotateSlice(face, rowCol, direction);
            e.preventDefault();
        }
    });
}

// Timer functions
function startTimer() {
    startTime = Date.now();
    moveCount = 0;
    score = 0;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetGameStats() {
    stopTimer();
    moveCount = 0;
    score = 0;
    document.getElementById('moves').textContent = '0 moves';
    document.getElementById('score').textContent = 'Score: 0';
}

function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Stats and preferences
function updateStatsDisplay() {
    if (bestTime) {
        const hours = Math.floor(bestTime / 3600);
        const minutes = Math.floor((bestTime % 3600) / 60);
        const seconds = bestTime % 60;
        
        document.getElementById('best-time').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    document.getElementById('best-moves').textContent = bestMoves || '-';
}

function loadPreferences() {
    // Sound preference
    const soundPref = localStorage.getItem('soundPrefer