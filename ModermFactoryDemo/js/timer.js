let isTimerRunning = false;
let startTime = 0;
let timerInterval = null;
let itemTimers = {};

// 初始化计时器
function initTimer() {
    document.getElementById('reset-btn').addEventListener('click', resetTimer);
}

// 开始主计时器
function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    startTime = Date.now();
    
    timerInterval = setInterval(updateTimer, 10);
    updateTimer();
}

// 开始单个物品计时
function startItemTimer(itemId) {
    itemTimers[itemId] = Date.now();
}

// 结束单个物品计时
function endItemTimer(itemId) {
    if (itemTimers[itemId]) {
        const elapsed = (Date.now() - itemTimers[itemId]) / 1000;
        delete itemTimers[itemId];
        return elapsed;
    }
    return 0;
}

// 更新计时器显示
function updateTimer() {
    const elapsed = (Date.now() - startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const milliseconds = Math.floor((elapsed % 1) * 100);
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

// 停止计时器
function stopTimer() {
    if (!isTimerRunning) return;
    
    clearInterval(timerInterval);
    isTimerRunning = false;
}

// 重置计时器
function resetTimer() {
    stopTimer();
    document.getElementById('timer').textContent = '00:00.00';
    document.getElementById('record-list').innerHTML = '';
    itemTimers = {};
    
    // 重置物品放置状态
    inventoryItems.forEach(item => {
        item.placed = false;
        const itemElement = document.querySelector(`.inventory-item[data-id="${item.id}"]`);
        if (itemElement) {
            itemElement.style.opacity = '1';
            itemElement.style.cursor = 'pointer';
        }
    });
    
    // 移除已放置的模型
    placedItems.forEach(item => {
        scene.remove(item.model);
    });
    placedItems = [];
    
    // 如果处于考试模式且有物品，重新开始计时
    if (isExamMode && inventoryItems.length > 0) {
        startTimer();
    }
}

// 添加记录
function addRecord(name, time) {
    const recordElement = document.createElement('div');
    recordElement.className = 'record-item';
    recordElement.textContent = `${name} - ${time}s`;
    
    document.getElementById('record-list').appendChild(recordElement);
}