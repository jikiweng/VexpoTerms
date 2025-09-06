let isVRMode = false;
let xrSession = null;
let customScrollbar = null;
let contentWrapper = null;
let isDragging = false;
let dragStartY = 0;
let scrollStartTop = 0;
let scrolledTermInfo = ""

window.addEventListener('load', function() {    
    if (isMetaQuestBrowser()) {
        document.body.classList.add('meta-quest');
        
        // 等待 SimpleBar 完全初始化
        setTimeout(() => {
            setupScrollbar();
        }, 200);
    } 
    else{
        const originalWrapper = document.querySelector('#content-wrapper');
        const scrollContent = originalWrapper.querySelector('.simplebar-content');
        const bodyHeight = scrollContent.scrollHeight;

        const windowHeight = window.innerHeight
        const bottomPoint = bodyHeight - windowHeight
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
        
        window.addEventListener('scroll', () => {
            const currentPos = window.pageYOffset
            if (bottomPoint <= currentPos) {
                scrolledTermInfo = termInfo
            }
        })
        console.log("scrolledTermInfo:", scrolledTermInfo);
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

function setupScrollbar() {    
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
    
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag);
    handle.addEventListener('pointerdown', startDrag);
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('pointermove', handleDrag);
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('pointerup', endDrag);
    
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
    e.preventDefault();
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
    e.preventDefault();
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (customScrollbar) {
        customScrollbar.handle.classList.remove('active');
    }
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
    if (!contentWrapper) return;
    
    const documentHeight = contentWrapper.scrollHeight;
    const clientHeight = contentWrapper.clientHeight;
    const scrollTop = contentWrapper.scrollTop;
    
    const maxScroll = documentHeight - clientHeight;
    let scrollPercentage = 0;
    
    if (maxScroll > 0) {
        scrollPercentage = (scrollTop / maxScroll) * 100;
    }

    if(scrollPercentage >= 100) {
        scrolledTermInfo = "termInfo";
    }
    
    const progressElement = document.getElementById('scroll-progress');
    if (progressElement) {
        progressElement.textContent = Math.round(scrollPercentage) + '%';
    }
    
    console.log('Scroll progress:', {
        scrollTop: scrollTop,
        documentHeight: documentHeight,
        clientHeight: clientHeight,
        maxScroll: maxScroll,
        percentage: Math.round(scrollPercentage) + '%'
    });
}