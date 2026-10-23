(function() {
    const PRIMARY_WORKER_URL = 'https://a-proxy.327791.workers.dev/';
    const FALLBACK_WORKER_URL = 'https://a-proxy.xushan321321.workers.dev/';
    let activeWorkerUrl = localStorage.getItem('aufw-active-worker') || PRIMARY_WORKER_URL;

    // --- Persistent State Storage ---
    let bookmarks = JSON.parse(localStorage.getItem('aufw-bookmarks')) || [
        { name: 'Google', url: 'google.com' },
        { name: 'YouTube', url: 'https://utubedc.base44.app' },
        { name: 'Discord', url: 'discord.com' },
        { name: 'GitHub', url: 'github.com' }
    ];

    let speedDialTiles = JSON.parse(localStorage.getItem('aufw-speeddial-tiles')) || [
        { label: 'DuckDuckGo', url: 'https://lite.duckduckgo.com/', icon: '🦆' },
        { label: 'YouTube', url: 'https://utubedc.base44.app', icon: '▶' },
        { label: 'Discord', url: 'discord.com', icon: '💬' },
        { label: 'GitHub', url: 'github.com', icon: '💻' }
    ];

    let sessionHistory = JSON.parse(localStorage.getItem('aufw-session-history')) || [];
    let panicConfig = JSON.parse(localStorage.getItem('aufw-panic')) || { key: '`', url: 'https://classroom.google.com/h' };
    let activeAccent = localStorage.getItem('aufw-accent') || '#6366f1';
    let soundEnabled = localStorage.getItem('aufw-sound') === 'true';
    let blurIntensity = localStorage.getItem('aufw-blur') || '20';
    let baseOpacity = localStorage.getItem('aufw-base-opacity') || '1';
    let autoGhostEnabled = localStorage.getItem('aufw-auto-ghost') === 'true';

    // Internal Tabs State - ADDED isProxied default
    let tabs = [{ id: 'tab-1', title: 'New Tab', url: '', history: [], historyIndex: -1, isProxied: true }];
    let activeTabId = 'tab-1';

    // Cleanup existing instance
    if (document.getElementById('aufw-proxy-root')) document.getElementById('aufw-proxy-root').remove();
    if (document.getElementById('fwh-tab-ctx')) document.getElementById('fwh-tab-ctx').remove();

    const root = document.createElement('div');
    root.id = 'aufw-proxy-root';
    root.style.opacity = baseOpacity; // Apply base opacity immediately

    const style = document.createElement('style');
    style.id = 'aufw-styles';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --fwh-accent: ${activeAccent};
            --fwh-accent-glow: ${activeAccent}4d;
            --fwh-accent-subtle: ${activeAccent}26;
            --fwh-blur: ${blurIntensity}px;
        }

        #aufw-proxy-root {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 900px; height: 620px; background: rgba(11, 13, 20, 0.92);
            backdrop-filter: blur(var(--fwh-blur)); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px; box-shadow: 0 30px 70px -10px rgba(0, 0, 0, 0.85), 0 0 30px var(--fwh-accent-glow);
            z-index: 9999998; display: flex; flex-direction: row; overflow: hidden; resize: both;
            min-width: 560px; min-height: 420px; font-family: 'Inter', sans-serif;
            transition: opacity 0.4s ease, border-radius 0.25s ease;
        }

        /* Ghost Mode - Opacity only so mouseenter still works! */
        #aufw-proxy-root.ghost-active { opacity: 0.05 !important; }

        #aufw-proxy-root.fullscreen {
            top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
            border-radius: 0; resize: none; transform: none !important;
        }

        #aufw-proxy-root.minimized {
            width: 60px !important; height: 60px !important; min-width: 60px !important; min-height: 60px !important;
            border-radius: 50%; resize: none; cursor: move; background: #0f1117;
            border: 2px solid var(--fwh-accent); box-shadow: 0 0 20px var(--fwh-accent-glow);
            opacity: 1 !important; /* Always fully visible when minimized */
        }

        /* SIDEBAR */
        .fwh-sidebar { width: 58px; background: #11131c; border-right: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; align-items: center; padding: 14px 0; gap: 16px; user-select: none; z-index: 2; }
        .fwh-logo { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 0 12px var(--fwh-accent-glow); }
        .fwh-nav-group { display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: center; }
        .fwh-nav-item { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 18px; cursor: pointer; transition: all 0.2s ease; position: relative; }
        .fwh-nav-item:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }
        .fwh-nav-item.active { color: #ffffff; background: var(--fwh-accent-subtle); }
        .fwh-nav-item.active::before { content: ''; position: absolute; left: -9px; top: 10px; bottom: 10px; width: 3px; background: var(--fwh-accent); border-radius: 0 4px 4px 0; }

        /* CONTENT WRAPPER & HEADER */
        .fwh-content-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .fwh-header { background: rgba(255, 255, 255, 0.02); padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); cursor: move; user-select: none; }
        .fwh-header-title { display: flex; align-items: center; gap: 10px; color: #f8fafc; font-size: 13px; font-weight: 700; }
        .fwh-version-tag { font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); color: #94a3b8; }
        .fwh-clock { font-size: 11px; color: #94a3b8; font-family: monospace; background: rgba(0,0,0,0.2); padding: 3px 8px; border-radius: 6px; }
        .fwh-status-badge { font-size: 10px; padding: 3px 10px; border-radius: 12px; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .fwh-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
        .fwh-controls { display: flex; align-items: center; gap: 6px; }
        .fwh-icon-btn { background: transparent; border: none; color: #64748b; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 13px; transition: all 0.2s ease; }
        .fwh-icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #ffffff; }
        .fwh-icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        /* INTERNAL TABS BAR */
        .fwh-tabs-bar { display: flex; align-items: center; gap: 4px; padding: 6px 12px 0; background: #0f111a; border-bottom: 1px solid rgba(255,255,255,0.05); overflow-x: auto; }
        .fwh-tab-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px; border-radius: 8px 8px 0 0; cursor: pointer; max-width: 140px; border: 1px solid transparent; border-bottom: none; transition: all 0.2s; }
        .fwh-tab-item:hover { background: rgba(255,255,255,0.06); color: #f8fafc; }
        .fwh-tab-item.active { background: #151824; color: #ffffff; border-color: rgba(255,255,255,0.08); border-top: 2px solid var(--fwh-accent); }
        .fwh-tab-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .fwh-tab-close { font-size: 12px; color: #64748b; border-radius: 50%; padding: 0 3px; }
        .fwh-tab-close:hover { color: #f43f5e; background: rgba(244,63,94,0.15); }
        .fwh-new-tab-btn { background: transparent; border: none; color: var(--fwh-accent); font-size: 14px; padding: 4px 8px; cursor: pointer; border-radius: 6px; }
        .fwh-new-tab-btn:hover { background: rgba(255,255,255,0.05); }

        /* TAB PANELS */
        .fwh-tab-panel { display: none; flex: 1; flex-direction: column; overflow: hidden; }
        .fwh-tab-panel.active { display: flex; }

        /* BROWSER & BOOKMARKS */
        .fwh-bar { background: rgba(0, 0, 0, 0.2); padding: 8px 14px; display: flex; gap: 8px; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .fwh-input { flex: 1; background: #151824; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 14px; color: #f8fafc; font-size: 13px; outline: none; font-family: inherit; }
        .fwh-input:focus { border-color: var(--fwh-accent); background: #1a1e2e; box-shadow: 0 0 12px var(--fwh-accent-glow); }
        .fwh-btn { background: var(--fwh-accent); color: #ffffff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px var(--fwh-accent-glow); }
        .fwh-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

        .fwh-bookmarks { display: flex; gap: 6px; padding: 6px 14px; background: rgba(0, 0, 0, 0.1); border-bottom: 1px solid rgba(255, 255, 255, 0.05); overflow-x: auto; align-items: center; }
        .fwh-bookmark-chip { background: rgba(255,255,255,0.05); color: #cbd5e1; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; border: 1px solid transparent; transition: all 0.2s; }
        .fwh-bookmark-chip:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .fwh-bookmark-del { color: #f43f5e; display: none; }
        .fwh-bookmark-chip:hover .fwh-bookmark-del { display: inline-block; }
        .fwh-add-bookmark { background: transparent; color: var(--fwh-accent); border: 1px dashed var(--fwh-accent); font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; font-weight: 600; }

        /* IFRAME & SPEED DIAL */
        .fwh-frame-container { flex: 1; width: 100%; height: 100%; background: #0b0d14; position: relative; }
        .fwh-iframe { width: 100%; height: 100%; border: none; background: #fff; }
        .fwh-iframe.no-pointer { pointer-events: none !important; }

        .fwh-speeddial { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #0d0f18; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; z-index: 5; padding: 20px; }
        .fwh-speeddial.hidden { display: none; }
        .fwh-speeddial-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 520px; width: 100%; }
        .fwh-speeddial-card { background: #141724; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; text-align: center; color: #f8fafc; position: relative; }
        .fwh-speeddial-card:hover { border-color: var(--fwh-accent); transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .fwh-speeddial-icon { font-size: 24px; }
        .fwh-speeddial-label { font-size: 12px; font-weight: 600; }
        .fwh-speeddial-del { position: absolute; top: 6px; right: 8px; color: #f43f5e; font-size: 12px; display: none; }
        .fwh-speeddial-card:hover .fwh-speeddial-del { display: block; }

        .fwh-loader { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(11, 13, 20, 0.94); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
        .fwh-loader.active { opacity: 1; pointer-events: all; }
        .fwh-spinner { width: 36px; height: 36px; border: 3px solid var(--fwh-accent-subtle); border-top-color: var(--fwh-accent); border-radius: 50%; animation: fwh-spin 0.8s linear infinite; }
        .fwh-loader-text { margin-top: 14px; color: var(--fwh-accent); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; }
        @keyframes fwh-spin { to { transform: rotate(360deg); } }

        /* MINI APPS */
        .fwh-apps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 20px; overflow-y: auto; }
        .fwh-app-card { background: #131622; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .fwh-app-title { color: #f8fafc; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .fwh-textarea { background: #1c2030; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: #cbd5e1; font-size: 12px; resize: none; height: 110px; outline: none; font-family: inherit; }
        .fwh-calc-display { background: #1c2030; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: #f8fafc; font-size: 16px; font-weight: 700; text-align: right; overflow-x: auto; }
        .fwh-calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .fwh-calc-btn { background: rgba(255,255,255,0.05); border: none; color: #f8fafc; border-radius: 6px; padding: 8px; font-weight: 600; cursor: pointer; }
        .fwh-calc-btn:hover { background: var(--fwh-accent-subtle); color: var(--fwh-accent); }

        /* SETTINGS & MODAL */
        .fwh-settings-view { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .fwh-card { background: #131622; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
        .fwh-card-info h4 { margin: 0; color: #f8fafc; font-size: 13px; font-weight: 600; }
        .fwh-card-info p { margin: 4px 0 0; color: #64748b; font-size: 11px; }
        .fwh-color-picker { display: flex; gap: 8px; }
        .fwh-color-dot { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.2s; }
        .fwh-color-dot:hover { transform: scale(1.15); }
        .fwh-color-dot.active { border-color: #ffffff; }
        .fwh-select, .fwh-settings-input { background: #1c2030; border: 1px solid rgba(255, 255, 255, 0.1); color: #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none; }

        /* MINIMIZED ICON WITH DRAG FIXES */
        .fwh-minimized-icon {
            display: none; width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
            cursor: move; position: relative; user-select: none; -webkit-user-select: none;
        }
        .fwh-minimized-icon img {
            width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
            pointer-events: none; user-select: none; -webkit-user-drag: none;
        }

        #aufw-proxy-root.minimized .fwh-sidebar, #aufw-proxy-root.minimized .fwh-content-wrap { display: none !important; }
        #aufw-proxy-root.minimized .fwh-minimized-icon { display: block !important; }

        /* Context Menu for Tabs */
        .fwh-context-menu { position: fixed; background: #131622; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 9999999; display: none; flex-direction: column; min-width: 150px; font-family: 'Inter', sans-serif; }
        .fwh-context-menu.active { display: flex; }
        .fwh-ctx-item { padding: 10px 12px; color: #cbd5e1; font-size: 12px; cursor: pointer; border-radius: 6px; font-weight: 500; display: flex; align-items: center; justify-content: space-between; }
        .fwh-ctx-item:hover { background: var(--fwh-accent-subtle); color: #fff; }
        .fwh-proxy-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); }
    `;

    root.innerHTML = `
        <div class="fwh-sidebar">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" class="fwh-logo" id="fwh-logo-btn" title="Free Will Hub V2.6.5" draggable="false">
            <div class="fwh-nav-group">
                <div class="fwh-nav-item active" data-tab="browser" title="Browser">&#127760;</div>
                <div class="fwh-nav-item" data-tab="apps" title="Mini Apps & Tools">&#128736;</div>
                <div class="fwh-nav-item" data-tab="history" title="Session History">&#128339;</div>
                <div class="fwh-nav-item" data-tab="settings" title="Settings">&#9881;</div>
            </div>
        </div>

        <div class="fwh-content-wrap">
            <div class="fwh-header" id="aufw-drag">
                <div class="fwh-header-title">
                    <span>Free Will Hub</span><span class="fwh-version-tag">V2.6.5</span>
                    <div class="fwh-clock" id="fwh-clock">00:00</div>
                    <div class="fwh-status-badge" id="aufw-worker-status" title="Switch Proxy Node">
                        <div class="fwh-status-dot" id="fwh-status-dot"></div><span id="fwh-node-text">Node 1</span>
                    </div>
                </div>
                <div class="fwh-controls">
                    <button class="fwh-icon-btn" id="aufw-center" title="Re-center Window">&#9970;</button>
                    <button class="fwh-icon-btn" id="aufw-full" title="Toggle Fullscreen">&#9974;</button>
                    <button class="fwh-icon-btn" id="aufw-min" title="Minimize">&#8722;</button>
                    <button class="fwh-icon-btn" style="color: #f43f5e;" id="aufw-close" title="Close">&times;</button>
                </div>
            </div>

            <!-- TAB 1: BROWSER -->
            <div class="fwh-tab-panel active" id="tab-browser">
                <div class="fwh-tabs-bar" id="fwh-internal-tabs">
                    <button class="fwh-new-tab-btn" id="fwh-add-tab-btn" title="New Tab">+</button>
                </div>
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
                    <div class="fwh-speeddial" id="aufw-speeddial">
                        <div style="color: #f8fafc; font-size: 16px; font-weight: 700; display:flex; align-items:center; gap:10px;">
                            <span>Quick Access Launcher</span>
                            <button class="fwh-btn" id="fwh-add-tile-btn" style="padding: 4px 10px; font-size: 11px;">+ Add Tile</button>
                        </div>
                        <div class="fwh-speeddial-grid" id="fwh-speeddial-grid"></div>
                    </div>
                    <div class="fwh-loader" id="aufw-loader">
                        <div class="fwh-spinner"></div><div class="fwh-loader-text">CONNECTING TO PROXY</div>
                    </div>
                    <iframe class="fwh-iframe" id="aufw-frame" allow="autoplay; fullscreen; pointer-lock" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"></iframe>
                </div>
            </div>

            <!-- TAB 2: MINI APPS -->
            <div class="fwh-tab-panel" id="tab-apps">
                <div class="fwh-apps-grid">
                    <div class="fwh-app-card">
                        <div class="fwh-app-title"><span>&#128221; Quick Scratchpad</span></div>
                        <textarea class="fwh-textarea" id="fwh-scratchpad" placeholder="Type quick notes here..."></textarea>
                    </div>
                    <div class="fwh-app-card">
                        <div class="fwh-app-title"><span>&#129301; Calculator</span></div>
                        <div class="fwh-calc-display" id="fwh-calc-out">0</div>
                        <div class="fwh-calc-grid">
                            <button class="fwh-calc-btn">C</button><button class="fwh-calc-btn">(</button><button class="fwh-calc-btn">)</button><button class="fwh-calc-btn">/</button>
                            <button class="fwh-calc-btn">7</button><button class="fwh-calc-btn">8</button><button class="fwh-calc-btn">9</button><button class="fwh-calc-btn">*</button>
                            <button class="fwh-calc-btn">4</button><button class="fwh-calc-btn">5</button><button class="fwh-calc-btn">6</button><button class="fwh-calc-btn">-</button>
                            <button class="fwh-calc-btn">1</button><button class="fwh-calc-btn">2</button><button class="fwh-calc-btn">3</button><button class="fwh-calc-btn">+</button>
                            <button class="fwh-calc-btn">0</button><button class="fwh-calc-btn">.</button><button class="fwh-calc-btn" style="grid-column: span 2; background: var(--fwh-accent);">=</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 3: HISTORY -->
            <div class="fwh-tab-panel" id="tab-history">
                <div class="fwh-settings-view">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="color: #f8fafc; margin:0;">Session Navigation Log</h4>
                        <button class="fwh-btn" id="fwh-clear-history-btn" style="background: #f43f5e;">Clear History</button>
                    </div>
                    <div id="fwh-history-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
                </div>
            </div>

            <!-- TAB 4: SETTINGS -->
            <div class="fwh-tab-panel" id="tab-settings">
                <div class="fwh-settings-view">
                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>UI Accent Color Theme</h4><p>Customize primary color theme</p>
                        </div>
                        <div class="fwh-color-picker">
                            <div class="fwh-color-dot" data-color="#6366f1" style="background: #6366f1;"></div>
                            <div class="fwh-color-dot" data-color="#06b6d4" style="background: #06b6d4;"></div>
                            <div class="fwh-color-dot" data-color="#10b981" style="background: #10b981;"></div>
                            <div class="fwh-color-dot" data-color="#f43f5e" style="background: #f43f5e;"></div>
                            <div class="fwh-color-dot" data-color="#8b5cf6" style="background: #8b5cf6;"></div>
                            <div class="fwh-color-dot" data-color="#f59e0b" style="background: #f59e0b;"></div>
                        </div>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>UI Sound Effects</h4><p>Synthesize audio feedback</p></div>
                        <button class="fwh-btn" id="fwh-toggle-sound-btn">${soundEnabled ? 'Enabled' : 'Disabled'}</button>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>Auto-Hide (Ghost Mode)</h4><p>Fade out window when mouse leaves</p></div>
                        <button class="fwh-btn" id="fwh-toggle-ghost-btn">${autoGhostEnabled ? 'Enabled' : 'Disabled'}</button>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>Base Console Opacity</h4><p>Adjust window transparency</p></div>
                        <input type="range" class="fwh-slider" id="aufw-opacity" min="0.15" max="1" step="0.05" value="${baseOpacity}" style="width: 110px; accent-color: var(--fwh-accent);">
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>Tab Cloaking</h4><p>Disguise host page title and favicon</p></div>
                        <select class="fwh-select" id="aufw-cloaker">
                            <option value="none">None (Default)</option>
                            <option value="classroom">Google Classroom</option>
                            <option value="docs">Google Docs</option>
                            <option value="drive">Google Drive</option>
                            <!-- NEW CLOAKER OPTION HERE -->
                            <option value="portal">Student Portal</option>
                        </select>
                    </div>
                    
                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>Panic Shortcut Target</h4><p>URL to redirect to (Key: ${panicConfig.key})</p></div>
                        <input type="text" class="fwh-settings-input" id="aufw-panic-url" style="width: 160px;" value="${panicConfig.url}">
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info"><h4>Backup & Restore Engine</h4><p>Export or import JSON config</p></div>
                        <div style="display: flex; gap: 8px;">
                            <button class="fwh-btn" id="fwh-export-btn">Export</button>
                            <button class="fwh-btn" id="fwh-import-btn" style="background: #10b981;">Import</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="fwh-minimized-icon" id="aufw-restore" title="Click to restore">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" alt="Restore" draggable="false">
        </div>
    `;

    // Context Menu for right click tabs
    const ctxMenu = document.createElement('div');
    ctxMenu.className = 'fwh-context-menu';
    ctxMenu.id = 'fwh-tab-ctx';
    ctxMenu.innerHTML = `<div class="fwh-ctx-item" id="fwh-ctx-toggle"><span>Proxy Active</span><span class="fwh-proxy-badge" id="fwh-proxy-badge-text">ON</span></div>`;

    document.head.appendChild(style);
    document.body.appendChild(root);
    document.body.appendChild(ctxMenu);

    // --- DOM References ---
    const frame = document.getElementById('aufw-frame');
    const input = document.getElementById('aufw-url');
    const loader = document.getElementById('aufw-loader');
    const speedDial = document.getElementById('aufw-speeddial');
    const speedDialGrid = document.getElementById('fwh-speeddial-grid');
    const btnBack = document.getElementById('aufw-back');
    const btnForward = document.getElementById('aufw-forward');
    const workerStatus = document.getElementById('aufw-worker-status');
    const nodeText = document.getElementById('fwh-node-text');
    const statusDot = document.getElementById('fwh-status-dot');
    const bookmarkContainer = document.getElementById('aufw-bookmark-container');
    const tabsContainer = document.getElementById('fwh-internal-tabs');
    const addTabBtn = document.getElementById('fwh-add-tab-btn');
    const historyList = document.getElementById('fwh-history-list');

    // --- Audio ---
    function playUiSound() {
        if (!soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    }

    // --- Clock Widget ---
    setInterval(() => {
        const d = new Date();
        document.getElementById('fwh-clock').innerText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

    // --- Ghost Mode (Auto-Hide) ---
    const ghostBtn = document.getElementById('fwh-toggle-ghost-btn');
    ghostBtn.onclick = () => {
        playUiSound();
        autoGhostEnabled = !autoGhostEnabled;
        localStorage.setItem('aufw-auto-ghost', autoGhostEnabled);
        ghostBtn.innerText = autoGhostEnabled ? 'Enabled' : 'Disabled';
    };

    root.addEventListener('mouseleave', () => {
        if (autoGhostEnabled && !root.classList.contains('minimized')) {
            root.classList.add('ghost-active');
        }
    });

    root.addEventListener('mouseenter', () => {
        if (autoGhostEnabled) {
            root.classList.remove('ghost-active');
        }
    });

    // --- Tab Cloaker & Panic ---
    document.getElementById('aufw-cloaker').onchange = (e) => {
        playUiSound();
        const val = e.target.value;
        if (val === 'classroom') { document.title = 'Home - Classroom'; changeFavicon('https://ssl.gstatic.com/classroom/favicon.png'); }
        else if (val === 'docs') { document.title = 'Google Docs'; changeFavicon('https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'); }
        else if (val === 'drive') { document.title = 'My Drive'; changeFavicon('https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png'); }
        // NEW PORTAL CLOAKER HANDLER
        else if (val === 'portal') { document.title = 'Student MyPortal'; changeFavicon('https://sites.google.com/sitesv-images-rt/AMxu72vWYicC5IWX9ZSorwl6xvZ_5FHRWKRZ7v96i86HNyNUn_bBbD-GwucP532SoDiNIBsOImj3EyTRT0_bjC8drcUFx6SqPDnLCwKXi8FvryAETZHKrsAef_0hhf-pHgOB6UPiRXRWYq5AimRx05WZ54uqrHCeRIU7sqZ8VWU=w16383'); }
    };
    function changeFavicon(src) {
        let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = src;
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    document.getElementById('aufw-panic-url').onchange = (e) => { panicConfig.url = e.target.value || 'https://classroom.google.com/h'; localStorage.setItem('aufw-panic', JSON.stringify(panicConfig)); };
    document.addEventListener("keydown", (e) => { if (e.key === panicConfig.key) window.location.href = panicConfig.url; });

    // --- Sound Toggle ---
    const soundBtn = document.getElementById('fwh-toggle-sound-btn');
    soundBtn.onclick = () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('aufw-sound', soundEnabled);
        soundBtn.innerText = soundEnabled ? 'Enabled' : 'Disabled';
        playUiSound();
    };

    // --- Sidebar Navigation ---
    const navItems = root.querySelectorAll('.fwh-nav-item');
    const tabPanels = root.querySelectorAll('.fwh-tab-panel');
    navItems.forEach(item => {
        item.onclick = () => {
            playUiSound();
            navItems.forEach(i => i.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`tab-${item.getAttribute('data-tab')}`).classList.add('active');
            if(item.getAttribute('data-tab') === 'history') renderHistory();
        };
    });

    // --- Accent Theme Engine ---
    root.querySelectorAll('.fwh-color-dot').forEach(dot => {
        if (dot.getAttribute('data-color') === activeAccent) dot.classList.add('active');
        dot.onclick = () => {
            playUiSound();
            root.querySelectorAll('.fwh-color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            activeAccent = dot.getAttribute('data-color');
            localStorage.setItem('aufw-accent', activeAccent);
            document.documentElement.style.setProperty('--fwh-accent', activeAccent);
            document.documentElement.style.setProperty('--fwh-accent-glow', activeAccent + '4d');
            document.documentElement.style.setProperty('--fwh-accent-subtle', activeAccent + '26');
        };
    });

    // --- Worker Switcher ---
    function updateWorkerUI() {
        if (activeWorkerUrl === PRIMARY_WORKER_URL) { nodeText.innerText = 'Node 1'; statusDot.style.background = '#10b981'; }
        else { nodeText.innerText = 'Node 2'; statusDot.style.background = '#f59e0b'; }
    }
    updateWorkerUI();
    workerStatus.onclick = () => {
        playUiSound();
        activeWorkerUrl = (activeWorkerUrl === PRIMARY_WORKER_URL) ? FALLBACK_WORKER_URL : PRIMARY_WORKER_URL;
        localStorage.setItem('aufw-active-worker', activeWorkerUrl);
        updateWorkerUI();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.url) loadUrl(activeTab.url, true);
    };

    // --- History Log ---
    function recordHistory(url) {
        sessionHistory.unshift({ url, timestamp: new Date().toLocaleTimeString() });
        if (sessionHistory.length > 50) sessionHistory.pop();
        localStorage.setItem('aufw-session-history', JSON.stringify(sessionHistory));
    }
    function renderHistory() {
        historyList.innerHTML = '';
        if (sessionHistory.length === 0) { historyList.innerHTML = '<div style="color: #64748b; font-size: 12px;">No history recorded yet.</div>'; return; }
        sessionHistory.forEach(item => {
            const row = document.createElement('div'); row.className = 'fwh-card'; row.style.cursor = 'pointer';
            // FIXED TEMPLATE LITERAL SYNTAX HERE
            row.innerHTML = `<div class="fwh-card-info"><h4>${item.url}</h4><p>${item.timestamp}</p></div><button class="fwh-btn" style="padding: 4px 10px; font-size: 11px;">Launch</button>`;
            row.onclick = () => { navItems[0].click(); loadUrl(item.url); };
            historyList.appendChild(row);
        });
    }
    document.getElementById('fwh-clear-history-btn').onclick = () => { playUiSound(); sessionHistory = []; localStorage.removeItem('aufw-session-history'); renderHistory(); };

    // --- Proxy Context Menu Logic ---
    document.addEventListener('click', (e) => {
        if (!ctxMenu.contains(e.target)) ctxMenu.classList.remove('active');
    });

    document.getElementById('fwh-ctx-toggle').addEventListener('click', () => {
        const targetId = ctxMenu.dataset.targetTab;
        const tab = tabs.find(t => t.id === targetId);
        if (tab) {
            tab.isProxied = !tab.isProxied;
            if (activeTabId === targetId && tab.url) {
                loader.classList.add('active');
                frame.src = tab.isProxied ? getFormattedUrl(tab.url) : tab.url;
            }
            renderSubTabs();
        }
        ctxMenu.classList.remove('active');
    });

    // --- Multi-Tab Internal Navigation Engine ---
    function renderSubTabs() {
        tabsContainer.querySelectorAll('.fwh-tab-item').forEach(e => e.remove());
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `fwh-tab-item ${tab.id === activeTabId ? 'active' : ''}`;
            // If tab is unproxied, show orange text
            tabEl.innerHTML = `<span class="fwh-tab-title" style="color: ${tab.isProxied ? 'inherit' : '#f59e0b'}">${tab.title}</span><span class="fwh-tab-close">&times;</span>`;
            
            tabEl.onclick = () => switchSubTab(tab.id);
            tabEl.querySelector('.fwh-tab-close').onclick = (e) => { e.stopPropagation(); closeSubTab(tab.id); };
            
            // CONTEXT MENU EVENT LISTENER (RIGHT CLICK)
            tabEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                switchSubTab(tab.id);
                ctxMenu.style.left = e.clientX + 'px';
                ctxMenu.style.top = e.clientY + 'px';
                ctxMenu.classList.add('active');
                ctxMenu.dataset.targetTab = tab.id;
                
                const badge = document.getElementById('fwh-proxy-badge-text');
                badge.innerText = tab.isProxied ? 'ON' : 'OFF';
                badge.style.color = tab.isProxied ? '#10b981' : '#f43f5e';
            });

            tabsContainer.insertBefore(tabEl, addTabBtn);
        });
    }
    
    function switchSubTab(id) {
        playUiSound(); activeTabId = id; renderSubTabs();
        const curTab = tabs.find(t => t.id === id);
        if (!curTab.url) { speedDial.classList.remove('hidden'); input.value = ''; frame.src = 'about:blank'; }
        else { speedDial.classList.add('hidden'); input.value = curTab.url; frame.src = curTab.isProxied ? getFormattedUrl(curTab.url) : curTab.url; }
        updateNavButtons();
    }
    
    // NEW TABS DEFAULT TO isProxied: true
    function createSubTab(url = '') { playUiSound(); const id = 'tab-' + Date.now(); tabs.push({ id, title: url || 'New Tab', url, history: url ? [url] : [], historyIndex: url ? 0 : -1, isProxied: true }); switchSubTab(id); }
    
    function closeSubTab(id) { playUiSound(); if (tabs.length === 1) return; tabs = tabs.filter(t => t.id !== id); if (activeTabId === id) activeTabId = tabs[tabs.length - 1].id; renderSubTabs(); switchSubTab(activeTabId); }
    addTabBtn.onclick = () => createSubTab('');

    // --- Speed Dial & Bookmarks ---
    function renderSpeedDial() {
        speedDialGrid.innerHTML = '';
        speedDialTiles.forEach((tile, index) => {
            const card = document.createElement('div'); card.className = 'fwh-speeddial-card';
            // FIXED TEMPLATE LITERAL SYNTAX HERE
            card.innerHTML = `<span class="fwh-speeddial-del">&times;</span><div class="fwh-speeddial-icon">${tile.icon||'🌐'}</div><div class="fwh-speeddial-label">${tile.label}</div>`;
            card.onclick = () => { playUiSound(); loadUrl(tile.url); };
            card.querySelector('.fwh-speeddial-del').onclick = (e) => { e.stopPropagation(); speedDialTiles.splice(index, 1); localStorage.setItem('aufw-speeddial-tiles', JSON.stringify(speedDialTiles)); renderSpeedDial(); };
            speedDialGrid.appendChild(card);
        });
    }
    document.getElementById('fwh-add-tile-btn').onclick = () => { playUiSound(); const label = prompt('Tile Name:'); if (!label) return; const url = prompt('URL:'); if (!url) return; const icon = prompt('Emoji:') || '🌐'; speedDialTiles.push({ label, url, icon }); localStorage.setItem('aufw-speeddial-tiles', JSON.stringify(speedDialTiles)); renderSpeedDial(); };
    renderSpeedDial();

    function renderBookmarks() {
        bookmarkContainer.innerHTML = '';
        bookmarks.forEach((bm, index) => {
            const chip = document.createElement('div'); chip.className = 'fwh-bookmark-chip';
            chip.innerHTML = `<span>${bm.name}</span><span class="fwh-bookmark-del">&times;</span>`;
            chip.querySelector('span').onclick = () => { playUiSound(); navItems[0].click(); loadUrl(bm.url); };
            chip.querySelector('.fwh-bookmark-del').onclick = (e) => { e.stopPropagation(); bookmarks.splice(index, 1); localStorage.setItem('aufw-bookmarks', JSON.stringify(bookmarks)); renderBookmarks(); };
            bookmarkContainer.appendChild(chip);
        });
        const addBtn = document.createElement('button'); addBtn.className = 'fwh-add-bookmark'; addBtn.innerText = '+ Add';
        addBtn.onclick = () => { playUiSound(); const name = prompt('Name:'); if (!name) return; const url = prompt('URL:'); if (!url) return; bookmarks.push({ name, url }); localStorage.setItem('aufw-bookmarks', JSON.stringify(bookmarks)); renderBookmarks(); };
        bookmarkContainer.appendChild(addBtn);
    }
    renderBookmarks(); renderSubTabs();

    // --- URL Navigation & Base44 Auto-Bypass ---
    function updateNavButtons() {
        const curTab = tabs.find(t => t.id === activeTabId);
        if (!curTab) return;
        btnBack.disabled = curTab.historyIndex <= 0;
        btnForward.disabled = curTab.historyIndex >= curTab.history.length - 1;
    }

    function getFormattedUrl(raw, workerBase = activeWorkerUrl) {
        if (!raw) return '';
        let targetUrl = (!/\s/.test(raw) && raw.includes('.')) ? ((!raw.startsWith('http://') && !raw.startsWith('https://')) ? 'https://' + raw : raw) : 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(raw);
        if (targetUrl.includes('base44.app')) return targetUrl;
        return (workerBase.endsWith('/') ? workerBase : workerBase + '/') + 'proxy/' + targetUrl;
    }

    function loadUrl(rawUrl, isHistoryNav = false) {
        if (!rawUrl) return;
        const curTab = tabs.find(t => t.id === activeTabId);
        if (!curTab) return;

        curTab.url = rawUrl; curTab.title = rawUrl.replace(/^https?:\/\//, '').split('/')[0];
        if (!isHistoryNav) { curTab.history = curTab.history.slice(0, curTab.historyIndex + 1); curTab.history.push(rawUrl); curTab.historyIndex++; recordHistory(rawUrl); }
        renderSubTabs(); updateNavButtons(); input.value = rawUrl; speedDial.classList.add('hidden'); loader.classList.add('active');
        
        // CHECK IF TAB IS PROXIED
        frame.src = curTab.isProxied ? getFormattedUrl(rawUrl) : rawUrl;
    }

    document.getElementById('aufw-go').onclick = () => { playUiSound(); loadUrl(input.value.trim()); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { playUiSound(); loadUrl(input.value.trim()); } };
    document.getElementById('aufw-reload').onclick = () => { playUiSound(); loader.classList.add('active'); frame.src = frame.src; };
    btnBack.onclick = () => { playUiSound(); const curTab = tabs.find(t => t.id === activeTabId); if (curTab && curTab.historyIndex > 0) { curTab.historyIndex--; loadUrl(curTab.history[curTab.historyIndex], true); } };
    btnForward.onclick = () => { playUiSound(); const curTab = tabs.find(t => t.id === activeTabId); if (curTab && curTab.historyIndex < curTab.history.length - 1) { curTab.historyIndex++; loadUrl(curTab.history[curTab.historyIndex], true); } };
    frame.onload = () => loader.classList.remove('active');
    document.getElementById('aufw-tab').onclick = () => { playUiSound(); if (input.value) window.open(getFormattedUrl(input.value.trim()), '_blank'); };

    // --- Mini Apps (Scratchpad / Calc) ---
    const scratchpad = document.getElementById('fwh-scratchpad');
    scratchpad.value = localStorage.getItem('aufw-scratchpad') || '';
    scratchpad.oninput = () => localStorage.setItem('aufw-scratchpad', scratchpad.value);

    const calcOut = document.getElementById('fwh-calc-out'); let calcExpr = '';
    root.querySelectorAll('.fwh-calc-btn').forEach(btn => {
        btn.onclick = () => {
            playUiSound(); const val = btn.innerText;
            if (val === 'C') { calcExpr = ''; calcOut.innerText = '0'; }
            else if (val === '=') { try { calcOut.innerText = eval(calcExpr) || '0'; calcExpr = calcOut.innerText; } catch (e) { calcOut.innerText = 'Error'; calcExpr = ''; } }
            else { calcExpr += val; calcOut.innerText = calcExpr; }
        };
    });

    // --- Backup & Restore ---
    document.getElementById('fwh-export-btn').onclick = () => {
        playUiSound(); const data = { bookmarks, speedDialTiles, panicConfig, activeAccent, activeWorkerUrl };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'freewillhub-profile.json'; a.click();
    };
    document.getElementById('fwh-import-btn').onclick = () => {
        playUiSound(); const raw = prompt('Paste JSON text:'); if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            if (parsed.bookmarks) localStorage.setItem('aufw-bookmarks', JSON.stringify(parsed.bookmarks));
            if (parsed.speedDialTiles) localStorage.setItem('aufw-speeddial-tiles', JSON.stringify(parsed.speedDialTiles));
            alert('Imported! Reloading...'); location.reload();
        } catch (e) { alert('Invalid Config!'); }
    };

    // --- Window Controls & Dragging Engine ---
    document.getElementById('aufw-close').onclick = () => { playUiSound(); root.remove(); style.remove(); ctxMenu.remove(); };
    document.getElementById('aufw-full').onclick = () => { playUiSound(); root.classList.toggle('fullscreen'); };
    document.getElementById('aufw-min').onclick = (e) => { playUiSound(); e.stopPropagation(); root.classList.remove('fullscreen', 'ghost-active'); root.classList.add('minimized'); };
    document.getElementById('aufw-opacity').oninput = (e) => { baseOpacity = e.target.value; localStorage.setItem('aufw-base-opacity', baseOpacity); root.style.opacity = baseOpacity; };
    function centerWindow() { playUiSound(); root.style.top = '50%'; root.style.left = '50%'; root.style.transform = 'translate(-50%, -50%)'; initialX = 0; initialY = 0; }
    document.getElementById('aufw-center').onclick = centerWindow;
    document.getElementById('aufw-drag').ondblclick = centerWindow;

    let isDragging = false, startX = 0, startY = 0, initialX = 0, initialY = 0, hasMoved = false;
    const dragHeader = document.getElementById('aufw-drag'), restoreIcon = document.getElementById('aufw-restore');

    restoreIcon.addEventListener('dragstart', (e) => e.preventDefault());

    function startDrag(e) {
        if (['BUTTON', 'INPUT', 'SELECT', 'OPTION'].includes(e.target.tagName) || root.classList.contains('fullscreen')) return;
        isDragging = true; hasMoved = false; startX = e.clientX - initialX; startY = e.clientY - initialY;
        frame.classList.add('no-pointer');
    }

    dragHeader.addEventListener('mousedown', startDrag);
    restoreIcon.addEventListener('mousedown', startDrag);

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return; e.preventDefault();
        const currentX = e.clientX - startX, currentY = e.clientY - startY;
        if (Math.abs(currentX - initialX) > 4 || Math.abs(currentY - initialY) > 4) hasMoved = true;
        initialX = currentX; initialY = currentY;
        root.style.transform = `translate(calc(-50% + ${initialX}px), calc(-50% + ${initialY}px))`;
    });

    document.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; frame.classList.remove('no-pointer'); } });

    restoreIcon.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!hasMoved) { playUiSound(); root.classList.remove('minimized', 'ghost-active'); }
    });
})();
