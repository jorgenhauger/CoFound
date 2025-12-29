// Sjekk om bruker er logget inn (denne redirecter hvis ikke)
// requireAuth is likely sync and checks localStorage/cookie? 
// Actually requireAuth in auth.js usually checks session.
// In auth.js (which I saw earlier but didn't memorize requireAuth details), 
// let's assume it handles redirect.
// But we also need the DATA.

// Henter elementer
const navAvatar = document.getElementById('nav-avatar');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileRole = document.getElementById('profile-role');
const profileLinkedin = document.getElementById('profile-linkedin');
const profileBio = document.getElementById('profile-bio');
const profileSkills = document.getElementById('profile-skills');
const profileExperience = document.getElementById('profile-experience');

// Funksjon for å fylle inn data
async function loadProfile() {
    // Sjekk om vi skal vise en annen bruker
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('user');

    // Hent min bruker (for navbar og sjekk)
    const currentUser = await getCurrentUserProfile();

    // Bestem hvilken profil vi skal vise
    let profileToLoad = currentUser;
    let isMyProfile = true;

    if (viewUserId && (!currentUser || viewUserId !== currentUser.id)) {
        isMyProfile = false;
        profileToLoad = await getPublicProfile(viewUserId);

        if (!profileToLoad) {
            document.querySelector('.profile-main').innerHTML = '<p style="padding: 20px;">Fant ikke brukeren.</p>';
            return;
        }
    } else if (!currentUser) {
        // Ikke innlogget og ingen user-param
        window.location.href = 'login.html';
        return;
    }

    // Navigasjon (håndteres av auth.js, men vi må sikre at navbar oppdateres hvis vi er logget inn)
    // Ingen endring her

    // Fyll inn info for profileToLoad
    if (profileAvatar) profileAvatar.src = profileToLoad.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';
    if (profileName) profileName.textContent = profileToLoad.name;

    // Vis rolle med badge
    if (profileRole) {
        const roleClass = profileToLoad.role === 'Founder' ? 'founder' : 'co-founder';
        const roleNorwegian = profileToLoad.role === 'Founder' ? 'Idéhaver' : 'Bidragsyter';
        profileRole.innerHTML = `
            ${escapeHTML(profileToLoad.role)} 
            <span class="role-badge ${roleClass}">${roleNorwegian}</span>
        `;
    }

    if (profileBio) profileBio.textContent = profileToLoad.bio || 'Ingen biografi lagt til.';

    // Social Links
    if (profileLinkedin) {
        profileLinkedin.href = profileToLoad.linkedin || "#";
        if (!profileToLoad.linkedin) profileLinkedin.style.display = 'none';
        else profileLinkedin.style.display = 'inline-flex';
    }

    // Skjul/Endre "Actions" basert på om det er min profil
    const profileActions = document.querySelector('.profile-actions');
    if (profileActions) {
        if (isMyProfile) {
            // Standard visning (LinkedIn link er allerede håndtert over, men Rediger-knappen må være der)
            const editBtn = profileActions.querySelector('a[href="edit-profile.html"]');
            if (editBtn) editBtn.style.display = 'inline-flex';
        } else {
            // Skjul rediger-knapp
            const editBtn = profileActions.querySelector('a[href="edit-profile.html"]');
            if (editBtn) editBtn.style.display = 'none';

            // Vi kan legge til en "Kontakt"-knapp her hvis vi vil, men vi holder det enkelt foreløpig
            // E.g. en knapp som åpner modalen
        }
    }


    // Ferdigheter
    if (profileSkills) {
        const skills = profileToLoad.skills || [];
        if (skills.length > 0) {
            profileSkills.innerHTML = skills.map(skill =>
                `<span class="tag">${skill}</span>`
            ).join('');
        } else {
            profileSkills.innerHTML = '<span style="color: var(--text-secondary);">Ingen ferdigheter lagt til.</span>';
        }
    }

    // Erfaring
    if (profileExperience) {
        const experience = profileToLoad.experience || [];

        if (experience.length > 0) {
            profileExperience.innerHTML = experience.map(exp => `
                <div class="experience-item">
                    <div class="exp-header">
                        <h4>${escapeHTML(exp.role)}</h4>
                        <span class="exp-period">${escapeHTML(exp.period)}</span>
                    </div>
                    <p class="exp-company">${escapeHTML(exp.company)}</p>
                    <p class="exp-desc">${escapeHTML(exp.description)}</p>
                </div>
            `).join('');
        } else {
            profileExperience.innerHTML = '<p style="color: var(--text-secondary);">Ingen erfaring lagt til.</p>';
        }
    } else {
        profileExperience.innerHTML = '<p style="color: var(--text-secondary);">Ingen erfaring lagt til.</p>';
    }

    // --- MINE INNLEGG (eller brukerens innlegg) ---
    const myPostsCard = document.getElementById('my-posts-card');
    const profilePostsContainer = document.getElementById('profile-posts-container');
    const postsTitle = myPostsCard ? myPostsCard.querySelector('h3') : null;

    if (myPostsCard && profilePostsContainer) {
        if (!isMyProfile) {
            if (postsTitle) postsTitle.textContent = "Brukerens Innlegg";
        }

        // Vis spinner mens vi laster innlegg
        myPostsCard.style.display = 'block';
        profilePostsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // Hent innlegg for denne brukeren
        const myPosts = await getPostsByUser(profileToLoad.id);

        if (myPosts.length > 0) {
            myPostsCard.style.display = 'block';
            profilePostsContainer.innerHTML = myPosts.map(post => `
                <div class="profile-post-item">
                    <div class="profile-post-content">
                        <h4>${escapeHTML(post.title)}</h4>
                        <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${new Date().toLocaleDateString()}</span>
                        <p>${escapeHTML(post.description.substring(0, 80))}...</p>
                    </div>
                    <div class="profile-post-actions">
                         ${isMyProfile ? `
                             <a href="create.html?edit=${post.id}" class="btn-secondary btn-sm" style="text-decoration: none; border-color: var(--border-color); color: var(--text-secondary);">
                                Rediger ✏️
                             </a>
                             <button class="btn-secondary btn-sm" onclick="deleteProfilePost('${post.id}')" style="border-color: #ffcccb; color: #ea4335;">
                                Slett 🗑️
                             </button>
                         ` : `
                            <!-- Her kan vi legge til 'Se innlegg' knapp eller lignende -->
                         `}
                    </div>
                </div>
            `).join('');
        } else {
            myPostsCard.style.display = 'block';
            profilePostsContainer.innerHTML = '<p style="color: var(--text-secondary);">Ingen aktive innlegg.</p>';
        }
    }
}

// Slettefunksjon for profil (kun mine innlegg)
window.deleteProfilePost = async function (postId) {
    if (confirm("Er du sikker på at du vil slette dette innlegget?")) {
        const result = await deletePost(postId);
        if (result.success) {
            showToast("Innlegg slettet", "success");
            // Last profilen på nytt for å oppdatere listen
            loadProfile();
        } else {
            showToast(result.message, "error");
        }
    }
}

// Last inn profilen når siden er klar
document.addEventListener('DOMContentLoaded', loadProfile);
