// 显示/隐藏加载提示
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// 射线检测 - 选择模型
function raycastToSelectModel(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / (window.innerWidth - 300)) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // 排除地面和主模型
    const objects = scene.children.filter(child => 
        child !== mainModel && 
        !(child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) &&
        child !== currentModel?.model
    );
    
    const intersects = raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
        // 清除之前选中的模型的高亮
        if (selectedModel) {
            selectedModel.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive.setHex(child.userData.originalEmissive || 0x000000);
                }
            });
        }
        
        // 设置新选中的模型
        selectedModel = intersects[0].object;
        
        // 向上查找父对象直到找到我们添加的模型
        while (selectedModel.parent && selectedModel.parent !== scene) {
            selectedModel = selectedModel.parent;
        }
        
        // 高亮显示选中的模型
        selectedModel.traverse(child => {
            if (child.isMesh) {
                child.userData.originalEmissive = child.material.emissive.getHex();
                child.material.emissive.setHex(0x00ff00);
            }
        });
    } else {
        // 清除选中状态
        if (selectedModel) {
            selectedModel.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive.setHex(child.userData.originalEmissive || 0x000000);
                }
            });
            selectedModel = null;
        }
    }
}