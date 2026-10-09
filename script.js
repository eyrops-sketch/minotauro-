// Estado global del juego parametrizable
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
    expressionTokens: [],
    timeLeft: 0,
    timerInterval: null,
    distSalida: 50,
    distMinotauro: 20,
    isEvaluating: false
};

// Elementos del DOM
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

    // Inicializar distancias de la partida
    gameState.distSalida = 50;
    gameState.distMinotauro = 20;
    updateHUD();

    configScreen.classList.remove('active');
    gameScreen.classList.add('active');

    initTurn();
});

function initTurn() {
    gameState.isEvaluating = false;
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

    gameState.expressionTokens = [];
    updateExpressionDisplay();
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
        btn.addEventListener('click', () => selectNumber(numObj));
        grid.appendChild(btn);
    });
}

const operatorsGrid = document.querySelectorAll('.btn-op');
operatorsGrid.forEach(btn => {
    btn.addEventListener('click', () => {
        selectOperator(btn.dataset.op);
    });
});

function selectNumber(numObj) {
    if (gameState.isEvaluating) return;
    numObj.used = true;
    gameState.expressionTokens.push({ type: 'num', value: numObj.value, id: numObj.id });
    renderNumbersGrid();
    updateExpressionDisplay();
}

function selectOperator(op) {
    if (gameState.isEvaluating) return;
    const last = gameState.expressionTokens[gameState.expressionTokens.length - 1];
    if (!last || last.type === 'op') return;

    gameState.expressionTokens.push({ type: 'op', value: op });
    updateExpressionDisplay();
}

function updateExpressionDisplay() {
    const display = document.getElementById('current-expression');
    if (gameState.expressionTokens.length === 0) {
        display.textContent = 'Selecciona números y operaciones...';
        return;
    }
    
    let text = gameState.expressionTokens.map(t => {
        if (t.value === '*') return '×';
        if (t.value === '/') return '÷';
        return t.value;
    }).join(' ');

    display.textContent = text;
}

document.getElementById('btn-clear').addEventListener('click', () => {
    if (gameState.isEvaluating) return;
    gameState.availableNumbers.forEach(n => n.used = false);
    gameState.expressionTokens = [];
    renderNumbersGrid();
    updateExpressionDisplay();
    document.getElementById('result-feedback').textContent = '';
});

if (config.allowUndo) {
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (gameState.isEvaluating || gameState.expressionTokens.length === 0) return;
        const lastToken = gameState.expressionTokens.pop();
        
        if (lastToken.type === 'num') {
            const numObj = gameState.availableNumbers.find(n => n.id === lastToken.id);
            if (numObj) numObj.used = false;
        }
        renderNumbersGrid();
        updateExpressionDisplay();
    });
}

document.getElementById('btn-submit').addEventListener('click', () => {
    evaluateExpression();
});

function evaluateExpression() {
    if (gameState.isEvaluating || gameState.expressionTokens.length === 0) return;
    gameState.isEvaluating = true;
    if (config.timerEnabled) clearInterval(gameState.timerInterval);

    let exprString = gameState.expressionTokens.map(t => t.value).join(' ');

    try {
        let resultado = eval(exprString);
        
        if (isNaN(resultado) || !isFinite(resultado)) {
            throw new Error("Operación inválida");
        }

        let diferencia = Math.abs(resultado - gameState.target);
        let feedback = document.getElementById('result-feedback');

        // Lógica de movimiento según aproximación
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
            feedback.textContent = `Demasiado lejos (${resultado}, dif: ${diferencia}). ¡El Minotauro acorta 3 metros!`;
        }

        // Asegurar límites lógicos
        if (gameState.distSalida < 0) gameState.distSalida = 0;
        if (gameState.distMinotauro < 0) gameState.distMinotauro = 0;
        updateHUD();

        // Comprobar fin de partida
        if (gameState.distSalida === 0) {
            feedback.style.color = '#00b37e';
            feedback.textContent = "¡VICTORIA! Has conseguido escapar del laberinto.";
            return; // Fin del juego
        }

        if (gameState.distMinotauro === 0) {
            feedback.style.color = '#f75a68';
            feedback.textContent = "¡El Minotauro te ha alcanzado! (Aquí se activará el combate táctico)";
            return; // Fin o inicio de combate
        }

        // Continuar al siguiente turno tras 3 segundos
        setTimeout(() => {
            initTurn();
        }, 3000);

    } catch (e) {
        gameState.isEvaluating = false;
        if (config.timerEnabled) {
            // Reactivar cronómetro si da error de expresión
            // (Opcional según prefieras)
        }
        document.getElementById('result-feedback').style.color = '#f75a68';
        document.getElementById('result-feedback').textContent = "Expresión matemática incorrecta o incompleta.";
    }
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
        feedback.textContent = "¡El Minotauro te ha atrapado por agotamiento del tiempo!";
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
