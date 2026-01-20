/**
 * ありがとうジャーナル - アプリケーションロジック
 * ログインユーザー同士が感謝の言葉を送り合うアプリ
 */

// ============================
// データ管理
// ============================

const STORAGE_KEYS = {
    USERS: 'arigato_users',
    MESSAGES: 'arigato_messages',
    CURRENT_USER: 'arigato_current_user'
};

// 初期データの設定
function initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        // デモ用の初期ユーザー
        const initialUsers = [
            { id: 'user1', name: 'さくら', createdAt: Date.now() },
            { id: 'user2', name: 'たける', createdAt: Date.now() },
            { id: 'user3', name: 'あおい', createdAt: Date.now() }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
        // デモ用の初期メッセージ
        const initialMessages = [
            {
                id: 'msg1',
                fromId: 'user1',
                fromName: 'さくら',
                toId: 'user2',
                toName: 'たける',
                message: 'いつも仕事を手伝ってくれてありがとう！本当に助かっています。',
                isPublic: true,
                createdAt: Date.now() - 86400000
            },
            {
                id: 'msg2',
                fromId: 'user2',
                fromName: 'たける',
                toId: 'user3',
                toName: 'あおい',
                message: '素敵なアドバイスをありがとう。おかげで問題が解決しました！',
                isPublic: true,
                createdAt: Date.now() - 3600000
            }
        ];
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(initialMessages));
    }
}

// ユーザー管理
function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function findUser(name) {
    return getUsers().find(u => u.name === name);
}

function createUser(name) {
    const users = getUsers();
    const newUser = {
        id: 'user_' + Date.now(),
        name: name,
        createdAt: Date.now()
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
}

function getCurrentUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userData ? JSON.parse(userData) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// メッセージ管理
function getMessages() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
}

function saveMessages(messages) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

function sendMessage(toId, toName, message, isPublic) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    const messages = getMessages();
    const newMessage = {
        id: 'msg_' + Date.now(),
        fromId: currentUser.id,
        fromName: currentUser.name,
        toId: toId,
        toName: toName,
        message: message,
        isPublic: isPublic,
        createdAt: Date.now()
    };
    messages.unshift(newMessage);
    saveMessages(messages);
    return newMessage;
}

function getReceivedMessages(userId) {
    return getMessages().filter(m => m.toId === userId);
}

function getSentMessages(userId) {
    return getMessages().filter(m => m.fromId === userId);
}

function getPublicMessages() {
    return getMessages().filter(m => m.isPublic);
}

// ============================
// UI 管理
// ============================

const elements = {};

function initializeElements() {
    elements.loginScreen = document.getElementById('login-screen');
    elements.mainScreen = document.getElementById('main-screen');
    elements.loginForm = document.getElementById('login-form');
    elements.usernameInput = document.getElementById('username');
    elements.currentUserBadge = document.getElementById('current-user');
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.tabBtns = document.querySelectorAll('.tab-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');
    elements.sendForm = document.getElementById('send-form');
    elements.recipientSelect = document.getElementById('recipient');
    elements.messageInput = document.getElementById('message');
    elements.isPublicCheckbox = document.getElementById('is-public');
    elements.receivedMessages = document.getElementById('received-messages');
    elements.sentMessages = document.getElementById('sent-messages');
    elements.timelineMessages = document.getElementById('timeline-messages');
    elements.receivedBadge = document.getElementById('received-badge');
    elements.toast = document.getElementById('toast');
}

// 画面切り替え
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// タブ切り替え
function switchTab(tabName) {
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // タブ切り替え時にコンテンツを更新
    if (tabName === 'received') {
        renderReceivedMessages();
    } else if (tabName === 'sent') {
        renderSentMessages();
    } else if (tabName === 'timeline') {
        renderTimelineMessages();
    }
}

// 宛先選択肢を更新
function updateRecipientOptions() {
    const currentUser = getCurrentUser();
    const users = getUsers().filter(u => u.id !== currentUser?.id);
    
    elements.recipientSelect.innerHTML = '<option value="">送りたい相手を選択</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        option.dataset.name = user.name;
        elements.recipientSelect.appendChild(option);
    });
}

// メッセージカードのHTML生成
function createMessageCard(msg) {
    const date = new Date(msg.createdAt);
    const timeString = formatDate(date);
    
    return `
        <div class="message-card">
            <div class="message-header">
                <div class="message-users">
                    <span class="message-from">${escapeHtml(msg.fromName)}</span>
                    <span class="message-arrow">→</span>
                    <span class="message-to">${escapeHtml(msg.toName)}</span>
                </div>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-body">
                ${escapeHtml(msg.message)}
            </div>
            ${msg.isPublic ? '<div class="message-public">🌐 公開メッセージ</div>' : ''}
        </div>
    `;
}

// 受信メッセージを表示
function renderReceivedMessages() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const messages = getReceivedMessages(currentUser.id);
    
    if (messages.length === 0) {
        elements.receivedMessages.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>まだ感謝のメッセージはありません</p>
            </div>
        `;
    } else {
        elements.receivedMessages.innerHTML = messages.map(createMessageCard).join('');
    }
    
    // バッジを更新
    updateReceivedBadge(messages.length);
}

// 送信済みメッセージを表示
function renderSentMessages() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const messages = getSentMessages(currentUser.id);
    
    if (messages.length === 0) {
        elements.sentMessages.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✨</span>
                <p>まだ感謝を送っていません</p>
            </div>
        `;
    } else {
        elements.sentMessages.innerHTML = messages.map(createMessageCard).join('');
    }
}

// タイムラインを表示
function renderTimelineMessages() {
    const messages = getPublicMessages();
    
    if (messages.length === 0) {
        elements.timelineMessages.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🌸</span>
                <p>まだ公開されたメッセージはありません</p>
            </div>
        `;
    } else {
        elements.timelineMessages.innerHTML = messages.map(createMessageCard).join('');
    }
}

// 受信バッジを更新
function updateReceivedBadge(count) {
    if (count > 0) {
        elements.receivedBadge.textContent = count;
        elements.receivedBadge.classList.remove('hidden');
    } else {
        elements.receivedBadge.classList.add('hidden');
    }
}

// トースト通知を表示
function showToast(message) {
    const toastMessage = elements.toast.querySelector('.toast-message');
    toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// ============================
// ユーティリティ
// ============================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分未満
        return 'たった今';
    } else if (diff < 3600000) { // 1時間未満
        return Math.floor(diff / 60000) + '分前';
    } else if (diff < 86400000) { // 24時間未満
        return Math.floor(diff / 3600000) + '時間前';
    } else if (diff < 604800000) { // 1週間未満
        return Math.floor(diff / 86400000) + '日前';
    } else {
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// ============================
// イベントハンドラ
// ============================

function handleLogin(e) {
    e.preventDefault();
    const username = elements.usernameInput.value.trim();
    
    if (!username) return;
    
    // 既存ユーザーを検索、なければ作成
    let user = findUser(username);
    if (!user) {
        user = createUser(username);
        showToast(`ようこそ、${username}さん！`);
    } else {
        showToast(`おかえりなさい、${username}さん！`);
    }
    
    setCurrentUser(user);
    
    // メイン画面に切り替え
    showScreen('main-screen');
    elements.currentUserBadge.textContent = user.name;
    updateRecipientOptions();
    switchTab('send');
    
    // 受信メッセージ数を更新
    const receivedCount = getReceivedMessages(user.id).length;
    updateReceivedBadge(receivedCount);
}

function handleLogout() {
    clearCurrentUser();
    elements.usernameInput.value = '';
    showScreen('login-screen');
}

function handleSendMessage(e) {
    e.preventDefault();
    
    const recipientId = elements.recipientSelect.value;
    const recipientOption = elements.recipientSelect.options[elements.recipientSelect.selectedIndex];
    const recipientName = recipientOption.dataset.name;
    const message = elements.messageInput.value.trim();
    const isPublic = elements.isPublicCheckbox.checked;
    
    if (!recipientId || !message) return;
    
    const newMessage = sendMessage(recipientId, recipientName, message, isPublic);
    
    if (newMessage) {
        showToast(`${recipientName}さんに感謝を送りました！`);
        elements.messageInput.value = '';
        elements.recipientSelect.value = '';
    }
}

function handleTabClick(e) {
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
        switchTab(tabBtn.dataset.tab);
    }
}

// ============================
// 初期化
// ============================

function initialize() {
    initializeData();
    initializeElements();
    
    // イベントリスナーを設定
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.sendForm.addEventListener('submit', handleSendMessage);
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', handleTabClick);
    });
    
    // ログイン状態を確認
    const currentUser = getCurrentUser();
    if (currentUser) {
        showScreen('main-screen');
        elements.currentUserBadge.textContent = currentUser.name;
        updateRecipientOptions();
        switchTab('send');
        
        // 受信メッセージ数を更新
        const receivedCount = getReceivedMessages(currentUser.id).length;
        updateReceivedBadge(receivedCount);
    } else {
        showScreen('login-screen');
    }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', initialize);
