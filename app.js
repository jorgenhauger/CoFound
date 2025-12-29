// Henter elementer fra HTML
const feedContainer = document.getElementById('feed');
const filterInputs = document.querySelectorAll('input[name="skill"]');
const modal = document.getElementById('interest-modal');
const closeModalBtn = document.querySelector('.close');
const modalRecipientName = document.getElementById('modal-recipient-name');
const sendInterestBtn = document.getElementById('send-interest-btn');
const interestMessage = document.getElementById('interest-message');

// Global state for posts and users
let allPosts = [];
let allCoFounders = [];
let selectedSkills = [];
let myFavoriteProjects = [];
let myFavoriteUsers = [];
let globalCurrentUserId = null; // Lagre ID globalt for enkel tilgang

// Funksjon for å lage HTML for et enkelt innlegg
function createPostHTML(post) {
    // Lager tags-HTML
    const tagsHTML = post.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // Sjekker om innlegget har et bilde
    let imageHTML = '';
    if (post.image) {
        imageHTML = `
            <div class="post-image-container">
                <img src="${post.image}" alt="${post.title}" class="post-image-content" loading="lazy">
            </div>
        `;
    }

    const isFav = myFavoriteProjects.includes(String(post.id));
    const activeClass = isFav ? 'active' : '';

    // VI FJERNER SLETT-KNAPPEN HERFRA (Flyttet til profil)
    return `
        <article class="post-card" style="position: relative;">
            <button class="favorite-btn ${activeClass}" onclick="toggleFavoriteBtn(this, 'project', '${post.id}')" title="Lagre favoritt">
                <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                </svg>
            </button>
            <div class="post-header">
                <a href="profile.html?user=${post.user_id}" style="text-decoration: none; display: flex; gap: 10px; align-items: center;">
                    <img src="${post.avatar}" alt="${escapeHTML(post.author)}" class="post-avatar">
                    <div class="post-author">
                        <h3 style="color: var(--text-main); margin: 0; transition: color 0.2s;">${escapeHTML(post.author)}</h3>
                        <span class="post-role">${escapeHTML(post.role)}</span>
                    </div>
                </a>
            </div>
            <div class="post-content">
                <h2>${escapeHTML(post.title)}</h2>
                ${imageHTML}
                <p>${escapeHTML(post.description)}</p>
                <div class="post-tags">
                    ${tagsHTML}
                </div>
            </div>
            <div class="post-actions" style="justify-content: flex-end; align-items: center;">
                <button class="btn-primary" onclick="openInterestModal('${post.user_id}', '${escapeHTML(post.author)}', '${escapeHTML(post.title)}')">Meld interesse</button>
            </div>
        </article>
    `;
}

// Slette-funksjon
window.confirmDelete = async function (postId) {
    if (confirm("Er du sikker på at du vil slette dette innlegget?")) {
        const result = await deletePost(postId); // fra data.js
        if (result.success) {
            showToast("Innlegg slettet", "success");
            // Fjern fra listen lokalt og tegn på nytt
            allPosts = allPosts.filter(p => p.id !== postId); // ID kan være int/string, sjekk data.js
            // Egentlig for sikkerhets skyld, last inn på nytt eller filtrer løst
            // Vi filtrerer løst:
            const domElement = document.querySelector(`button[onclick="confirmDelete('${postId}')"]`).closest('.post-card');
            if (domElement) domElement.remove();
        } else {
            showToast(result.message, "error");
        }
    }
}

// Favorite Button Logic (Updated for Async Supabase)
window.toggleFavoriteBtn = async function (btn, type, id) {
    // Optimistic UI update
    btn.classList.toggle('active');
    const isNowActive = btn.classList.contains('active');

    // Call API
    // Note: toggleFavorite comes from data.js now
    const result = await toggleFavorite(type, id);

    // Result is true if favourited, false if unfavourited.
    // Sync state just in case
    if (result) {
        btn.classList.add('active');
        showToast('Lagt til i favoritter', 'success');
        // Update local cache
        if (type === 'project') myFavoriteProjects.push(String(id));
        else myFavoriteUsers.push(String(id));
    } else {
        btn.classList.remove('active');
        showToast('Fjernet fra favoritter', 'info');
        // Update local cache
        if (type === 'project') myFavoriteProjects = myFavoriteProjects.filter(pid => pid !== String(id));
        else myFavoriteUsers = myFavoriteUsers.filter(uid => uid !== String(id));
    }
}

// Funksjon for å vise innleggene i feeden
function renderPosts(postsToRender) {
    if (postsToRender.length === 0) {
        feedContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Ingen innlegg funnet.</p>';
        return;
    }
    feedContainer.innerHTML = postsToRender.map(post => createPostHTML(post)).join('');
}


// --- HOVEDFUNKSJON FOR Å LASTE APPEN ---
async function initApp() {

    const user = await getSessionUser();
    if (user) {
        globalCurrentUserId = user.id;
        myFavoriteProjects = await getFavorites('project'); // returns array of IDs
        myFavoriteUsers = await getFavorites('user');
    }

    // Viser laste-spinner
    feedContainer.innerHTML = '<div class="loading-spinner"></div><p class="loading-container">Laster innlegg...</p>';

    // Hent innlegg fra Supabase (via data.js)
    allPosts = await getPosts();
    renderPosts(allPosts);

    // Hent co-foundere også (for "Finn Co-founder" tab)
    allCoFounders = await getCoFounders();
}

// Kjør init når siden er lastet
document.addEventListener('DOMContentLoaded', initApp);


// --- EVENT LISTENERS & LOGIKK ---

// Klikk på "Meld interesse"
window.openInterestModal = function (userId, authorName, postTitle) {
    if (!globalCurrentUserId) {
        // Lagre hvor de var, slik at de kan komme tilbake
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        if (confirm("Du må være logget inn for å kontakte andre. Vil du logge inn nå?")) {
            window.location.href = 'login.html';
        }
        return;
    }

    modal.classList.add('show');
    modal.dataset.recipientId = userId; // Vi bruker ID nå, ikke email/navn
    modal.dataset.postTitle = postTitle || 'dette innlegget';
};

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
});
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
});

// Send interesse (melding)
sendInterestBtn.addEventListener('click', async () => {
    const messageText = interestMessage.value.trim();
    if (!messageText) {
        showToast('Vennligst skriv en melding', 'error');
        return;
    }

    const recipientId = modal.dataset.recipientId;
    const postTitle = modal.dataset.postTitle;

    sendInterestBtn.innerText = "Sender...";
    sendInterestBtn.disabled = true;

    // Bruk funksjonen fra data.js (som nå kaller Supabase)
    const result = await sendMessage(recipientId, `Interessert i: ${postTitle}`, messageText, postTitle);

    if (result.success) {
        showToast('Melding sendt! ✉️', 'success');
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
        interestMessage.value = '';
    } else {
        showToast(result.message, 'error');
    }

    sendInterestBtn.innerText = "Send melding";
    sendInterestBtn.disabled = false;
});


// --- FILTRERING (Kategori for Prosjekter) ---
const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');

function applyFilters() {
    const selectedCategories = Array.from(filterCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (selectedCategories.length === 0) {
        renderPosts(allPosts);
    } else {
        const filteredPosts = allPosts.filter(post =>
            selectedCategories.includes(post.category)
        );
        renderPosts(filteredPosts);
    }
}

filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});


// --- TAB SWITCHING (Prosjekter vs Folk) ---
const tabButtons = document.querySelectorAll('.tab-btn');
const projectsSection = document.getElementById('projects-section');
const cofoundersSection = document.getElementById('cofounders-section');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;

        // Vis/Skjul seksjoner
        if (tab === 'projects') {
            projectsSection.style.display = 'block';
            cofoundersSection.style.display = 'none';
        } else if (tab === 'cofounders') {
            projectsSection.style.display = 'none';
            cofoundersSection.style.display = 'block';
            renderCoFoundersUI(); // Render co-founders when tab is clicked
        }

        // Vis/Skjul filtre (enkelt bytte)
        const categoryFilters = document.getElementById('category-filters');
        const skillFilters = document.getElementById('skill-filters');
        const filterTitle = document.getElementById('filter-title');

        if (tab === 'projects') {
            categoryFilters.style.display = 'block';
            if (skillFilters) skillFilters.style.display = 'none';
            if (filterTitle) filterTitle.textContent = 'Filtrer etter kategori';
        } else if (tab === 'cofounders') {
            categoryFilters.style.display = 'none';
            if (skillFilters) skillFilters.style.display = 'block';
            if (filterTitle) filterTitle.textContent = 'Filtrer etter ferdigheter';
            renderSkillFilters();
        }
    });
});


// --- CO-FOUNDER RENDERING ---
function createCoFounderHTML(profile) {
    const skills = profile.skills || [];
    const skillsHTML = skills.map(skill => `<span class="tag">${skill}</span>`).join('');

    return `
        <article class="post-card">
            <div class="post-header">
                <a href="profile.html?user=${profile.id}" style="text-decoration: none; display: flex; gap: 10px; align-items: center;">
                    <img src="${profile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'}" alt="${escapeHTML(profile.name)}" class="post-avatar">
                    <div class="post-author">
                        <h3 style="color: var(--text-main); margin: 0; transition: color 0.2s;">${escapeHTML(profile.name)}</h3>
                        <span class="role-badge ${profile.role === 'Founder' ? 'founder' : 'co-founder'}">${escapeHTML(profile.role)}</span>
                    </div>
                </a>
            </div>
            <div class="post-content">
                <p>${escapeHTML(profile.bio || 'Ingen beskrivelse.')}</p>
                <div class="post-tags">
                    ${skillsHTML}
                </div>
            </div>
            <div class="post-actions">
                <button class="btn-primary" onclick="openInterestModal('${profile.id}', '${escapeHTML(profile.name)}', 'Samarbeid')">Kontakt</button>
            </div>
        </article>
    `;
}

function renderCoFoundersUI() {
    const cofounderFeed = document.getElementById('cofounder-feed');
    // Filteret skilles håndteres av applySkillFilters, men her viser vi alt initielt eller filtrert
    // For enkelhets skyld, bruk 'allCoFounders' som base

    if (allCoFounders.length === 0) {
        cofounderFeed.innerHTML = '<p style="text-align: center; padding: 20px;">Ingen co-foundere funnet.</p>';
        return;
    }
    cofounderFeed.innerHTML = allCoFounders.map(cf => createCoFounderHTML(cf)).join('');
}


// --- SKILL FILTERS (for Co-founders) ---

function extractAllSkills() {
    const skillsSet = new Set();
    allCoFounders.forEach(user => {
        if (user.skills && Array.isArray(user.skills)) {
            user.skills.forEach(skill => skillsSet.add(skill));
        }
    });
    return Array.from(skillsSet).sort();
}

function renderSkillFilters() {
    const activeFiltersContainer = document.getElementById('active-skill-filters');
    const availableSkillsContainer = document.getElementById('available-skills');

    if (!activeFiltersContainer || !availableSkillsContainer) return;

    const allSkills = extractAllSkills();
    const availableSkills = allSkills.filter(skill => !selectedSkills.includes(skill));

    activeFiltersContainer.innerHTML = selectedSkills.map(skill => `
        <span class="skill-pill" onclick="removeSkillFilter('${skill}')">
            ${skill} <span class="remove-icon">×</span>
        </span>
    `).join('');

    availableSkillsContainer.innerHTML = availableSkills.map(skill => `
        <span class="skill-pill available" onclick="addSkillFilter('${skill}')">
            ${skill}
        </span>
    `).join('');
}

window.addSkillFilter = function (skill) {
    selectedSkills.push(skill);
    renderSkillFilters();
    applySkillFilters();
}

window.removeSkillFilter = function (skill) {
    selectedSkills = selectedSkills.filter(s => s !== skill);
    renderSkillFilters();
    applySkillFilters();
}

function applySkillFilters() {
    const cofounderFeed = document.getElementById('cofounder-feed');
    let filtered = allCoFounders;

    if (selectedSkills.length > 0) {
        filtered = allCoFounders.filter(user =>
            user.skills && selectedSkills.some(skill => user.skills.includes(skill))
        );
    }

    if (filtered.length === 0) {
        cofounderFeed.innerHTML = '<p style="text-align: center; padding: 20px;">Ingen matcher valgte ferdigheter.</p>';
    } else {
        cofounderFeed.innerHTML = filtered.map(user => createCoFounderHTML(user)).join('');
    }
}

// --- SØK ---
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    if (activeTab === 'projects') {
        const result = allPosts.filter(p =>
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(term)))
        );
        renderPosts(result);
    } else {
        const result = allCoFounders.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.bio && p.bio.toLowerCase().includes(term))
        );
        const cofounderFeed = document.getElementById('cofounder-feed');
        cofounderFeed.innerHTML = result.length ? result.map(cf => createCoFounderHTML(cf)).join('') : '<p style="text-align: center; padding: 20px;">Ingen treff.</p>';
    }
});
