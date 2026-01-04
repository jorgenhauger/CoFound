// Add unread badge update to all pages with navbar
window.updateNavbarBadge = async function () {
    const navbarUnreadBadge = document.getElementById('navbar-unread-badge');

    if (!navbarUnreadBadge) return;

    // Use our new data.js function
    // Note: getUnreadMessageCount checks for session internally
    const unreadCount = await getUnreadMessageCount();

    if (unreadCount > 0) {
        navbarUnreadBadge.textContent = unreadCount;
        navbarUnreadBadge.style.display = 'inline-block';
        navbarUnreadBadge.classList.add('pulse'); // Optional: Add CSS animation
    } else {
        navbarUnreadBadge.style.display = 'none';
        navbarUnreadBadge.classList.remove('pulse');
    }
};

// Run on load and every 60 seconds (long polling to avoid spamming DB)
document.addEventListener('DOMContentLoaded', () => {
    updateNavbarBadge();
    setInterval(updateNavbarBadge, 60000);
});
