// Add unread badge update to all pages with navbar
window.updateNavbarBadge = async function () {
    const navbarUnreadBadge = document.getElementById('navbar-unread-badge');

    if (!navbarUnreadBadge) return;

    // Use our new data.js function
    const unreadCount = await getUnreadMessageCount();

    const badges = [
        document.getElementById('navbar-unread-badge'),
        document.getElementById('bottom-nav-badge')
    ];

    badges.forEach(badge => {
        if (!badge) return;

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex'; // Flex for centering (was inline-block)
            badge.classList.add('pulse');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('pulse');
        }
    });
};

// Run on load and every 60 seconds (long polling to avoid spamming DB)
document.addEventListener('DOMContentLoaded', () => {
    updateNavbarBadge();
    setInterval(updateNavbarBadge, 60000);
});
