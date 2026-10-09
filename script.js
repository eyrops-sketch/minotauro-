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
    currentValue: null,
    pendingOperator: null,
    historyStack: [],
    expressionLog: "",
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
    gameState.currentValue = null;
    gameState.pendingOperator = null;
    gameState.historyStack = [];
    gameState.expressionLog = "";
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

    updateDisplay();
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

    // Guardar estado previo para deshacer
    gameState.historyStack.push({
        type: 'num',
        numObj: numObj,
        prevCurrentValue: gameState.currentValue,
        prevPendingOp: gameState.pendingOperator,
        prevLog: gameState.expressionLog
    });

    numObj.used = true;

    if (gameState.currentValue === null) {
        // Primer número seleccionado
        gameState.currentValue = numObj.value;
        gameState.expressionLog = `${numObj.value}`;
    } else if (gameState.pendingOperator !== null) {
        // Ya había un operador pendiente, aplicar operación acumulativa
        let opSymbol = gameState.pendingOperator;
        let a = gameState.currentValue;
        let b = numObj.value;
        let res = 0;

        if (opSymbol === '+') res = a + b;
        else if (opSymbol === '-') res = a - b;
        else if (opSymbol === '*') res = a * b;
        else if (opSymbol === '/') {
            if (b === 0 || a % b !== 0) {
                alert("Operación inválida (división no exactas o entre cero)");
                numObj.used = false;
                gameState.historyStack.pop();
                return;
            }
            res = a / b;
        }

        gameState.currentValue = res;
        gameState.expressionLog += ` ${opSymbol === '*' ? '×' : opSymbol === '/' ? '÷' : opSymbol} ${b}`;
        gameState.pendingOperator = null;
    } else {
        // Seleccionó número sin operador previo, no permitido en acumulativo estricto
        numObj.used = false;
        gameState.historyStack.pop();
        return;
    }

    renderNumbersGrid();
    updateDisplay();
}

function handleOperatorClick(op) {
    if (gameState.isEvaluating) return;

    if (op === '=') {
        evaluateFinalResult();
        return;
    }

    if (gameState.currentValue === null) return; // No se puede poner operador sin número previo

    gameState.historyStack.push({
        type: 'op',
        op: op,
        prevPendingOp: gameState.pendingOperator,
        prevLog: gameState.expressionLog
    });

    gameState.pendingOperator = op;
    let visualOp = op === '*' ? '×' : op === '/' ? '÷' : op;
    gameState.expressionLog += ` ${visualOp}`;
    updateDisplay();
}

function updateDisplay() {
    const display = document.getElementById('current-expression');
    if (gameState.expressionLog === "") {
        display.textContent = 'Selecciona una ficha numérica...';
    } else {
        let text = gameState.expressionLog;
        if (gameState.currentValue !== null) {
            text += ` = [${gameState.currentValue}]`;
        }
        display.textContent = text;
    }
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if (gameState.isEvaluating) return;
    gameState.availableNumbers.forEach(n => n.used = false);
    gameState.currentValue = null;
    gameState.pendingOperator = null;
    gameState.historyStack = [];
    gameState.expressionLog = "";
    renderNumbersGrid();
    updateDisplay();
    document.getElementById('result-feedback').textContent = '';
});

if (config.allowUndo) {
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (gameState.isEvaluating || gameState.historyStack.length === 0) return;
        const lastAction = gameState.historyStack.pop();

        if (lastAction.type === 'num') {
            lastAction.numObj.used = false;
            gameState.currentValue = lastAction.prevCurrentValue;
            gameState.pendingOperator = lastAction.prevPendingOp;
            gameState.expressionLog = lastAction.prevLog;
        } else if (lastAction.type === 'op') {
            gameState.pendingOperator = lastAction.prevPendingOp;
            gameState.expressionLog = lastAction.prevLog;
        }

        renderNumbersGrid();
        updateDisplay();
    });
}

document.getElementById('btn-submit').addEventListener('click', () => {
    evaluateFinalResult();
});

function evaluateFinalResult() {
    if (gameState.isEvaluating || gameState.currentValue === null) return;
    gameState.isEvaluating = true;
    if (config.timerEnabled) clearInterval(gameState.timerInterval);

    let resultado = gameState.currentValue;
    let diferencia = Math.abs(resultado - gameState.target);
    let feedback = document.getElementById('result-feedback');

    if (diferencia === 0) {
        gameState.distSalida -= 6;
        feedback.style.color = '#00b37e';
        feedback.textContent = `¡CIFRA EXACTA! (${resultado}). ¡Avanzas 6 metros hacia la salida!`;
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

    // Avanzar de turno a los 3 segundos de forma infalible aciertes o falles
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
