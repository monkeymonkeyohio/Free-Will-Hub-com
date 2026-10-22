(function() {
    const PRIMARY_WORKER_URL = 'https://a-proxy.327791.workers.dev/';
    const FALLBACK_WORKER_URL = 'https://a-proxy.xushan321321.workers.dev/';
    let activeWorkerUrl = localStorage.getItem('aufw-active-worker') || PRIMARY_WORKER_URL;

    // --- State Storage ---
    let bookmarks = JSON.parse(localStorage.getItem('aufw-bookmarks')) || [
        { name: 'Google', url: 'google.com' },
        { name: 'YouTube', url: 'https://utubedc.base44.app' },
        { name: 'Discord', url: 'discord.com' },
        { name: 'GitHub', url: 'github.com' }
    ];

    let panicConfig = JSON.parse(localStorage.getItem('aufw-panic')) || {
        key: '`',
        url: 'https://classroom.google.com/h'
    };

    let activeAccent = localStorage.getItem('aufw-accent') || '#6366f1';

    // Internal Tabs State
    let tabs = [
        { id: 'tab-1', title: 'New Tab', url: '', history: [], historyIndex: -1 }
    ];
    let activeTabId = 'tab-1';

    if (document.getElementById('aufw-proxy-root')) {
        document.getElementById('aufw-proxy-root').remove();
    }

    const root = document.createElement('div');
    root.id = 'aufw-proxy-root';

    const style = document.createElement('style');
    style.id = 'aufw-styles';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --fwh-accent: ${activeAccent};
            --fwh-accent-glow: ${activeAccent}4d;
            --fwh-accent-subtle: ${activeAccent}26;
        }

        #aufw-proxy-root {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 880px; height: 600px;
            background: #0b0d14;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            box-shadow: 0 30px 70px -10px rgba(0, 0, 0, 0.85), 0 0 30px var(--fwh-accent-glow);
            z-index: 9999999;
            display: flex; flex-direction: row;
            overflow: hidden; resize: both;
            min-width: 540px; min-height: 400px;
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
            border: 2px solid var(--fwh-accent);
            box-shadow: 0 0 20px var(--fwh-accent-glow);
        }

        /* SIDEBAR */
        .fwh-sidebar {
            width: 58px; background: #11131c;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            display: flex; flex-direction: column; align-items: center;
            padding: 14px 0; gap: 16px; user-select: none; z-index: 2;
        }

        .fwh-logo {
            width: 32px; height: 32px; border-radius: 8px;
            object-fit: cover; cursor: pointer;
            box-shadow: 0 0 12px var(--fwh-accent-glow);
        }

        .fwh-nav-group { display: flex; flex-direction: column; gap: 8px; width: 100%; align-items: center; }

        .fwh-nav-item {
            width: 40px; height: 40px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: #64748b; font-size: 18px; cursor: pointer;
            transition: all 0.2s ease; position: relative;
        }

        .fwh-nav-item:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }

        .fwh-nav-item.active {
            color: #ffffff; background: var(--fwh-accent-subtle);
        }

        .fwh-nav-item.active::before {
            content: ''; position: absolute; left: -9px; top: 10px; bottom: 10px;
            width: 3px; background: var(--fwh-accent); border-radius: 0 4px 4px 0;
        }

        /* CONTENT WRAPPER */
        .fwh-content-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }

        /* HEADER */
        .fwh-header {
            background: rgba(255, 255, 255, 0.02); padding: 8px 16px;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: move; user-select: none;
        }

        .fwh-header-title { display: flex; align-items: center; gap: 10px; color: #f8fafc; font-size: 13px; font-weight: 700; }
        .fwh-version-tag { font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); color: #94a3b8; }

        .fwh-status-badge {
            font-size: 10px; padding: 3px 10px; border-radius: 12px;
            background: rgba(16, 185, 129, 0.12); color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.25); font-weight: 600;
            display: flex; align-items: center; gap: 6px; cursor: pointer;
        }
        .fwh-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }

        .fwh-controls { display: flex; align-items: center; gap: 6px; }
        .fwh-icon-btn {
            background: transparent; border: none; color: #64748b;
            border-radius: 6px; padding: 5px 8px; cursor: pointer;
            font-size: 13px; transition: all 0.2s ease;
        }
        .fwh-icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #ffffff; }
        .fwh-icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        /* INTERNAL TABS BAR */
        .fwh-tabs-bar {
            display: flex; align-items: center; gap: 4px; padding: 6px 12px 0;
            background: #0f111a; border-bottom: 1px solid rgba(255,255,255,0.05);
            overflow-x: auto;
        }
        .fwh-tab-item {
            display: flex; align-items: center; gap: 8px; padding: 6px 12px;
            background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 11px;
            border-radius: 8px 8px 0 0; cursor: pointer; max-width: 140px;
            border: 1px solid transparent; border-bottom: none; transition: all 0.2s;
        }
        .fwh-tab-item:hover { background: rgba(255,255,255,0.06); color: #f8fafc; }
        .fwh-tab-item.active {
            background: #151824; color: #ffffff;
            border-color: rgba(255,255,255,0.08); border-top: 2px solid var(--fwh-accent);
        }
        .fwh-tab-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .fwh-tab-close { font-size: 12px; color: #64748b; border-radius: 50%; padding: 0 3px; }
        .fwh-tab-close:hover { color: #f43f5e; background: rgba(244,63,94,0.15); }
        .fwh-new-tab-btn {
            background: transparent; border: none; color: #818cf8;
            font-size: 14px; padding: 4px 8px; cursor: pointer; border-radius: 6px;
        }
        .fwh-new-tab-btn:hover { background: rgba(255,255,255,0.05); }

        /* BROWSER BAR & BOOKMARKS */
        .fwh-tab-panel { display: none; flex: 1; flex-direction: column; overflow: hidden; }
        .fwh-tab-panel.active { display: flex; }

        .fwh-bar {
            background: rgba(0, 0, 0, 0.2); padding: 8px 14px;
            display: flex; gap: 8px; align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .fwh-input {
            flex: 1; background: #151824; border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px; padding: 8px 14px; color: #f8fafc; font-size: 13px; outline: none;
            transition: all 0.2s; font-family: inherit;
        }
        .fwh-input:focus { border-color: var(--fwh-accent); background: #1a1e2e; box-shadow: 0 0 12px var(--fwh-accent-glow); }

        .fwh-btn {
            background: var(--fwh-accent); color: #ffffff; border: none; border-radius: 8px;
            padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 14px var(--fwh-accent-glow);
        }
        .fwh-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

        .fwh-bookmarks {
            display: flex; gap: 6px; padding: 6px 14px; background: rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05); overflow-x: auto; align-items: center;
        }
        .fwh-bookmark-chip {
            background: rgba(255,255,255,0.05); color: #cbd5e1; font-size: 11px;
            padding: 4px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap;
            display: flex; align-items: center; gap: 6px; border: 1px solid transparent; transition: all 0.2s;
        }
        .fwh-bookmark-chip:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .fwh-bookmark-del { color: #f43f5e; display: none; }
        .fwh-bookmark-chip:hover .fwh-bookmark-del { display: inline-block; }
        .fwh-add-bookmark {
            background: transparent; color: var(--fwh-accent); border: 1px dashed var(--fwh-accent);
            font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; font-weight: 600;
        }

        /* FRAME CONTAINER & SPEED DIAL GRID */
        .fwh-frame-container { flex: 1; width: 100%; height: 100%; background: #0b0d14; position: relative; }
        .fwh-iframe { width: 100%; height: 100%; border: none; background: #fff; }
        .fwh-iframe.no-pointer { pointer-events: none !important; }

        .fwh-speeddial {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: #0d0f18; display: flex; flex-direction: column; align-items: center;
            justify-content: center; gap: 24px; z-index: 5; padding: 20px;
        }
        .fwh-speeddial.hidden { display: none; }
        .fwh-speeddial-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 500px; width: 100%;
        }
        .fwh-speeddial-card {
            background: #141724; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
            padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;
            cursor: pointer; transition: all 0.2s; text-align: center; color: #f8fafc;
        }
        .fwh-speeddial-card:hover {
            border-color: var(--fwh-accent); transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .fwh-speeddial-icon { font-size: 24px; }
        .fwh-speeddial-label { font-size: 12px; font-weight: 600; }

        .fwh-loader {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(11, 13, 20, 0.94); display: flex; flex-direction: column;
            align-items: center; justify-content: center; z-index: 10;
            opacity: 0; pointer-events: none; transition: opacity 0.25s;
        }
        .fwh-loader.active { opacity: 1; pointer-events: all; }
        .fwh-spinner {
            width: 36px; height: 36px; border: 3px solid var(--fwh-accent-subtle);
            border-top-color: var(--fwh-accent); border-radius: 50%; animation: fwh-spin 0.8s linear infinite;
        }
        .fwh-loader-text { margin-top: 14px; color: var(--fwh-accent); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; }
        @keyframes fwh-spin { to { transform: rotate(360deg); } }

        /* SETTINGS & MODAL */
        .fwh-settings-view { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        .fwh-card {
            background: #131622; border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;
        }
        .fwh-card-info h4 { margin: 0; color: #f8fafc; font-size: 13px; font-weight: 600; }
        .fwh-card-info p { margin: 4px 0 0; color: #64748b; font-size: 11px; }

        .fwh-color-picker { display: flex; gap: 8px; }
        .fwh-color-dot {
            width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.2s;
        }
        .fwh-color-dot:hover { transform: scale(1.15); }
        .fwh-color-dot.active { border-color: #ffffff; }

        .fwh-select, .fwh-settings-input {
            background: #1c2030; border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none;
        }

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
        .fwh-modal-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px; }
        .fwh-modal-title { color: #f8fafc; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .fwh-patch-list { display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto; }
        .fwh-patch-item { display: flex; gap: 10px; font-size: 12px; color: #cbd5e1; line-height: 1.4; }
        .fwh-patch-tag { background: var(--fwh-accent-subtle); color: var(--fwh-accent); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; height: fit-content; }

        .fwh-minimized-icon { display: none; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; cursor: pointer; }
        .fwh-minimized-icon img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

        #aufw-proxy-root.minimized .fwh-sidebar,
        #aufw-proxy-root.minimized .fwh-content-wrap { display: none !important; }
        #aufw-proxy-root.minimized .fwh-minimized-icon { display: block !important; }
    `;

    root.innerHTML = `
        <div class="fwh-sidebar">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" class="fwh-logo" id="fwh-logo-btn" title="Free Will Hub V1.2.0">
            <div class="fwh-nav-group">
                <div class="fwh-nav-item active" data-tab="browser" title="Browser">&#127760;</div>
                <div class="fwh-nav-item" data-tab="settings" title="Settings">&#9881;</div>
                <div class="fwh-nav-item" data-tab="patchnotes" title="Patch Notes">&#128220;</div>
            </div>
        </div>

        <div class="fwh-content-wrap">
            <div class="fwh-header" id="aufw-drag">
                <div class="fwh-header-title">
                    <span>Free Will Hub</span>
                    <span class="fwh-version-tag">V1.2.0</span>
                    <div class="fwh-status-badge" id="aufw-worker-status" title="Switch Proxy Node">
                        <div class="fwh-status-dot" id="fwh-status-dot"></div>
                        <span id="fwh-node-text">Node 1</span>
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
                    <!-- Dynamic Sub-Tabs Rendered Here -->
                    <button class="fwh-new-tab-btn" id="fwh-add-tab-btn" title="New Tab">+</button>
                </div>

                <div class="fwh-bar">
                    <button class="fwh-icon-btn" id="aufw-back" title="Back" disabled>&#9664;</button>
                    <button class="fwh-icon-btn" id="aufw-forward" title="Forward" disabled>&#9654;</button>
                    <button class="fwh-icon-btn" id="aufw-reload" title="Reload">&#8635;</button>
                    <input type="text" class="fwh-input" id="aufw-url" placeholder="Search web or enter target URL..." autocomplete="off" />
                    <button class="fwh-btn" id="aufw-go">Launch</button>
                    <button class="fwh-icon-btn" id="aufw-tab" title="Open in dedicated browser tab">&#8599;</button>
                </div>

                <div class="fwh-bookmarks" id="aufw-bookmark-container"></div>

                <div class="fwh-frame-container">
                    <!-- SPEED DIAL GRID (Blank State) -->
                    <div class="fwh-speeddial" id="aufw-speeddial">
                        <div style="color: #f8fafc; font-size: 16px; font-weight: 700;">Quick Access Launcher</div>
                        <div class="fwh-speeddial-grid">
                            <div class="fwh-speeddial-card" data-url="https://lite.duckduckgo.com/">
                                <div class="fwh-speeddial-icon">&#128038;</div>
                                <div class="fwh-speeddial-label">DuckDuckGo</div>
                            </div>
                            <div class="fwh-speeddial-card" data-url="https://utubedc.base44.app">
                                <div class="fwh-speeddial-icon">&#9654;</div>
                                <div class="fwh-speeddial-label">YouTube</div>
                            </div>
                            <div class="fwh-speeddial-card" data-url="discord.com">
                                <div class="fwh-speeddial-icon">&#128172;</div>
                                <div class="fwh-speeddial-label">Discord</div>
                            </div>
                            <div class="fwh-speeddial-card" data-url="github.com">
                                <div class="fwh-speeddial-icon">&#128187;</div>
                                <div class="fwh-speeddial-label">GitHub</div>
                            </div>
                        </div>
                    </div>

                    <div class="fwh-loader" id="aufw-loader">
                        <div class="fwh-spinner"></div>
                        <div class="fwh-loader-text">CONNECTING TO FREE WILL HUB PROXY</div>
                    </div>
                    <iframe class="fwh-iframe" id="aufw-frame" allow="autoplay; fullscreen; microphone; camera; pointer-lock" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"></iframe>
                </div>
            </div>

            <!-- TAB 2: SETTINGS -->
            <div class="fwh-tab-panel" id="tab-settings">
                <div class="fwh-settings-view">
                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>UI Accent Color Theme</h4>
                            <p>Customize primary color theme for the Venyx console</p>
                        </div>
                        <div class="fwh-color-picker">
                            <div class="fwh-color-dot" data-color="#6366f1" style="background: #6366f1;" title="Indigo"></div>
                            <div class="fwh-color-dot" data-color="#06b6d4" style="background: #06b6d4;" title="Cyan"></div>
                            <div class="fwh-color-dot" data-color="#10b981" style="background: #10b981;" title="Emerald"></div>
                            <div class="fwh-color-dot" data-color="#f43f5e" style="background: #f43f5e;" title="Crimson"></div>
                            <div class="fwh-color-dot" data-color="#8b5cf6" style="background: #8b5cf6;" title="Violet"></div>
                            <div class="fwh-color-dot" data-color="#f59e0b" style="background: #f59e0b;" title="Amber"></div>
                        </div>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Tab Cloaking (Mask Title & Icon)</h4>
                            <p>Disguise host page title and favicon</p>
                        </div>
                        <select class="fwh-select" id="aufw-cloaker">
                            <option value="none">None (Default)</option>
                            <option value="classroom">Google Classroom</option>
                            <option value="docs">Google Docs</option>
                            <option value="drive">Google Drive</option>
                        </select>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Panic Shortcut Key & Target</h4>
                            <p>Press key to immediately redirect page</p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" class="fwh-settings-input" id="aufw-panic-key" style="width: 40px; text-align: center;" value="${panicConfig.key}" maxlength="1">
                            <input type="text" class="fwh-settings-input" id="aufw-panic-url" style="width: 160px;" value="${panicConfig.url}">
                        </div>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Active Proxy Worker Node</h4>
                            <p>Switch primary and fallback proxy routing workers</p>
                        </div>
                        <button class="fwh-btn" id="fwh-settings-node-btn">Switch Node</button>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Search Engine Provider</h4>
                            <p>Default engine for text search queries</p>
                        </div>
                        <select class="fwh-select" id="aufw-engine">
                            <option value="ddg">DuckDuckGo</option>
                            <option value="google">Google</option>
                            <option value="bing">Bing</option>
                        </select>
                    </div>

                    <div class="fwh-card">
                        <div class="fwh-card-info">
                            <h4>Console Opacity (Ghost Mode)</h4>
                            <p>Adjust window transparency</p>
                        </div>
                        <input type="range" class="fwh-slider" id="aufw-opacity" min="0.15" max="1" step="0.05" value="1" style="width: 110px; accent-color: var(--fwh-accent);">
                    </div>
                </div>
            </div>

            <!-- TAB 3: PATCH NOTES VIEW -->
            <div class="fwh-tab-panel" id="tab-patchnotes">
                <div class="fwh-settings-view">
                    <div class="fwh-modal" style="width: 100%; box-sizing: border-box;">
                        <div class="fwh-modal-header">
                            <div class="fwh-modal-title">&#128220; Patch Notes Log</div>
                        </div>
                        <div class="fwh-patch-list">
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.2.0</span>
                                <div>Added Multi-Tab Internal Browser Bar, Accent Color Customizer, Speed Dial, Tab Cloaker, and Panic Hotkey Config.</div>
                            </div>
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.1.0</span>
                                <div>Redesigned UI with dark Venyx theme, left vertical sidebar navigation, and startup patch notes dialog.</div>
                            </div>
                            <div class="fwh-patch-item">
                                <span class="fwh-patch-tag">V1.0.5</span>
                                <div>Upgraded Cloudflare Worker pipeline to path-prefix routing (/proxy/) for Vite module imports.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- STARTUP MODAL -->
            <div class="fwh-modal-overlay" id="fwh-patch-modal">
                <div class="fwh-modal">
                    <div class="fwh-modal-header">
                        <div class="fwh-modal-title">&#128640; Free Will Hub V1.2.0</div>
                    </div>
                    <div class="fwh-patch-list">
                        <div class="fwh-patch-item">
                            <span class="fwh-patch-tag">NEW</span>
                            <div>Added internal sub-tabs and Speed Dial launcher.</div>
                        </div>
                        <div class="fwh-patch-item">
                            <span class="fwh-patch-tag">NEW</span>
                            <div>UI Accent Color Theme Customizer & Tab Cloaker.</div>
                        </div>
                    </div>
                    <button class="fwh-btn" id="fwh-continue-btn" style="width: 100%; margin-top: 8px;">Continue</button>
                </div>
            </div>
        </div>

        <div class="fwh-minimized-icon" id="aufw-restore" title="Restore Console">
            <img src="https://i.ibb.co/8gx87ScN/Proxy-Logo.png" alt="Restore">
        </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(root);

    // --- DOM Elements ---
    const frame = document.getElementById('aufw-frame');
    const input = document.getElementById('aufw-url');
    const loader = document.getElementById('aufw-loader');
    const speedDial = document.getElementById('aufw-speeddial');
    const btnBack = document.getElementById('aufw-back');
    const btnForward = document.getElementById('aufw-forward');
    const workerStatus = document.getElementById('aufw-worker-status');
    const nodeText = document.getElementById('fwh-node-text');
    const statusDot = document.getElementById('fwh-status-dot');
    const settingsNodeBtn = document.getElementById('fwh-settings-node-btn');
    const engineSelect = document.getElementById('aufw-engine');
    const bookmarkContainer = document.getElementById('aufw-bookmark-container');
    const patchModal = document.getElementById('fwh-patch-modal');
    const tabsContainer = document.getElementById('fwh-internal-tabs');
    const addTabBtn = document.getElementById('fwh-add-tab-btn');

    document.getElementById('fwh-continue-btn').onclick = () => patchModal.classList.add('hidden');

    // --- Sidebar Navigation ---
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

    // --- Accent Theme Engine ---
    root.querySelectorAll('.fwh-color-dot').forEach(dot => {
        if (dot.getAttribute('data-color') === activeAccent) dot.classList.add('active');
        dot.onclick = () => {
            root.querySelectorAll('.fwh-color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            activeAccent = dot.getAttribute('data-color');
            localStorage.setItem('aufw-accent', activeAccent);
            
            document.documentElement.style.setProperty('--fwh-accent', activeAccent);
            document.documentElement.style.setProperty('--fwh-accent-glow', activeAccent + '4d');
            document.documentElement.style.setProperty('--fwh-accent-subtle', activeAccent + '26');
        };
    });

    // --- Tab Cloaker ---
    document.getElementById('aufw-cloaker').onchange = (e) => {
        const val = e.target.value;
        if (val === 'classroom') {
            document.title = 'Home - Classroom';
            changeFavicon('https://ssl.gstatic.com/classroom/favicon.png');
        } else if (val === 'docs') {
            document.title = 'Google Docs';
            changeFavicon('https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico');
        } else if (val === 'drive') {
            document.title = 'My Drive - Google Drive';
            changeFavicon('https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png');
        }
    };

    function changeFavicon(src) {
        let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = src;
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    // --- Panic Key Config ---
    const panicKeyInput = document.getElementById('aufw-panic-key');
    const panicUrlInput = document.getElementById('aufw-panic-url');

    panicKeyInput.onchange = () => { panicConfig.key = panicKeyInput.value || '`'; localStorage.setItem('aufw-panic', JSON.stringify(panicConfig)); };
    panicUrlInput.onchange = () => { panicConfig.url = panicUrlInput.value || 'https://classroom.google.com/h'; localStorage.setItem('aufw-panic', JSON.stringify(panicConfig)); };

    document.addEventListener("keydown", (e) => {
        if (e.key === panicConfig.key) { window.location.href = panicConfig.url; }
    });

    // --- Worker Switcher ---
    function updateWorkerUI() {
        if (activeWorkerUrl === PRIMARY_WORKER_URL) {
            nodeText.innerText = 'Node 1';
            statusDot.style.background = '#10b981';
            settingsNodeBtn.innerText = 'Switch to Node 2 (Fallback)';
        } else {
            nodeText.innerText = 'Node 2';
            statusDot.style.background = '#f59e0b';
            settingsNodeBtn.innerText = 'Switch to Node 1 (Primary)';
        }
    }
    updateWorkerUI();

    function toggleWorkerNode() {
        activeWorkerUrl = (activeWorkerUrl === PRIMARY_WORKER_URL) ? FALLBACK_WORKER_URL : PRIMARY_WORKER_URL;
        localStorage.setItem('aufw-active-worker', activeWorkerUrl);
        updateWorkerUI();
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.url) loadUrl(activeTab.url, true);
    }

    workerStatus.onclick = toggleWorkerNode;
    settingsNodeBtn.onclick = toggleWorkerNode;

    // --- Multi-Tab Internal Navigation Engine ---
    function renderSubTabs() {
        tabsContainer.querySelectorAll('.fwh-tab-item').forEach(e => e.remove());
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `fwh-tab-item ${tab.id === activeTabId ? 'active' : ''}`;
            tabEl.innerHTML = `
                <span class="fwh-tab-title">${tab.title}</span>
                <span class="fwh-tab-close">&times;</span>
            `;
            tabEl.onclick = () => switchSubTab(tab.id);
            tabEl.querySelector('.fwh-tab-close').onclick = (e) => {
                e.stopPropagation();
                closeSubTab(tab.id);
            };
            tabsContainer.insertBefore(tabEl, addTabBtn);
        });
    }

    function switchSubTab(id) {
        activeTabId = id;
        renderSubTabs();
        const curTab = tabs.find(t => t.id === id);
        if (!curTab.url) {
            speedDial.classList.remove('hidden');
            input.value = '';
            frame.src = 'about:blank';
        } else {
            speedDial.classList.add('hidden');
            input.value = curTab.url;
            frame.src = getFormattedUrl(curTab.url);
        }
        updateNavButtons();
    }

    function createSubTab(url = '') {
        const id = 'tab-' + Date.now();
        tabs.push({ id, title: url ? url : 'New Tab', url, history: url ? [url] : [], historyIndex: url ? 0 : -1 });
        switchSubTab(id);
    }

    function closeSubTab(id) {
        if (tabs.length === 1) return;
        tabs = tabs.filter(t => t.id !== id);
        if (activeTabId === id) activeTabId = tabs[tabs.length - 1].id;
        renderSubTabs();
        switchSubTab(activeTabId);
    }

    addTabBtn.onclick = () => createSubTab('');

    // Speed dial card clicks
    root.querySelectorAll('.fwh-speeddial-card').forEach(card => {
        card.onclick = () => {
            const targetUrl = card.getAttribute('data-url');
            loadUrl(targetUrl);
        };
    });

    // --- URL Navigation & Formatting ---
    function updateNavButtons() {
        const curTab = tabs.find(t => t.id === activeTabId);
        if (!curTab) return;
        btnBack.disabled = curTab.historyIndex <= 0;
        btnForward.disabled = curTab.historyIndex >= curTab.history.length - 1;
    }

    function getFormattedUrl(raw, workerBase = activeWorkerUrl) {
        if (!raw) return '';
        let targetUrl;
        if (!/\s/.test(raw) && raw.includes('.')) {
            targetUrl = (!raw.startsWith('http://') && !raw.startsWith('https://')) ? 'https://' + raw : raw;
        } else {
            const engine = engineSelect.value;
            if (engine === 'google') targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(raw);
            else if (engine === 'bing') targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(raw);
            else targetUrl = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(raw);
        }
        const base = workerBase.endsWith('/') ? workerBase : workerBase + '/';
        return base + 'proxy/' + targetUrl;
    }

    function loadUrl(rawUrl, isHistoryNav = false) {
        if (!rawUrl) return;
        const curTab = tabs.find(t => t.id === activeTabId);
        if (!curTab) return;

        curTab.url = rawUrl;
        curTab.title = rawUrl.replace(/^https?:\/\//, '').split('/')[0];

        if (!isHistoryNav) {
            curTab.history = curTab.history.slice(0, curTab.historyIndex + 1);
            curTab.history.push(rawUrl);
            curTab.historyIndex++;
        }

        renderSubTabs();
        updateNavButtons();

        input.value = rawUrl;
        speedDial.classList.add('hidden');
        loader.classList.add('active');
        frame.src = getFormattedUrl(rawUrl);
    }

    document.getElementById('aufw-go').onclick = () => loadUrl(input.value.trim());
    input.onkeydown = (e) => { if (e.key === 'Enter') loadUrl(input.value.trim()); };
    document.getElementById('aufw-reload').onclick = () => { loader.classList.add('active'); frame.src = frame.src; };

    btnBack.onclick = () => {
        const curTab = tabs.find(t => t.id === activeTabId);
        if (curTab && curTab.historyIndex > 0) {
            curTab.historyIndex--;
            loadUrl(curTab.history[curTab.historyIndex], true);
        }
    };

    btnForward.onclick = () => {
        const curTab = tabs.find(t => t.id === activeTabId);
        if (curTab && curTab.historyIndex < curTab.history.length - 1) {
            curTab.historyIndex++;
            loadUrl(curTab.history[curTab.historyIndex], true);
        }
    };

    frame.onload = () => loader.classList.remove('active');

    document.getElementById('aufw-tab').onclick = () => {
        if (input.value) window.open(getFormattedUrl(input.value.trim()), '_blank');
    };

    // --- Bookmarks ---
    function renderBookmarks() {
        bookmarkContainer.innerHTML = '';
        bookmarks.forEach((bm, index) => {
            const chip = document.createElement('div');
            chip.className = 'fwh-bookmark-chip';
            chip.innerHTML = `<span>${bm.name}</span><span class="fwh-bookmark-del">&times;</span>`;
            chip.querySelector('span').onclick = () => { navItems[0].click(); loadUrl(bm.url); };
            chip.querySelector('.fwh-bookmark-del').onclick = (e) => {
                e.stopPropagation(); bookmarks.splice(index, 1);
                localStorage.setItem('aufw-bookmarks', JSON.stringify(bookmarks)); renderBookmarks();
            };
            bookmarkContainer.appendChild(chip);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'fwh-add-bookmark'; addBtn.innerText = '+ Add';
        addBtn.onclick = () => {
            const name = prompt('Bookmark Title:'); if (!name) return;
            const url = prompt('URL or Domain:'); if (!url) return;
            bookmarks.push({ name, url });
            localStorage.setItem('aufw-bookmarks', JSON.stringify(bookmarks)); renderBookmarks();
        };
        bookmarkContainer.appendChild(addBtn);
    }
    renderBookmarks();
    renderSubTabs();

    // --- Controls & Centering ---
    document.getElementById('aufw-close').onclick = () => { root.remove(); style.remove(); };
    document.getElementById('aufw-full').onclick = () => root.classList.toggle('fullscreen');
    document.getElementById('aufw-min').onclick = (e) => {
        e.stopPropagation(); root.classList.remove('fullscreen'); root.classList.add('minimized');
    };
    document.getElementById('aufw-opacity').oninput = (e) => root.style.opacity = e.target.value;

    function centerWindow() {
        root.style.top = '50%'; root.style.left = '50%'; root.style.transform = 'translate(-50%, -50%)';
        initialX = 0; initialY = 0;
    }

    document.getElementById('aufw-center').onclick = centerWindow;
    document.getElementById('aufw-drag').ondblclick = centerWindow;

    // --- Dragging Engine ---
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
        let moveX = e.clientX - startX; let moveY = e.clientY - startY;
        if (Math.abs(moveX - initialX) > 3 || Math.abs(moveY - initialY) > 3) hasMoved = true;
        initialX = moveX; initialY = moveY;
        root.style.transform = `translate(calc(-50% + ${initialX}px), calc(-50% + ${initialY}px))`;
    };

    document.onmouseup = () => { isDragging = false; frame.classList.remove('no-pointer'); };

    restoreIcon.onclick = () => {
        if (!hasMoved) root.classList.remove('minimized');
    };
})();


