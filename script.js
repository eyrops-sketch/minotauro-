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
    expressionTokens: [], // Almacena los pasos para poder deshacer
    timeLeft: 0,
    timerInterval: null
};

// Elementos del DOM
const configScreen = document.getElementById('config-screen');
const gameScreen = document.getElementById('game-screen');
const startGameBtn = document.getElementById('start-game-btn');
const timerEnabledCheckbox = document.getElementById('timer-enabled');
const timerDurationGroup = document.getElementById('timer-duration-group');

// Control visual del checkbox de tiempo
timerEnabledCheckbox.addEventListener('change', (e) => {
    timerDurationGroup.style.display = e.target.checked ? 'flex' : 'none';
});

startGameBtn.addEventListener('click', () => {
    // Leer configuración de la interfaz
    config.numCount = parseInt(document.getElementById('num-count').value);
    config.maxTarget = parseInt(document.getElementById('max-target').value);
    config.timerEnabled = timerEnabledCheckbox.checked;
    config.timerSeconds = parseInt(document.getElementById('timer-seconds').value);
    config.allowUndo = document.getElementById('allow-undo').checked;

    // Configurar visibilidad de botones según opciones
    document.getElementById('btn-undo').style.display = config.allowUndo ? 'block' : 'none';
    if(!config.allowUndo) {
        document.getElementById('btn-clear').style.gridColumn = 'span 2';
    }

    // Cambiar pantalla
    configScreen.classList.remove('active');
    gameScreen.classList.add('active');

    initTurn();
});

function initTurn() {
    // Generar número objetivo aleatorio según rango
    const minTarget = config.maxTarget === 999 ? 100 : 10;
    gameState.target = Math.floor(Math.random() * (config.maxTarget - minTarget + 1)) + minTarget;
    document.getElementById('target-number').textContent = gameState.target;

    // Generar números aleatorios base (mezcla de pequeños y grandes estilo Cifras)
    gameState.availableNumbers = [];
    const poolPequenos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const poolGrandes = [25, 50, 75, 100];

    for (let i = 0; i < config.numCount; i++) {
        // Asegurar al menos un grande si hay suficientes huecos, o aleatorio puro
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

    // Iniciar cronómetro si está activo
    if (config.timerEnabled) {
        gameState.timeLeft = config.timerSeconds;
        document.getElementById('timer-display').style.display = 'block';
        document.getElementById('time-left').textContent = gameState.timeLeft;
        
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(() => {
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

// Controladores de interacción matemática
const operatorsGrid = document.querySelectorAll('.btn-op');
operatorsGrid.forEach(btn => {
    btn.addEventListener('click', () => {
        selectOperator(btn.dataset.op);
    });
});

function selectNumber(numObj) {
    numObj.used = true;
    gameState.expressionTokens.push({ type: 'num', value: numObj.value, id: numObj.id });
    renderNumbersGrid();
    updateExpressionDisplay();
}

function selectOperator(op) {
    // Evitar poner operador si el último token ya es un operador o está vacío
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

// Botones de acción
document.getElementById('btn-clear').addEventListener('click', () => {
    gameState.availableNumbers.forEach(n => n.used = false);
    gameState.expressionTokens = [];
    renderNumbersGrid();
    updateExpressionDisplay();
    document.getElementById('result-feedback').textContent = '';
});

if (config.allowUndo) {
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (gameState.expressionTokens.length === 0) return;
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
    if (gameState.expressionTokens.length === 0) return;

    // Convertir los tokens a una cadena ejecutable de JS de manera segura básica
    let exprString = gameState.expressionTokens.map(t => t.value).join(' ');

    try {
        // Evaluador matemático simple
        let resultado = eval(exprString);
        
        if (isNaN(resultado) || !isFinite(resultado)) {
            throw new Error("Operación inválida");
        }

        let diferencia = Math.abs(resultado - gameState.target);
        let feedback = document.getElementById('result-feedback');

        if (diferencia === 0) {
            feedback.style.color = '#00b37e';
            feedback.textContent = `¡CIFRA EXACTA! (${resultado}). ¡Avanzas con bonificación máxima!`;
        } else {
            feedback.style.color = '#fba94c';
            feedback.textContent = `Resultado: ${resultado}. Te has quedado a una distancia de ${diferencia}.`;
        }

        if (config.timerEnabled) clearInterval(gameState.timerInterval);

    } catch (e) {
        document.getElementById('result-feedback').style.color = '#f75a68';
        document.getElementById('result-feedback').textContent = "Expresión matemática incorrecta o incompleta.";
    }
}

function handleTimeOut() {
    const feedback = document.getElementById('result-feedback');
    feedback.style.color = '#f75a68';
    feedback.textContent = "¡Se acabó el tiempo! El Minotauro aprovecha tu duda y avanza hacia ti.";
    // Aquí luego conectaremos el movimiento del Minotauro
}

