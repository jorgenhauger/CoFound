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

// Gjør funksjoner tilgjengelig globalt
window.showToast = showToast;
window.redirectWithDelay = redirectWithDelay;
window.escapeHTML = escapeHTML;
window.calculateProfileCompleteness = calculateProfileCompleteness;
window.triggerConfetti = triggerConfetti;

// Custom Confirmation Modal
function showConfirmDialog(message, onConfirm) {
    // Remove existing if any
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal show'; // Reuse existing modal styles

    modal.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 400px;">
            <h2 style="font-size: 1.25rem; margin-bottom: 10px;">Bekreft handling</h2>
            <p style="margin-bottom: 20px;">${escapeHTML(message)}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirm-cancel" class="btn-secondary">Avbryt</button>
                <button id="confirm-yes" class="btn-primary" style="background-color: #ea4335; border-color: #ea4335;">Slett</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('confirm-cancel').onclick = () => modal.remove();
    document.getElementById('confirm-yes').onclick = () => {
        modal.remove();
        onConfirm();
    };

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Show Skills Modal
function showSkillsModal(name, skills) {
    const existing = document.getElementById('skills-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'skills-modal';
    modal.className = 'modal show'; // Reuse existing modal styles

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; width: 90%;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="font-size: 1.25rem; margin-bottom: 20px;">Ferdigheter: ${escapeHTML(name)}</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${skills.map(skill => `<span class="tag" style="border-radius: 4px;">${escapeHTML(skill)}</span>`).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}
window.showConfirmDialog = showConfirmDialog;
window.showSkillsModal = showSkillsModal;

// Delings-hjelper
function sharePost(title, text, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url || window.location.href,
        })
            .then(() => console.log('Delt suksessfullt'))
            .catch((error) => console.log('Error sharing:', error));
    } else {
        // Fallback: Kopier til utklippstavle
        const shareUrl = url || window.location.href;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Lenke kopiert til utklippstavle! 📋', 'success');
        });
    }
}
window.sharePost = sharePost;

// Favorites Logic
// Now just wrappers or placeholders, as logic moved to data.js
// Ideally, we should remove these and call data.js directly, but to keep existing calls working in app.js:

async function isFavorite(type, id) {
    // This requires async now, which might break synchronous checks in UI rendering.
    // For rendering lists, we should fetch all favorites IDs first and check against the set.
    // This wrapper might not be useful anymore for synchronous rendering.
    const favs = await getFavorites(type);
    return favs.includes(String(id));
}

// We'll keep this exposed so app.js buttons can call it
window.toggleFavorite = toggleFavorite; // References the function from data.js if included? 
// Wait, utils.js is included BEFORE data.js usually? Or AFTER?
// Index.html: supabase, utils, data, auth, app.
// So utils is loaded BEFORE data.js.
// So 'toggleFavorite' from data.js is NOT available here yet.

// Better approach:
// Define a temporary global wrapper or rely on app.js to define the click handler.
// app.js has: window.toggleFavoriteBtn = ...
// Let's modify utils.js to NOT define toggleFavorite implementation, but maybe helper for optimistic UI.

// Actually, let's remove the localStorage implementation here.
// And since data.js defines these functions globally (presumably, or attached to window if module?), 
// we should rely on data.js.
// But data.js uses 'async function ...'. In main scope these are globals.
// So we can remove the implementations here to avoid conflict/shadowing.

// We will export nothing for favorites here, and let data.js handle it.
// BUT app.js expects 'showToast' etc.

// Let's just comment out the old logic.
