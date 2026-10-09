let config = {
    numCount: 6,
    maxTarget: 999,
    solvableTarget: true,
    timerEnabled: true,
    timerSeconds: 45,
    allowUndo: true
};

let gameState = {
    target: 0,
    availableNumbers: [],
    mainValue: null,
    mainOp: null,
    mainLog: "",
    auxValue: null,
    auxOp: null,
    auxLog: "",
    activeTarget: 'main',
    
    historyStack: [],
    timeLeft: 0,
    timerInterval: null,
    distSalida: 50,
    distMinotauro: 20,
    isEvaluating: false,
    gameOver: false
};

const configScreen = document.getElementById('config-screen');
const gameScreen = document.getElementById('game-screen');
const startGameBtn = document.getElementById('start-game-btn');
const timerEnabledCheckbox = document.getElementById('timer-enabled');
const timerDurationGroup = document.getElementById('timer-duration-group');

const coverImage = document.getElementById('cover-image');
const introVideo = document.getElementById('intro-video');

timerEnabledCheckbox.addEventListener('change', (e) => {
    timerDurationGroup.style.display = e.target.checked ? 'flex' : 'none';
});

document.querySelectorAll('input[name="calc-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.activeTarget = e.target.value;
        const labelMain = document.getElementById('label-main');
        const labelAux = document.getElementById('label-aux');
        
        if (gameState.activeTarget === 'main') {
            labelMain.classList.add('active-mode-main');
            labelAux.classList.remove('active-mode-aux');
        } else {
            labelAux.classList.add('active-mode-aux');
            labelMain.classList.remove('active-mode-main');
        }
    });
});

// AL PULSAR ENTRAR AL LABERINTO: REPRODUCIR VÍDEO ANTES DE ARRANCAR
startGameBtn.addEventListener('click', () => {
    config.numCount = parseInt(document.getElementById('num-count').value);
    config.maxTarget = parseInt(document.getElementById('max-target').value);
    config.solvableTarget = document.getElementById('solvable-target').checked;
    config.timerEnabled = timerEnabledCheckbox.checked;
    config.timerSeconds = parseInt(document.getElementById('timer-seconds').value);
    config.allowUndo = document.getElementById('allow-undo').checked;

    document.getElementById('btn-undo').style.display = config.allowUndo ? 'block' : 'none';
    if(!config.allowUndo) {
        document.getElementById('btn-clear').style.gridColumn = 'span 2';
    }

    // Ocultar imagen de portada y mostrar vídeo en su lugar
    coverImage.style.display = 'none';
    introVideo.style.display = 'block';
    startGameBtn.disabled = true;
    startGameBtn.textContent = "Cargando Laberinto...";

    introVideo.play().catch(() => {
        // Si el navegador bloquea el autoplay por políticas, salta directamente al juego
        proceedToGame();
    });

    // Cuando el vídeo termina, arranca el juego automáticamente
    introVideo.onended = () => {
        proceedToGame();
    };
});

function proceedToGame() {
    configScreen.classList.remove('active');
    gameScreen.classList.add('active');
    // Restaurar estado del botón por si se vuelve al menú
    startGameBtn.disabled = false;
    startGameBtn.textContent = "Entrar al Laberinto";
    coverImage.style.display = 'block';
    introVideo.style.display = 'none';
    
    startNewGame();
}

function startNewGame() {
    gameState.distSalida = 50;
    gameState.distMinotauro = 20;
    gameState.gameOver = false;
    document.getElementById('game-over-container').style.display = 'none';
    updateHUD();
    initTurn();
}

document.getElementById('btn-restart').addEventListener('click', () => {
    startNewGame();
});

function initTurn() {
    if (gameState.gameOver) return;
    gameState.isEvaluating = false;
    resetCalculators();
    document.getElementById('result-feedback').textContent = '';

    const minTarget = config.maxTarget === 999 ? 100 : 10;
    const poolPequenos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const poolGrandes = [25, 50, 75, 100];

    let nums = [];
    for (let i = 0; i < config.numCount; i++) {
        let num;
        if (i === 0 && config.numCount >= 6) {
            num = poolGrandes[Math.floor(Math.random() * poolGrandes.length)];
        } else {
            num = poolPequenos[Math.floor(Math.random() * poolPequenos.length)];
        }
        nums.push(num);
    }

    if (config.solvableTarget) {
        gameState.target = generateSolvableTarget(nums, minTarget, config.maxTarget);
    } else {
        gameState.target = Math.floor(Math.random() * (config.maxTarget - minTarget + 1)) + minTarget;
    }

    document.getElementById('target-number').textContent = gameState.target;
    gameState.availableNumbers = nums.map((val, idx) => ({ id: idx, value: val, used: false }));

    updateDisplays();
    renderNumbersGrid();

    if (config.timerEnabled) {
        gameState.timeLeft = config.timerSeconds;
        document.getElementById('timer-display').style.display = 'block';
        document.getElementById('time-left').textContent = gameState.timeLeft;
        
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(() => {
            if (gameState.isEvaluating || gameState.gameOver) return;
            gameState.timeLeft--;
            document.getElementById('time-left').textContent = gameState.timeLeft;
            if (gameState.timeLeft <= 0) {
                clearInterval(gameState.timerInterval);
                handleTimeOut();
            }
        }, 1000);
    } else {
        document.getElementById('timer-display').style.display = 'none';
    }
}

function generateSolvableTarget(numbers, min, max) {
    let pool = [...numbers];
    let current = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    let ops = ['+', '-', '*', '/'];
    let steps = Math.min(3, pool.length);

    for (let i = 0; i < steps; i++) {
        let nextNum = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        let op = ops[Math.floor(Math.random() * ops.length)];
        
        if (op === '+') current += nextNum;
        else if (op === '-') current = Math.max(1, current - nextNum);
        else if (op === '*') current *= nextNum;
        else if (op === '/') {
            if (nextNum > 0 && current % nextNum === 0) current /= nextNum;
            else current += nextNum;
        }
    }

    if (current < min || current > max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return current;
}

function resetCalculators() {
    gameState.mainValue = null;
    gameState.mainOp = null;
    gameState.mainLog = "";
    gameState.auxValue = null;
    gameState.auxOp = null;
    gameState.auxLog = "";
    gameState.historyStack = [];
}

function renderNumbersGrid() {
    const grid = document.getElementById('numbers-grid');
    grid.innerHTML = '';
    
    gameState.availableNumbers.forEach(numObj => {
        const btn = document.createElement('button');
        btn.className = 'btn-num';
        btn.textContent = numObj.value;
        btn.disabled = numObj.used;
        btn.addEventListener('click', () => handleNumberClick(numObj));
        grid.appendChild(btn);
    });
}

const operatorsGrid = document.querySelectorAll('.btn-op');
operatorsGrid.forEach(btn => {
    btn.addEventListener('click', () => {
        handleOperatorClick(btn.dataset.op);
    });
});

function handleNumberClick(numObj) {
    if (gameState.isEvaluating || gameState.gameOver) return;
    const targetBox = gameState.activeTarget;

    gameState.historyStack.push({
        type: 'num',
        box: targetBox,
        numObj: numObj,
        prevMainVal: gameState.mainValue, prevMainOp: gameState.mainOp, prevMainLog: gameState.mainLog,
        prevAuxVal: gameState.auxValue, prevAuxOp: gameState.auxOp, prevAuxLog: gameState.auxLog
    });

    numObj.used = true;

    if (targetBox === 'main') {
        if (gameState.mainValue === null) {
            gameState.mainValue = numObj.value;
            gameState.mainLog = `${numObj.value}`;
        } else if (gameState.mainOp !== null) {
            let res = computeOp(gameState.mainValue, gameState.mainOp, numObj.value);
            if (res === null) { undoLastAction(); return; }
            gameState.mainValue = res;
            gameState.mainLog += ` ${numObj.value}`;
            gameState.mainOp = null;
        } else {
            undoLastAction(); return;
        }
    } else {
        if (gameState.auxValue === null) {
            gameState.auxValue = numObj.value;
            gameState.auxLog = `${numObj.value}`;
        } else if (gameState.auxOp !== null) {
            let res = computeOp(gameState.auxValue, gameState.auxOp, numObj.value);
            if (res === null) { undoLastAction(); return; }
            gameState.auxValue = res;
            gameState.auxLog += ` ${numObj.value}`;
            gameState.auxOp = null;
        } else {
            undoLastAction(); return;
        }
    }

    renderNumbersGrid();
    updateDisplays();
}

function handleOperatorClick(op) {
    if (gameState.isEvaluating || gameState.gameOver) return;

    const targetBox = gameState.activeTarget;
    let currentVal = targetBox === 'main' ? gameState.mainValue : gameState.auxValue;
    if (currentVal === null) return;

    gameState.historyStack.push({
        type: 'op',
        box: targetBox,
        op: op,
        prevMainOp: gameState.mainOp, prevMainLog: gameState.mainLog,
        prevAuxOp: gameState.auxOp, prevAuxLog: gameState.auxLog
    });

    let visualOp = op === '*' ? '×' : op === '/' ? '÷' : op;
    if (targetBox === 'main') {
        gameState.mainOp = op;
        gameState.mainLog += ` ${visualOp}`;
    } else {
        gameState.auxOp = op;
        gameState.auxLog += ` ${visualOp}`;
    }
    updateDisplays();
}

function computeOp(a, op, b) {
    let res = 0;
    if (op === '+') res = a + b;
    else if (op === '-') res = a - b;
    else if (op === '*') res = a * b;
    else if (op === '/') {
        if (b === 0 || a % b !== 0) {
            alert("Operación inválida (división no exacta o entre cero)");
            return null;
        }
        res = a / b;
    }
    return res;
}

document.getElementById('btn-upload-aux').addEventListener('click', () => {
    if (gameState.isEvaluating || gameState.auxValue === null || gameState.gameOver) return;

    if (gameState.mainValue === null) {
        gameState.mainValue = gameState.auxValue;
        gameState.mainLog = `${gameState.auxLog}`;
    } else if (gameState.mainOp !== null) {
        let res = computeOp(gameState.mainValue, gameState.mainOp, gameState.auxValue);
        if (res === null) return;
        
        let cleanBaseLog = gameState.mainLog.split('=')[0].trim();
        gameState.mainLog = `${cleanBaseLog} ${gameState.mainOp === '*' ? '×' : gameState.mainOp === '/' ? '÷' : gameState.mainOp} ${gameState.auxValue}`;
        gameState.mainValue = res;
        gameState.mainOp = null;
    } else {
        alert("Selecciona un operador (+, -, ×, ÷) en el Cuadro Principal antes de subir el valor auxiliar.");
        return;
    }
    
    gameState.auxValue = null;
    gameState.auxOp = null;
    gameState.auxLog = "";

    document.querySelector('input[name="calc-mode"][value="main"]').checked = true;
    gameState.activeTarget = 'main';
    document.getElementById('label-main').classList.add('active-mode-main');
    document.getElementById('label-aux').classList.remove('active-mode-aux');

    updateDisplays();
});

function updateDisplays() {
    const mainDisp = document.getElementById('current-expression');
    const auxDisp = document.getElementById('aux-expression');

    if (gameState.mainLog === "") {
        mainDisp.textContent = 'Selecciona ficha o número...';
    } else {
        let text = gameState.mainLog;
        if (gameState.mainValue !== null && !text.includes('=')) text += ` = [${gameState.mainValue}]`;
        mainDisp.textContent = text;
    }

    if (gameState.auxLog === "") {
        auxDisp.textContent = 'Vacío (usa el selector para operar aquí)';
    } else {
        let text = gameState.auxLog;
        if (gameState.auxValue !== null && !text.includes('=')) text += ` = [${gameState.auxValue}]`;
        auxDisp.textContent = text;
    }
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if (gameState.isEvaluating || gameState.gameOver) return;
    gameState.availableNumbers.forEach(n => n.used = false);
    resetCalculators();
    renderNumbersGrid();
    updateDisplays();
    document.getElementById('result-feedback').textContent = '';
});

function undoLastAction() {
    if (gameState.historyStack.length === 0) return;
    const last = gameState.historyStack.pop();

    if (last.type === 'num') {
        last.numObj.used = false;
        gameState.mainValue = last.prevMainVal;
        gameState.mainOp = last.prevMainOp;
        gameState.mainLog = last.prevMainLog;
        gameState.auxValue = last.prevAuxVal;
        gameState.auxOp = last.prevAuxOp;
        gameState.auxLog = last.prevAuxLog;
    } else if (last.type === 'op') {
        gameState.mainOp = last.prevMainOp;
        gameState.mainLog = last.prevMainLog;
        gameState.auxOp = last.prevAuxOp;
        gameState.auxLog = last.prevAuxLog;
    }
    renderNumbersGrid();
    updateDisplays();
}

if (config.allowUndo) {
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (gameState.isEvaluating || gameState.gameOver) return;
        undoLastAction();
    });
}

document.getElementById('btn-submit').addEventListener('click', () => {
    evaluateFinalResult();
});

function evaluateFinalResult() {
    if (gameState.isEvaluating || gameState.mainValue === null || gameState.gameOver) return;
    gameState.isEvaluating = true;
    if (config.timerEnabled) clearInterval(gameState.timerInterval);

    let resultado = gameState.mainValue;
    let diferencia = Math.abs(resultado - gameState.target);
    let feedback = document.getElementById('result-feedback');

    if (diferencia === 0) {
        gameState.distSalida -= 6;
        feedback.style.color = '#4ade80';
        feedback.textContent = `¡CIFRA EXACTA! (${resultado}). ¡Avanzas 6 metros!`;
    } else if (diferencia <= 5) {
        gameState.distSalida -= 3;
        feedback.style.color = '#4ade80';
        feedback.textContent = `¡Muy cerca! (${resultado}, dif: ${diferencia}). Avanzas 3 metros.`;
    } else if (diferencia <= 15) {
        gameState.distSalida -= 1;
        feedback.style.color = '#fb923c';
        feedback.textContent = `Aproximación moderada (${resultado}, dif: ${diferencia}). Avanzas 1 metro.`;
    } else {
        gameState.distMinotauro -= 3;
        feedback.style.color = '#f87171';
        feedback.textContent = `Demasiado lejos (${resultado}, dif: ${diferencia}). ¡El Minotauro avanza 3 metros!`;
    }

    if (gameState.distSalida < 0) gameState.distSalida = 0;
    if (gameState.distMinotauro < 0) gameState.distMinotauro = 0;
    updateHUD();

    if (gameState.distSalida === 0) {
        feedback.style.color = '#4ade80';
        feedback.textContent = "¡VICTORIA! Has conseguido escapar del laberinto.";
        gameState.gameOver = true;
        document.getElementById('game-over-container').style.display = 'block';
        return;
    }

    if (gameState.distMinotauro === 0) {
        feedback.style.color = '#f87171';
        feedback.textContent = "¡El Minotauro te ha alcanzado!";
        gameState.gameOver = true;
        document.getElementById('game-over-container').style.display = 'block';
        return;
    }

    setTimeout(() => {
        if (!gameState.gameOver) initTurn();
    }, 3000);
}

function handleTimeOut() {
    gameState.isEvaluating = true;
    const feedback = document.getElementById('result-feedback');
    feedback.style.color = '#f87171';
    feedback.textContent = "¡Se acabó el tiempo! El Minotauro avanza 4 metros hacia ti.";
    
    gameState.distMinotauro -= 4;
    if (gameState.distMinotauro < 0) gameState.distMinotauro = 0;
    updateHUD();

    if (gameState.distMinotauro === 0) {
        feedback.textContent = "¡El Minotauro te ha atrapado por tiempo!";
        gameState.gameOver = true;
        document.getElementById('game-over-container').style.display = 'block';
        return;
    }

    setTimeout(() => {
        if (!gameState.gameOver) initTurn();
    }, 3000);
}

function updateHUD() {
    document.getElementById('dist-salida').textContent = gameState.distSalida;
    document.getElementById('dist-minotauro').textContent = gameState.distMinotauro;
}
