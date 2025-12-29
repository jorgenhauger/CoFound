// Messages.js - Inbox functionality
// Assumes Supabase data.js methods are available (getMyMessages)

// Global state for cache
let cachedConversations = [];

// Helper: Group messages into conversations
function groupMessagesToConversations(messages, currentUser) {
    if (!messages || messages.length === 0) return [];

    const conversations = {};

    messages.forEach(msg => {
        // Find "the other person"
        const isMeSender = msg.fromId === currentUser.id;

        const otherId = isMeSender ? msg.toId : msg.fromId;
        const otherName = isMeSender ? msg.to : msg.from;

        // Use default avatar if missing, or specific logic
        // Note: msg.avatar logic in data.js might need tweaking, but we try:
        // If I sent it, I want RECEIVER's avatar. Data.js getMyMessages now returns 'avatar' somewhat ambiguously or we need to check sender/receiver relations.
        // Actually, let's rely on data.js returning structured data.
        // For now, let's just assume we can get it or fallback.
        const otherAvatar = isMeSender
            ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherName}` // Fallback/Logic needed if avatar not in msg
            : msg.avatar;

        if (!conversations[otherId]) {
            conversations[otherId] = {
                id: otherId, // This is the User ID of the other person
                name: otherName,
                lastMessage: msg,
                unreadCount: 0,
                avatar: otherAvatar
            };
        }

        // Update last message
        const msgTime = new Date(msg.timestamp).getTime();
        const lastMsgTime = new Date(conversations[otherId].lastMessage.timestamp).getTime();

        if (msgTime > lastMsgTime) {
            conversations[otherId].lastMessage = msg;
        }

        // Count unread (only if I received it)
        if (!isMeSender && !msg.read) {
            conversations[otherId].unreadCount++;
        }
    });

    return Object.values(conversations).sort((a, b) => {
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
    });
}


// Render conversations
async function renderMessages() {
    const messagesContainer = document.getElementById('messages-container');
    const emptyState = document.getElementById('empty-state');

    // Sjekk login
    const currentUser = await getSessionUser(); // from auth.js (or data.js helper)
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const messages = await getMyMessages(); // Async call to Supabase
        const conversations = groupMessagesToConversations(messages, currentUser);
        cachedConversations = conversations;

        // Oppdater navbar badge basert på unread count
        updateNavbarBadge(conversations);

        if (conversations.length === 0) {
            messagesContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        messagesContainer.innerHTML = conversations.map(conv => createConversationHTML(conv)).join('');
        messagesContainer.style.display = 'block';
        emptyState.style.display = 'none';

    } catch (error) {
        console.error('Error rendering messages:', error);
        messagesContainer.innerHTML = `<div class="error-message" style="color: red; padding: 20px;">Kunne ikke laste meldinger.</div>`;
    }
}

// Create conversation HTML
function createConversationHTML(conv) {
    const unreadClass = conv.unreadCount > 0 ? 'unread' : '';
    const lastMsg = conv.lastMessage;
    const dateStr = new Date(lastMsg.timestamp).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });

    // Check if I sent the last message
    const previewPrefix = (lastMsg.fromId === conv.id) ? '' : 'Du: ';

    return `
        <div class="message-card ${unreadClass}" onclick="window.location.href='conversation.html?id=${conv.id}'">
            <div class="message-header">
                <div class="message-from">
                    <img src="${conv.avatar}" alt="${escapeHTML(conv.name)}" class="avatar-small">
                    <strong>${escapeHTML(conv.name)}</strong>
                    ${conv.unreadCount > 0 ? `<span class="new-badge">${conv.unreadCount} NY</span>` : ''}
                </div>
                <div class="message-time">${dateStr}</div>
            </div>
            <div class="message-preview" style="margin-left: 32px;">${previewPrefix}${escapeHTML(lastMsg.message)}</div>
        </div>
    `;
    `;
}

function updateNavbarBadge(conversations) {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    const badge = document.getElementById('navbar-unread-badge');
    if (badge) {
        if (totalUnread > 0) {
            badge.textContent = totalUnread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Vi må vente på at auth.js har sjekket session før vi laster, 
    // men getSessionUser() håndterer det ved å være async.
    renderMessages();
});
