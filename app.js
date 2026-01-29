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
            { userId: 'user1', name: 'さくら', password: 'password', createdAt: Date.now() },
            { userId: 'user2', name: 'たける', password: 'password', createdAt: Date.now() },
            { userId: 'user3', name: 'あおい', password: 'password', createdAt: Date.now() }
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

function findUser(userId) {
    return getUsers().find(u => u.userId === userId);
}

function createUser(userId, name, password) {
    const users = getUsers();
    const newUser = {
        userId: userId,
        name: name,
        password: password,
        bio: '', // 自己紹介
        avatar: '👤', // プロフィール画像
        following: [], // フォローリスト
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

function sendMessage(toId, toName, message) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    const messages = getMessages();
    const newMessage = {
        id: 'msg_' + Date.now(),
        fromId: currentUser.userId,
        fromName: currentUser.name,
        toId: toId,
        toName: toName,
        message: message,
        createdAt: Date.now()
    };
    messages.unshift(newMessage);
    saveMessages(messages);
    return newMessage;
}

function getReceivedMessages(userId) {
    return getMessages().filter(m => m.toId === userId);
}

// フォロー機能
function followUser(targetUserId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 自身のデータ更新
    if (!currentUser.following) currentUser.following = [];
    if (!currentUser.following.includes(targetUserId)) {
        currentUser.following.push(targetUserId);

        // ローカルストレージ内の全ユーザーデータも更新
        const users = getUsers();
        const index = users.findIndex(u => u.userId === currentUser.userId);
        if (index !== -1) {
            users[index] = currentUser;
            saveUsers(users);
        }
        setCurrentUser(currentUser);
    }
}

function unfollowUser(targetUserId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    if (currentUser.following && currentUser.following.includes(targetUserId)) {
        currentUser.following = currentUser.following.filter(id => id !== targetUserId);

        // ローカルストレージ内の全ユーザーデータも更新
        const users = getUsers();
        const index = users.findIndex(u => u.userId === currentUser.userId);
        if (index !== -1) {
            users[index] = currentUser;
            saveUsers(users);
        }
        setCurrentUser(currentUser);
    }
}

// フォロワー数を取得
function getFollowerCount(userId) {
    const users = getUsers();
    return users.filter(u => u.following && u.following.includes(userId)).length;
}

// フォロー数を取得
function getFollowingCount(userId) {
    const user = findUser(userId);
    return user && user.following ? user.following.length : 0;
}

function isFollowing(targetUserId) {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.following && currentUser.following.includes(targetUserId);
}



// ============================
// UI 管理
// ============================

const elements = {};

function initializeElements() {
    elements.loginScreen = document.getElementById('login-screen');
    elements.registerScreen = document.getElementById('register-screen');
    elements.mainScreen = document.getElementById('main-screen');

    // ページによって、存在する要素だけ取得
    if (elements.loginScreen) {
        elements.loginForm = document.getElementById('login-form');
        elements.usernameInput = document.getElementById('username');
        elements.passwordInput = document.getElementById('password');
    }

    if (elements.registerScreen) {
        elements.registerForm = document.getElementById('register-form');
        elements.regUserIdInput = document.getElementById('reg-userid');
        elements.regUsernameInput = document.getElementById('reg-username');
        elements.regPasswordInput = document.getElementById('reg-password');
    }

    if (elements.mainScreen) {
        elements.currentUserBadge = document.getElementById('current-user');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.tabBtns = document.querySelectorAll('.tab-btn');
        elements.tabContents = document.querySelectorAll('.tab-content');
        elements.sendForm = document.getElementById('send-form');
        elements.recipientSelect = document.getElementById('recipient');
        elements.messageInput = document.getElementById('message');
        elements.receivedMessages = document.getElementById('received-messages');
        elements.sentMessages = document.getElementById('sent-messages');
        elements.receivedBadge = document.getElementById('received-badge');

        // Search & Friends
        elements.searchUserIdInput = document.getElementById('search-userid');
        elements.searchBtn = document.getElementById('search-btn');
        elements.searchResult = document.getElementById('search-result');
        elements.followingList = document.getElementById('following-list');

        // Profile Modal
        elements.profileModal = document.getElementById('profile-modal');
        elements.closeModal = elements.profileModal.querySelector('.close-modal');
        elements.modalUsername = document.getElementById('modal-username');
        elements.modalUserid = document.getElementById('modal-userid');
        elements.profileAvatarDisplay = document.getElementById('profile-avatar-display');
        elements.avatarEdit = document.getElementById('avatar-edit');
        elements.followingCount = document.getElementById('following-count');
        elements.followerCount = document.getElementById('follower-count');
        elements.bioDisplay = document.getElementById('bio-display');
        elements.bioEdit = document.getElementById('bio-edit');
        elements.modalActionBtn = document.getElementById('modal-action-btn');
        elements.modalEditBtn = document.getElementById('modal-edit-btn');
        elements.modalSaveBtn = document.getElementById('modal-save-btn');
        elements.modalCancelBtn = document.getElementById('modal-cancel-btn');
    }

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
    } else if (tabName === 'friends') {
        renderFollowingList();
    }
}

// 宛先選択肢を更新（フォロー中のユーザーのみ）
function updateRecipientOptions() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 自身以外の全ユーザー
    const allUsers = getUsers().filter(u => u.userId !== currentUser.userId);

    // フォロー中のユーザーIDリスト
    const followingIds = currentUser.following || [];

    // フォロー中のユーザーのみフィルタリング
    const users = allUsers.filter(u => followingIds.includes(u.userId));

    elements.recipientSelect.innerHTML = '<option value="">送りたい相手を選択</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.userId;
        option.textContent = user.name;
        option.dataset.name = user.name;
        elements.recipientSelect.appendChild(option);
    });
}

function renderSearchResult(user) {
    elements.searchResult.innerHTML = '';

    if (!user) {
        elements.searchResult.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">ユーザーが見つかりませんでした</p>';
        return;
    }

    if (user.userId === getCurrentUser().userId) {
        elements.searchResult.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">自分自身は検索結果に表示されません</p>';
        return;
    }

    const isFollowed = isFollowing(user.userId);
    const btnText = isFollowed ? 'フォロー中' : 'フォローする';
    const btnClass = isFollowed ? 'follow-btn following' : 'follow-btn';

    const html = `
        <div class="user-card">
            <div class="user-info">
                <span class="user-name user-link" onclick="showUserProfile('${user.userId}')">${escapeHtml(user.name)}</span>
                <span class="user-id">@${escapeHtml(user.userId)}</span>
            </div>
            <button class="${btnClass}" onclick="toggleFollow('${user.userId}')">${btnText}</button>
        </div>
    `;

    elements.searchResult.innerHTML = html;
}

function renderFollowingList() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const followingIds = currentUser.following || [];
    const allUsers = getUsers();
    const followingUsers = allUsers.filter(u => followingIds.includes(u.userId));

    if (followingUsers.length === 0) {
        elements.followingList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👥</span>
                <p>まだフォローしている人はいません</p>
            </div>
        `;
    } else {
        elements.followingList.innerHTML = followingUsers.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <span class="user-name user-link" onclick="showUserProfile('${user.userId}')">${escapeHtml(user.name)}</span>
                    <span class="user-id">@${escapeHtml(user.userId)}</span>
                </div>
                <button class="follow-btn following" onclick="toggleFollow('${user.userId}')">フォロー中</button>
            </div>
        `).join('');
    }
}

// グローバル関数として公開（HTMLからonclickで呼ぶため）
window.toggleFollow = function (targetUserId) {
    if (isFollowing(targetUserId)) {
        unfollowUser(targetUserId);
    } else {
        followUser(targetUserId);
    }

    // UI更新
    const searchedUser = findUser(targetUserId); // 検索結果の表示更新用
    const searchInputVal = elements.searchUserIdInput.value.trim();
    if (searchInputVal === targetUserId) {
        renderSearchResult(searchedUser);
    }
    renderFollowingList();
    updateRecipientOptions(); // 宛先リストも更新
};

// プロフィール表示
window.showUserProfile = function (userId) {
    const user = findUser(userId);
    const currentUser = getCurrentUser();

    if (!user || !currentUser) return;

    const isMe = user.userId === currentUser.userId;
    const isFollowed = !isMe && isFollowing(user.userId);

    // UI設定
    elements.modalUsername.textContent = user.name;
    elements.modalUserid.textContent = '@' + user.userId;

    // Bio表示
    if (user.bio) {
        elements.bioDisplay.innerHTML = `<p>${escapeHtml(user.bio)}</p>`;
    } else {
        elements.bioDisplay.innerHTML = `<p class="placeholder-text">自己紹介はまだありません</p>`;
    }
    elements.bioEdit.value = user.bio || '';

    // 表示モードリセット
    elements.bioDisplay.classList.remove('hidden');
    elements.bioEdit.classList.add('hidden');

    // ボタン制御
    if (isMe) {
        elements.modalActionBtn.classList.add('hidden');
        elements.modalEditBtn.classList.remove('hidden');
        elements.modalSaveBtn.classList.add('hidden');
        elements.modalCancelBtn.classList.add('hidden');
    } else {
        elements.modalActionBtn.classList.remove('hidden');
        elements.modalEditBtn.classList.add('hidden');
        elements.modalSaveBtn.classList.add('hidden');
        elements.modalCancelBtn.classList.add('hidden');

        updateFollowButton(user.userId);
    }

    // ボタンのイベントリスナー再設定（クローンして置換することで重複防止）
    replaceButtonListener(elements.modalActionBtn, () => {
        window.toggleFollow(user.userId);
        updateFollowButton(user.userId);
        // 検索結果やリストの表示も同期させるために再描画
        if (elements.searchUserIdInput.value === user.userId) {
            renderSearchResult(user);
        }
        renderFollowingList();
    });

    // モーダル表示
    elements.profileModal.classList.remove('hidden');
    setTimeout(() => elements.profileModal.classList.add('show'), 10);
};

function updateFollowButton(userId) {
    const isFollowed = isFollowing(userId);
    elements.modalActionBtn.textContent = isFollowed ? 'フォロー中' : 'フォローする';
    if (isFollowed) {
        elements.modalActionBtn.classList.add('following');
    } else {
        elements.modalActionBtn.classList.remove('following');
    }
}

function replaceButtonListener(element, callback) {
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    newElement.addEventListener('click', callback);
    // 参照を更新
    if (newElement.id === 'modal-action-btn') elements.modalActionBtn = newElement;
}

// プロフィール編集モード
function enableEditProfile() {
    elements.bioDisplay.classList.add('hidden');
    elements.bioEdit.classList.remove('hidden');

    elements.profileAvatarDisplay.classList.add('hidden');
    elements.avatarEdit.classList.remove('hidden');

    elements.modalEditBtn.classList.add('hidden');
    elements.modalSaveBtn.classList.remove('hidden');
    elements.modalCancelBtn.classList.remove('hidden');
    elements.bioEdit.focus();
}

function saveProfile() {
    const newBio = elements.bioEdit.value.trim();
    const newAvatar = elements.avatarEdit.value.trim();

    const updatedUser = updateProfile(newBio, newAvatar);

    if (updatedUser) {
        // 表示更新
        if (updatedUser.bio) {
            elements.bioDisplay.innerHTML = `<p>${escapeHtml(updatedUser.bio)}</p>`;
        } else {
            elements.bioDisplay.innerHTML = `<p class="placeholder-text">自己紹介はまだありません</p>`;
        }

        elements.profileAvatarDisplay.textContent = updatedUser.avatar || '👤';

        elements.bioDisplay.classList.remove('hidden');
        elements.bioEdit.classList.add('hidden');
        elements.profileAvatarDisplay.classList.remove('hidden');
        elements.avatarEdit.classList.add('hidden');

        elements.modalEditBtn.classList.remove('hidden');
        elements.modalSaveBtn.classList.add('hidden');
        elements.modalCancelBtn.classList.add('hidden');

        showToast('プロフィールを更新しました');
    }
}

function cancelEditProfile() {
    elements.bioDisplay.classList.remove('hidden');
    elements.bioEdit.classList.add('hidden');
    elements.profileAvatarDisplay.classList.remove('hidden');
    elements.avatarEdit.classList.add('hidden');

    elements.modalEditBtn.classList.remove('hidden');
    elements.modalSaveBtn.classList.add('hidden');
    elements.modalCancelBtn.classList.add('hidden');

    // 元の値に戻す
    const currentUser = getCurrentUser();
    elements.bioEdit.value = currentUser.bio || '';
    elements.avatarEdit.value = currentUser.avatar || '👤';
}

function closeModal() {
    elements.profileModal.classList.remove('show');
    setTimeout(() => {
        elements.profileModal.classList.add('hidden');
    }, 300);
}

// メッセージカードのHTML生成
function createMessageCard(msg) {
    const date = new Date(msg.createdAt);
    const timeString = formatDate(date);

    return `
        <div class="message-card">
            <div class="message-header">
                <div class="message-users">
                    <span class="message-from user-link" onclick="showUserProfile('${escapeHtml(msg.fromId)}')">${escapeHtml(msg.fromName)}</span>
                    <span class="message-arrow">→</span>
                    <span class="message-to user-link" onclick="showUserProfile('${escapeHtml(msg.toId)}')">${escapeHtml(msg.toName)}</span>
                </div>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-body">
                ${escapeHtml(msg.message)}
            </div>
        </div>
    `;
}

// 受信メッセージを表示
function renderReceivedMessages() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const messages = getReceivedMessages(currentUser.userId);

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

    const messages = getSentMessages(currentUser.userId);

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
    const userId = elements.usernameInput.value.trim(); // ユーザー名入力欄をID入力欄として使用
    const password = elements.passwordInput.value.trim();

    if (!userId || !password) {
        showToast('ユーザーIDとパスワードを入力してください');
        return;
    }

    // ユーザーを検索
    let user = findUser(userId);
    if (!user) {
        showToast('ユーザーIDまたはパスワードが間違っています'); // セキュリティのため詳細は伏せる
        return;
    } else {
        // パスワード確認
        if (user.password && user.password !== password) {
            showToast('ユーザーIDまたはパスワードが間違っています');
            return;
        }

        showToast(`おかえりなさい、${user.name}さん！`);
    }

    setCurrentUser(user);

    // ページ遷移
    setTimeout(() => {
        window.location.href = 'top.html';
    }, 1000);
}

function handleRegister(e) {
    e.preventDefault();
    const userId = elements.regUserIdInput.value.trim();
    const username = elements.regUsernameInput.value.trim();
    const password = elements.regPasswordInput.value.trim();

    if (!userId || !username || !password) {
        showToast('すべての項目を入力してください');
        return;
    }

    // 重複チェック
    if (findUser(userId)) {
        showToast('このユーザーIDは既に使用されています');
        return;
    }

    const newUser = createUser(userId, username, password);
    setCurrentUser(newUser);

    showToast(`ようこそ、${username}さん！`);
    setTimeout(() => {
        window.location.href = 'top.html';
    }, 1000);
}

function handleLogout() {
    clearCurrentUser();
    window.location.href = 'index.html';
}

function handleSearch() {
    const userId = elements.searchUserIdInput.value.trim();
    if (!userId) return;

    const user = findUser(userId);
    renderSearchResult(user);
}

function handleSendMessage(e) {
    e.preventDefault();


    const recipientId = elements.recipientSelect.value;
    const recipientOption = elements.recipientSelect.options[elements.recipientSelect.selectedIndex];
    const recipientName = recipientOption.dataset.name;
    const message = elements.messageInput.value.trim();

    if (!recipientId || !message) return;

    const newMessage = sendMessage(recipientId, recipientName, message);

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

    // イベントリスナーを設定（存在する要素のみ）
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }

    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', handleRegister);
    }

    if (elements.mainScreen) {
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.sendForm.addEventListener('submit', handleSendMessage);
        elements.searchBtn.addEventListener('click', handleSearch);
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', handleTabClick);
        });

        // Modal Events
        elements.closeModal.addEventListener('click', closeModal);
        elements.profileModal.addEventListener('click', (e) => {
            if (e.target === elements.profileModal) closeModal();
        });
        elements.modalEditBtn.addEventListener('click', enableEditProfile);
        elements.modalSaveBtn.addEventListener('click', saveProfile);
        elements.modalCancelBtn.addEventListener('click', cancelEditProfile);
    }

    // ログイン状態を確認とリダイレクト
    const currentUser = getCurrentUser();

    // ログイン画面または登録画面での処理
    if (document.getElementById('login-screen') || document.getElementById('register-screen')) {
        if (currentUser) {
            // ログイン済みならトップへ
            window.location.href = 'top.html';
        }
    }

    // メイン画面での処理
    if (document.getElementById('main-screen')) {
        if (!currentUser) {
            // 未ログインならログイン画面へ
            window.location.href = 'index.html';
            return;
        }

        elements.currentUserBadge.textContent = currentUser.name;
        // 自分の名前をクリックしたらプロフィール表示
        elements.currentUserBadge.classList.add('user-link');
        elements.currentUserBadge.onclick = () => showUserProfile(currentUser.userId);

        updateRecipientOptions();
        switchTab('send');

        // 受信メッセージ数を更新
        const receivedCount = getReceivedMessages(currentUser.userId).length;
        updateReceivedBadge(receivedCount);
    }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', initialize);
