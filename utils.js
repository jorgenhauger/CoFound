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

// Gjør funksjoner tilgjengelig globalt
window.showToast = showToast;
window.redirectWithDelay = redirectWithDelay;

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
