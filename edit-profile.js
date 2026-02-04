// Henter skjema-elementer
const form = document.getElementById('edit-profile-form');
const nameInput = document.getElementById('name');
const roleInput = document.getElementById('role');
const statusInput = document.getElementById('status'); // Nytt felt
// const avatarInput = document.getElementById('avatar'); // Byttet ut med filopplasting
const avatarUrlInput = document.getElementById('avatar-url'); // Skjult felt
const avatarFileInput = document.getElementById('avatar-file'); // Filvelger
const avatarPreview = document.getElementById('avatar-preview'); // Forhåndsvisning

const bioInput = document.getElementById('bio');
const linkedinInput = document.getElementById('linkedin');
const skillsInput = document.getElementById('skills');
const experienceContainer = document.getElementById('experience-container');
const addExperienceBtn = document.getElementById('add-experience-btn');
const publicToggle = document.getElementById('public-toggle'); // Privacy toggle

// Global user var for update
let currentUserRef = null;

// Håndter forhåndsvisning av bilde
if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                avatarPreview.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}

// Funksjon for å lage HTML for en erfaring
function createExperienceHTML(exp = {}) {
    const div = document.createElement('div');
    div.className = 'experience-input-group';
    div.style.marginBottom = '20px';
    div.style.padding = '15px';
    div.style.background = '#f1f5f9';
    div.style.borderRadius = '8px';
    div.style.border = '1px solid #e2e8f0';

    div.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <input type="text" class="exp-role" placeholder="Rolle (f.eks. Utvikler)" value="${exp.role || ''}">
            <input type="text" class="exp-company" placeholder="Bedrift" value="${exp.company || ''}">
        </div>
        <input type="text" class="exp-period" placeholder="Periode (f.eks. 2020 - 2023)" value="${exp.period || ''}" style="margin-bottom: 10px;">
        <textarea class="exp-desc" placeholder="Beskrivelse av hva du gjorde..." style="height: 80px;">${exp.description || ''}</textarea>
        <button type="button" class="btn-remove" style="color: red; background: none; border: none; cursor: pointer; margin-top: 5px; font-size: 0.9rem;">Fjern denne jobben</button>
    `;

    // Legg til slette-funksjon
    div.querySelector('.btn-remove').addEventListener('click', () => {
        div.remove();
    });

    return div;
}

// Fyller inn skjemaet med nåværende data
async function loadFormData() {
    // VIKTIG: Bruk getCurrentUserProfile() for å hente data fra databasen
    const user = await getCurrentUserProfile();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUserRef = user;

    if (nameInput) nameInput.value = user.name || '';
    if (roleInput) roleInput.value = user.role || 'Founder';
    if (statusInput) statusInput.value = user.status || 'Aktivt søkende'; // Default status

    // Sett avatar info
    const currentAvatar = user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.name || 'Guest');
    if (avatarUrlInput) avatarUrlInput.value = user.avatar || '';
    if (avatarPreview) avatarPreview.src = currentAvatar;

    if (bioInput) bioInput.value = user.bio || '';
    if (linkedinInput) linkedinInput.value = user.linkedin || "";
    if (skillsInput) skillsInput.value = (user.skills || []).join(', ');

    // Set privacy toggle
    if (publicToggle) {
        // Default to true if undefined (legacy users)
        publicToggle.checked = (user.is_public !== false);
    }

    // Last inn erfaringer
    if (experienceContainer) {
        experienceContainer.innerHTML = ''; // Nullstill først
        const experience = user.experience || [];

        if (experience.length > 0) {
            experience.forEach(exp => {
                experienceContainer.appendChild(createExperienceHTML(exp));
            });
        } else {
            // Legg til en tom hvis ingen finnes
            experienceContainer.appendChild(createExperienceHTML());
        }
    }
}

// Legg til ny erfaring-knapp
if (addExperienceBtn) {
    addExperienceBtn.addEventListener('click', () => {
        experienceContainer.appendChild(createExperienceHTML());
    });
}

// --- LOGIKK FOR FERDIGHETER-FORSLAG ---
let availableSkills = new Set();
const suggestionsList = document.getElementById('skills-suggestions');

async function fetchAndCacheSkills() {
    // Vi henter ALLE profiler for å crowdsource ferdigheter
    try {
        const profiles = await getAllProfiles();
        if (profiles) {
            // Bruk et Map for å normalisere: 'markedsføring' -> 'Markedsføring'
            // Nøkkel = lowercase, Verdi = Pen visning (Første stor bokstav)
            const skillMap = new Map();

            profiles.forEach(p => {
                if (p.skills && Array.isArray(p.skills)) {
                    p.skills.forEach(s => {
                        const clean = s.trim();
                        if (!clean) return;

                        const lower = clean.toLowerCase();
                        // Vi lager en "Pen" versjon med stor forbokstav
                        const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);

                        // Lagre kun hvis vi ikke har den (eller overskriv hvis vi vil tvinge format)
                        if (!skillMap.has(lower)) {
                            skillMap.set(lower, capitalized);
                        }
                    });
                }
            });

            availableSkills = new Set(skillMap.values());
            console.log("Crowdsourced skills loaded (unique):", availableSkills.size);
        }
    } catch (err) {
        console.warn("Kunne ikke laste ferdighetsforslag:", err);
    }
}

if (skillsInput && suggestionsList) {
    // 1. Last inn ferdigheter når siden laster
    fetchAndCacheSkills();

    // 2. Logikk for søk og visning
    const showSuggestions = (term = '') => {
        const lowerTerm = term.toLowerCase();

        // Sortere: De som starter med termin, deretter alfabetisk
        let matches = Array.from(availableSkills).filter(skill => {
            if (!term) return true; // Vis alle hvis tomt
            return skill.toLowerCase().startsWith(lowerTerm);
        });

        // Vis kun topp 15 for å holde det ryddig
        matches = matches.slice(0, 15);

        // Skjul hvis ingen treff
        if (matches.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        // Vis treff
        suggestionsList.innerHTML = matches.map(skill =>
            `<div class="suggestion-item">${skill}</div>`
        ).join('');

        suggestionsList.style.display = 'block';
    };

    // Lytt på input (når man skriver)
    skillsInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const parts = val.split(',');
        const currentTerm = parts[parts.length - 1].trim();
        showSuggestions(currentTerm);
    });

    // Lytt på fokus (når man klikker i feltet) - "Bla gjennom" funksjon
    skillsInput.addEventListener('focus', (e) => {
        const val = e.target.value;
        const parts = val.split(',');
        const currentTerm = parts[parts.length - 1].trim();
        // Vis forslag selv om feltet er tomt (viser da alle/populære)
        showSuggestions(currentTerm);
    });

    // 3. Håndter klikk på forslag
    suggestionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            const selectedSkill = e.target.textContent;

            // Bytt ut det siste (påbegynte) ordet med valgt ferdighet
            const parts = skillsInput.value.split(',');
            parts[parts.length - 1] = ' ' + selectedSkill; // Legg til space for pent format

            skillsInput.value = parts.join(', ') + ', '; // Legg til komma klart for neste
            suggestionsList.style.display = 'none';
            skillsInput.focus();
        }
    });

    // 4. Skjul hvis man klikker utenfor
    document.addEventListener('click', (e) => {
        if (e.target !== skillsInput && e.target !== suggestionsList) {
            suggestionsList.style.display = 'none';
        }
    });
}


// Lagrer endringer
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Feedback til bruker
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Lagrer...";
    submitBtn.disabled = true;

    // 1. Sjekk om vi skal laste opp nytt bilde
    let finalAvatarUrl = avatarUrlInput.value;
    const file = avatarFileInput.files[0];

    if (file) {
        submitBtn.innerText = "Laster opp bilde...";
        try {
            const uploadedUrl = await uploadImage(file, 'avatars');
            if (uploadedUrl) {
                finalAvatarUrl = uploadedUrl;
            }
        } catch (err) {
            console.error("Feil ved bildeopplasting:", err);
            showToast("Kunne ikke laste opp bildet, men lagrer resten.", "error");
        }
    }


    // Samle inn erfaringsdata
    const experienceInputs = document.querySelectorAll('.experience-input-group');
    const newExperience = Array.from(experienceInputs)
        .map(div => ({
            role: div.querySelector('.exp-role').value,
            company: div.querySelector('.exp-company').value,
            period: div.querySelector('.exp-period').value,
            description: div.querySelector('.exp-desc').value
        }))
        .filter(exp => exp.role.trim() !== "" && exp.company.trim() !== ""); // Filtrerer bort tomme

    // Oppretter data-objekt for oppdatering
    const updatedProfile = {
        name: nameInput.value,
        role: roleInput.value,
        status: statusInput.value, // Send med status
        avatar: finalAvatarUrl, // Bruk den nye URL-en
        bio: bioInput.value,
        linkedin: linkedinInput ? linkedinInput.value : null,
        skills: skillsInput.value.split(',').map(s => s.trim()).filter(s => s !== ''),
        experience: newExperience,
        is_public: publicToggle ? publicToggle.checked : true
    };

    submitBtn.innerText = "Lagrer profil...";

    // Send til Supabase via data.js
    const result = await updateUserProfile(updatedProfile);

    if (result.success) {
        showToast('Profil oppdatert!', 'success');
        if (window.triggerConfetti) triggerConfetti();
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1000);
    } else {
        showToast('Feil ved lagring: ' + result.message, 'error');
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});


// Sletting av konto
const deleteAccountBtn = document.getElementById('delete-account-btn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
        const confirmDelete = confirm("Er du helt sikker på at du vil slette kontoen din? Dette kan ikke angres.");
        if (confirmDelete) {
            const doubleConfirm = confirm("Virkelig helt sikker? Alle dine innlegg og meldinger vil forsvinne permanent.");
            if (doubleConfirm) {
                deleteAccountBtn.innerText = "Sletter...";
                deleteAccountBtn.disabled = true;

                const result = await deleteCurrentUserAccount();

                if (result.success) {
                    alert("Kontoen din er nå slettet. Takk for tiden din på CoFound.");
                    await logoutUser(); // Logger ut og sender til login.html
                } else {
                    alert("Noe gikk galt ved sletting: " + result.message);
                    deleteAccountBtn.innerText = "Slett min konto";
                    deleteAccountBtn.disabled = false;
                }
            }
        }
    });
}

// Kjør når siden laster
document.addEventListener('DOMContentLoaded', loadFormData);
