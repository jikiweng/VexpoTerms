let isVRMode = false;
let xrSession = null;
let customScrollbar = null;
let contentWrapper = null;
let isDragging = false;
let dragStartY = 0;
let scrollStartTop = 0;
let scrolledTermInfo = "terms"

window.addEventListener('load', function() {    
    if (isMetaQuestBrowser()) {
        document.body.classList.add('meta-quest');
        
        setTimeout(() => {
            setupScrollbarForQuest();
        }, 200);
    } 
    else{
        setTimeout(() => {
            setupScrollbarForNonVR();
        }, 200);
    }
});

function isMetaQuestBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    const conditions = [
        userAgent.includes('quest'),
        userAgent.includes('oculusbrowser'),
        userAgent.includes('meta'),
    ];
    
    const isQuest = conditions.some(condition => condition);    
    return isQuest;
}

function isUnityWebView() {
    // 檢測是否在Unity WebView中運行
    const userAgent = navigator.userAgent.toLowerCase();
    const conditions = [
        userAgent.includes('unity'),
        userAgent.includes('webview'),
        userAgent.includes('unitywebview'),
        // 檢查是否有Unity特定的全局變量
        typeof window.unityInstance !== 'undefined',
        typeof window.unityWebView !== 'undefined',
        // 檢查是否有Unity特定的函數
        typeof window.SendMessage !== 'undefined',
        typeof window.UnityWebView !== 'undefined'
    ];
    
    return conditions.some(condition => condition);
}

function setupScrollbarForNonVR(){
    const originalWrapper = document.querySelector('#content-wrapper');
    const scrollContent = originalWrapper.querySelector('.simplebar-content');
    const bodyHeight = scrollContent.scrollHeight;
    const windowHeight = window.innerHeight;
    const bottomPoint = bodyHeight - windowHeight;
    console.log("bodyHeight:", bodyHeight, "windowHeight:", windowHeight, "bottomPoint:", bottomPoint);
    
    var url = window.location.href;
    var tsVer = document.head.querySelector('[name=ts-ver][content]') ? document.head.querySelector('[name=ts-ver][content]').content : "";
    var ppVer = document.head.querySelector('[name=pp-ver][content]') ? document.head.querySelector('[name=pp-ver][content]').content : "";
    var cpVer = document.head.querySelector('[name=cp-ver][content]') ? document.head.querySelector('[name=cp-ver][content]').content : "";
    var pdVer = document.head.querySelector('[name=pd-ver][content]') ? document.head.querySelector('[name=pd-ver][content]').content : "";
    var tfVer = document.head.querySelector('[name=tf-ver][content]') ? document.head.querySelector('[name=tf-ver][content]').content : "";
    var termInfo = url + "?ts-ver=" + tsVer + "&pp-ver=" + ppVer + "&cp-ver=" + cpVer + "&pd-ver=" + pdVer + "&tf-ver=" + tfVer;
        
    if(bodyHeight <= windowHeight) {
        scrolledTermInfo = termInfo
    }

    const scrollContainer = originalWrapper.querySelector('.simplebar-content-wrapper');     
    scrollContainer.addEventListener('scroll', () => {        
        const scrollTop = scrollContainer.scrollTop;
        console.log("currentPos: ",scrollTop );

        if (bottomPoint <= scrollTop ) {
            scrolledTermInfo = termInfo
        }
    })
    console.log("scrolledTermInfo:", scrolledTermInfo);
}

function setupScrollbarForQuest() {    
    const originalWrapper = document.querySelector('#content-wrapper');
    
    if (!originalWrapper) {
        console.error('Required elements not found');
        return;
    }
    
    let simplebarContent = null;
    
    const possibleSelectors = [
        '.simplebar-content-wrapper',
        '.simplebar-content',
        '.simplebar-scroll-content',
        '[data-simplebar-content]'
    ];
    
    for (const selector of possibleSelectors) {
        simplebarContent = originalWrapper.querySelector(selector);
        if (simplebarContent) {
            console.log('Found SimpleBar content with selector:', selector);
            break;
        }
    }
    
    if (simplebarContent) {
        contentWrapper = simplebarContent;
        console.log('Using SimpleBar content wrapper for scrolling');
    } else {
        contentWrapper = originalWrapper;
        console.log('Using original content wrapper for scrolling');
    }
    
    console.log('Content wrapper:', contentWrapper);
    console.log('Scroll height:', contentWrapper.scrollHeight);
    console.log('Client height:', contentWrapper.clientHeight);
    
    const scrollbarContainer = document.createElement('div');
    scrollbarContainer.className = 'custom-scrollbar';
    
    const track = document.createElement('div');
    track.className = 'scroll-track';
    
    const upArea = document.createElement('div');
    upArea.className = 'scroll-up-area';
    
    const downArea = document.createElement('div');
    downArea.className = 'scroll-down-area';
    
    const handle = document.createElement('div');
    handle.className = 'scroll-handle';
    
    scrollbarContainer.appendChild(track);
    scrollbarContainer.appendChild(upArea);
    scrollbarContainer.appendChild(downArea);
    scrollbarContainer.appendChild(handle);
    
    document.body.appendChild(scrollbarContainer);
    
    customScrollbar = {
        container: scrollbarContainer,
        track: track,
        upArea: upArea,
        downArea: downArea,
        handle: handle
    };
    
    upArea.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollUp();
    });
    upArea.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollUp();
    });
    upArea.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollUp();
    });
    
    downArea.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollDown();
    });
    downArea.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollDown();
    });
    downArea.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollDown();
    });
    
    // 為Unity WebView添加特殊的事件處理
    if (isUnityWebView()) {
        // 在Unity WebView中，使用點擊跳轉的方式
        handle.addEventListener('click', handleHandleClick);
        handle.addEventListener('touchstart', handleHandleClick);
        handle.addEventListener('pointerdown', handleHandleClick);
        
        // 添加點擊拖曳區域來移動滾動條
        track.addEventListener('click', handleTrackClick);
        track.addEventListener('touchstart', handleTrackClick);
        track.addEventListener('pointerdown', handleTrackClick);
        
        // 添加滾輪支持
        contentWrapper.addEventListener('wheel', handleWheel);
    } else {
        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag);
        handle.addEventListener('pointerdown', startDrag);
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('touchmove', handleDrag);
        document.addEventListener('pointermove', handleDrag);
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        document.addEventListener('pointerup', endDrag);
    }
    
    contentWrapper.addEventListener('scroll', updateHandlePosition);
    updateHandlePosition();
    
    contentWrapper.addEventListener('scroll', updateScrollProgress);
}

function scrollUp() {
    if (!contentWrapper) return;
    const scrollStep = 200;
    const oldScrollTop = contentWrapper.scrollTop;
    
    requestAnimationFrame(() => {
        const newScrollTop = Math.max(0, contentWrapper.scrollTop - scrollStep);
        contentWrapper.scrollTop = newScrollTop;
        console.log('Scroll up:', oldScrollTop, '->', newScrollTop);
        
        setTimeout(() => {
            updateScrollProgress();
        }, 50);
    });
}

function scrollDown() {
    if (!contentWrapper) return;
    const scrollStep = 200;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const oldScrollTop = contentWrapper.scrollTop;
    
    requestAnimationFrame(() => {
        const newScrollTop = Math.min(maxScroll, contentWrapper.scrollTop + scrollStep);
        contentWrapper.scrollTop = newScrollTop;
        console.log('Scroll down:', oldScrollTop, '->', newScrollTop);
        
        setTimeout(() => {
            updateScrollProgress();
        }, 50);
    });
}

function startDrag(e) {    
    isDragging = true;
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    scrollStartTop = contentWrapper.scrollTop;
    customScrollbar.handle.classList.add('active');
    
    // 為Unity WebView添加額外的事件監聽
    if (isUnityWebView()) {
        document.addEventListener('mousemove', handleDrag, { passive: false });
        document.addEventListener('touchmove', handleDrag, { passive: false });
        document.addEventListener('pointermove', handleDrag, { passive: false });
        document.addEventListener('mouseup', endDrag, { passive: false });
        document.addEventListener('touchend', endDrag, { passive: false });
        document.addEventListener('pointerup', endDrag, { passive: false });
    }
    
    e.preventDefault();
    e.stopPropagation();
}

function handleDrag(e) {
    if (!isDragging || !contentWrapper) return;
    
    const currentY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    const deltaY = currentY - dragStartY;
    
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const trackHeight = window.innerHeight - 27 - 27 - 40;
    const scrollRatio = maxScroll / trackHeight;
    
    const newScrollTop = Math.max(0, Math.min(maxScroll, scrollStartTop + deltaY * scrollRatio));
    contentWrapper.scrollTop = newScrollTop;
    
    updateScrollProgress();
    
    // 在Unity WebView中需要更積極地阻止默認行為
    if (isUnityWebView()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    
    e.preventDefault();
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (customScrollbar) {
        customScrollbar.handle.classList.remove('active');
    }
    
    // 移除為Unity WebView添加的額外事件監聽
    if (isUnityWebView()) {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('pointermove', handleDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
        document.removeEventListener('pointerup', endDrag);
    }
}

// Unity WebView專用的拖曳開始函數
function startDragUnity(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    scrollStartTop = contentWrapper.scrollTop;
    customScrollbar.handle.classList.add('active');
    
    // 在Unity WebView中使用定時器來模擬拖曳
    if (isUnityWebView()) {
        startUnityDragTimer();
    }
}

// Unity WebView拖曳定時器
let unityDragTimer = null;
let lastMouseY = 0;

function startUnityDragTimer() {
    if (unityDragTimer) {
        clearInterval(unityDragTimer);
    }
    
    unityDragTimer = setInterval(() => {
        if (!isDragging || !contentWrapper) {
            clearInterval(unityDragTimer);
            unityDragTimer = null;
            return;
        }
        
        // 嘗試獲取當前鼠標位置
        // 在Unity WebView中，我們可能需要使用不同的方法
        const currentY = lastMouseY || dragStartY;
        const deltaY = currentY - dragStartY;
        
        const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
        const trackHeight = window.innerHeight - 27 - 27 - 40;
        const scrollRatio = maxScroll / trackHeight;
        
        const newScrollTop = Math.max(0, Math.min(maxScroll, scrollStartTop + deltaY * scrollRatio));
        contentWrapper.scrollTop = newScrollTop;
        
        updateScrollProgress();
    }, 16); // 約60fps
}

// 添加鼠標移動監聽來更新位置
document.addEventListener('mousemove', function(e) {
    if (isDragging && isUnityWebView()) {
        lastMouseY = e.clientY;
    }
});

document.addEventListener('mouseup', function(e) {
    if (isDragging && isUnityWebView()) {
        endDragUnity();
    }
});

function endDragUnity() {
    if (!isDragging) return;
    isDragging = false;
    if (customScrollbar) {
        customScrollbar.handle.classList.remove('active');
    }
    if (unityDragTimer) {
        clearInterval(unityDragTimer);
        unityDragTimer = null;
    }
}

// 處理滾動條手柄點擊
function handleHandleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 點擊手柄時不移動，只是為了防止事件冒泡
    console.log('Handle clicked in Unity WebView');
}

// 處理軌道點擊
function handleTrackClick(e) {
    if (!contentWrapper) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = customScrollbar.track.getBoundingClientRect();
    const clickY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    const relativeY = clickY - rect.top;
    
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const trackHeight = rect.height - 40; // 減去handle的高度
    const scrollRatio = relativeY / trackHeight;
    
    const newScrollTop = Math.max(0, Math.min(maxScroll, scrollRatio * maxScroll));
    contentWrapper.scrollTop = newScrollTop;
    
    updateScrollProgress();
}

// 處理滾輪事件
function handleWheel(e) {
    if (!contentWrapper) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const deltaY = e.deltaY;
    const scrollStep = 100;
    const currentScrollTop = contentWrapper.scrollTop;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    
    let newScrollTop;
    if (deltaY > 0) {
        // 向下滾動
        newScrollTop = Math.min(maxScroll, currentScrollTop + scrollStep);
    } else {
        // 向上滾動
        newScrollTop = Math.max(0, currentScrollTop - scrollStep);
    }
    
    contentWrapper.scrollTop = newScrollTop;
    updateScrollProgress();
}

function updateHandlePosition() {
    if (!customScrollbar || !contentWrapper) return;
    
    const scrollTop = contentWrapper.scrollTop;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    
    const topBoundary = 27; 
    const bottomBoundary = window.innerHeight - 27; 
    const handleHeight = 40;
    const availableHeight = bottomBoundary - topBoundary - handleHeight;
    
    if (maxScroll > 0) {
        const scrollRatio = scrollTop / maxScroll;
        const handleTop = topBoundary + scrollRatio * availableHeight;
        
        const finalTop = Math.max(topBoundary, Math.min(bottomBoundary - handleHeight, handleTop));
        customScrollbar.handle.style.top = finalTop + 'px';
    } else {
        customScrollbar.handle.style.top = topBoundary + 'px';
    }
}

function updateScrollProgress() {
    const originalWrapper = document.querySelector('#content-wrapper');
    const scrollContent = originalWrapper.querySelector('.simplebar-content');
    const bodyHeight = scrollContent.scrollHeight;
    const windowHeight = window.innerHeight;
    const bottomPoint = bodyHeight - windowHeight;
    const scrollContainer = originalWrapper.querySelector('.simplebar-content-wrapper');     
    const scrollTop = scrollContainer.scrollTop;

    if (bottomPoint <= scrollTop ) {
        scrolledTermInfo = termInfo
    }
}

