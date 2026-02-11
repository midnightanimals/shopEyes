document.addEventListener('DOMContentLoaded', () => {

    const loadComponent = (selector, url, callback) => {
        const element = document.querySelector(selector);
        if (element) {
            fetch(url)
                .then(response => response.ok ? response.text() : Promise.reject('File not found.'))
                .then(data => {
                    element.innerHTML = data;
                    // 當 HTML 成功插入後，執行 callback
                    if (callback) {
                        callback();
                    }
                })
                .catch(error => console.error(`Error loading component from ${url}:`, error));
        }
    };

    // 載入 Header
    loadComponent('#header-placeholder', '_header.html');

    // 載入 Footer，並在載入完成後初始化 FAB 按鈕
    loadComponent('#footer-placeholder', '_footer.html', () => {
        initFloatingActionButton();
    });
});

// 將按鈕邏輯包裝成一個函數
function initFloatingActionButton() {
    const fabContainer = document.getElementById('fabContainer');
    const fabMain = document.getElementById('fabMain');

    if (!fabMain || !fabContainer) return; // 安全檢查

    fabMain.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止觸發到 document 的點擊事件
        fabContainer.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!fabContainer.contains(e.target)) {
            fabContainer.classList.remove('active');
        }
    });
}