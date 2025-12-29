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

    const emptyState = document.getElementById('empty-state');
    const emptyStateTitle = document.getElementById('empty-state-title');
    const emptyStateText = document.getElementById('empty-state-text');

    function hideEmptyState() {
        if (emptyState) emptyState.style.display = 'none';
    }

    function showEmptyState(tab) {
        if (!emptyState) return;
        emptyState.style.display = 'block';
        if (tab === 'projects') {
            emptyStateTitle.textContent = 'Ingen lagrede prosjekter';
            emptyStateText.textContent = 'Du har ikke lagret noen prosjekter ennå. Utforsk feeden for å finne partnere!';
        } else {
            emptyStateTitle.textContent = 'Ingen lagrede co-founders';
            emptyStateText.textContent = 'Du har ikke lagret noen co-founders ennå. Utforsk talenter i feeden!';
        }
    }

    // Render Favorite Projects
    async function renderFavoriteProjects() {
        favProjectsFeed.innerHTML = loadingSpinner;
        hideEmptyState();

        try {
            const favPosts = await getFavoriteItems('project');

            if (favPosts.length === 0) {
                favProjectsFeed.innerHTML = '';
                showEmptyState('projects');
                return;
            }

            // ... (resten av logikken)
            if (typeof createPostHTML === 'function') {
                if (window.myFavoriteProjects) {
                    window.myFavoriteProjects = favPosts.map(p => String(p.id));
                } else {
                    window.myFavoriteProjects = favPosts.map(p => String(p.id));
                }
                favProjectsFeed.innerHTML = favPosts.map(post => createPostHTML(post)).join('');
            } else {
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
        hideEmptyState();

        try {
            const favUsers = await getFavoriteItems('user');

            if (favUsers.length === 0) {
                favCofoundersFeed.innerHTML = '';
                showEmptyState('cofounders');
                return;
            }

            if (typeof createCoFounderHTML === 'function') {
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
