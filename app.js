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

// --- SMART MATCHING LOGIC ---

// Beregn match-score for PROSJEKTER
function calculateMatchScore(postTags) {
    if (!window.currentUser || !window.currentUser.skills || !postTags) return 0;

    const userSkills = window.currentUser.skills.map(s => s.toLowerCase());
    const tags = postTags.map(t => t.toLowerCase());

    const intersection = tags.filter(tag => userSkills.includes(tag));
    return intersection.length;
}

// Beregn match-score for PROFILER
function calculateProfileMatchScore(profile) {
    if (!window.currentUser || !window.currentUser.skills || !profile.skills) return 0;

    // 0. Ikke match deg selv
    if (profile.id === window.currentUser.id) return 0;

    const mySkills = window.currentUser.skills.map(s => s.toLowerCase());
    const theirSkills = profile.skills.map(s => s.toLowerCase());

    // 1. Skill Overlap (+1 per skill)
    const intersection = theirSkills.filter(skill => mySkills.includes(skill));
    let score = intersection.length;

    // 2. Rolle-kompatibilitet (Founder + Co-founder = Match)
    const myRole = (window.currentUser.role || '').toLowerCase();
    const theirRole = (profile.role || '').toLowerCase();

    // Enkel logikk: Hvis vi har forskjellige roller, er det bra (Founder leter ofte etter Co-founder og omvendt)
    if (myRole !== theirRole && (myRole === 'founder' || myRole === 'co-founder') && (theirRole === 'founder' || theirRole === 'co-founder')) {
        score += 2; // Bonus
    }

    return score;
}


// Render "Anbefalte PROSJEKTER"
function renderRecommendedFeed() {
    const recommendedSection = document.getElementById('recommended-projects-section'); // Opdatert ID
    if (!recommendedSection) {
        // Fallback for sikkerhet hvis HTML ikke er oppdatert ennå i DOM
        const old = document.getElementById('recommended-section');
        if (old) old.id = 'recommended-projects-section';
    }

    const section = document.getElementById('recommended-projects-section');
    const container = document.getElementById('recommended-feed');

    if (!section || !container || !allPosts.length) return;

    // Kun vis hvis vi er på prosjekt-fanen (sjekkes også ved tab-switch, men greit å ha her)
    // ... (Vi styrer visnling via tab-event listeners nedenfor)

    const scoredPosts = allPosts.map(post => {
        return { ...post, matchScore: calculateMatchScore(post.tags) };
    }).filter(post => post.matchScore > 0);

    scoredPosts.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = scoredPosts.slice(0, 5);

    // VISIBILITY CHECK: Only show if we are strictly on the projects tab
    const projectsTab = document.querySelector('.tab-btn[data-tab="projects"]');
    // If no tab system exists (e.g. other page), default to true? No, feed.html always has it.
    const isProjectsTabActive = projectsTab ? projectsTab.classList.contains('active') : true;

    if (isProjectsTabActive) {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }

    if (topMatches.length === 0) {
        container.innerHTML = `
            <div class="empty-match-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">🌱</div>
                <h4 style="margin: 0 0 4px 0;">Ingen prosjekt-matcher</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">
                    Vi fant ingen prosjekter. 
                    <a href="edit-profile.html" style="color: var(--primary-color);">Lagt til flere skills?</a>
                </p>
            </div>
        `;
        container.style.justifyContent = 'flex-start';
        return;
    }

    // Render cards
    container.innerHTML = topMatches.map(post => {
        const isHighMatch = post.matchScore >= 2;
        const badgeClass = isHighMatch ? 'match-score-high' : '';
        const badgeText = isHighMatch ? '🔥 Høy Match' : '⚡ Match';

        return `
        <div class="recommended-card" onclick="window.location.href='post.html?id=${post.id}'" style="cursor: pointer;">
             <div style="margin-bottom: 8px;">
                <span class="match-badge ${badgeClass}" style="font-size: 0.75rem;">${badgeText} (${post.matchScore})</span>
            </div>
            <h4 style="margin: 0 0 8px 0; font-size: 1rem; color: var(--text-main); line-height: 1.3;">
                ${escapeHTML(post.title)}
            </h4>
            <div class="post-tags" style="margin-top: auto;">
                ${post.tags.slice(0, 2).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                ${post.tags.length > 2 ? `<span class="tag">+${post.tags.length - 2}</span>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Render "Anbefalte PROFILER"
function renderRecommendedProfiles() {
    const section = document.getElementById('recommended-cofounders-section');
    const container = document.getElementById('recommended-cofounder-feed');

    if (!section || !container || !allCoFounders.length) return;

    const scoredProfiles = allCoFounders.map(profile => {
        return { ...profile, matchScore: calculateProfileMatchScore(profile) };
    }).filter(p => p.matchScore > 0);

    scoredProfiles.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = scoredProfiles.slice(0, 5);

    // VISIBILITY CHECK: Only show if we are on the cofounders tab
    const isBackTab = document.querySelector('.tab-btn[data-tab="cofounders"]').classList.contains('active');
    if (isBackTab) {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }

    if (topMatches.length === 0) {
        container.innerHTML = `
            <div class="empty-match-state">
                <div style="font-size: 2rem; margin-bottom: 8px;">🤷‍♂️</div>
                <h4 style="margin: 0 0 4px 0;">Ingen profil-matcher</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">
                    Ingen profiler matcher dine skills akkurat nå.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = topMatches.map(profile => {
        const isHighMatch = profile.matchScore >= 3; // Litt høyere terskel for profiles (siden role gir +2)
        const badgeClass = isHighMatch ? 'match-score-high' : '';
        const badgeText = isHighMatch ? '🔥 Solid Match' : '⚡ Match';

        const avatarUrl = profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`;

        return `
        <div class="recommended-card" onclick="window.location.href='profile.html?user=${profile.id}'" style="cursor: pointer;">
             <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                <span class="match-badge ${badgeClass}" style="font-size: 0.75rem;">${badgeText}</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${avatarUrl}" alt="${escapeHTML(profile.name)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                     <h4 style="margin: 0; font-size: 0.95rem; color: var(--text-main);">${escapeHTML(profile.name)}</h4>
                     <span style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(profile.role)}</span>
                </div>
            </div>

            <div class="post-tags" style="margin-top: auto;">
                ${(profile.skills || []).slice(0, 2).map(skill => `<span class="tag">${escapeHTML(skill)}</span>`).join('')}
                 ${(profile.skills || []).length > 2 ? `<span class="tag">+${(profile.skills || []).length - 2}</span>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Funksjon for å lage HTML for et enkelt innlegg
function createPostHTML(post) {
    // Beregn match for hoved-feeden også
    const matchScore = calculateMatchScore(post.tags);
    let matchBadgeHTML = '';

    if (matchScore > 0) {
        const isHighMatch = matchScore >= 2;
        const badgeClass = isHighMatch ? 'match-score-high' : '';
        const badgeText = isHighMatch ? '🔥 Høy Match' : '⚡ Match';
        matchBadgeHTML = `<span class="match-badge ${badgeClass}">${badgeText} (${matchScore} skills)</span>`;
    }

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
                ${matchBadgeHTML ? `<div style="margin-bottom: 8px;">${matchBadgeHTML}</div>` : ''}
                ${imageHTML}
                <p>${escapeHTML(post.description)}</p>
                <div class="post-tags">
                    ${tagsHTML}
                </div>
            </div>
            <div class="post-actions" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-secondary btn-sm" onclick="sharePost('${escapeHTML(post.title)}', 'Sjekk ut dette prosjektet på CoFound!', window.location.origin + '/feed.html?post=${post.id}')" title="Del innlegg" style="border: none; background: transparent; padding: 8px; color: var(--text-secondary);">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </button>
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

// Funksjon for å vise skeleton loaders mens vi venter på data
function renderSkeletons(container, count = 3) {
    const skeletonHTML = `
        <div class="skeleton-card">
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
        </div>
    `.repeat(count);
    container.innerHTML = skeletonHTML;
}

// --- HOVEDFUNKSJON FOR Å LASTE APPEN ---
async function initApp() {

    const user = await getSessionUser();
    if (user) {
        globalCurrentUserId = user.id;
        myFavoriteProjects = await getFavorites('project'); // returns array of IDs
        myFavoriteUsers = await getFavorites('user');
    }

    // Viser skeleton loaders i stedet for spinner
    renderSkeletons(feedContainer, 3);

    // Hent innlegg fra Supabase (via data.js)
    allPosts = await getPosts();
    renderPosts(allPosts);

    // NYTT: Render anbefalt feed hvis logget inn
    if (window.currentUser && window.currentUser.skills && window.currentUser.skills.length > 0) {
        renderRecommendedFeed();
    }

    // Hent ALLE profiler (både foundere og co-foundere) for "Finn profiler" tab
    allCoFounders = await getAllProfiles(); // Endret funksjonsnavn i data.js (vi kaller variabelen fortsatt allCoFounders for mindre refactoring)
}

// Kjør init når siden er lastet
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();

    // Check URL params for tab switching (e.g. from "Utforsk" link)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    if (urlParams.get('tab') === 'cofounders') {
        const cofounderTabBtn = document.querySelector('[data-tab="cofounders"]');
        if (cofounderTabBtn) cofounderTabBtn.click();
        // Since click() triggers the listener, the class will be added there.
        // But for safety/timing:
        document.querySelector('.nav-links')?.classList.add('mobile-visible');
    } else {
        // Default to projects: Render both recommended lists so they are ready
        renderRecommendedFeed(); // Projects
        renderRecommendedProfiles(); // Profiles (hidden but ready)
    }
});


// Setup Mobile "Explore" Button to Toggle Search
const exploreBtn = document.querySelector('.bottom-nav-item[href*="tab=cofounders"]');
if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop navigation
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('mobile-visible');

        // Focus search if opening
        if (navLinks.classList.contains('mobile-visible')) {
            document.getElementById('search-input')?.focus();
        }
    });
}

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
        if (window.triggerConfetti) triggerConfetti();
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

// Lytt på rolle-endringer
const roleRadios = document.querySelectorAll('input[name="role-filter"]');
roleRadios.forEach(radio => {
    radio.addEventListener('change', applySkillFilters); // Gjenbruk funksjon som trigger rendering
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

        // Toggle Search Bar visibility on mobile -> REMOVED to allow persistent search
        // const navLinks = document.querySelector('.nav-links');
        // Logic moved to Explore button toggle

        // Vis/Skjul seksjoner
        if (tab === 'projects') {
            projectsSection.style.display = 'block';
            cofoundersSection.style.display = 'none';
        } else if (tab === 'cofounders') {
            projectsSection.style.display = 'none';
            cofoundersSection.style.display = 'block';
            renderCoFoundersUI();
        }

        // Vis/Skjul filtre
        const categoryFilters = document.getElementById('category-filters');
        const roleFilters = document.getElementById('role-filters'); // Ny
        const skillFilters = document.getElementById('skill-filters');
        const filterTitle = document.getElementById('filter-title');

        if (tab === 'projects') {
            categoryFilters.style.display = ''; // Reset to CSS default (flex on mobile, block on desktop)
            if (roleFilters) roleFilters.style.display = 'none';
            if (skillFilters) skillFilters.style.display = 'none';
            if (filterTitle) filterTitle.textContent = 'Filtrer etter kategori';
        } else if (tab === 'cofounders') {
            categoryFilters.style.display = 'none';
            if (roleFilters) roleFilters.style.display = ''; // Vis rolle-filter
            if (skillFilters) skillFilters.style.display = ''; // Reset to CSS default
            if (filterTitle) filterTitle.textContent = 'Filtrer profiler';
            renderSkillFilters();
        }
    });
});


// --- CO-FOUNDER RENDERING ---
function createCoFounderHTML(profile) {
    const skills = profile.skills || [];
    const MAX_VISIBLE_SKILLS = 5; // Limit to 5 skills on card
    let skillsHTML = skills.slice(0, MAX_VISIBLE_SKILLS).map(skill => `<span class="tag">${skill}</span>`).join('');

    if (skills.length > MAX_VISIBLE_SKILLS) {
        // Escape name for usage in inline onclick
        const safeName = profile.name.replace(/'/g, "\\'");
        // Store skills as data attribute
        const skillsJson = JSON.stringify(skills).replace(/"/g, '&quot;');

        skillsHTML += `<span class="tag more-tag" onclick="showSkillsModal('${safeName}', ${skillsJson})" style="cursor: pointer; background: var(--border-color); color: var(--text-main);">+${skills.length - MAX_VISIBLE_SKILLS}</span>`;
    }

    const isFav = myFavoriteUsers.includes(String(profile.id));
    const activeClass = isFav ? 'active' : '';

    return `
        <article class="post-card" style="position: relative;">
            <button class="favorite-btn ${activeClass}" onclick="toggleFavoriteBtn(this, 'user', '${profile.id}')" title="Lagre favoritt">
                <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                </svg>
            </button>
            <div class="post-header">
                <a href="profile.html?user=${profile.id}" style="text-decoration: none; display: flex; gap: 10px; align-items: center;">
                    <img src="${profile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'}" alt="${escapeHTML(profile.name)}" class="post-avatar">
                    <div class="post-author">
                        <h3 style="color: var(--text-main); margin: 0; transition: color 0.2s;">${escapeHTML(profile.name)}</h3>
                        ${(() => {
            const status = profile.status || 'Aktivt søkende';
            let statusClass = 'status-green';
            if (status.includes('Åpen')) statusClass = 'status-yellow';
            if (status.includes('Ikke')) statusClass = 'status-red';
            return `<span class="status-badge ${statusClass}" style="margin-left:8px; font-size:0.75rem;">${escapeHTML(status)}</span>`;
        })()}
                    </div>
                </a>
            </div>
            <div class="post-content">
                <p>${escapeHTML(profile.bio || 'Ingen beskrivelse.')}</p>
                <div class="post-tags">
                    ${skillsHTML}
                </div>
            </div>
            <div class="post-actions" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-secondary btn-sm" onclick="sharePost('${escapeHTML(profile.name)}', 'Sjekk ut denne co-founderen på CoFound!', window.location.origin + '/profile.html?user=${profile.id}')" title="Del profil" style="border: none; background: transparent; padding: 8px; color: var(--text-secondary);">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                </button>
                <button class="btn-primary" onclick="openInterestModal('${profile.id}', '${escapeHTML(profile.name)}', 'Samarbeid')">Kontakt</button>
            </div>
        </article>
    `;
}

// Global function to show skills modal
window.showSkillsModal = function (name, skills) {
    const modal = document.getElementById('skills-modal');
    const title = document.getElementById('skills-modal-title');
    const list = document.getElementById('skills-modal-list');
    const closeBtn = document.querySelector('.close-skills');

    if (!modal || !title || !list) return;

    title.textContent = `Ferdigheter: ${name}`;
    list.innerHTML = skills.map(skill => `<span class="tag">${skill}</span>`).join('');

    modal.style.display = 'block';
    // Small delay to allow display:block to apply before adding class for opacity transition
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Close logic
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    };

    if (closeBtn) closeBtn.onclick = closeModal;

    // Window click closing logic is handled by existing general window listener or we add specific:
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
};

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

    // 1. Filtrer på Rolle (Radio buttons)
    const selectedRole = document.querySelector('input[name="role-filter"]:checked')?.value || 'all';

    if (selectedRole !== 'all') {
        filtered = filtered.filter(user => {
            // Sjekk om rollen matcher (case insensitive for sikkerhets skyld)
            return (user.role || '').toLowerCase() === selectedRole.toLowerCase();
        });
    }

    // 2. Filtrer på Skills (Tags)
    if (selectedSkills.length > 0) {
        filtered = filtered.filter(user =>
            user.skills && selectedSkills.some(skill => user.skills.includes(skill))
        );
    }

    if (filtered.length === 0) {
        cofounderFeed.innerHTML = '<p style="text-align: center; padding: 20px;">Ingen matcher valgte ferdigheter.</p>';
    } else {
        cofounderFeed.innerHTML = filtered.map(user => createCoFounderHTML(user)).join('');
    }
}

// --- SØK (Robust & Case-Insensitive) ---
const searchInput = document.getElementById('search-input');

function performSearch() {
    const rawTerm = searchInput.value;
    const term = rawTerm.toLowerCase().trim();
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    if (term === '') {
        // Hvis tomt søk, vis alt (respekter filtre hvis vi hadde det, men her resetter vi til "alt" for enkelhets skyld)
        if (activeTab === 'projects') {
            // TODO: Ideelt sett burde vi kalle applyFilters() her for å beholde kategorifiltre
            // Men for nå resetter vi til allPosts
            renderPosts(allPosts);
        } else {
            renderCoFoundersUI(); // Viser alle co-foundere
        }
        return;
    }

    if (activeTab === 'projects') {
        const result = allPosts.filter(p => {
            // Sjekk alt: Tittel, Beskrivelse, Kategori, Tags, Forfatternavn, Forfatter-rolle
            const matchTitle = p.title.toLowerCase().includes(term);
            const matchDesc = p.description.toLowerCase().includes(term);
            const matchCategory = p.category.toLowerCase().includes(term);
            const matchAuthor = p.author.toLowerCase().includes(term);
            const matchTags = p.tags && p.tags.some(t => t.toLowerCase().includes(term));

            return matchTitle || matchDesc || matchCategory || matchAuthor || matchTags;
        });
        renderPosts(result);
    } else {
        // Co-founders tab
        const result = allCoFounders.filter(p => {
            // Sjekk: Navn, Bio, Rolle, Skills, Erfaring
            const matchName = p.name.toLowerCase().includes(term);
            const matchBio = (p.bio || '').toLowerCase().includes(term);
            const matchRole = (p.role || '').toLowerCase().includes(term);
            const matchSkills = p.skills && p.skills.some(s => s.toLowerCase().includes(term));

            // Sjekk erfaring (litt mer kompleks struktur)
            const matchExp = p.experience && p.experience.some(exp =>
                (exp.role && exp.role.toLowerCase().includes(term)) ||
                (exp.company && exp.company.toLowerCase().includes(term))
            );

            return matchName || matchBio || matchRole || matchSkills || matchExp;
        });

        const cofounderFeed = document.getElementById('cofounder-feed');
        if (result.length > 0) {
            cofounderFeed.innerHTML = result.map(cf => createCoFounderHTML(cf)).join('');
        } else {
            cofounderFeed.innerHTML = '<p style="text-align: center; padding: 20px;">Ingen treff på profiler eller ferdigheter.</p>';
        }
    }
}

// Kjør søk på input (med debounce hvis vi vil, men her kjører vi direkte for responsivitet)
searchInput.addEventListener('input', performSearch);

// Lytte på enter også for å lukke tastatur på mobil
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        searchInput.blur();
    }
});
