(function() {
    const PRIMARY_WORKER_URL = 'https://a-proxy.327791.workers.dev/';
    const FALLBACK_WORKER_URL = 'https://a-proxy.xushan321321.workers.dev/';
    let activeWorkerUrl = PRIMARY_WORKER_URL;

    let historyStack = [];
    let historyIndex = -1;
    
  
    let bookmarks = JSON.parse(localStorage.getItem('aufw-bookmarks')) || [
        { name: 'Google', url: 'google.com' },
        { name: 'YouTube', url: 'youtube.com' },
        { name: 'Discord', url: 'discord.com' },
        { name: 'GitHub', url: 'github.com' }
    ];

    if (document.getElementById('aufw-proxy-root')) {
        document.getElementById('aufw-proxy-root').remove();
    }

    const root = document.createElement('div');
    root.id = 'aufw-proxy-root';

    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        #aufw-proxy-root {
            position: fixed;
            top: 40px;
            left: calc(100vw - 880px);
            width: 850px;
            height: 580px;
            background: #0b0d14;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            box-shadow: 0 30px 70px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(99, 102, 241, 0.15);
            z-index: 9999999;
            display: flex;
            flex-direction: row;
            overflow: hidden;
            resize: both;
            min-width: 520px;
            min-height: 380px;
            font-family: 'Inter', -apple-system, sans-serif;
            transition: opacity 0.2s ease, border-radius 0.25s ease;
        }

        #aufw-proxy-root.fullscreen {
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important;
            border-radius: 0; resize: none; transform: none !important;
        }

        #aufw-proxy-root.minimized {
            width: 60px !important; height: 60px !important;
            min-width: 60px !important; min-height: 60px !important;
            border-radius: 50%; resize: none; cursor: move;
            background: #0f1117;
            border: 2px solid #6366f1;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
        }

        /* --- LEFT SIDEBAR (VENYX STYLE) --- */
        .fwh-sidebar {
            width: 58px;
            background: #11131c;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            display: flex; flex-direction: column; align-items: center;
            padding: 14px 0; gap: 16px; user-select: none; z-index: 2;
        }

        .fwh-logo {
            width: 32px; height: 32px; border-radius: 8px;
            object-fit: cover; cursor: pointer;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
        }

        .fwh-nav-group {
            display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: center;
        }

        .fwh-nav-item {
            width: 40px; height: 40px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: #64748b; font-size: 18px; cursor: pointer;
            transition: all 0.2s ease; position: relative;
        }

        .fwh-nav-item:hover {
            color: #f8fafc; background: rgba(255, 255, 255, 0.05);
        }

        .fwh-nav-item.active {
            color: #818cf8; background: rgba(99, 102, 241, 0.15);
        }

        .fwh-nav-item.active::before {
            content: ''; position: absolute; left: -9px; top: 10px; bottom: 10px;
            width: 3px; background: #6366f1; border-radius: 0 4px 4px 0;
        }

        
        .fwh-content-wrap {
            flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;
        }

        
        .fwh-header {
            background: rgba(255, 255, 255, 0.02);
            padding: 10px 18px;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: move; user-select: none;
        }

        .fwh-header-title {
            display: flex; align-items: center; gap: 10px;
            color: #f8fafc; font-size: 13px; font-weight: 700;
        }

        .fwh-version-tag {
            font-size: 10px; padding: 2px 6px; border-radius: 6px;
            background: rgba(255, 255, 255, 0.06); color: #94a3b8; font-weight: 600;
        }

        .fwh-status-badge {
            font-size: 10px; padding: 3px 10px; border-radius: 12px;
            background: rgba(16, 185, 129, 0.12); color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25); font-weight: 600;
            display: flex; align-items: center; gap: 6px; cursor: pointer;
        }

        .fwh-status-dot {
            width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;
        }

        .fwh-controls { display: flex; align-items: center; gap: 6px; }

        .fwh-icon-btn {
            background: transparent; border: none; color: #64748b;
            border-radius: 6px; padding: 5px 8px; cursor: pointer;
            font-size: 13px; transition: all 0.2s ease;
        }
        .fwh-icon-btn:hover:not(:disabled) {
            background: rgba(255,255,255,0.08); color: #ffffff;
        }
        .fwh-icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        
        .fwh-tab-panel {
            display: none; flex: 1; flex-direction: column; overflow: hidden;
        }
        .fwh-tab-panel.active { display: flex; }

        
        .fwh-bar {
            background: rgba(0, 0, 0, 0.2);
            padding: 8px 14px;
            display: flex; gap: 8px; align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .fwh-input {
            flex: 1; background: #151824;
            border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
            padding: 8px 14px; color: #f8fafc; font-size: 13px; outline: none;
            transition: all 0.2s; font-family: inherit;
        }
        .fwh-input:focus {
            border-color: #6366f1; background: #1a1e2e;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
        }

        .fwh-btn {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: #ffffff; border: none; border-radius: 8px;
            padding: 8px 16px; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
        }
        .fwh-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

        .fwh-bookmarks {
            display: flex; gap: 6px; padding: 6px 14px;
            background: rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            overflow-x: auto; align-items: center;
        }
        .fwh-bookmarks::-webkit-scrollbar { height: 3px; }
        .fwh-bookmarks::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

        .fwh-bookmark-chip {
            background: rgba(255,255,255,0.05); color: #cbd5e1;
            font-size: 11px; padding: 4px 10px; border-radius: 6px;
            cursor: pointer; white-space: nowrap; transition: all 0.2s;
            display: flex; align-items: center; gap: 6px; border: 1px solid transparent;
        }
        .fwh-bookmark-chip:hover {
            background: rgba(255,255,255,0.1); color: #fff;
            border-color: rgba(255,255,255,0.12);
        }
        .fwh-bookmark-del { color: #f43f5e; font-size: 11px; display: none; }
        .fwh-bookmark-chip:hover .fwh-bookmark-del { display: inline-block; }

        .fwh-add-bookmark {
            background: transparent; color: #818cf8; border: 1px dashed rgba(129, 140, 248, 0.4);
            font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer;
            white-space: nowrap; transition: all 0.2s; font-weight: 600;
        }
        .fwh-add-bookmark:hover { background: rgba(99, 102, 241, 0.15); border-color: #6366f1; }

        .fwh-frame-container { flex: 1; width: 100%; height: 100%; background: #ffffff; position: relative; }
        .fwh-iframe { width: 100%; height: 100%; border: none; background: #fff; }
        .fwh-iframe.no-pointer { pointer-events: none !important; }

        .fwh-loader {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(11, 13, 20, 0.94); display: flex; flex-direction: column;
            align-items: center; justify-content: center; z-index: 10;
            opacity: 0; pointer-events: none; transition: opacity 0.25s;
        }
        .fwh-loader.active { opacity: 1; pointer-events: all; }
        .fwh-spinner {
            width: 36px; height: 36px; border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1; border-radius: 50%; animation: fwh-spin 0.8s linear infinite;
        }
        .fwh-loader-text {
            margin-top: 14px; color: #818cf8; font-size: 11px; font-weight: 600;
            letter-spacing: 1.5px; animation: fwh-pulse 1.4s infinite;
        }
        @keyframes fwh-spin { to { transform: rotate(360deg); } }
        @keyframes fwh-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* --- SETTINGS & CARDS --- */
        .fwh-settings-view {
            padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
        }
        .fwh-card {
            background: #131622; border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px; padding: 16px 20px; display: flex;
            align-items: center; justify-content: space-between;
        }
        .fwh-card-info h4 { margin: 0; color: #f8fafc; font-size: 13px; font-weight: 600; }
        .fwh-card-info p { margin: 4px 0 0; color: #64748b; font-size: 11px; }

        .fwh-select {
            background: #1c2030; border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1; border-radius: 8px; padding: 8px 12px;
            font-size: 12px; outline: none; cursor: pointer;
        }

        .fwh-slider {
            width: 110px; accent-color: #6366f1; cursor: pointer;
        }

        /* --- DEV PATCH NOTES MODAL --- */
        .fwh-modal-overlay {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(11, 13, 20, 0.88); backdrop-filter: blur(8px);
            z-index: 99; display: flex; align-items: center; justify-content: center;
            opacity: 1; transition: opacity 0.3s ease;
        }
        .fwh-modal-overlay.hidden { opacity: 0; pointer-events: none; }

        .fwh-modal {
            width: 440px; background: #131624; border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            display: flex; flex-direction: column; gap: 16px;
        }
        .fwh-modal-header {
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px;
        }
        .fwh-modal-title { color: #f8fafc; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .fwh-patch-list {
            display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto;
        }
        .fwh-patch-item {
            display: flex; gap: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.4;
        }
        .fwh-patch-tag {
            background: rgba(99, 102, 241, 0.15); color: #818cf8;
            font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; height: fit-content;
        }

        /* Full logo coverage on minimized state */
        .fwh-minimized-icon {
            display: none; width: 100%; height: 100%;
            border-radius: 50%; overflow: hidden;
            cursor: pointer; position: relative;
        }
        .fwh-minimized-icon img {
            width: 100%; height: 100%;
            object-fit: cover; border-radius: 50%;
            pointer-events: none; user-select: none;
        }

        #aufw-proxy-root.minimized .fwh-sidebar,
        #aufw-proxy-root.minimized .fwh-content-wrap { display: none !important; }
        #aufw-proxy-root.minimized .fwh-minimized-icon { display: block !important; }
    `;

    root.innerHTML = `
        <div class="fwh-sidebar">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" class="fwh-logo" id="fwh-logo-btn" title="Free Will Hub">
            <div class="fwh-nav-group">
                <div class="fwh-nav-item active" data-tab="browser" title="Browser View">&#127760;</div>
                <div class="fwh-nav-item" data-tab="settings" title="Settings">&#9881;</div>
                <div class="fwh-nav-item" data-tab="patchnotes" title="Patch Notes">&#128220;</div>
            </div>
        </div>

        <div class="fwh-content-wrap">
          
            <div class="fwh-header" id="aufw-drag">
                <div class="fwh-header-title">
                    <span>Free Will Hub.com</span>
                    <span class="fwh-version-tag">V1.1.0</span>
                    <div class="fwh-status-badge" id="aufw-worker-status" title="Current Active Proxy Node">
                        <div class="fwh-status-dot" id="fwh-status-dot"></div>
                        <span id="fwh-node-text">Node 1</span>
                    </div>
                </div>
                <div class="fwh-controls">
                    <button class="fwh-icon-btn" id="aufw-full" title="Toggle Fullscreen">&#9974;</button>
                    <button class="fwh-icon-btn" id="aufw-min" title="Minimize">&#8722;</button>
                    <button class="fwh-icon-btn" style="color: #f43f5e;" id="aufw-close" title="Close">&times;</button>
                </div>
            </div>

        
            <div class="fwh-tab-panel active" id="tab-browser">
                <div class="fwh-bar">
                    <button class="fwh-icon-btn" id="aufw-back" title="Back" disabled>&#9664;</button>
                    <button class="fwh-icon-btn" id="aufw-forward" title="Forward" disabled>&#9654;</button>
                    <button class="fwh-icon-btn" id="aufw-reload" title="Reload">&#8635;</button>
                    <input type="text" class="fwh-input" id="aufw-url" placeholder="Search web or enter target URL..." autocomplete="off" />
                    <button class="fwh-btn" id="aufw-go">Launch</button>
                    <button class="fwh-icon-btn" id="aufw-tab" title="Open in dedicated tab">&#8599;</button>
                </div>
                <div class="fwh-bookmarks" id="aufw-bookmark-container"></div>
                <div class="fwh-frame-container">
                    <div class="fwh-loader" id="aufw-loader">
                        <div class="fwh-spinner"></div>
                        <div class="fwh-loader-text">CONNECTING TO FREE WILL HUB PROXY</div>
                    </div>
                    <iframe class="fwh-iframe" id="aufw-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"></iframe>
                </div>
            </div>

          
            <div class="fwh-tab-panel" id="tab-settings">
                <div class="fwh-settings-view">
                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Active Proxy Node</h4>
                            <p>Switch between primary and fallback proxy routing workers</p>
                        </div>
                        <button class="fwh-btn" id="fwh-settings-node-btn">Switch to Node 2</button>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Default Search Engine</h4>
                            <p>Choose search provider for non-URL queries</p>
                        </div>
                        <select class="fwh-select" id="aufw-engine">
                            <option value="ddg">DuckDuckGo</option>
                            <option value="google">Google</option>
                            <option value="bing">Bing</option>
                        </select>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Ghost Mode (Opacity)</h4>
                            <p>Adjust window transparency for stealth operations</p>
                        </div>
                        <input type="range" class="fwh-slider" id="aufw-opacity" min="0.15" max="1" step="0.05" value="1">
                    </div>
                </div>
            </div>


            <div class="fwh-tab-panel" id="tab-patchnotes">
                <div class="fwh-settings-view">
                    <div class="fwh-modal" style="width: 100%; box-sizing: border-box;">
                        <div class="fwh-modal-header">
                            <div class="fwh-modal-title">&#128220; Free Will Hub Patch Notes Log</div>
                        </div>
                        <div class="fwh-patch-list">
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.1.0</span>
                                <div>Redesigned UI with dark and sleek proxy theme, left vertical sidebar navigation, and startup dev patch notes dialog.</div>
                            </div>
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.1.0</span>
                                <div>Migrated node selector and search engine settings into dedicated Settings panel.</div>
                            </div>
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.0.5</span>
                                <div>Upgraded Cloudflare Worker pipeline to path-prefix routing (/proxy/) for Vite module imports.</div>
                            </div>
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.0.4</span>
                                <div>Integrated WebSocket Subprotocol negotiation forwarding for multiplayer games.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div class="fwh-modal-overlay" id="fwh-patch-modal">
                <div class="fwh-modal">
                    <div class="fwh-modal-header">
                        <div class="fwh-modal-title">&#128640; Free Will Hub.com V1.1.0</div>
                    </div>
                    <div class="fwh-patch-list">
                        <div class="fwh-patch-item">
                            <span class="fwh-patch-tag">NEW</span>
                            <div>Sleek Proxy UI layout with left navigation sidebar and dark mode cards.</div>
                        </div>
                        <div class="fwh-patch-item">
                            <span class="fwh-patch-tag">NEW</span>
                            <div>Integrated Settings manager for Proxy Worker Nodes and Search Engines.</div>
                        </div>
                        <div class="fwh-patch-item">
                            <span class="fwh-patch-tag">CORE</span>
                            <div>WebSocket tunneling & path-prefix module import resolution enabled.</div>
                        </div>
                    </div>
                    <button class="fwh-btn" id="fwh-continue-btn" style="width: 100%; margin-top: 8px;">Continue</button>
                </div>
            </div>
        </div>

        <div class="fwh-minimized-icon" id="aufw-restore" title="Click to restore Free Will Hub">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" alt="Restore">
        </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(root);

   
    const frame = document.getElementById('aufw-frame');
    const input = document.getElementById('aufw-url');
    const loader = document.getElementById('aufw-loader');
    const btnBack = document.getElementById('aufw-back');
    const btnForward = document.getElementById('aufw-forward');
    const workerStatus = document.getElementById('aufw-worker-status');
    const nodeText = document.getElementById('fwh-node-text');
    const statusDot = document.getElementById('fwh-status-dot');
    const settingsNodeBtn = document.getElementById('fwh-settings-node-btn');
    const engineSelect = document.getElementById('aufw-engine');
    const bookmarkContainer = document.getElementById('aufw-bookmark-container');
    const patchModal = document.getElementById('fwh-patch-modal');

    document.getElementById('fwh-continue-btn').onclick = () => {
        patchModal.classList.add('hidden');
    };

    const navItems = root.querySelectorAll('.fwh-nav-item');
    const tabPanels = root.querySelectorAll('.fwh-tab-panel');

    navItems.forEach(item => {
        item.onclick = () => {
            const targetTab = item.getAttribute('data-tab');
            navItems.forEach(i => i.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        };
    });

    function toggleWorkerNode() {
        if (activeWorkerUrl === PRIMARY_WORKER_URL) {
            activeWorkerUrl = FALLBACK_WORKER_URL;
            nodeText.innerText = 'Node 2';
            statusDot.style.background = '#f59e0b';
            statusDot.style.boxShadow = '0 0 8px #f59e0b';
            settingsNodeBtn.innerText = 'Switch to Node 1 (Primary)';
        } else {
            activeWorkerUrl = PRIMARY_WORKER_URL;
            nodeText.innerText = 'Node 1';
            statusDot.style.background = '#10b981';
            statusDot.style.boxShadow = '0 0 8px #10b981';
            settingsNodeBtn.innerText = 'Switch to Node 2 (Fallback)';
        }
        if (input.value.trim()) loadUrl(input.value.trim(), true);
    }

    workerStatus.onclick = toggleWorkerNode;
    settingsNodeBtn.onclick = toggleWorkerNode;

    function saveBookmarks() {
        localStorage.setItem('aufw-bookmarks', JSON.stringify(bookmarks));
        renderBookmarks();
    }

    function renderBookmarks() {
        bookmarkContainer.innerHTML = '';
        bookmarks.forEach((bm, index) => {
            const chip = document.createElement('div');
            chip.className = 'fwh-bookmark-chip';
            chip.innerHTML = `<span>${bm.name}</span><span class="fwh-bookmark-del" title="Delete">&times;</span>`;
            
            chip.querySelector('span').onclick = () => {
                navItems[0].click(); 
                loadUrl(bm.url);
            };
            
            chip.querySelector('.fwh-bookmark-del').onclick = (e) => {
                e.stopPropagation();
                bookmarks.splice(index, 1);
                saveBookmarks();
            };
            bookmarkContainer.appendChild(chip);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'fwh-add-bookmark';
        addBtn.innerText = '+ Add';
        addBtn.onclick = () => {
            const name = prompt('Bookmark Title:');
            if (!name) return;
            const url = prompt('URL or Domain:');
            if (!url) return;
            bookmarks.push({ name, url });
            saveBookmarks();
        };
        bookmarkContainer.appendChild(addBtn);
    }
    renderBookmarks();

    function updateNavButtons() {
        btnBack.disabled = historyIndex <= 0;
        btnForward.disabled = historyIndex >= historyStack.length - 1;
    }

    function getFormattedUrl(raw, workerBase = activeWorkerUrl) {
        if (!raw) return '';
        let targetUrl;
        
        if (!/\s/.test(raw) && raw.includes('.')) {
            targetUrl = (!raw.startsWith('http://') && !raw.startsWith('https://')) ? 'https://' + raw : raw;
        } else {
            const engine = engineSelect.value;
            if (engine === 'google') {
                targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
            } else if (engine === 'bing') {
                targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(raw);
            } else {
                targetUrl = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(raw);
            }
        }
        
        const base = workerBase.endsWith('/') ? workerBase : workerBase + '/';
        return base + 'proxy/' + targetUrl;
    }

    function loadUrl(rawUrl, isHistoryNav = false) {
        if (!rawUrl) return;
        const target = getFormattedUrl(rawUrl, activeWorkerUrl);
        
        if (!isHistoryNav) {
            historyStack = historyStack.slice(0, historyIndex + 1);
            historyStack.push(rawUrl);
            historyIndex++;
            updateNavButtons();
        }

        input.value = rawUrl;
        loader.classList.add('active');
        frame.src = target;
    }

    document.getElementById('aufw-go').onclick = () => loadUrl(input.value.trim());
    input.onkeydown = (e) => { if (e.key === 'Enter') loadUrl(input.value.trim()); };
    document.getElementById('aufw-reload').onclick = () => { loader.classList.add('active'); frame.src = frame.src; };
    
    btnBack.onclick = () => {
        if (historyIndex > 0) { historyIndex--; loadUrl(historyStack[historyIndex], true); updateNavButtons(); }
    };
    btnForward.onclick = () => {
        if (historyIndex < historyStack.length - 1) { historyIndex++; loadUrl(historyStack[historyIndex], true); updateNavButtons(); }
    };

    frame.onload = () => loader.classList.remove('active');
    frame.onerror = () => {
        if (activeWorkerUrl === PRIMARY_WORKER_URL) {
            toggleWorkerNode();
        }
    };

    document.getElementById('aufw-tab').onclick = () => {
        if (input.value) window.open(getFormattedUrl(input.value.trim()), '_blank');
    };

    document.getElementById('aufw-close').onclick = () => { root.remove(); style.remove(); };
    document.getElementById('aufw-full').onclick = () => root.classList.toggle('fullscreen');
    document.getElementById('aufw-min').onclick = (e) => {
        e.stopPropagation();
        root.classList.remove('fullscreen');
        root.classList.add('minimized');
    };
    document.getElementById('aufw-opacity').oninput = (e) => root.style.opacity = e.target.value;

    let isDragging = false, startX, startY, initialX = 0, initialY = 0, hasMoved = false;
    const dragHeader = document.getElementById('aufw-drag');
    const restoreIcon = document.getElementById('aufw-restore');

    function startDrag(e) {
        if (['BUTTON', 'INPUT', 'SELECT'].includes(e.target.tagName) || root.classList.contains('fullscreen')) return;
        isDragging = true; hasMoved = false;
        startX = e.clientX - initialX; startY = e.clientY - initialY;
        frame.classList.add('no-pointer');
    }

    dragHeader.onmousedown = startDrag;
    restoreIcon.onmousedown = startDrag;

    document.onmousemove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        let moveX = e.clientX - startX;
        let moveY = e.clientY - startY;
        
        const rect = root.getBoundingClientRect();
        if (moveY < -rect.top) moveY = -rect.top; 
        
        if (Math.abs(moveX - initialX) > 3 || Math.abs(moveY - initialY) > 3) hasMoved = true;
        initialX = moveX; initialY = moveY;
        root.style.transform = `translate(${initialX}px, ${initialY}px)`;
    };

    document.onmouseup = () => { isDragging = false; frame.classList.remove('no-pointer'); };
    
    restoreIcon.onclick = () => {
        if (!hasMoved) root.classList.remove('minimized');
    };

    
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (!anchor || !anchor.href || root.contains(anchor) || anchor.href.includes('sites.google.com') || anchor.getAttribute('href').startsWith('#') || anchor.getAttribute('href').startsWith('javascript:')) return;
        e.preventDefault();
        navItems[0].click();
        loadUrl(anchor.href);
    }, true);
document.addEventListener("keydown", (e) => {
  if (e.key === "~") {
    window.location.href = "https://classroom.google.com/h";
  }
});
})();


