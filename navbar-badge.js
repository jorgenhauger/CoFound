// Add unread badge update to all pages with navbar
window.updateNavbarBadge = function () {
    const navbarUnreadBadge = document.getElementById('navbar-unread-badge');

    if (!navbarUnreadBadge) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Get unread count
    const allMessages = JSON.parse(localStorage.getItem('cofound_messages') || '[]');
    const myMessages = allMessages.filter(msg =>
        msg.toEmail === currentUser.email &&
        msg.fromEmail // Ensure sender exists
    );
    const unreadCount = myMessages.filter(msg => !msg.read).length;

    if (unreadCount > 0) {
        navbarUnreadBadge.textContent = unreadCount;
        navbarUnreadBadge.style.display = 'inline-block';
    } else {
        navbarUnreadBadge.style.display = 'none';
    }
};

// Run on load
document.addEventListener('DOMContentLoaded', window.updateNavbarBadge);
