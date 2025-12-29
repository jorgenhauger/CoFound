// conversation.js - Chat logic using Supabase

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const currentUser = await getSessionUser();
        const chatMessages = document.getElementById('chat-messages');
        const participantNameEl = document.getElementById('participant-name');
        const participantAvatarEl = document.getElementById('participant-avatar');
        const replyInput = document.getElementById('reply-input');
        const sendReplyBtn = document.getElementById('send-reply-btn');

        // Get participant ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const participantId = urlParams.get('id');

        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        if (!participantId) {
            console.warn('Missing participant ID, redirecting...');
            window.location.href = 'messages.html';
            return;
        }

        // --- Helper: Fetch participant details ---
        async function loadParticipant() {
            // Try to find profile in DB
            const { data: profile } = await db.from('profiles').select('*').eq('id', participantId).single();

            if (profile) {
                if (participantNameEl) participantNameEl.textContent = profile.name;
                if (participantAvatarEl) participantAvatarEl.src = profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`;
                return profile;
            } else {
                // Fallback UI
                if (participantNameEl) participantNameEl.textContent = "Bruker";
                return { name: "Bruker" };
            }
        }

        // --- Render Messages ---
        async function renderChat() {
            if (!chatMessages) return;

            // Fetch real messages from Supabase (via data.js helper)
            const messages = await getConversationMessages(participantId);

            // Clear loading state if any
            chatMessages.innerHTML = '';

            messages.forEach(msg => {
                const isMe = msg.fromId === currentUser.id;
                const messageEl = document.createElement('div');
                messageEl.className = `chat-bubble ${isMe ? 'sent' : 'received'}`;

                // Parse timestamp
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                messageEl.innerHTML = `
                    <div class="bubble-content">
                        ${msg.postTitle ? `<div class="bubble-context">📌 ${msg.postTitle}</div>` : ''}
                        <p>${msg.message}</p>
                        <span class="bubble-time">${timeStr}</span>
                    </div>
                `;

                chatMessages.appendChild(messageEl);
            });

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // --- Send Reply ---
        async function sendReply() {
            if (!replyInput) return;

            const text = replyInput.value.trim();
            if (!text) return;

            // Disable button
            if (sendReplyBtn) sendReplyBtn.disabled = true;

            // Send via data.js
            const result = await sendMessage(participantId, "Svar", text, null);

            if (result.success) {
                replyInput.value = '';
                await renderChat(); // Refresh chat
            } else {
                alert("Kunne ikke sende melding: " + result.message);
            }

            if (sendReplyBtn) sendReplyBtn.disabled = false;
        }

        // --- Init ---
        await loadParticipant();
        await renderChat();

        // Mark as read immediately
        markConversationAsRead(participantId);


        // --- Event Listeners ---
        if (sendReplyBtn) sendReplyBtn.addEventListener('click', sendReply);

        if (replyInput) {
            replyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                }
            });
        }

        // Optional: Poll for new messages every 5 seconds (Realtime subscription is better but this is MVP)
        setInterval(() => {
            renderChat(); // Silent refresh
        }, 5000);


    } catch (error) {
        console.error('Error in conversation.js:', error);
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `<div style="color: red; padding: 20px;">Feil ved lasting av samtale.</div>`;
        }
    }
});
