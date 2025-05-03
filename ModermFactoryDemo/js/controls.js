// 初始化控制器
function initControls() {
    // 添加轨道控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 根据模式设置不同的控制限制
    updateControlLimits();
    
    // 视角按钮
    document.getElementById('top-view-btn').addEventListener('click', setTopView);
    document.getElementById('front-view-btn').addEventListener('click', setFrontView);
    
    // 模式按钮
    document.getElementById('training-btn').addEventListener('click', setTrainingMode);
    document.getElementById('exam-btn').addEventListener('click', setExamMode);
    
    // 鼠标事件
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onMouseWheel);
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('contextmenu', onRightClick);
}

// 更新控制限制
function updateControlLimits() {
    if (isTrainingMode) {
        // 训练模式 - 180 度的水平旋转,上下旋转
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minAzimuthAngle = -Math.PI / 2;
        controls.maxAzimuthAngle = Math.PI / 2;
    } else {
        // 考试模式 - 允许有限环绕
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minAzimuthAngle = -Math.PI / 4;
        controls.maxAzimuthAngle = Math.PI / 4;
    }
    
    controls.minDistance = 2;
    controls.maxDistance = 5;
}

// 鼠标移动事件
function onMouseMove(event) {
    if (!currentModel) return;
    
    // 计算鼠标在3D空间中的位置
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / (window.innerWidth - 300)) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 创建射线
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // 计算与地面的交点
    const ground = scene.children.find(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry);
    if (ground) {
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            // 将模型放置在交点上方
            currentModel.model.position.copy(intersects[0].point);
            currentModel.model.position.y += 0.01;
        }
    }
}

// 鼠标滚轮事件 - 控制Z位置
function onMouseWheel(event) {
    if (!currentModel) return;
    
    event.preventDefault();
    

}

// 鼠标点击事件 - 放置模型
function onMouseClick(event) {
    if (!currentModel || event.button !== 0) return; // 只处理左键
    
    placeCurrentModel();
}

// 鼠标右键事件 - 删除选中模型
function onRightClick(event) {
    event.preventDefault();
    
    if (!selectedModel) return;
    
    // 从场景和记录中移除
    scene.remove(selectedModel);
    placedItems = placedItems.filter(item => item.model !== selectedModel);
    
    // 重置物品栏状态
    const itemId = selectedModel.userData.id;
    const inventoryItem = inventoryItems.find(item => item.id === itemId);
    if (inventoryItem) {
        inventoryItem.placed = false;
        updateInventoryItemDisplay(itemId);
    }
    
    // 移除选中状态
    selectedModel = null;
}

// 设置俯视图
function setTopView() {
    camera.position.set(0, 5, 0.001); // 稍微偏移避免万向节锁
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
}

// 设置正视图
function setFrontView() {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
}

// 设置训练模式
function setTrainingMode() {
    isTrainingMode = true;
    isExamMode = false;
    document.getElementById('training-btn').classList.add('active');
    document.getElementById('exam-btn').classList.remove('active');
    document.getElementById('timer-panel').style.display = 'none';
    stopTimer();
    updateControlLimits();
}

// 设置考试模式
function setExamMode() {
    isExamMode = true;
    isTrainingMode = false;
    document.getElementById('exam-btn').classList.add('active');
    document.getElementById('training-btn').classList.remove('active');
    document.getElementById('timer-panel').style.display = 'block';
    updateControlLimits();
    
    // 如果已经有物品但计时器未启动，则启动计时器
    if (inventoryItems.length > 0 && !isTimerRunning) {
        startTimer();
    }
}