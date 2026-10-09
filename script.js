let config = {
    numCount: 6,
    maxTarget: 999,
    timerEnabled: true,
    timerSeconds: 45,
    allowUndo: true
};

let gameState = {
    target: 0,
    availableNumbers: [],
    // Estado cuadro Principal
    mainValue: null,
    mainOp: null,
    mainLog: "",
    // Estado cuadro Auxiliar
    auxValue: null,
    auxOp: null,
    auxLog: "",
    // Selección activa ('main' o 'aux')
    activeTarget: 'main',
    
    historyStack: [],
    timeLeft: 0,
    timerInterval: null,
    distSalida: 50,
    distMinotauro: 20,
    isEvaluating: false
};

const configScreen = document.getElementById('config-screen');
const gameScreen = document.getElementById('game-screen');
const startGameBtn = document.getElementById('start-game-btn');
const timerEnabledCheckbox = document.getElementById('timer-enabled');
const timerDurationGroup = document.getElementById('timer-duration-group');

timerEnabledCheckbox.addEventListener('change', (e) => {
    timerDurationGroup.style.display = e.target.checked ? 'flex' : 'none';
});

// Selector de opción (Radio buttons)
document.querySelectorAll('input[name="calc-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.activeTarget = e.target.value;
    });
});

startGameBtn.addEventListener('click', () => {
    config.numCount = parseInt(document.getElementById('num-count').value);
    config.maxTarget = parseInt(document.getElementById('max-target').value);
    config.timerEnabled = timerEnabledCheckbox.checked;
    config.timerSeconds = parseInt(document.getElementById('timer-seconds').value);
    config.allowUndo = document.getElementById('allow-undo').checked;

    document.getElementById('btn-undo').style.display = config.allowUndo ? 'block' : 'none';
    if(!config.allowUndo) {
        document.getElementById('btn-clear').style.gridColumn = 'span 2';
    }

    gameState.distSalida = 50;
    gameState.distMinotauro = 20;
    updateHUD();

    configScreen.classList.remove('active');
    gameScreen.classList.add('active');

    initTurn();
});

function initTurn() {
    gameState.isEvaluating = false;
    resetCalculators();
    document.getElementById('result-feedback').textContent = '';

    const minTarget = config.maxTarget === 999 ? 100 : 10;
    gameState.target = Math.floor(Math.random() * (config.maxTarget - minTarget + 1)) + minTarget;
    document.getElementById('target-number').textContent = gameState.target;

    gameState.availableNumbers = [];
    const poolPequenos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const poolGrandes = [25, 50, 75, 100];

    for (let i = 0; i < config.numCount; i++) {
        let num;
        if (i === 0 && config.numCount >= 6) {
            num = poolGrandes[Math.floor(Math.random() * poolGrandes.length)];
        } else {
            num = poolPequenos[Math.floor(Math.random() * poolPequenos.length)];
        }
        gameState.availableNumbers.push({ id: i, value: num, used: false });
    }

    updateDisplays();
    renderNumbersGrid();

    if (config.timerEnabled) {
        gameState.timeLeft = config.timerSeconds;
        document.getElementById('timer-display').style.display = 'block';
        document.getElementById('time-left').textContent = gameState.timeLeft;
        
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(() => {
            if (gameState.isEvaluating) return;
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
    if (gameState.isEvaluating) return;
    const targetBox = gameState.activeTarget; // 'main' o 'aux'

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
            gameState.mainLog += ` ${gameState.mainOp === '*' ? '×' : gameState.mainOp === '/' ? '÷' : gameState.mainOp} ${numObj.value}`;
            gameState.mainOp = null;
        } else {
            undoLastAction(); return;
        }
    } else {
        // Auxiliar
        if (gameState.auxValue === null) {
            gameState.auxValue = numObj.value;
            gameState.auxLog = `${numObj.value}`;
        } else if (gameState.auxOp !== null) {
            let res = computeOp(gameState.auxValue, gameState.auxOp, numObj.value);
            if (res === null) { undoLastAction(); return; }
            gameState.auxValue = res;
            gameState.auxLog += ` ${gameState.auxOp === '*' ? '×' : gameState.auxOp === '/' ? '÷' : gameState.auxOp} ${numObj.value}`;
            gameState.auxOp = null;
        } else {
            undoLastAction(); return;
        }
    }

    renderNumbersGrid();
    updateDisplays();
}

function handleOperatorClick(op) {
    if (gameState.isEvaluating) return;
    if (op === '=') { evaluateFinalResult(); return; }

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

// BOTÓN SUBIR AUXILIAR AL PRINCIPAL
document.getElementById('btn-upload-aux').addEventListener('click', () => {
    if (gameState.isEvaluating || gameState.auxValue === null) return;
    
    // Al subir el auxiliar al principal, el valor calculado del auxiliar se convierte en la base del principal
    gameState.mainValue = gameState.auxValue;
    gameState.mainLog = `(${gameState.auxLog})`;
    gameState.mainOp = null;
    
    // Limpiar auxiliar tras subirlo
    gameState.auxValue = null;
    gameState.auxOp = null;
    gameState.auxLog = "";

    // Cambiar automáticamente la selección activa al Principal
    document.querySelector('input[name="calc-mode"][value="main"]').checked = true;
    gameState.activeTarget = 'main';

    updateDisplays();
});

function updateDisplays() {
    const mainDisp = document.getElementById('current-expression');
    const auxDisp = document.getElementById('aux-expression');

    if (gameState.mainLog === "") {
        mainDisp.textContent = 'Selecciona ficha o número...';
    } else {
        let text = gameState.mainLog;
        if (gameState.mainValue !== null) text += ` = [${gameState.mainValue}]`;
        mainDisp.textContent = text;
    }

    if (gameState.auxLog === "") {
        auxDisp.textContent = 'Vacío (usa el selector para operar aquí)';
    } else {
        let text = gameState.auxLog;
        if (gameState.auxValue !== null) text += ` = [${gameState.auxValue}]`;
        auxDisp.textContent = text;
    }
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if (gameState.isEvaluating) return;
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
        if (gameState.isEvaluating) return;
        undoLastAction();
    });
}

document.getElementById('btn-submit').addEventListener('click', () => {
    evaluateFinalResult();
});

function evaluateFinalResult() {
    if (gameState.isEvaluating || gameState.mainValue === null) return;
    gameState.isEvaluating = true;
    if (config.timerEnabled) clearInterval(gameState.timerInterval);

    let resultado = gameState.mainValue;
    let diferencia = Math.abs(resultado - gameState.target);
    let feedback = document.getElementById('result-feedback');

    if (diferencia === 0) {
        gameState.distSalida -= 6;
        feedback.style.color = '#00b37e';
        feedback.textContent = `¡CIFRA EXACTA! (${resultado}). ¡Avanzas 6 metros!`;
    } else if (diferencia <= 5) {
        gameState.distSalida -= 3;
        feedback.style.color = '#00b37e';
        feedback.textContent = `¡Muy cerca! (${resultado}, dif: ${diferencia}). Avanzas 3 metros.`;
    } else if (diferencia <= 15) {
        gameState.distSalida -= 1;
        feedback.style.color = '#fba94c';
        feedback.textContent = `Aproximación moderada (${resultado}, dif: ${diferencia}). Avanzas 1 metro.`;
    } else {
        gameState.distMinotauro -= 3;
        feedback.style.color = '#f75a68';
        feedback.textContent = `Demasiado lejos (${resultado}, dif: ${diferencia}). ¡El Minotauro avanza 3 metros!`;
    }

    if (gameState.distSalida < 0) gameState.distSalida = 0;
    if (gameState.distMinotauro < 0) gameState.distMinotauro = 0;
    updateHUD();

    if (gameState.distSalida === 0) {
        feedback.style.color = '#00b37e';
        feedback.textContent = "¡VICTORIA! Has conseguido escapar del laberinto.";
        return;
    }

    if (gameState.distMinotauro === 0) {
        feedback.style.color = '#f75a68';
        feedback.textContent = "¡El Minotauro te ha alcanzado!";
        return;
    }

    setTimeout(() => {
        initTurn();
    }, 3000);
}

function handleTimeOut() {
    gameState.isEvaluating = true;
    const feedback = document.getElementById('result-feedback');
    feedback.style.color = '#f75a68';
    feedback.textContent = "¡Se acabó el tiempo! El Minotauro avanza 4 metros hacia ti.";
    
    gameState.distMinotauro -= 4;
    if (gameState.distMinotauro < 0) gameState.distMinotauro = 0;
    updateHUD();

    if (gameState.distMinotauro === 0) {
        feedback.textContent = "¡El Minotauro te ha atrapado por tiempo!";
        return;
    }

    setTimeout(() => {
        initTurn();
    }, 3000);
}

function updateHUD() {
    document.getElementById('dist-salida').textContent = gameState.distSalida;
    document.getElementById('dist-minotauro').textContent = gameState.distMinotauro;
}
