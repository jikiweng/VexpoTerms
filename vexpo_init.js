// vexpo_init_new.js  （整檔替換）
let isVRMode = false;
let xrSession = null;
let customScrollbar = null;
let contentWrapper = null;
let isDragging = false;
let dragStartY = 0;
let scrollStartTop = 0;
let scrolledTermInfo = "";

const LONG_PRESS_DELAY = 1000; // 1 秒判定為長按
const AUTO_SCROLL_INTERVAL = 120; // 自動連續滾動間隔 (ms)
const AXIS_THRESHOLD = 0.5; // gamepad 軸閾值

// long-press / auto scroll state
let longPressTimer = null;
let autoScrollInterval = null;
let autoScrollDirection = null;
let pointerActiveArrow = null; // "up" / "down" or null

// gamepad state
let gpLastDir = 0; // -1 up, 0 neutral, 1 down
let gpLongPressTimer = null;
let gpIsAuto = false;

window.addEventListener('load', function() {    
    if (isMetaQuestBrowser()) {
        document.body.classList.add('meta-quest');
        setTimeout(() => {
            setupCustomScrollbarForQuest();
        }, 200);
    } else {
        setTimeout(() => {
            setupNativeScrollbarForNonVR();
        }, 200);
    }

    // 總是啟動 gamepad poll（如果有 controller 就會偵測到）
    pollGamepad();
});

function isMetaQuestBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    const conditions = [
        userAgent.includes('quest'),
        userAgent.includes('oculusbrowser'),
        userAgent.includes('meta'),
    ];
    return conditions.some(c => c);
}

function setupNativeScrollbarForNonVR(){
    const originalWrapper = document.querySelector('#content-wrapper');
    if (!originalWrapper) {
        console.error('Required elements not found');
        return;
    }
    contentWrapper = originalWrapper;
    console.log('Using native scrollbar for Non-VR');
    console.log('Content wrapper:', contentWrapper);
    console.log('Scroll height:', contentWrapper.scrollHeight);
    console.log('Client height:', contentWrapper.clientHeight);
    
    const bodyHeight = contentWrapper.scrollHeight;
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
        scrolledTermInfo = termInfo;
    }

    contentWrapper.addEventListener('scroll', updateScrollProgress);
    console.log("scrolledTermInfo:", scrolledTermInfo);
}

function setupCustomScrollbarForQuest() {    
    const originalWrapper = document.querySelector('#content-wrapper');
    if (!originalWrapper) {
        console.error('Required elements not found');
        return;
    }
    contentWrapper = originalWrapper;
    console.log('Using custom image scrollbar for Quest');
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

    // --- ARROW: pointer down/up with short/long distinction ---
    function onArrowPointerDown(direction, e) {
        e.preventDefault(); e.stopPropagation();
        pointerActiveArrow = direction;
        // set long-press timer
        longPressTimer = setTimeout(() => {
            startAutoScroll(direction);
            // mark auto in use
        }, LONG_PRESS_DELAY);
    }
    function onArrowPointerUp(direction, e) {
        e && e.preventDefault && e.preventDefault();
        e && e.stopPropagation && e.stopPropagation();
        // if longPressTimer still pending -> short press
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            // short press action
            if (direction === 'up') scrollUp();
            else scrollDown();
        } else {
            // timer already fired => auto scroll active, stop it
            stopAutoScroll();
        }
        pointerActiveArrow = null;
    }

    // bind upArea
    ['pointerdown','touchstart','mousedown'].forEach(evt => {
        upArea.addEventListener(evt, (e) => onArrowPointerDown('up', e));
    });
    ['pointerup','touchend','mouseup','pointercancel','mouseleave'].forEach(evt => {
        upArea.addEventListener(evt, (e) => onArrowPointerUp('up', e));
    });

    // bind downArea
    ['pointerdown','touchstart','mousedown'].forEach(evt => {
        downArea.addEventListener(evt, (e) => onArrowPointerDown('down', e));
    });
    ['pointerup','touchend','mouseup','pointercancel','mouseleave'].forEach(evt => {
        downArea.addEventListener(evt, (e) => onArrowPointerUp('down', e));
    });

    // --- HANDLE drag (保留原邏輯) ---
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag);
    handle.addEventListener('pointerdown', startDrag);
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('pointermove', handleDrag);
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('pointerup', endDrag);

    // --- track click: 跳到該位置並同步 page scroll ---
    track.addEventListener('pointerdown', function(e) {
        // 如果是按在 handle 上（可能冒泡），則不處理
        const rectHandle = customScrollbar.handle.getBoundingClientRect();
        if (e.clientY >= rectHandle.top && e.clientY <= rectHandle.bottom) {
            return;
        }
        moveHandleToClientYAndScroll(e.clientY);
    });
    // 也支援 touch
    track.addEventListener('touchstart', function(e) {
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        const rectHandle = customScrollbar.handle.getBoundingClientRect();
        if (touch.clientY >= rectHandle.top && touch.clientY <= rectHandle.bottom) return;
        moveHandleToClientYAndScroll(touch.clientY);
    });

    // scroll syncing
    contentWrapper.addEventListener('scroll', updateHandlePosition);
    updateHandlePosition();
    contentWrapper.addEventListener('scroll', updateScrollProgress);

    // bottom detection for scrolledTermInfo (保留目前邏輯)
    const bodyHeight = contentWrapper.scrollHeight;
    const windowHeight = window.innerHeight;
    const bottomPoint = bodyHeight - windowHeight;
    var url = window.location.href;
    var tsVer = document.head.querySelector('[name=ts-ver][content]') ? document.head.querySelector('[name=ts-ver][content]').content : "";
    var ppVer = document.head.querySelector('[name=pp-ver][content]') ? document.head.querySelector('[name=pp-ver][content]').content : "";
    var cpVer = document.head.querySelector('[name=cp-ver][content]') ? document.head.querySelector('[name=cp-ver][content]').content : "";
    var pdVer = document.head.querySelector('[name=pd-ver][content]') ? document.head.querySelector('[name=pd-ver][content]').content : "";
    var tfVer = document.head.querySelector('[name=tf-ver][content]') ? document.head.querySelector('[name=tf-ver][content]').content : "";
    var termInfo = url + "?ts-ver=" + tsVer + "&pp-ver=" + ppVer + "&cp-ver=" + cpVer + "&pd-ver=" + pdVer + "&tf-ver=" + tfVer;
        
    if(bodyHeight <= windowHeight) {
        scrolledTermInfo = termInfo;
    }

    contentWrapper.addEventListener('scroll', () => {        
        const scrollTop = contentWrapper.scrollTop;
        if (bottomPoint <= scrollTop ) {
            scrolledTermInfo = termInfo;
        }
    });
    console.log("scrolledTermInfo:", scrolledTermInfo);
}

/* ---------- scroll functions & auto-scroll control ---------- */

function scrollUp() {
    if (!contentWrapper) return;
    const scrollStep = 200;
    const newScrollTop = Math.max(0, contentWrapper.scrollTop - scrollStep);
    contentWrapper.scrollTop = newScrollTop;
    updateScrollProgress();
}

function scrollDown() {
    if (!contentWrapper) return;
    const scrollStep = 200;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const newScrollTop = Math.min(maxScroll, contentWrapper.scrollTop + scrollStep);
    contentWrapper.scrollTop = newScrollTop;
    updateScrollProgress();
}

function startAutoScroll(direction) {
    stopAutoScroll();
    autoScrollDirection = direction;
    // 立即執行一次，感覺更自然
    if (direction === 'up') scrollUp();
    else scrollDown();
    autoScrollInterval = setInterval(() => {
        if (direction === 'up') scrollUp();
        else scrollDown();
    }, AUTO_SCROLL_INTERVAL);
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
        autoScrollDirection = null;
    }
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

/* ---------- handle drag / update ---------- */

function startDrag(e) {    
    isDragging = true;
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    scrollStartTop = contentWrapper.scrollTop;
    if (customScrollbar && customScrollbar.handle) customScrollbar.handle.classList.add('active');
    e.preventDefault();
}

function handleDrag(e) {
    if (!isDragging || !contentWrapper) return;
    const currentY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY || 0;
    const deltaY = currentY - dragStartY;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const topBoundary = 20; 
    const bottomBoundary = window.innerHeight - 20; 
    const handleHeight = 40;
    const trackHeight = bottomBoundary - topBoundary - handleHeight;
    const scrollRatio = maxScroll / trackHeight;
    const newScrollTop = Math.max(0, Math.min(maxScroll, scrollStartTop + deltaY * scrollRatio));
    contentWrapper.scrollTop = newScrollTop;
    updateScrollProgress();
    e.preventDefault();
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (customScrollbar && customScrollbar.handle) customScrollbar.handle.classList.remove('active');
}

/* ---------- handle position / click-to-move helpers ---------- */

function updateHandlePosition() {
    if (!customScrollbar || !contentWrapper) return;
    const scrollTop = contentWrapper.scrollTop;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const topBoundary = 20; 
    const bottomBoundary = window.innerHeight - 20; 
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

function moveHandleToClientYAndScroll(clientY) {
    if (!customScrollbar || !contentWrapper) return;
    const topBoundary = 20; 
    const bottomBoundary = window.innerHeight - 20; 
    const handleHeight = 40;
    const availableHeight = bottomBoundary - topBoundary - handleHeight;
    // 計算目標 handleTop（把點擊視作 handle 的中心）
    let targetTop = clientY - (handleHeight / 2);
    // 限制邊界
    const minTop = topBoundary;
    const maxTop = bottomBoundary - handleHeight;
    targetTop = Math.max(minTop, Math.min(maxTop, targetTop));
    // 計算比例並設定 scrollTop
    const ratio = (targetTop - topBoundary) / (availableHeight || 1);
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    const newScrollTop = Math.round(ratio * maxScroll);
    contentWrapper.scrollTop = newScrollTop;
    updateScrollProgress();
    updateHandlePosition();
}

/* ---------- scroll progress ---------- */

function updateScrollProgress() {
    if (!contentWrapper) return;
    const documentHeight = contentWrapper.scrollHeight;
    const clientHeight = contentWrapper.clientHeight;
    const scrollTop = contentWrapper.scrollTop;
    const maxScroll = documentHeight - clientHeight;
    let scrollPercentage = 0;
    if (maxScroll > 0) {
        scrollPercentage = Math.round((scrollTop / maxScroll) * 100);
    }
    var url = window.location.href;
    var tsVer = document.head.querySelector('[name=ts-ver][content]') ? document.head.querySelector('[name=ts-ver][content]').content : "";
    var ppVer = document.head.querySelector('[name=pp-ver][content]') ? document.head.querySelector('[name=pp-ver][content]').content : "";
    var cpVer = document.head.querySelector('[name=cp-ver][content]') ? document.head.querySelector('[name=cp-ver][content]').content : "";
    var pdVer = document.head.querySelector('[name=pd-ver][content]') ? document.head.querySelector('[name=pd-ver][content]').content : "";
    var tfVer = document.head.querySelector('[name=tf-ver][content]') ? document.head.querySelector('[name=tf-ver][content]').content : "";
    var termInfo = url + "?ts-ver=" + tsVer + "&pp-ver=" + ppVer + "&cp-ver=" + cpVer + "&pd-ver=" + pdVer + "&tf-ver=" + tfVer;
    if(scrollPercentage >= 100) {
        scrolledTermInfo = termInfo;
    }
    const progressElement = document.getElementById('scroll-progress');
    if (progressElement) {
        progressElement.textContent = scrollPercentage + '%';
    }
}

/* ---------- Gamepad (poll) for joystick support ---------- */

function pollGamepad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let found = false;
    for (let i = 0; i < gps.length; i++) {
        const gp = gps[i];
        if (!gp) continue;
        // assume axes[1] is vertical
        const y = gp.axes && gp.axes.length > 1 ? gp.axes[1] : 0;
        let dir = 0;
        if (y < -AXIS_THRESHOLD) dir = -1; // up
        else if (y > AXIS_THRESHOLD) dir = 1; // down

        // state change detection
        if (dir !== gpLastDir) {
            // released or changed
            if (dir === 0) {
                // released
                if (gpLongPressTimer) {
                    clearTimeout(gpLongPressTimer);
                    gpLongPressTimer = null;
                    // short press because timer never fired
                    if (!gpIsAuto) {
                        if (gpLastDir === -1) scrollUp();
                        else if (gpLastDir === 1) scrollDown();
                    }
                }
                if (gpIsAuto) {
                    stopAutoScroll();
                    gpIsAuto = false;
                }
            } else {
                // newly pressed direction
                gpLongPressTimer = setTimeout(() => {
                    // long press triggered
                    startAutoScroll(dir === -1 ? 'up' : 'down');
                    gpIsAuto = true;
                    gpLongPressTimer = null;
                }, LONG_PRESS_DELAY);
            }
            gpLastDir = dir;
        }
        found = true;
    }
    // continue polling only if page active
    requestAnimationFrame(pollGamepad);
}
