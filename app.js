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
        blocked: [], // ブロックリスト
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
    const currentUser = getCurrentUser();
    const blocked = currentUser && currentUser.blocked ? currentUser.blocked : [];
    return getMessages()
        .filter(m => m.toId === userId)
        .filter(m => !blocked.includes(m.fromId));
}

function getSentMessages(userId) {
    return getMessages()
        .filter(m => m.fromId === userId);
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

// ブロック機能
function blockUser(targetUserId) {
    const users = getUsers(); // 全ユーザーデータを一度取得
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 配列内の自分の参照を取得
    const myIndex = users.findIndex(u => u.userId === currentUser.userId);
    if (myIndex === -1) return;
    const me = users[myIndex];

    if (!me.blocked) me.blocked = [];

    // まだブロックしていない場合のみ実行
    if (!me.blocked.includes(targetUserId)) {
        me.blocked.push(targetUserId);

        // 1. 自分が相手をフォローしていたら解除
        if (me.following && me.following.includes(targetUserId)) {
            me.following = me.following.filter(id => id !== targetUserId);
        }

        // 2. 相手が自分をフォローしていたら解除 (強制フォロー解除)
        const targetIndex = users.findIndex(u => u.userId === targetUserId);
        if (targetIndex !== -1) {
            const target = users[targetIndex];
            if (target.following && target.following.includes(me.userId)) {
                target.following = target.following.filter(id => id !== me.userId);
            }
        }

        // 一括保存
        saveUsers(users);
        setCurrentUser(me); // 自身のセッション情報も更新
    }
}

function unblockUser(targetUserId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    if (currentUser.blocked && currentUser.blocked.includes(targetUserId)) {
        currentUser.blocked = currentUser.blocked.filter(id => id !== targetUserId);
        updateUserInStorage(currentUser);
        setCurrentUser(currentUser);
    }
}

function isBlocked(targetUserId) {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.blocked && currentUser.blocked.includes(targetUserId);
}

// Helper to update user in storage
function updateUserInStorage(updatedUser) {
    const users = getUsers();
    const index = users.findIndex(u => u.userId === updatedUser.userId);
    if (index !== -1) {
        users[index] = updatedUser;
        saveUsers(users);
    }
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
        elements.receivedMessages = document.getElementById('received-messages');
        elements.sentMessages = document.getElementById('sent-messages');
        elements.timelineList = document.getElementById('timeline-list');
        elements.receivedBadge = document.getElementById('received-badge');

        // Search & Friends
        elements.searchUserIdInput = document.getElementById('search-userid');
        elements.searchResult = document.getElementById('search-result');
        elements.followingList = document.getElementById('following-list');
        elements.searchResult = document.getElementById('search-result');
        elements.followingList = document.getElementById('following-list');
        elements.blockedList = document.getElementById('blocked-list');
        elements.blockedListToggle = document.getElementById('blocked-list-toggle');

        elements.followingListToggle = document.getElementById('following-list-toggle');

        elements.searchSectionToggle = document.getElementById('search-section-toggle');
        elements.searchSectionContent = document.getElementById('search-section-content');

        // Profile Modal
        elements.profileModal = document.getElementById('profile-modal');
        elements.closeModal = elements.profileModal.querySelector('.close-modal');
        elements.modalUsername = document.getElementById('modal-username');
        elements.modalUserid = document.getElementById('modal-userid');
        elements.profileAvatarDisplay = document.getElementById('profile-avatar-display');
        elements.followingCount = document.getElementById('following-count');
        elements.followerCount = document.getElementById('follower-count');
        elements.bioDisplay = document.getElementById('bio-display');
        elements.bioEdit = document.getElementById('bio-edit');
        elements.avatarUpload = document.getElementById('avatar-upload');
        elements.avatarEditOverlay = document.getElementById('avatar-edit-overlay');
        elements.usernameEdit = document.getElementById('username-edit');

        elements.modalActionBtn = document.getElementById('modal-action-btn');
        elements.modalBlockBtn = document.getElementById('modal-block-btn');
        elements.modalEditBtn = document.getElementById('modal-edit-btn');
        elements.modalSaveBtn = document.getElementById('modal-save-btn');
        elements.modalCancelBtn = document.getElementById('modal-cancel-btn');
        elements.modalThanksBtn = document.getElementById('modal-thanks-btn');
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
        renderBlockedList();
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

    // フォロー中のユーザーのみフィルタリング (and not blocked)
    const blocked = currentUser.blocked || [];
    const users = allUsers
        .filter(u => followingIds.includes(u.userId))
        .filter(u => !blocked.includes(u.userId));

    elements.recipientSelect.innerHTML = '<option value="">ありがとうのメッセージを送る相手を選択</option>';
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

    const isBlockedUser = isBlocked(user.userId);
    const isFollowed = isFollowing(user.userId);

    let btnText, btnClass;
    if (isBlockedUser) {
        btnText = 'ブロック中';
        btnClass = 'follow-btn blocked'; // defined in css
    } else {
        btnText = isFollowed ? 'フォロー中' : 'フォローする';
        btnClass = isFollowed ? 'follow-btn following' : 'follow-btn';
    }

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
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-sm btn-success" style="border-radius: 50px;" onclick="openSendTabWithRecipient('${user.userId}')">ありがとうを送る</button>
                    <button class="follow-btn following" onclick="toggleFollow('${user.userId}')">フォロー中</button>
                </div>
            </div>
        `).join('');
    }
}

// グローバル関数として公開（HTMLからonclickで呼ぶため）
// グローバル関数として公開（HTMLからonclickで呼ぶため）
window.toggleFollow = function (targetUserId) {
    // ブロック中の場合は解除を確認
    if (isBlocked(targetUserId)) {
        if (confirm('ブロックを解除しますか？')) {
            unblockUser(targetUserId);
            showToast('ブロックを解除しました');
        } else {
            return;
        }
    } else {
        // 通常のフォロー/解除処理
        if (isFollowing(targetUserId)) {
            unfollowUser(targetUserId);
        } else {
            followUser(targetUserId);
        }
    }

    // UI更新
    const searchedUser = findUser(targetUserId); // 検索結果の表示更新用
    const searchInputVal = elements.searchUserIdInput.value.trim();
    if (searchInputVal === targetUserId) {
        renderSearchResult(searchedUser);
    }
    renderFollowingList();
    renderBlockedList();
    updateRecipientOptions(); // 宛先リストも更新
};

window.openSendTabWithRecipient = function (userId) {
    const user = findUser(userId);
    if (!user) return;

    // モーダルが開いていれば閉じる
    if (elements.profileModal.classList.contains('show')) {
        closeModal();
    }

    // 送るタブに切り替え
    switchTab('send');

    // 宛先を選択
    elements.recipientSelect.value = userId;

    // フォームにスクロール
    elements.sendForm.scrollIntoView({ behavior: 'smooth' });
};

function renderBlockedList() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const blockedIds = currentUser.blocked || [];
    const allUsers = getUsers();
    const blockedUsers = allUsers.filter(u => blockedIds.includes(u.userId));

    if (blockedUsers.length === 0) {
        elements.blockedList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🚫</span>
                <p>ブロックしている人はいません</p>
            </div>
        `;
    } else {
        elements.blockedList.innerHTML = blockedUsers.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <span class="user-name user-link" onclick="showUserProfile('${user.userId}')">${escapeHtml(user.name)}</span>
                    <span class="user-id">@${escapeHtml(user.userId)}</span>
                </div>
                <button class="follow-btn blocked" onclick="toggleFollow('${user.userId}')">ブロック中</button>
            </div>
        `).join('');
    }
}

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
    // アバター表示
    if (user.avatar && user.avatar.startsWith('data:')) {
        elements.profileAvatarDisplay.textContent = '';
        elements.profileAvatarDisplay.style.backgroundImage = `url('${user.avatar}')`;
        elements.profileAvatarDisplay.style.backgroundSize = 'cover';
        elements.profileAvatarDisplay.style.backgroundPosition = 'center';
    } else {
        elements.profileAvatarDisplay.style.backgroundImage = '';
        elements.profileAvatarDisplay.textContent = user.avatar || '👤';
    }

    // 統計情報の更新
    elements.followingCount.textContent = getFollowingCount(user.userId);
    elements.followerCount.textContent = getFollowerCount(user.userId);

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
        elements.modalThanksBtn.classList.add('hidden');
        elements.modalBlockBtn.classList.add('hidden');
        elements.modalEditBtn.classList.remove('hidden');
        elements.modalSaveBtn.classList.add('hidden');
        elements.modalCancelBtn.classList.add('hidden');
    } else {
        elements.modalActionBtn.classList.remove('hidden');
        elements.modalThanksBtn.classList.remove('hidden');
        elements.modalBlockBtn.classList.remove('hidden');
        elements.modalEditBtn.classList.add('hidden');
        elements.modalSaveBtn.classList.add('hidden');
        elements.modalCancelBtn.classList.add('hidden');

        updateFollowButton(user.userId);
        updateBlockButton(user.userId);

        // 以前のリスナーを削除するために置換が必要かもしれないが、
        // replaceButtonListenerで毎回新しくなるのでOK
    }

    // Thanks Button Listener
    replaceButtonListener(elements.modalThanksBtn, () => {
        openSendTabWithRecipient(user.userId);
    });

    // Block button listener
    replaceButtonListener(elements.modalActionBtn, () => {
        window.toggleFollow(user.userId);
        updateFollowButton(user.userId);

        // 統計情報の更新
        elements.followerCount.textContent = getFollowerCount(user.userId);

        // 検索結果やリストの表示も同期させるために再描画
        if (elements.searchUserIdInput.value === user.userId) {
            renderSearchResult(user);
        }
        renderFollowingList();
        renderBlockedList();
    });
    replaceButtonListener(elements.modalBlockBtn, () => {
        if (isBlocked(user.userId)) {
            unblockUser(user.userId);
        } else {
            if (confirm('このユーザーをブロックしますか？\n（メッセージが届かなくなります）')) {
                blockUser(user.userId);
            }
        }
        // UI updates
        showUserProfile(user.userId); // Reload modal content
        showUserProfile(user.userId); // Reload modal content
        renderFollowingList(); // Update friends list
        renderBlockedList(); // Update blocked list
        updateRecipientOptions(); // Update message recipients

        // 検索結果も更新
        if (elements.searchUserIdInput.value === user.userId) {
            renderSearchResult(user);
        }
    });

    // モーダル表示
    elements.profileModal.classList.remove('hidden');
    setTimeout(() => elements.profileModal.classList.add('show'), 10);
};

// Helper: Resize Image
function resizeImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateFollowButton(userId) {
    const isFollowed = isFollowing(userId);
    const isBlockedUser = isBlocked(userId);

    if (isBlockedUser) {
        elements.modalActionBtn.textContent = 'フォローできません';
        elements.modalActionBtn.disabled = true;
        elements.modalActionBtn.classList.add('blocked-action');
        elements.modalActionBtn.classList.remove('following', 'btn-primary', 'btn-follow-action');
    } else {
        elements.modalActionBtn.disabled = false;
        elements.modalActionBtn.textContent = isFollowed ? 'フォロー中' : 'フォローする';
        elements.modalActionBtn.classList.remove('blocked-action');

        if (isFollowed) {
            elements.modalActionBtn.classList.add('following');
            elements.modalActionBtn.classList.remove('btn-primary', 'btn-follow-action');
        } else {
            elements.modalActionBtn.classList.remove('following');
            elements.modalActionBtn.classList.add('btn-follow-action');
            elements.modalActionBtn.classList.remove('btn-primary');
        }
    }
}

function updateBlockButton(userId) {
    const blocked = isBlocked(userId);
    elements.modalBlockBtn.textContent = blocked ? 'ブロック中' : 'ブロック';
    if (blocked) {
        elements.modalBlockBtn.classList.remove('btn-danger', 'btn-outline');
        elements.modalBlockBtn.classList.add('btn-blocked');

        // Inline style fallback
        elements.modalBlockBtn.style.backgroundColor = '#ef4444';
        elements.modalBlockBtn.style.color = '#ffffff';
        elements.modalBlockBtn.style.border = '1px solid #ef4444';
    } else {
        elements.modalBlockBtn.classList.add('btn-danger');
        elements.modalBlockBtn.classList.remove('btn-outline', 'btn-blocked');

        // Reset inline styles
        elements.modalBlockBtn.style.backgroundColor = '';
        elements.modalBlockBtn.style.color = '';
        elements.modalBlockBtn.style.border = '';
    }
}

function replaceButtonListener(element, callback) {
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    newElement.addEventListener('click', callback);
    // 参照を更新
    if (newElement.id === 'modal-action-btn') elements.modalActionBtn = newElement;
    if (newElement.id === 'modal-block-btn') elements.modalBlockBtn = newElement;
    if (newElement.id === 'modal-thanks-btn') elements.modalThanksBtn = newElement;
}

// プロフィール編集モード
function enableEditProfile() {
    elements.bioDisplay.classList.add('hidden');
    elements.bioEdit.classList.remove('hidden');

    elements.modalUsername.classList.add('hidden');
    elements.usernameEdit.classList.remove('hidden');

    // 現在の値をセット
    elements.usernameEdit.value = elements.modalUsername.textContent;

    elements.avatarEditOverlay.classList.remove('hidden');

    elements.modalEditBtn.classList.add('hidden');
    elements.modalSaveBtn.classList.remove('hidden');
    elements.modalCancelBtn.classList.remove('hidden');
    elements.usernameEdit.focus();
}

function updateProfile(newName, newBio, newAvatar) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    // Update fields if provided
    if (newName !== undefined) currentUser.name = newName;
    if (newBio !== undefined) currentUser.bio = newBio;
    if (newAvatar !== undefined) currentUser.avatar = newAvatar;

    updateUserInStorage(currentUser);
    setCurrentUser(currentUser);
    return currentUser;
}

function saveProfile() {
    const newName = elements.usernameEdit.value.trim();
    const newBio = elements.bioEdit.value.trim();
    const avatarFile = elements.avatarUpload.files[0];

    if (!newName) {
        showToast('ユーザー名は必須です');
        return;
    }

    const processSave = (avatarData) => {
        const updatedUser = updateProfile(newName, newBio, avatarData);
        if (updatedUser) {
            // UI Update
            elements.modalUsername.textContent = updatedUser.name;
            elements.modalUserid.textContent = '@' + updatedUser.userId;

            if (updatedUser.bio) {
                elements.bioDisplay.innerHTML = `<p>${escapeHtml(updatedUser.bio)}</p>`;
            } else {
                elements.bioDisplay.innerHTML = `<p class="placeholder-text">自己紹介はまだありません</p>`;
            }

            // Avatar Update in UI
            if (updatedUser.avatar && updatedUser.avatar.startsWith('data:')) {
                elements.profileAvatarDisplay.textContent = '';
                elements.profileAvatarDisplay.style.backgroundImage = `url('${updatedUser.avatar}')`;
                elements.profileAvatarDisplay.style.backgroundSize = 'cover';
                elements.profileAvatarDisplay.style.backgroundPosition = 'center';
            } else {
                elements.profileAvatarDisplay.style.backgroundImage = '';
                elements.profileAvatarDisplay.textContent = updatedUser.avatar || '👤';
            }

            // Reset UI State
            elements.bioDisplay.classList.remove('hidden');
            elements.bioEdit.classList.add('hidden');

            elements.modalUsername.classList.remove('hidden');
            elements.usernameEdit.classList.add('hidden');

            elements.avatarEditOverlay.classList.add('hidden');

            elements.modalEditBtn.classList.remove('hidden');
            elements.modalSaveBtn.classList.add('hidden');
            elements.modalCancelBtn.classList.add('hidden');

            // 自分自身の名前表示も更新（ヘッダーなど）
            const currentUserBadge = document.getElementById('current-user');
            if (currentUserBadge) {
                currentUserBadge.textContent = updatedUser.name;
            }

            showToast('プロフィールを更新しました');
        }
    };

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            processSave(e.target.result);
        };
        reader.readAsDataURL(avatarFile);
    } else {
        processSave(undefined); // No avatar update
    }
}

function cancelEditProfile() {
    elements.bioDisplay.classList.remove('hidden');
    elements.bioEdit.classList.add('hidden');

    elements.modalUsername.classList.remove('hidden');
    elements.usernameEdit.classList.add('hidden');

    elements.avatarEditOverlay.classList.add('hidden');

    elements.modalEditBtn.classList.remove('hidden');
    elements.modalSaveBtn.classList.add('hidden');
    elements.modalCancelBtn.classList.add('hidden');

    // 元の値に戻す
    const currentUser = getCurrentUser();
    elements.bioEdit.value = currentUser.bio || '';
    elements.usernameEdit.value = currentUser.name || '';
    elements.avatarUpload.value = ''; // Clear file input

    // Reset avatar preview if it was changed purely in UI
    if (currentUser.avatar && currentUser.avatar.startsWith('data:')) {
        elements.profileAvatarDisplay.textContent = '';
        elements.profileAvatarDisplay.style.backgroundImage = `url('${currentUser.avatar}')`;
    } else {
        elements.profileAvatarDisplay.style.backgroundImage = '';
        elements.profileAvatarDisplay.textContent = currentUser.avatar || '👤';
    }
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
                <p>まだありがとうのメッセージはありません</p>
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
                <p>まだありがとうを送っていません</p>
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
// トースト通知を表示
let toastTimeout;
function showToast(message) {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    const toastMessage = elements.toast.querySelector('.toast-message');
    toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    elements.toast.classList.add('show');

    toastTimeout = setTimeout(() => {
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

function formatDate(dateInput) {
    const date = new Date(dateInput);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
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

    // ブロック中のユーザーは検索結果に表示しない
    if (isBlocked(userId)) {
        elements.searchResult.innerHTML = '';
        showToast('このユーザーは表示できません');
        return;
    }

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
        showToast(`${recipientName}さんにありがとうを送りました！`);
        elements.messageInput.value = '';
        elements.recipientSelect.value = '';

        // Update Sent Messages List
        renderSentMessages();
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
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.sendForm.addEventListener('submit', handleSendMessage);

        // リアルタイム検索
        elements.searchUserIdInput.addEventListener('input', (e) => {
            const userId = e.target.value.trim();
            if (userId) {
                const user = findUser(userId);
                // 自分自身は検索結果に表示しない
                if (user) {
                    renderSearchResult(user);
                } else {
                    elements.searchResult.innerHTML = '';
                }
            } else {
                elements.searchResult.innerHTML = '';
            }
        });

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
        elements.modalEditBtn.addEventListener('click', enableEditProfile);
        elements.modalSaveBtn.addEventListener('click', saveProfile);
        elements.modalCancelBtn.addEventListener('click', cancelEditProfile);

        // Blocked List Toggle
        if (elements.blockedListToggle) {
            elements.blockedListToggle.addEventListener('click', () => {
                elements.blockedListToggle.classList.toggle('collapsed');
                elements.blockedList.classList.toggle('collapsed');
            });
        }

        // Following List Toggle
        if (elements.followingListToggle) {
            elements.followingListToggle.addEventListener('click', () => {
                elements.followingListToggle.classList.toggle('collapsed');
                elements.followingList.classList.toggle('collapsed');
            });
        }

        // Search Section Toggle
        if (elements.searchSectionToggle) {
            elements.searchSectionToggle.addEventListener('click', () => {
                elements.searchSectionToggle.classList.toggle('collapsed');
                // For search section, we might need a utility class or specific style for collapsing
                // borrowing .collapsed logic from styles.css which hides display: none
                elements.searchSectionToggle.classList.toggle('collapsed-rotate'); // Rotate icon specific? Or generic?
                // Re-using .section-toggle logic requires the parent class
                if (elements.searchSectionContent.style.display === 'none') {
                    elements.searchSectionContent.style.display = 'block';
                    elements.searchSectionToggle.classList.remove('collapsed');
                } else {
                    elements.searchSectionContent.style.display = 'none';
                    elements.searchSectionToggle.classList.add('collapsed');
                }
            });
        }


        // Avatar Upload Events
        elements.avatarEditOverlay.addEventListener('click', () => {
            elements.avatarUpload.click();
        });

        elements.avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    elements.profileAvatarDisplay.textContent = '';
                    elements.profileAvatarDisplay.style.backgroundImage = `url('${e.target.result}')`;
                    elements.profileAvatarDisplay.style.backgroundSize = 'cover';
                    elements.profileAvatarDisplay.style.backgroundPosition = 'center';
                };
                reader.readAsDataURL(file);
            }
        });
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
