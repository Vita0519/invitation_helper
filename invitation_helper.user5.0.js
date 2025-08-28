// ==UserScript==
// @name         企业微信文档邀请助手
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  在腾讯文档页面和通讯录iFrame中，自动化邀请团队成员。
// @author       victor0519
// @match        *://doc.weixin.qq.com/*
// @match        *://open.work.weixin.qq.com/wwopen/openData/tree/frame*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// ==/UserScript==

(function() {
    'use strict';

    // --- Constants ---
    const CONFIG_PREFIX = 'invitation_list_';
    const LAST_SELECTED_KEY = 'last_selected_list';
    const PANEL_VISIBLE_KEY = 'panel_visible';
    const DEFAULT_LIST_NAME = "默认周报名单";
    const DEFAULT_PERSONS = ['xxx', '八戒', '酱爆', 'Garson','煎饼果子（86）', 'BEelzebub','飞天雾','回忆'];
    const SPLIT_REGEX = /[,，；、\n\r]/; // Added '、' to separators

    // --- Shared Utilities ---
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function robustClick(element) {
        // A more robust click method using event dispatching, which is safer than accessing framework-specific properties.
        try {
            console.log("Inv-Helper: Clicking via dispatching mouse events.");
            const eventInit = { bubbles: true, cancelable: true, view: window };
            element.dispatchEvent(new MouseEvent('mousedown', eventInit));
            element.dispatchEvent(new MouseEvent('mouseup', eventInit));
            element.dispatchEvent(new MouseEvent('click', eventInit));
        } catch (e) {
            console.log(`Inv-Helper: Dispatching events failed: ${e.message}. Falling back to element.click().`);
            // Final fallback to the simplest click
            element.click();
        }
    }

    function waitForElement(selector, container = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let elapsedTime = 0;
            const interval = setInterval(() => {
                const element = container.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    return resolve(element);
                }
                elapsedTime += intervalTime;
                if (elapsedTime >= timeout) {
                    clearInterval(interval);
                    reject(new Error(`Element "${selector}" not found within ${timeout}ms.`));
                }
            }, intervalTime);
        });
    }

    // --- Iframe-specific Logic ---
    function initIframe() {
        console.log("文档邀请助手: Iframe 脚本已加载。");

        const observer = new MutationObserver((mutationsList, obs) => {
            for(const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const resultNode = document.querySelector('.wwtree_rctree-treenode .list-node');
                    if (resultNode) {
                        console.log("文档邀请助手: 在Iframe中找到搜索结果，正在点击...");
                        robustClick(resultNode);
                        // Once clicked, we can stop observing to avoid multiple clicks
                        obs.disconnect();
                        // Re-initialize observer for the next search
                        setTimeout(initIframe, 500);
                        return;
                    }
                }
            }
        });

        waitForElement('body').then(body => {
            observer.observe(body, { childList: true, subtree: true });
            console.log("文档邀请助手: Iframe 观察器已启动。");
        }).catch(e => console.error("文档邀请助手: Iframe body 未找到。", e));
    }


    // --- Main Frame-specific Logic ---
    function initMainFrame() {
        console.log("文档邀请助手: 主页面脚本已加载。");

        // --- State Management ---
        const state = {
            lists: {}, selectedList: null, isProcessing: false, shouldStop: false,
            isPanelVisible: true, isPanelMinimized: false, isModalVisible: false, log: [],
        };

        // --- UI (HTML & CSS) ---
        const panelHTML = `
            <div id="invitation-helper-panel" class="draggable-panel">
                <div class="panel-header">
                    <div>
                        <strong>文档邀请助手 v5.0</strong>
                        <a href="https://www.allfather.top/" target="_blank" title="作者博客">victor0519</a>
                        <a href="https://github.com/Vita0519" target="_blank" title="github">github</a>
                    </div>
                    <div class="panel-controls">
                        <button id="panel-minimize-btn" title="最小化">—</button>
                        <button id="panel-close-btn" title="关闭">X</button>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="form-group">
                        <label for="list-selector">邀请名单:</label>
                        <select id="list-selector"></select>
                    </div>
                    <div class="form-group btn-group">
                        <button id="new-list-btn">新建</button>
                        <button id="save-list-btn">保存</button>
                        <button id="delete-list-btn">删除</button>
                    </div>
                    <div class="form-group">
                        <textarea id="invite-person-input" placeholder="请输入需要邀请的人员名单，用逗号、分号或换行分隔"></textarea>
                    </div>
                    <div class="form-group btn-group">
                        <button id="execute-button" disabled>🚀 开始邀请</button>
                    </div>
                    <div class="log-container">
                        <strong>操作日志:</strong>
                        <div id="log-text"></div>
                    </div>
                </div>
            </div>
            <div id="new-list-modal" class="modal-hidden">
                <div class="modal-content">
                    <h3>新建邀请名单</h3>
                    <input type="text" id="new-list-name-input" placeholder="输入名单名称">
                    <textarea id="new-list-members-input" placeholder="输入成员，用逗号分隔"></textarea>
                    <div class="modal-buttons">
                        <button id="modal-save-btn">保存</button>
                        <button id="modal-cancel-btn">取消</button>
                    </div>
                </div>
            </div>
        `;

        const panelCSS = `
            #invitation-helper-panel {
                position: fixed; top: 100px; right: 20px; width: 320px;
                background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 2147483646;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 14px; color: #333;
                transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
                visibility: visible; opacity: 1; transform: scale(1);
            }
            #invitation-helper-panel.hidden { opacity: 0; transform: scale(0.95); visibility: hidden; }
            .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background-color: #f7f7f7; border-bottom: 1px solid #e0e0e0; cursor: move; border-top-left-radius: 8px; border-top-right-radius: 8px; }
            .panel-header strong { font-weight: 600; margin-right: 8px; }
            .panel-header a { color: #007bff; text-decoration: none; font-size: 12px; }
            .panel-header a:hover { text-decoration: underline; }
            .panel-controls button { background: none; border: none; cursor: pointer; font-size: 16px; color: #888; padding: 2px 4px; }
            .panel-controls button:hover { color: #000; }
            .panel-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
            .form-group { display: flex; flex-direction: column; gap: 5px; }
            .btn-group { flex-direction: row; justify-content: space-around; gap: 10px; }
            #list-selector, #invite-person-input, .btn-group button, #execute-button { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            #invite-person-input { height: 120px; resize: vertical; }
            #execute-button { color: white; border: none; font-weight: bold; cursor: pointer; transition: background-color 0.2s; background-color: #4CAF50; }
            #execute-button:hover { background-color: #45a049; }
            #execute-button:disabled { background-color: #cccccc; cursor: not-allowed; }
            .log-container { margin-top: 10px; }
            #log-text { height: 100px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 8px; font-family: Consolas, Monaco, monospace; font-size: 12px; overflow-y: auto; word-wrap: break-word; }
            #log-text a { color: #007bff; }
            #new-list-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; align-items: center; justify-content: center; }
            #new-list-modal.modal-hidden { display: none; }
            .modal-content { background: white; padding: 20px; border-radius: 8px; width: 350px; display: flex; flex-direction: column; gap: 15px; }
            .modal-content h3 { margin: 0; text-align: center; }
            .modal-content input, .modal-content textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            .modal-content textarea { height: 100px; resize: vertical; }
            .modal-buttons { display: flex; justify-content: flex-end; gap: 10px; }
            .modal-buttons button { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }
            #modal-save-btn { background-color: #4CAF50; color: white; }
            #modal-cancel-btn { background-color: #f0f0f0; }
        `;

        // --- UI Rendering ---
        function render() {
            const panel = document.getElementById('invitation-helper-panel');
            panel.classList.toggle('hidden', !state.isPanelVisible);
            panel.querySelector('.panel-body').style.display = state.isPanelMinimized ? 'none' : 'flex';
            document.getElementById('panel-minimize-btn').textContent = state.isPanelMinimized ? '❐' : '—';

            const selector = document.getElementById('list-selector');
            selector.innerHTML = '';
            for (const name in state.lists) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                selector.appendChild(option);
            }
            selector.value = state.selectedList;

            const personInput = document.getElementById('invite-person-input');
            personInput.value = state.lists[state.selectedList] || '';

            const isIdle = !state.isProcessing;
            document.getElementById('execute-button').disabled = !isIdle;
            document.getElementById('list-selector').disabled = !isIdle;
            document.getElementById('invite-person-input').disabled = !isIdle;
            document.getElementById('new-list-btn').disabled = !isIdle;
            document.getElementById('save-list-btn').disabled = !isIdle;
            document.getElementById('delete-list-btn').disabled = !isIdle;

            const logText = document.getElementById('log-text');
            logText.innerHTML = state.log.join('');
            logText.scrollTop = logText.scrollHeight;

            document.getElementById('new-list-modal').classList.toggle('modal-hidden', !state.isModalVisible);
        }

        // --- State Updaters ---
        function setState(newState) {
            Object.assign(state, newState);
            render();
        }

        function log(message) {
            const time = new Date().toLocaleTimeString();
            const newLog = [...state.log, `[${time}] ${message}<br>`];
            setState({ log: newLog });
        }

        // --- Data Storage & Handlers ---
        async function loadAllListsFromStorage() {
            const keys = await GM_listValues();
            const lists = {};
            for (const key of keys) {
                if (key.startsWith(CONFIG_PREFIX)) {
                    lists[key.substring(CONFIG_PREFIX.length)] = await GM_getValue(key);
                }
            }
            if (Object.keys(lists).length === 0) {
                lists[DEFAULT_LIST_NAME] = DEFAULT_PERSONS.join(', ');
                await GM_setValue(CONFIG_PREFIX + DEFAULT_LIST_NAME, lists[DEFAULT_LIST_NAME]);
            }
            const lastSelected = await GM_getValue(LAST_SELECTED_KEY, DEFAULT_LIST_NAME);
            setState({ lists, selectedList: lists[lastSelected] ? lastSelected : Object.keys(lists)[0] });
            log("名单加载完成。");
        }

        async function saveListToStorage(name, members) {
            const formattedMembers = members.split(SPLIT_REGEX).map(n => n.trim()).filter(Boolean).join(', ');
            await GM_setValue(CONFIG_PREFIX + name, formattedMembers);
            const newLists = { ...state.lists, [name]: formattedMembers };
            setState({ lists: newLists, selectedList: name });
        }

        async function deleteListFromStorage(name) {
            await GM_deleteValue(CONFIG_PREFIX + name);
            const newLists = { ...state.lists };
            delete newLists[name];
            setState({ lists: newLists, selectedList: Object.keys(newLists)[0] });
        }

        async function handleListSelect(e) {
            await GM_setValue(LAST_SELECTED_KEY, e.target.value);
            setState({ selectedList: e.target.value });
        }

        async function handleSaveCurrentList() {
            await saveListToStorage(state.selectedList, document.getElementById('invite-person-input').value);
            log(`名单 '${state.selectedList}' 已保存。`);
        }

        async function handleModalSave() {
            const name = document.getElementById('new-list-name-input').value.trim();
            if (!name) return alert("请输入名单名称。");
            if (state.lists[name]) return alert(`名为 '${name}' 的名单已存在。`);
            await saveListToStorage(name, document.getElementById('new-list-members-input').value);
            setState({ isModalVisible: false });
            log(`已创建并选中新名单 '${name}'。`);
        }

        function simulateRealInput(element, text) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(element, text);
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // --- Core Invitation Logic ---
        async function executeInvitation() {
            setState({ isProcessing: true, shouldStop: false });
            log("开始执行邀请操作...");

            try {
                const invitePersonText = state.lists[state.selectedList];
                if (!invitePersonText || !invitePersonText.trim()) throw new Error("邀请人列表为空！");
                const invitePerson = invitePersonText.split(SPLIT_REGEX).map(name => name.trim()).filter(Boolean);

                log("点击邀请按钮...");
                const inviteButton = await waitForElement('.ent-collab-users .ent-collab-icon-wrapper');
                robustClick(inviteButton);

                log("等待通讯录面板加载...");
                const addressBook = await waitForElement('.wdocs-address-book');
                await sleep(1000); // Wait for panel animation

                let successCount = 0;
                for (const person of invitePerson) {
                    if (state.shouldStop) {
                        log("操作被用户终止。");
                        break;
                    }
                    try {
                        log(`正在邀请: ${person}`);
                        const searchInput = await waitForElement('.wdocs-address-book-content-left-search input[placeholder="搜索"]', addressBook);
                        simulateRealInput(searchInput, person);
                        // The iframe script will handle the click. We just wait a bit.
                        await sleep(2000); // Wait for iframe to search and click
                        log(`✅ 已发送邀请指令: ${person}`);
                        successCount++;
                    } catch (person_e) {
                        log(`❌ 邀请失败: ${person} - ${person_e.message}`);
                    }
                }
                if (!state.shouldStop) {
                    const summary = `邀请流程完成。已发送 ${successCount} 个邀请指令。请在右侧确认是否都已成功添加。`;
                    log(summary);
                }
            } catch (e) {
                if (!state.shouldStop) {
                    log(`邀请过程发生错误: ${e.message}`);
                }
            } finally {
                setState({ isProcessing: false, shouldStop: false });
            }
        }

        // --- Initialization ---
        async function init() {
            GM_addStyle(panelCSS);
            const container = document.createElement('div');
            container.innerHTML = panelHTML;
            document.body.appendChild(container);

            const panel = document.getElementById('invitation-helper-panel');
            let isDragging = false, offsetX, offsetY;
            panel.querySelector('.panel-header').addEventListener('mousedown', (e) => {
                if (e.target.closest('a, button')) return;
                isDragging = true;
                offsetX = e.clientX - panel.getBoundingClientRect().left;
                offsetY = e.clientY - panel.getBoundingClientRect().top;
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                panel.style.left = `${e.clientX - offsetX}px`;
                panel.style.top = `${e.clientY - offsetY}px`;
            });
            document.addEventListener('mouseup', () => isDragging = false);

            document.getElementById('list-selector').addEventListener('change', handleListSelect);
            document.getElementById('save-list-btn').addEventListener('click', handleSaveCurrentList);
            document.getElementById('new-list-btn').addEventListener('click', () => setState({ isModalVisible: true }));
            document.getElementById('delete-list-btn').addEventListener('click', async () => {
                if (confirm(`确定要删除名单 '${state.selectedList}' 吗？`)) {
                    await deleteListFromStorage(state.selectedList);
                    log(`名单 '${state.selectedList}' 已删除。`);
                }
            });
            document.getElementById('execute-button').addEventListener('click', executeInvitation);
            document.getElementById('modal-save-btn').addEventListener('click', handleModalSave);
            document.getElementById('modal-cancel-btn').addEventListener('click', () => setState({ isModalVisible: false }));
            document.getElementById('panel-close-btn').addEventListener('click', () => {
                GM_setValue(PANEL_VISIBLE_KEY, false);
                // Set shouldStop to true to terminate any ongoing process gracefully.
                setState({ isPanelVisible: false, shouldStop: true });
            });
            document.getElementById('panel-minimize-btn').addEventListener('click', () => setState({ isPanelMinimized: !state.isPanelMinimized }));

            const isVisible = await GM_getValue(PANEL_VISIBLE_KEY, true);
            setState({ isPanelVisible: isVisible });
            await loadAllListsFromStorage();

            GM_registerMenuCommand("显示/隐藏邀请助手", () => {
                const newVisibility = !state.isPanelVisible;
                GM_setValue(PANEL_VISIBLE_KEY, newVisibility);
                setState({ isPanelVisible: newVisibility });
            });

            log(`作者: victor0519|<a href="https://www.allfather.top/" target="_blank">Blog</a>|<a href="https://github.com/Vita0519" target="_blank">Github</a>`);
            log("助手已启动。");
        }
        init();
    }

    // --- Main Entry Point ---
    // Determine if we are in the main document or the address book iframe
    if (window.location.href.startsWith('https://open.work.weixin.qq.com/')) {
        initIframe();
    } else {
        window.addEventListener('load', initMainFrame, false);
    }

})();
