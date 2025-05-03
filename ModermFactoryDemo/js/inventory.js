// 物品栏相关变量
let inventoryItems = [];
let placedItems = [];
let currentModel = null;
let selectedModel = null;
let mainModelConfig = null;

// 初始化物品栏
function initInventory() {
    // 事件监听
    document.getElementById('main-model-btn').addEventListener('click', triggerMainModelInput);
    document.getElementById('folder-btn').addEventListener('click', triggerFolderInput);
    document.getElementById('main-model-input').addEventListener('change', handleMainModelUpload);
    document.getElementById('folder-input').addEventListener('change', handleFolderUpload);
}

// 处理主模型上传
function handleMainModelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showLoading(true);
    
    const loader = new THREE.GLTFLoader();
    const reader = new FileReader();
    reader.onload = function(e) {
        loader.parse(
            e.target.result,
            '',
            function(gltf) {
                // 移除旧的主模型
                if (mainModel) {
                    scene.remove(mainModel);
                }
                
                // 设置新主模型
                mainModel = gltf.scene;
                
                // 计算边界框并居中
                const bbox = new THREE.Box3().setFromObject(mainModel);
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());
                
                // 自动调整大小并居中
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1.0 / maxDim;
                
                mainModel.position.copy(center).multiplyScalar(-1);
                mainModel.scale.set(scale, scale, scale);
                
                scene.add(mainModel);
                showLoading(false);
            },
            function(error) {
                console.error('加载主模型错误:', error);
                showLoading(false);
            }
        );
    };
    reader.readAsArrayBuffer(file);
}

// 处理文件夹上传
function handleFolderUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    showLoading(true);
    
    // 查找配置文件
    let configFile = null;
    const glbFiles = [];
    
    Array.from(files).forEach(file => {
        if (file.name === 'set.config') {
            configFile = file;
        } else if (file.name.toLowerCase().endsWith('.glb') || 
                  file.name.toLowerCase().endsWith('.gltf')) {
            glbFiles.push(file);
        }
    });
    
    // 读取配置
    let configPromise = Promise.resolve(null);
    if (configFile) {
        configPromise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    resolve(JSON.parse(e.target.result));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(configFile);
        });
    }
    
    configPromise.then(config => {
        const loader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
        loader.setDRACOLoader(dracoLoader);
        
        let loadedCount = 0;
        
        glbFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                loader.parse(
                    e.target.result,
                    '',
                    function(gltf) {
                        const modelName = file.name.replace(/\.(glb|gltf)$/i, '');
                        const modelConfig = config && config[modelName] ? config[modelName] : null;
                        
                        addToInventory(gltf.scene, modelName, modelConfig);
                        loadedCount++;
                        
                        if (loadedCount === glbFiles.length) {
                            showLoading(false);
                            if (isExamMode && !isTimerRunning) {
                                startTimer();
                            }
                        }
                    },
                    function(error) {
                        console.error('加载模型错误:', error);
                        loadedCount++;
                        
                        if (loadedCount === glbFiles.length) {
                            showLoading(false);
                        }
                    }
                );
            };
            reader.readAsArrayBuffer(file);
        });
    }).catch(error => {
        console.error('读取配置文件错误:', error);
        showLoading(false);
    });
}

// 添加到物品栏
function addToInventory(model, name, config = null) {
    const itemId = 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // 存储模型
    inventoryItems.push({
        id: itemId,
        model: model,
        name: name,
        config: config,
        placed: false
    });
    
    // 创建缩略图
    createThumbnail(model, name, itemId);
}

// 创建缩略图
function createThumbnail(model, name, itemId) {
    // 创建缩略图场景
    const thumbScene = new THREE.Scene();
    const thumbCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    thumbCamera.position.set(0, 0, 2);
    
    // 克隆模型以避免影响原始模型
    const modelClone = model.clone();
    modelClone.position.set(0, 0, 0);
    
    // 自动调整模型大小
    const bbox = new THREE.Box3().setFromObject(modelClone);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    
    modelClone.position.copy(center).multiplyScalar(-1);
    modelClone.scale.set(scale, scale, scale);
    
    thumbScene.add(modelClone);
    
    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    thumbScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    thumbScene.add(directionalLight);
    
    // 创建渲染器
    const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    thumbRenderer.setSize(80, 80);
    
    // 渲染缩略图
    thumbRenderer.render(thumbScene, thumbCamera);
    
    // 创建物品栏元素
    const itemElement = document.createElement('div');
    itemElement.className = 'inventory-item';
    itemElement.dataset.id = itemId;
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview';
    previewDiv.appendChild(thumbRenderer.domElement);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'name';
    nameDiv.textContent = name;
    
    itemElement.appendChild(previewDiv);
    itemElement.appendChild(nameDiv);
    
    // 添加点击事件
    itemElement.addEventListener('click', function() {
        const item = inventoryItems.find(item => item.id === itemId);
        if (!item.placed) {
            selectModelFromInventory(itemId);
        }
    });
    
    // 添加到物品栏
    document.getElementById('inventory-grid').appendChild(itemElement);
}

// 从物品栏选择模型
function selectModelFromInventory(itemId) {
    // 找到选中的物品
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (!selectedItem || selectedItem.placed) return;
    
    // 移除当前跟随的模型
    if (currentModel) {
        scene.remove(currentModel.model);
        currentModel = null;
    }
    
    // 克隆模型并添加到场景
    const modelClone = selectedItem.model.clone();
    modelClone.name = selectedItem.name; // 保存名称用于记录
    
    // 应用配置
    if (selectedItem.config) {
        applyModelConfig(modelClone, selectedItem.config);
    }
    
    scene.add(modelClone);
    
    currentModel = {
        id: itemId,
        model: modelClone,
        name: selectedItem.name,
        startTime: Date.now(),
        config: selectedItem.config
    };
    
    // 在考试模式下开始单个物品的计时
    if (isExamMode) {
        startItemTimer(itemId);
    }
}

// 应用模型配置
function applyModelConfig(model, config) {
    if (config.position) {
        model.position.set(
            config.position.x || 0,
            config.position.y || 0,
            config.position.z || 0
        );
    }
    
    if (config.rotation) {
        model.rotation.set(
            THREE.MathUtils.degToRad(config.rotation.x || 0),
            THREE.MathUtils.degToRad(config.rotation.y || 0),
            THREE.MathUtils.degToRad(config.rotation.z || 0)
        );
    }
    
    if (config.scale) {
        const scale = config.scale.uniform ? config.scale.value : config.scale;
        model.scale.set(
            scale.x || 1,
            scale.y || 1,
            scale.z || 1
        );
    }
}

// 更新跟随模型的位置
function updateFollowingModel() {
    if (!currentModel) return;
    
    // 更新模型Z位置
    if (currentModel.targetZ !== undefined) {
        currentModel.model.position.z = currentModel.targetZ;
    }
}

// 放置当前模型
function placeCurrentModel() {
    if (!currentModel) return;
    
    // 标记物品为已放置
    const inventoryItem = inventoryItems.find(item => item.id === currentModel.id);
    if (inventoryItem) {
        inventoryItem.placed = true;
        // 更新物品栏显示
        updateInventoryItemDisplay(currentModel.id);
    }
    
    // 计算放置时间
    const placementTime = (Date.now() - currentModel.startTime) / 1000;
    
    // 添加到已放置物品列表
    placedItems.push({
        id: currentModel.id,
        model: currentModel.model,
        name: currentModel.name,
        time: placementTime
    });
    
    // 添加到记录
    if (isExamMode) {
        addRecord(currentModel.name, placementTime.toFixed(2));
    }
    
    // 检查是否所有物品都已放置
    if (isExamMode && placedItems.length === inventoryItems.length) {
        stopTimer();
    }
    
    // 清除当前模型
    currentModel = null;
}

// 更新物品栏显示
function updateInventoryItemDisplay(itemId) {
    const itemElement = document.querySelector(`.inventory-item[data-id="${itemId}"]`);
    if (itemElement) {
        itemElement.style.opacity = '0.5';
        itemElement.style.cursor = 'not-allowed';
    }
}

// 触发主模型输入
function triggerMainModelInput() {
    document.getElementById('main-model-input').click();
}

// 触发文件夹输入
function triggerFolderInput() {
    document.getElementById('folder-input').click();
}

// 读取配置文件
function readConfigFile(path) {
    return new Promise((resolve, reject) => {
        fetch(path)
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.json();
            })
            .then(resolve)
            .catch(reject);
    });
}