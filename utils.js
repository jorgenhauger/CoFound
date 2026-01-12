// Toast Notification Logic
function showToast(message, type = 'info') {
    // Sjekk om det allerede finnes en toast, fjern den
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Lag ny toast
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animasjon
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Fjern etter 3 sekunder
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400); // Vent på at ut-animasjonen er ferdig
    }, 3000);
}

// Helper for delayed redirect (so toast can be seen)
function redirectWithDelay(url, delay = 1000) {
    setTimeout(() => {
        window.location.href = url;
    }, delay);
}

// XSS Protection Helper
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Beregn hvor komplett profilen er (0-100)
function calculateProfileCompleteness(profile) {
    if (!profile) return 0;

    let score = 0;
    const weights = {
        name: 15,
        role: 15,
        avatar: 20,
        bio: 20,
        skills: 15,
        experience: 15
    };

    if (profile.name && profile.name.trim() !== '') score += weights.name;
    if (profile.role && profile.role.trim() !== '') score += weights.role;
    // Sjekk om avatar er opplastet (vi antar alt som ikke er dicebear er "ekte" eller i hvert fall valgt)
    if (profile.avatar && !profile.avatar.includes('api.dicebear.com')) score += weights.avatar;
    if (profile.bio && profile.bio.trim().length > 5) score += weights.bio;
    if (profile.skills && profile.skills.length > 0) score += weights.skills;
    if (profile.experience && profile.experience.length > 0) score += weights.experience;

    return Math.min(score, 100);
}

// Konfetti-hjelper (laster biblioteket dynamisk ved behov)
function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1a73e8', '#34a853', '#f9ab00', '#ea4335'], // Google-farger
            ticks: 200,
            gravity: 1.2
        });
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        script.onload = () => triggerConfetti();
        document.head.appendChild(script);
    }
}

// Theme Logic with Persistence
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const path = window.location.pathname;

    // Force Light Mode on public pages
    // Checks for root (/), index.html, login.html, signup.html, etc.
    const isPublicPage = path === '/' || path.endsWith('index.html') || path.endsWith('login.html') || path.endsWith('signup.html') || path.endsWith('forgot-password.html') || path.endsWith('reset-password.html');

    if (isPublicPage) {
        document.body.classList.remove('dark-mode');
        return; // Stop here, do not apply dark mode
    }

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
}

// Run init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    });
} else {
    initTheme();
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
}

// Custom Confirm Dialog
function showConfirmDialog(message, onConfirm) {
    // 1. Create elements
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal-content';

    const msgEl = document.createElement('p');
    msgEl.className = 'confirm-modal-message';
    msgEl.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-modal-btn cancel';
    cancelBtn.textContent = 'Avbryt';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-modal-btn confirm';
    confirmBtn.textContent = 'Slett';

    // 2. Assemble
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    modal.appendChild(msgEl);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 3. Logic
    const close = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200); // Wait for transition
    };

    // Trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });

    // Event listeners
    cancelBtn.onclick = close;
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };

    confirmBtn.onclick = () => {
        onConfirm();
        close();
    };
}

// Expose globally
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.showToast = showToast;
window.redirectWithDelay = redirectWithDelay;
window.escapeHTML = escapeHTML;
window.calculateProfileCompleteness = calculateProfileCompleteness;
window.triggerConfetti = triggerConfetti;
window.showConfirmDialog = showConfirmDialog;
