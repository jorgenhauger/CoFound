// favorites.js - Updated for Supabase

document.addEventListener('DOMContentLoaded', async () => {
    const favProjectsFeed = document.getElementById('fav-projects-feed');
    const favCofoundersFeed = document.getElementById('fav-cofounders-feed');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const projectsSection = document.getElementById('fav-projects-section');
    const cofoundersSection = document.getElementById('fav-cofounders-section');

    const loadingSpinner = '<div class="spinner" style="text-align:center; padding: 20px;">Laster favoritter...</div>';

    // Sjekk auth
    const user = await getSessionUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Tab Switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            if (tab === 'projects') {
                projectsSection.style.display = 'block';
                cofoundersSection.style.display = 'none';
                renderFavoriteProjects();
            } else {
                projectsSection.style.display = 'none';
                cofoundersSection.style.display = 'block';
                renderFavoriteCofounders();
            }
        });
    });

    // Render Favorite Projects
    async function renderFavoriteProjects() {
        favProjectsFeed.innerHTML = loadingSpinner;

        try {
            // Bruk den nye funksjonen i data.js som henter fulle objekter
            const favPosts = await getFavoriteItems('project');

            if (favPosts.length === 0) {
                favProjectsFeed.innerHTML = '<div class="empty-state"><p>Du har ingen lagrede prosjekter ennå.</p></div>';
                return;
            }

            // Reuse createPostHTML from app.js if available
            if (typeof createPostHTML === 'function') {
                // Vi må sette myFavoriteProjects globalt i app.js for at hjertet skal være fylt,
                // men her viser vi bare favoritter, så kanskje vi bare kan forutsette det.
                // Eller vi kan oppdatere cachen.

                // For å sikre at hjertene rendres riktig, oppdater cachen i app.js (hvis den er lastet)
                if (window.myFavoriteProjects) {
                    window.myFavoriteProjects = favPosts.map(p => String(p.id));
                } else {
                    window.myFavoriteProjects = favPosts.map(p => String(p.id));
                }

                favProjectsFeed.innerHTML = favPosts.map(post => createPostHTML(post)).join('');
            } else {
                // Fallback rendering
                favProjectsFeed.innerHTML = favPosts.map(post => `
                    <div class="post-card">
                        <h3>${escapeHTML(post.title)}</h3>
                        <p>${escapeHTML(post.description)}</p>
                        <a href="#" class="btn-primary">Se mer</a>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error("Feil ved lasting av favorittprosjekter:", error);
            favProjectsFeed.innerHTML = '<p style="color:red">Kunne ikke laste favoritter.</p>';
        }
    }

    // Render Favorite Co-founders
    async function renderFavoriteCofounders() {
        favCofoundersFeed.innerHTML = loadingSpinner;

        try {
            const favUsers = await getFavoriteItems('user');

            if (favUsers.length === 0) {
                favCofoundersFeed.innerHTML = '<div class="empty-state"><p>Du har ingen lagrede co-founders ennå.</p></div>';
                return;
            }

            if (typeof createCoFounderHTML === 'function') {
                // Oppdater cache for hjertet
                window.myFavoriteUsers = favUsers.map(u => String(u.id));

                favCofoundersFeed.innerHTML = favUsers.map(user => createCoFounderHTML(user)).join('');
            } else {
                favCofoundersFeed.innerHTML = favUsers.map(u => `<div class="post-card"><h3>${escapeHTML(u.name)}</h3><p>${escapeHTML(u.role)}</p></div>`).join('');
            }

        } catch (error) {
            console.error("Feil ved lasting av favorittpersoner:", error);
            favCofoundersFeed.innerHTML = '<p style="color:red">Kunne ikke laste favoritter.</p>';
        }
    }

    // Initial Render
    await renderFavoriteProjects();
});
