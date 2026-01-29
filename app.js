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
    // 既存のデータからサンプルユーザー（さくら、たける）を削除
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const sampleIds = ['user1', 'user2']; // user1: さくら, user2: たける

    const beforeUserCount = users.length;
    users = users.filter(u => !sampleIds.includes(u.userId));

    if (users.length !== beforeUserCount) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        console.log('Sample users removed');
    }

    // サンプルユーザーに関連するメッセージも削除
    let messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    const beforeMsgCount = messages.length;

    messages = messages.filter(m => !sampleIds.includes(m.fromId) && !sampleIds.includes(m.toId));

    if (messages.length !== beforeMsgCount) {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
        console.log('Sample messages removed');
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

function sendMessage(toId, toName, message, options = {}) {
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
        createdAt: Date.now(),
        isRead: false, // Initialize read status
        replyTo: options.replyTo || null, // Save reply context if exists
        rootId: options.rootId || null // Thread Root ID
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

// Thread Logic
let currentThreadContext = null; // { rootId, otherUserId, otherUserName }

function openThread(messageId) {
    const messages = getMessages();
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    const currentUser = getCurrentUser();

    // Determine Root ID
    // If message has rootId, use it. If not, this message is the root.
    const rootId = targetMsg.rootId || targetMsg.id;

    // Identify the "other" participant for the header
    const otherId = (targetMsg.fromId === currentUser.userId) ? targetMsg.toId : targetMsg.fromId;
    const otherName = (targetMsg.fromId === currentUser.userId) ? targetMsg.toName : targetMsg.fromName;

    currentThreadContext = {
        rootId: rootId,
        otherUserId: otherId,
        otherUserName: otherName
    };

    renderThreadMessages();

    // Show Modal
    const modal = document.getElementById('thread-modal');
    modal.classList.remove('hidden');
    // Trigger reflow
    void modal.offsetWidth;
    modal.classList.add('show');
}

function closeThread() {
    const modal = document.getElementById('thread-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        currentThreadContext = null;
    }, 300);
}

function renderThreadMessages() {
    if (!currentThreadContext) return;

    const messages = getMessages();
    const currentUser = getCurrentUser();

    // Filter messages: 
    // 1. Matches rootId
    // 2. OR is the root message itself
    const threadMessages = messages.filter(m =>
        m.rootId === currentThreadContext.rootId || m.id === currentThreadContext.rootId
    );

    // Sort by Date (Oldest First for conversation flow)
    threadMessages.sort((a, b) => a.createdAt - b.createdAt);

    const listContainer = document.getElementById('thread-messages-list');
    listContainer.innerHTML = '';

    if (threadMessages.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999;">メッセージが見つかりません</p>';
        return;
    }

    threadMessages.forEach(msg => {
        // Reuse createMessageCard logic but maybe simplified?
        // Using 'timeline' type for now to show standard card
        listContainer.innerHTML += createMessageCard(msg, 'timeline');
    });

    // Scroll to bottom
    setTimeout(() => {
        listContainer.scrollTop = listContainer.scrollHeight;
    }, 10);
}

function handleThreadSend(e) {
    e.preventDefault();
    if (!currentThreadContext) return;

    const input = document.getElementById('thread-input');
    const text = input.value.trim();
    if (!text) return;

    // Send Message
    // options: replyTo (last message?), rootId

    // Find last message to link replyTo? Or just link to Root?
    // Let's find the specific message we are replying to implies context.
    // In a flat thread view, maybe we just reply to the "other" person with rootId set.

    // For rich context, let's just set rootId.
    // AND if we want `replyTo` snippet, we could grab the last message from the other person.

    const messages = getMessages();
    const threadMessages = messages.filter(m =>
        m.rootId === currentThreadContext.rootId || m.id === currentThreadContext.rootId
    );
    // Find last message from the OTHER person
    const lastMsg = threadMessages.reverse().find(m => m.fromId === currentThreadContext.otherUserId);

    const options = {
        rootId: currentThreadContext.rootId
    };

    if (lastMsg) {
        options.replyTo = {
            id: lastMsg.id,
            name: lastMsg.fromName,
            text: lastMsg.message
        };
    }

    // Call global sendMessage
    const newMessage = sendMessage(currentThreadContext.otherUserId, currentThreadContext.otherUserName, text, options);

    if (newMessage) {
        input.value = '';
        renderThreadMessages(); // Refresh UI

        // Also update background badges/lists if necessary
        // (Optional: update main timeline if open)
    }
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
        elements.timelineList = document.getElementById('timeline-list');
        elements.receivedBadge = document.getElementById('received-badge');

        // Received Tab Grouping Elements
        elements.receivedSendersList = document.getElementById('received-senders-list');
        elements.receivedMessagesDetail = document.getElementById('received-messages-detail');
        elements.detailSenderName = document.getElementById('detail-sender-name');
        elements.detailMessagesList = document.getElementById('detail-messages-list');

        // Sent Tab Grouping Elements
        elements.sentRecipientsList = document.getElementById('sent-recipients-list');
        elements.sentMessagesDetail = document.getElementById('sent-messages-detail');
        elements.detailRecipientName = document.getElementById('detail-recipient-name');
        elements.detailSentMessagesList = document.getElementById('detail-sent-messages-list');


        // Search & Friends
        elements.searchUserIdInput = document.getElementById('search-userid');
        elements.searchResult = document.getElementById('search-result');
        elements.followingList = document.getElementById('following-list');
        elements.blockedList = document.getElementById('blocked-list');
        elements.blockedListToggle = document.getElementById('blocked-list-toggle');
        elements.followerList = document.getElementById('follower-list');
        elements.followerListToggle = document.getElementById('follower-list-toggle');

        elements.followingListToggle = document.getElementById('following-list-toggle');

        // New Dropdown Elements
        elements.listTypeSelect = document.getElementById('list-type-select');
        elements.followingListWrapper = document.getElementById('following-list-wrapper');
        elements.followerListWrapper = document.getElementById('follower-list-wrapper');
        elements.blockedListWrapper = document.getElementById('blocked-list-wrapper');

        elements.searchSectionToggle = document.getElementById('search-section-toggle');
        elements.searchSectionContent = document.getElementById('search-section-content');

        // Profile Modal
        elements.profileModal = document.getElementById('profile-modal');
        elements.closeModal = elements.profileModal.querySelector('.close-modal');
        elements.modalUsername = document.getElementById('modal-username');
        elements.usernameEdit = document.getElementById('username-edit');
        elements.modalUserid = document.getElementById('modal-userid');
        elements.modalFollowsYouBadge = document.getElementById('modal-follows-you-badge');
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

        // Thread Modal Elements
        elements.threadModal = document.getElementById('thread-modal');
        elements.closeThreadModal = document.querySelector('.close-thread-modal');
        elements.threadMessagesList = document.getElementById('thread-messages-list');
        elements.threadReplyForm = document.getElementById('thread-reply-form');
        elements.threadInput = document.getElementById('thread-input');
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
    if (tabName === 'timeline') {
        renderTimeline();
    } else if (tabName === 'received') {
        renderReceivedMessages();
    } else if (tabName === 'sent') {
        renderSentMessages();
    } else if (tabName === 'send') {
        // デフォルトでは宛先選択を有効化してリセット
        if (elements.recipientSelect) {
            elements.recipientSelect.disabled = false;
            elements.recipientSelect.value = ''; // Reset selection
        }
    } else if (tabName === 'friends') {
        renderSentMessages();
    } else if (tabName === 'friends') {
        renderFollowingList();
        renderFollowerList();
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
    if (searchInputVal === targetUserId) {
        renderSearchResult(searchedUser);
    }
    renderFollowingList();
    renderFollowerList(); // Update follower list UI
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
    elements.recipientSelect.disabled = true; // 宛先を変更できないようにする

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


function renderFollowerList() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const allUsers = getUsers();
    // Find users who follow me
    const followers = allUsers.filter(u => u.following && u.following.includes(currentUser.userId));

    // Using filtered list for display
    // const blockedIds = currentUser.blocked || [];
    // Should we show blocked users in follower list? usually yes, or maybe grayed out.
    // For now, simple list.

    if (followers.length === 0) {
        elements.followerList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🥰</span>
                <p>まだフォロワーはいません</p>
            </div>
        `;
    } else {
        elements.followerList.innerHTML = followers.map(user => {
            const isBlockedUser = isBlocked(user.userId);
            const isFollowed = isFollowing(user.userId);

            // Determine Follow button state
            let followBtnHtml = '';
            if (isBlockedUser) {
                followBtnHtml = `<button class="follow-btn blocked" onclick="toggleFollow('${user.userId}')">ブロック中</button>`;
            } else {
                const btnText = isFollowed ? 'フォロー中' : 'フォローする';
                const btnClass = isFollowed ? 'follow-btn following' : 'follow-btn';
                followBtnHtml = `<button class="${btnClass}" onclick="toggleFollow('${user.userId}')">${btnText}</button>`;
            }

            // Determine Thanks button state
            let thanksBtnHtml = '';
            if (isFollowed) {
                thanksBtnHtml = `<button class="btn-sm btn-success" style="border-radius: 50px;" onclick="openSendTabWithRecipient('${user.userId}')">ありがとうを送る</button>`;
            } else {
                // Disabled style and toast action
                thanksBtnHtml = `<button class="btn-sm btn-disabled-soft" style="border-radius: 50px;" onclick="showToast('ありがとうを送るにはフォローが必要です')">ありがとうを送る</button>`;
            }

            return `
            <div class="user-card">
                <div class="user-info">
                    <span class="user-name user-link" onclick="showUserProfile('${user.userId}')">${escapeHtml(user.name)}</span>
                    <span class="user-id">@${escapeHtml(user.userId)}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${thanksBtnHtml}
                    ${followBtnHtml}
                </div>
            </div>
        `}).join('');
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

    // Follows You Badge Logic
    if (elements.modalFollowsYouBadge) {
        const followsMe = user.following && user.following.includes(currentUser.userId);
        if (followsMe && !isMe) {
            elements.modalFollowsYouBadge.classList.remove('hidden');
        } else {
            elements.modalFollowsYouBadge.classList.add('hidden');
        }
    }

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

    // Thanks Button Listener with Conditional Logic
    replaceButtonListener(elements.modalThanksBtn, () => {
        if (isFollowing(user.userId)) {
            openSendTabWithRecipient(user.userId);
        } else {
            showToast('ありがとうを送るにはフォローが必要です');
        }
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
        elements.modalActionBtn.textContent = 'フォロー不可';
        elements.modalActionBtn.disabled = true;
        elements.modalActionBtn.classList.add('blocked-action');
        elements.modalActionBtn.classList.remove('following', 'btn-primary', 'btn-follow-action');
    } else {
        elements.modalActionBtn.disabled = false;
        elements.modalActionBtn.textContent = isFollowed ? 'フォロー中' : 'フォローする';
        elements.modalActionBtn.classList.remove('blocked-action');

        // Show Thanks Button always (state is visual only now)
        elements.modalThanksBtn.classList.remove('hidden');

        // Logic for Thanks Button Visual State
        if (isFollowed) {
            elements.modalThanksBtn.classList.remove('btn-disabled-soft');
        } else {
            elements.modalThanksBtn.classList.add('btn-disabled-soft');
        }

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
// メッセージカードのHTML生成
function createMessageCard(msg, type = 'sent') {
    const date = new Date(msg.createdAt);
    const timeString = formatDate(date);
    const currentUser = getCurrentUser();
    const isOwnMessage = currentUser && msg.fromId === currentUser.userId;
    const ownMessageClass = isOwnMessage ? 'own-message' : '';

    // 受信の場合は相手（自分）を表示しない
    let toHtml = '';
    // 返信ボタン
    let actionsHtml = '';

    if (type !== 'received') {
        toHtml = `
            <span class="message-arrow">→</span>
            <span class="message-to user-link" onclick="showUserProfile('${escapeHtml(msg.toId)}')">${escapeHtml(msg.toName)}</span>
         `;
    }

    // 自分のメッセージ以外で、かつタイムラインか受信ボックスの場合に返信ボタンを表示
    if (!isOwnMessage) {
        actionsHtml = `
            <button class="reply-btn" onclick="openThread('${escapeHtml(msg.id)}')">
                💬 スレッド
            </button>
        `;
    } else {
        actionsHtml = `
            <button class="reply-btn" onclick="openThread('${escapeHtml(msg.id)}')">
                💬 スレッド
            </button>
        `;
    }

    // Reply Context Rendering
    let replyContextHtml = '';
    if (msg.replyTo) {
        replyContextHtml = `
            <div class="reply-context">
                <span class="reply-link-name">↩ Replying to ${escapeHtml(msg.replyTo.name)}</span>
                <span class="reply-snippet">${escapeHtml(msg.replyTo.text)}</span>
            </div>
        `;
    }

    // Unread styling
    const unreadClass = (type === 'received' && !msg.isRead) ? 'unread' : '';
    const unreadBadge = (type === 'received' && !msg.isRead) ? '<span class="unread-badge">NEW</span>' : '';

    return `
        <div class="message-card ${unreadClass} ${ownMessageClass}">
            <div class="message-header">
                <div class="message-users">
                    <span class="message-from user-link" onclick="showUserProfile('${escapeHtml(msg.fromId)}')">${escapeHtml(msg.fromName)}</span>
                    ${unreadBadge}
                    ${toHtml}
                    ${actionsHtml}
                </div>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-body">
                ${replyContextHtml}
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
        elements.receivedSendersList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>まだありがとうのメッセージはありません</p>
            </div>
        `;
        // Ensure detail view is hidden
        elements.receivedMessagesDetail.classList.add('hidden');
        elements.receivedSendersList.classList.remove('hidden');
    } else {
        // Group by Sender
        const senderGroups = {};
        messages.forEach(msg => {
            if (!senderGroups[msg.fromId]) {
                senderGroups[msg.fromId] = {
                    name: msg.fromName,
                    messages: [],
                    latest: 0
                };
            }
            senderGroups[msg.fromId].messages.push(msg);
            if (msg.createdAt > senderGroups[msg.fromId].latest) {
                senderGroups[msg.fromId].latest = msg.createdAt;
            }
        });

        // Convert to array and sort by latest message time descending
        const sortedSenders = Object.keys(senderGroups).map(fromId => {
            return { id: fromId, ...senderGroups[fromId] };
        }).sort((a, b) => b.latest - a.latest);

        // Create Sender List HTML
        const sendersHtml = sortedSenders.map(group => {
            const count = group.messages.length;

            // Unread Logic
            const hasUnread = group.messages.some(m => !m.isRead);
            const unreadIndicator = hasUnread ? '<span class="unread-indicator"></span>' : '';
            const unreadStyle = hasUnread ? 'font-weight: bold; color: var(--text-primary);' : 'color: var(--text-secondary);';

            return `
            <div class="user-card" onclick="showReceivedDetail('${group.id}')" style="cursor: pointer;">
                <div class="user-info">
                    <span class="user-name">${escapeHtml(group.name)} ${unreadIndicator}</span>
                    <span class="user-id" style="font-size: 12px; ${unreadStyle}">メッセージ ${count}件</span>
                </div>
                <div style="font-size: 20px; color: var(--pink-400);">
                    →
                </div>
            </div>
            `;
        }).join('');

        elements.receivedSendersList.innerHTML = sendersHtml;

        // Ensure List View is active
        elements.receivedSendersList.classList.remove('hidden');
        elements.receivedMessagesDetail.classList.add('hidden');
    }

    // バッジを更新 (Count only unread)
    const unreadCount = messages.filter(m => !m.isRead).length;
    updateReceivedBadge(unreadCount);
}

// Show Detail View for specific sender
window.showReceivedDetail = function (fromId) {
    const currentUser = getCurrentUser();
    const messages = getReceivedMessages(currentUser.userId).filter(m => m.fromId === fromId);

    if (messages.length > 0) {
        elements.detailSenderName.textContent = messages[0].fromName + 'さんからのメッセージ';
        elements.detailMessagesList.innerHTML = messages.map(msg => createMessageCard(msg, 'received')).join('');

        // Mark as Read
        markMessagesAsRead(currentUser.userId, fromId);

        // Show Detail, Hide List
        elements.receivedSendersList.classList.add('hidden');
        elements.receivedMessagesDetail.classList.remove('hidden');
    }
};

function markMessagesAsRead(userId, fromId) {
    const messages = getMessages();
    let updated = false;
    messages.forEach(msg => {
        if (msg.toId === userId && msg.fromId === fromId && !msg.isRead) {
            msg.isRead = true;
            updated = true;
        }
    });

    if (updated) {
        saveMessages(messages);
        // Update badge immediately
        const currentUser = getCurrentUser();
        const myMessages = getReceivedMessages(currentUser.userId);
        const unreadCount = myMessages.filter(m => !m.isRead).length;
        updateReceivedBadge(unreadCount);
    }
}

// Back to List View
window.backToReceivedList = function () {
    renderReceivedMessages(); // Refresh list to update unread status/dots
    elements.receivedSendersList.classList.remove('hidden');
    elements.receivedMessagesDetail.classList.add('hidden');
};

// 送信済みメッセージを表示
function renderSentMessages() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const messages = getSentMessages(currentUser.userId);

    if (messages.length === 0) {
        elements.sentRecipientsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✨</span>
                <p>まだありがとうを送っていません</p>
            </div>
        `;
        elements.sentMessagesDetail.classList.add('hidden');
        elements.sentRecipientsList.classList.remove('hidden');
    } else {
        // Group by Recipient
        const groups = {};
        messages.forEach(msg => {
            if (!groups[msg.toId]) {
                groups[msg.toId] = {
                    name: msg.toName,
                    messages: [],
                    latest: 0
                };
            }
            groups[msg.toId].messages.push(msg);
            if (msg.createdAt > groups[msg.toId].latest) {
                groups[msg.toId].latest = msg.createdAt;
            }
        });

        // Convert to array and sort by latest message time descending
        const sortedRecipients = Object.keys(groups).map(toId => {
            return { id: toId, ...groups[toId] };
        }).sort((a, b) => b.latest - a.latest);

        const html = sortedRecipients.map(recipient => {
            return `
            <div class="user-card" onclick="showSentDetail('${recipient.id}')" style="cursor: pointer;">
                <div class="user-info">
                    <span class="user-name">${escapeHtml(recipient.name)}</span>
                    <span class="user-id" style="font-size: 12px; color: var(--text-secondary);">メッセージ ${recipient.messages.length}件</span>
                </div>
                <div style="font-size: 20px; color: var(--blue-400);">
                    →
                </div>
            </div>
            `;
        }).join('');

        elements.sentRecipientsList.innerHTML = html;
        elements.sentRecipientsList.classList.remove('hidden');
        elements.sentMessagesDetail.classList.add('hidden');
    }
}

// Show Detail View for specific recipient
window.showSentDetail = function (toId) {
    const currentUser = getCurrentUser();
    const messages = getSentMessages(currentUser.userId).filter(m => m.toId === toId);

    if (messages.length > 0) {
        elements.detailRecipientName.textContent = messages[0].toName + 'さんへのメッセージ';
        elements.detailSentMessagesList.innerHTML = messages.map(msg => createMessageCard(msg, 'sent')).join('');

        elements.sentRecipientsList.classList.add('hidden');
        elements.sentMessagesDetail.classList.remove('hidden');
    }
};

window.backToSentList = function () {
    elements.sentRecipientsList.classList.remove('hidden');
    elements.sentMessagesDetail.classList.add('hidden');
};

// タイムラインを表示
function renderTimeline() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // ブロックユーザーのIDリスト
    const blockedIds = currentUser.blocked || [];

    // 全メッセージを取得
    let messages = getMessages();

    // ブロックしている/されているユーザーのメッセージを除外
    messages = messages.filter(m =>
        !blockedIds.includes(m.fromId) &&
        !blockedIds.includes(m.toId)
    );

    if (messages.length === 0) {
        elements.timelineList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📱</span>
                <p>まだメッセージはありません</p>
            </div>
        `;
    } else {
        const html = messages.map(msg => createMessageCard(msg, 'timeline')).join('');
        elements.timelineList.innerHTML = html;
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



function handleSendMessage(e) {
    e.preventDefault();

    const recipientId = elements.recipientSelect.value;
    const recipientOption = elements.recipientSelect.options[elements.recipientSelect.selectedIndex];
    const recipientName = recipientOption.dataset.name;
    const message = elements.messageInput.value.trim();

    if (!recipientId || !message) return;

    // Send logic modified to accept object or parameters?
    // modify sendMessage signature to accept options? or just pass it in message object construction within sendMessage?
    // Let's modify sendMessage to accept an optional 4th argument options

    const options = {};
    if (currentReplyContext) {
        options.replyTo = currentReplyContext;
    }

    const newMessage = sendMessage(recipientId, recipientName, message, options);

    if (newMessage) {
        showToast(`${recipientName}さんにありがとうを送りました！`);
        elements.messageInput.value = '';
        elements.recipientSelect.value = '';

        // Reset Reply Context
        cancelReply();

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
        elements.modalCancelBtn.addEventListener('click', cancelEditProfile);

        // Reply Preview Events
        document.getElementById('cancel-reply-btn').addEventListener('click', cancelReply);

        // Thread Modal Events
        if (elements.closeThreadModal) {
            elements.closeThreadModal.addEventListener('click', closeThread);
        }
        if (elements.threadModal) {
            elements.threadModal.addEventListener('click', (e) => {
                if (e.target === elements.threadModal) closeThread();
            });
        }
        if (elements.threadReplyForm) {
            elements.threadReplyForm.addEventListener('submit', handleThreadSend);
        }

        // Blocked List Toggle
        if (elements.blockedListToggle) {
            elements.blockedListToggle.addEventListener('click', () => {
                elements.blockedListToggle.classList.toggle('collapsed');
                elements.blockedList.classList.toggle('collapsed');
            });
        }

        // List Type Select Logic
        if (elements.listTypeSelect) {
            elements.listTypeSelect.addEventListener('change', (e) => {
                const selected = e.target.value;
                if (selected === 'following') {
                    elements.followingListWrapper.classList.remove('hidden');
                    elements.followerListWrapper.classList.add('hidden');
                    elements.blockedListWrapper.classList.add('hidden');
                } else if (selected === 'followers') {
                    elements.followingListWrapper.classList.add('hidden');
                    elements.followerListWrapper.classList.remove('hidden');
                    elements.blockedListWrapper.classList.add('hidden');
                } else if (selected === 'blocked') {
                    elements.followingListWrapper.classList.add('hidden');
                    elements.followerListWrapper.classList.add('hidden');
                    elements.blockedListWrapper.classList.remove('hidden');
                }
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
                    elements.searchSectionContent.classList.remove('collapsed');
                } else {
                    elements.searchSectionContent.style.display = 'none';
                    elements.searchSectionToggle.classList.add('collapsed');
                }
            });
        }

        // Global Event Delegation removed - reverted to replaceButtonListener pattern

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
        switchTab('timeline'); // Default to timeline tab

        // 受信メッセージ数を更新 (Unread only)
        const myMessages = getReceivedMessages(currentUser.userId);
        const unreadCount = myMessages.filter(m => !m.isRead).length;
        updateReceivedBadge(unreadCount);
    }
}

// Reply Context State
let currentReplyContext = null;

function startReply(messageId) {
    const messages = getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    // Set Context
    currentReplyContext = {
        id: msg.id,
        name: msg.fromName,
        text: msg.message
    };

    // Update UI
    const preview = document.getElementById('reply-preview');
    preview.querySelector('.reply-to-name').textContent = `Replying to ${currentReplyContext.name}`;
    preview.querySelector('.reply-text-snippet').textContent = currentReplyContext.text;
    preview.classList.remove('hidden');

    // Switch Tab & Set Recipient
    openSendTabWithRecipient(msg.fromId);
}

function cancelReply() {
    currentReplyContext = null;
    document.getElementById('reply-preview').classList.add('hidden');
}

// Override openSendTabWithRecipient to verify context validity
// If user changes recipient manually, we might want to clear context, but for now simple logic.
// The original function is modified to NOT clear the form if we are replying.
const originalOpenSendTab = window.openSendTabWithRecipient;
window.openSendTabWithRecipient = function (userId) {
    // If we called this NOT via startReply (i.e. just "Send Thanks" button), should we clear reply context?
    // Let's rely on explicit cancel for now, or clear if the recipient doesn't match the reply context sender.
    if (currentReplyContext) {
        // If the intended recipient is different from the reply context author, warn or clear?
        // Actually, msg.fromId is the recipient.
        // We'll trust the flow for now.
    }

    // Call original logic (which sets recipient)
    // We need to recreate the logic inside here because we don't have access to the original function scope easily if we didn't save it.
    // Wait, I defined it globally above.

    // Actually, I should update the original function to be aware of reply context or just replicate logic.
    // Replicating logic for simplicity and to add specific behavior.

    const user = findUser(userId);
    if (!user) return;

    if (elements.profileModal.classList.contains('show')) {
        closeModal();
    }

    switchTab('send');
    elements.recipientSelect.value = userId;
    elements.recipientSelect.disabled = true;
    elements.sendForm.scrollIntoView({ behavior: 'smooth' });
};

// ============================
// イベントハンドラ (Restored)
// ============================

function handleLogin(e) {
    e.preventDefault();
    const userId = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value.trim();

    if (!userId || !password) {
        showToast('ユーザーIDとパスワードを入力してください');
        return;
    }

    let user = findUser(userId);
    if (!user) {
        showToast('ユーザーIDまたはパスワードが間違っています');
        return;
    } else {
        if (user.password && user.password !== password) {
            showToast('ユーザーIDまたはパスワードが間違っています');
            return;
        }
        showToast(`おかえりなさい、${user.name}さん！`);
    }

    setCurrentUser(user);

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

    const options = {};
    if (currentReplyContext) {
        options.replyTo = currentReplyContext;
    }

    const newMessage = sendMessage(recipientId, recipientName, message, options);

    if (newMessage) {
        showToast(`${recipientName}さんにありがとうを送りました！`);
        elements.messageInput.value = '';
        elements.recipientSelect.value = '';

        // Reset Reply Context
        cancelReply();

        // Update Sent Messages List
        renderSentMessages();
    }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', initialize);
