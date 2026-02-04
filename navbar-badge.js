// navbar-badge.js - Real-time unread message badge updates

let badgeUnsubscribe = null;

window.updateNavbarBadge = async function () {
    const unreadCount = await getUnreadMessageCount();

    const badges = [
        document.getElementById('navbar-unread-badge'),
        document.getElementById('bottom-nav-badge')
    ];

    badges.forEach(badge => {
        if (!badge) return;

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex'; // Flex for centering
            badge.classList.add('pulse');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('pulse');
        }
    });
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initial update
    await updateNavbarBadge();

    // Get current user
    const currentUser = await getSessionUser();

    if (currentUser) {
        // Subscribe to new messages (will trigger badge update)
        badgeUnsubscribe = subscribeToMessages(currentUser.id, async (newMessage) => {
            console.log('New message received, updating badge');
            await updateNavbarBadge();

            // Optional: Show toast notification
            if (window.showToast) {
                const senderName = newMessage.from_id ? 'Noen' : 'Noen';
                showToast(`Ny melding mottatt!`, 'success');
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (badgeUnsubscribe) {
        badgeUnsubscribe();
    }
});
