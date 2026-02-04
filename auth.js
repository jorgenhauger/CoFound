// auth.js - Håndterer brukerlogikk og autentisering med Supabase

// Registrer ny bruker
async function registerUser(name, email, password, role) {
    try {
        const { data, error } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: role,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` // Standard avatar basert på navn
                }
            }
        });

        if (error) {
            return { success: false, message: error.message };
        }

        // Sjekk om vi fikk en sesjon (hvis ikke, kreves e-postbekreftelse)
        if (data.user && !data.session) {
            return {
                success: true,
                message: "Konto opprettet! Sjekk e-posten din for å bekrefte kontoen før du logger inn."
            };
        }

        return { success: true, message: "Bruker opprettet! Du blir nå logget inn." };

    } catch (err) {
        console.error("Feil ved registrering:", err);
        return { success: false, message: "Noe gikk galt. Prøv igjen." };
    }
}

// Logg inn bruker
async function loginUser(email, password) {
    try {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            return { success: false, message: "Feil e-post eller passord." };
        }

        return { success: true, message: "Velkommen tilbake!" };

    } catch (err) {
        console.error("Feil ved innlogging:", err);
        return { success: false, message: "Noe gikk galt." };
    }
}

// Logg ut bruker
async function logoutUser() {
    // Unsubscribe from all real-time channels first
    if (typeof unsubscribeAll === 'function') {
        unsubscribeAll();
    }

    await db.auth.signOut();

    // Ta vare på tema-innstillingen før vi tømmer
    const currentTheme = localStorage.getItem('theme');

    // Tøm alt
    localStorage.clear();
    sessionStorage.clear();

    // Legg tilbake temaet hvis det fantes
    if (currentTheme) {
        localStorage.setItem('theme', currentTheme);
    }

    // Force reload to login page to ensure clean state
    window.location.href = 'login.html';
}

// Sjekk om bruker er logget inn - Hjelpefunksjon
async function getSessionUser() {
    const { data: { session } } = await db.auth.getSession();
    return session ? session.user : null;
}

// Hent full profil (inkludert rolle, bio osv)
async function getCurrentUserProfile() {
    const user = await getSessionUser();
    if (!user) return null;

    // Hent utvidet info fra 'profiles' tabellen
    let { data: profile, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // SELF-HEALING: Hvis profil mangler (f.eks. trigger feilet), opprett den nå
    if ((error && (error.code === 'PGRST116' || error.message.includes('JSON object requested, multiple (or no) rows returned'))) || (!profile && !error)) {
        console.warn("Profil mangler i databasen for bruker " + user.id + ". Forsøker å reparere...");

        const meta = user.user_metadata || {};
        const newProfile = {
            id: user.id,
            email: user.email,
            name: meta.name || user.email.split('@')[0] || 'Ukjent bruker',
            role: meta.role || 'Founder', // Fallback
            avatar: meta.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            bio: '',
            skills: [],
            experience: []
        };

        const { data: insertedProfile, error: insertError } = await db
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

        if (!insertError && insertedProfile) {
            console.log("Profil reparert!", insertedProfile);
            return insertedProfile;
        } else {
            console.error("Kunne ikke reparere profil:", insertError);
            return null;
        }
    }

    if (error) {
        console.error("Kunne ikke hente profil:", error);
        return null;
    }

    return profile;
}


// Sjekk om bruker er logget inn (for beskyttede sider)
async function requireAuth() {
    const user = await getSessionUser();
    if (!user) {
        // Lagre URL vi kom fra slik at vi kan redirecte tilbake senere (valgfritt)
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
}

// Oppdater navbar basert på innloggingsstatus
async function updateNavbar() {
    const userMenu = document.querySelector('.user-menu');
    const navLinks = document.querySelector('.nav-links');

    // Vi må vente på at Supabase sjekker sesjonen
    const profile = await getCurrentUserProfile();

    if (profile) {
        // Lagre profilen globalt så vi slipper å hente den hele tiden
        window.currentUser = profile;

        // Vis avatar og "Logg ut"
        userMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <a href="favorites.html" title="Mine Favoritter" style="color: var(--text-secondary); display: flex; align-items: center; margin-left: 20px;">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </a>
                <a href="profile.html" title="Min Profil">
                    <img src="${profile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'}" alt="${profile.name}" class="avatar-small">
                </a>
                <button id="logout-btn" class="btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">Logg ut</button>
            </div>
        `;

        // Legg til event listener for logg ut (siden onclick="logoutUser()" ikke funker like bra med moduler/async)
        document.getElementById('logout-btn').addEventListener('click', logoutUser);

    } else {
        // Vis Logg inn / Registrer deg knapper
        userMenu.innerHTML = `
            <a href="login.html" class="btn-secondary" style="margin-right: 10px;">Logg inn</a>
            <a href="signup.html" class="btn-primary">Registrer deg</a>
        `;

        // Skjul "Min Profil" og "Nytt Innlegg" om du er utlogget
        const profileLink = navLinks.querySelector('a[href="profile.html"]');
        const createLink = navLinks.querySelector('a[href="create.html"]');

        if (profileLink) profileLink.style.display = 'none';
        if (createLink) createLink.style.display = 'none';
    }
}

// Kjør navbar-oppdatering når siden laster
document.addEventListener('DOMContentLoaded', updateNavbar);

