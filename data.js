// data.js - Håndterer data (innlegg, profiler, osv) mot Supabase

// --- HJELPEFUNKSJONER ---

// Hent innlogget bruker (synkron sjekk av session variabel som settes i auth.js)
// Dette er nyttig for rask UI-oppdatering, men for sikkerhet bør man bruke auth.js sine metoder.
function getCurrentUserSync() {
    return window.currentUser || null;
}

// Last opp bilde til Supabase Storage
async function uploadImage(file, bucket) {
    if (!file) return null;

    // Lag et unikt filnavn (f.eks. 123456789-bilde.jpg) for å unngå kollisjoner
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    // Last opp filen
    const { data, error } = await db.storage
        .from(bucket)
        .upload(fileName, file);

    if (error) {
        console.error("Feil ved opplasting:", error);
        alert("Kunne ikke laste opp bilde: " + error.message);
        return null;
    }

    // Hent den offentlige URL-en
    const { data: { publicUrl } } = db.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrl;
}

// --- INNLEGG (POSTS) ---

// Hent alle innlegg
async function getPosts() {
    try {
        // Hent innlegg og koble på forfatter-info fra 'profiles' tabellen
        // Syntax: user_id (id, name, avatar, role) betyr at vi henter disse feltene fra relasjonen
        const { data, error } = await db
            .from('posts')
            .select(`
                *,
                profiles:user_id (
                    name,
                    role,
                    avatar
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Feil ved henting av innlegg:", error);
            return [];
        }

        // Formater dataen slik frontend forventer den (flater ut strukturen litt)
        return data.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            category: post.category,
            tags: post.tags || [],
            image: post.image_url,
            author: post.profiles?.name || 'Ukjent',
            role: post.profiles?.role || 'Bruker',
            avatar: post.profiles?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
            user_id: post.user_id // Nyttig for å vite om vi eier innlegget
        }));

    } catch (err) {
        console.error("Uventet feil i getPosts:", err);
        return [];
    }
}

// Hent innlegg for en spesifikk bruker
async function getPostsByUser(userId) {
    try {
        const { data, error } = await db
            .from('posts')
            .select(`
                *,
                profiles:user_id (
                    name,
                    role,
                    avatar
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Feil ved henting av brukerens innlegg:", error);
            return [];
        }

        return data.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            category: post.category,
            tags: post.tags || [],
            image: post.image_url,
            author: post.profiles?.name || 'Ukjent',
            role: post.profiles?.role || 'Bruker',
            avatar: post.profiles?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
            user_id: post.user_id
        }));

    } catch (err) {
        console.error("Uventet feil i getPostsByUser:", err);
        return [];
    }
}

// Hent et enkelt innlegg basert på ID
async function getPostById(postId) {
    try {
        const { data, error } = await db
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) {
            console.error("Feil ved henting av post:", error);
            return null;
        }

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            category: data.category,
            tags: data.tags || [],
            image: data.image_url,
            user_id: data.user_id
        };
    } catch (err) {
        console.error("Feil i getPostById:", err);
        return null;
    }
}

// Oppdater eksisterende innlegg
async function updatePost(postId, title, description, category, tags, imageUrl) {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Logg inn først." };

    try {
        // Vi må sjekke at brukeren faktisk eier posten.
        // Dette håndteres av RLS i databasen, men vi kan også sjekke eierskap eksplisitt hvis vi vil.
        // RLS policy for update bør være: auth.uid() = user_id

        const { error } = await db
            .from('posts')
            .update({
                title: title,
                description: description,
                category: category,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                image_url: imageUrl
            })
            .eq('id', postId)
            .eq('user_id', user.id); // Ekstra sikkerhet

        if (error) {
            console.error("Feil ved oppdatering:", error);
            return { success: false, message: "Kunne ikke oppdatere innlegg." };
        }

        return { success: true, message: "Innlegg oppdatert!" };

    } catch (err) {
        console.error("Feil ved oppdatering:", err);
        return { success: false, message: "Noe gikk galt." };
    }
}

// Lagre nytt innlegg
async function addNewPost(title, description, category, tags, imageUrl) {
    const user = await getSessionUser(); // Fra auth.js
    if (!user) return { success: false, message: "Du må være logget inn." };

    // ... rest of the function (unchanged logic) use original code or similar structure
    try {
        const { data, error } = await db
            .from('posts')
            .insert([
                {
                    user_id: user.id, // Koble til innlogget bruker
                    title: title,
                    description: description,
                    category: category,
                    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                    image_url: imageUrl
                }
            ]);

        if (error) {
            console.error(error);
            return { success: false, message: "Kunne ikke opprette innlegg: " + error.message };
        }

        return { success: true, message: "Innlegg publisert!" };

    } catch (err) {
        return { success: false, message: "Noe gikk galt." };
    }
}

// Slett innlegg
async function deletePost(postId) {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Logg inn først." };

    try {
        const { error } = await db
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id); // Sikkerhet: Sjekk at brukeren eier innlegget

        if (error) {
            console.error("Feil ved sletting:", error);
            return { success: false, message: "Kunne ikke slette innlegg." };
        }

        return { success: true, message: "Innlegg slettet." };

    } catch (err) {
        return { success: false, message: "Noe gikk galt." };
    }
}


// --- PROFILSØK (CO-FOUNDERS) ---

// Hent ALLE offentlige profiler (både Foundere og Co-foundere)
// Vi filtrerer heller i frontend
async function getAllProfiles() {
    try {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false }); // Nyeste først

        if (error) {
            console.error("Feil ved henting av profiler:", error);
            return [];
        }
        return data;

    } catch (err) {
        return [];
    }
}

// --- MELDINGER ---

// Send melding
async function sendMessage(toUserId, subject, message, postTitle) {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Logg inn først." };

    try {
        const { error } = await db
            .from('messages')
            .insert([
                {
                    from_id: user.id,
                    to_id: toUserId,
                    subject: subject,
                    content: message,
                    post_title: postTitle
                }
            ]);

        if (error) throw error;
        return { success: true, message: "Melding sendt!" };

    } catch (err) {
        console.error(err);
        return { success: false, message: "Kunne ikke sende melding." };
    }
}

// Hent full samtale med en spesifikk bruker (både sendt og mottatt)
async function getConversationMessages(otherUserId) {
    const user = await getSessionUser();
    if (!user) return [];

    try {
        // Hent alle meldinger som involverer meg
        // Vi filtrerer i etterkant for å finne de som tilhører "otherUserId"
        // Dette er enklere enn å skrive en komplisert OR-spørring i Supabase JS for akkurat nå
        const { data, error } = await db
            .from('messages')
            .select(`
                *,
                sender:from_id (name, avatar),
                receiver:to_id (name, avatar)
            `)
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Filtrer ut bare de som er mellom meg og den andre personen
        const conversation = data.filter(msg =>
            (msg.from_id === user.id && msg.to_id === otherUserId) ||
            (msg.from_id === otherUserId && msg.to_id === user.id)
        );

        return conversation.map(msg => ({
            id: msg.id,
            from: msg.sender?.name || 'Ukjent',
            fromId: msg.from_id,
            toId: msg.to_id,
            message: msg.content,
            timestamp: msg.created_at,
            read: msg.is_read,
            postTitle: msg.post_title,
            avatar: msg.sender?.avatar
        }));

    } catch (err) {
        console.error("Feil ved henting av samtale:", err);
        return [];
    }
}

// Merk samtale som lest
async function markConversationAsRead(otherUserId) {
    const user = await getSessionUser();
    if (!user) return;

    try {
        // Oppdater alle meldinger FRA den andre personen TIL meg som "lest"
        const { error } = await db
            .from('messages')
            .update({ is_read: true })
            .eq('from_id', otherUserId)
            .eq('to_id', user.id)
            .eq('is_read', false);

        if (error) throw error;

    } catch (err) {
        console.error("Kunne ikke markere som lest:", err);
    }
}

// Hent mine meldinger (både sendte og mottatte for enkelhets skyld, eller bare innboks)
async function getMyMessages() {
    const user = await getSessionUser();
    if (!user) return [];

    try {
        // Henter ALLE mine meldinger (sendt og mottatt) for Innboksen
        // Slik at vi kan vise "Du sendte..."
        const { data, error } = await db
            .from('messages')
            .select(`
                *,
                sender:from_id (name, avatar, email),
                receiver:to_id (name, avatar, email)
            `)
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Formaterer litt
        return data.map(msg => ({
            id: msg.id,
            from: msg.sender?.name || 'Ukjent',
            to: msg.receiver?.name || 'Ukjent',
            fromEmail: msg.sender?.email,
            toEmail: msg.receiver?.email,
            fromId: msg.from_id,
            toId: msg.to_id,
            subject: msg.subject,
            message: msg.content,
            timestamp: msg.created_at,
            read: msg.is_read,
            postTitle: msg.post_title,
            avatar: msg.sender?.avatar || msg.receiver?.avatar // Fallback
        }));

    } catch (err) {
        console.error("Feil ved henting av meldinger", err);
        return [];
    }
}

// Hent antall uleste meldinger (for varsling)
async function getUnreadMessageCount() {
    const user = await getSessionUser();
    if (!user) return 0;

    try {
        const { count, error } = await db
            .from('messages')
            .select('*', { count: 'exact', head: true }) // head: true betyr at vi bare henter antallet, ikke dataen
            .eq('to_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.error("Kunne ikke hente antall uleste:", err);
        return 0;
    }
}


// --- PROFIL OPPDATERING ---

async function updateUserProfile(profileData) {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Ikke logget inn" };

    try {
        const { error } = await db
            .from('profiles')
            .update({
                name: profileData.name,
                role: profileData.role,
                status: profileData.status, // Ny
                avatar: profileData.avatar,
                bio: profileData.bio,
                skills: profileData.skills, // Array
                experience: profileData.experience, // JSON
                linkedin: profileData.linkedin,
                is_public: profileData.is_public // Boolean
            })
            .eq('id', user.id);

        if (error) throw error;
        return { success: true };

    } catch (error) {
        console.error("Feil ved oppdatering av profil:", error);
        return { success: false, message: error.message };
    }
}


// Hent offentlig profil for en annen bruker
async function getPublicProfile(userId) {
    try {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Feil ved henting av offentlig profil:", error);
            return null;
        }

        return data;
    } catch (err) {
        console.error("Feil i getPublicProfile:", err);
        return null;
    }
}


// --- FAVORITTER ---

async function getFavorites(type) {
    const user = await getSessionUser();
    if (!user) return [];

    try {
        const { data, error } = await db
            .from('favorites')
            .select('item_id')
            .eq('user_id', user.id)
            .eq('type', type);

        if (error) throw error;
        return data.map(f => f.item_id); // Returner bare ID-ene
    } catch (err) {
        console.error("Feil ved henting av favoritter:", err);
        return [];
    }
}

async function toggleFavorite(type, itemId) {
    const user = await getSessionUser();
    if (!user) return false;

    itemId = String(itemId); // Sikre at vi bruker string ID

    try {
        // Sjekk om den finnes
        const { data } = await db
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('item_id', itemId)
            .eq('type', type)
            .single();

        if (data) {
            // Fjern
            await db.from('favorites').delete().eq('id', data.id);
            return false; // Ikke lenger favoritt
        } else {
            // Legg til
            await db.from('favorites').insert({
                user_id: user.id,
                item_id: itemId,
                type: type
            });
            return true; // Er nå favoritt
        }
    } catch (err) {
        console.error("Feil ved toggle favorite:", err);
        return false;
    }
}

// Hjelpefunksjon for å hente objektene som er favoritter
async function getFavoriteItems(type) {
    const ids = await getFavorites(type);
    if (ids.length === 0) return [];

    // Her må vi hente de faktiske dataene.
    // Hvis type er 'project', hent fra 'posts'. Hvis 'user', hent fra 'profiles'.

    try {
        const tableName = type === 'project' ? 'posts' : 'profiles';

        // Supabase "in" query tar en array
        // Merk: Hvis ID-ene er integers (posts id) og item_id er tekst, kan det bli kluss.
        // Post IDs er bigint (tall).

        let query = db.from(tableName).select('*');

        if (type === 'project') {
            // For posts, we might want author info too
            query = db.from('posts').select('*, profiles:user_id(name, role, avatar)');
        }

        const { data, error } = await query.in('id', ids);

        if (error) throw error;

        // Formattering (lik getPosts/getCoFounders)
        if (type === 'project') {
            return data.map(post => ({
                id: post.id,
                title: post.title,
                description: post.description,
                platform: post.category, // using category as platform for now
                category: post.category,
                tags: post.tags || [],
                author: post.profiles?.name || 'Ukjent',
                role: post.profiles?.role || 'Founder',
                avatar: post.profiles?.avatar,
                image: post.image_url,
                user_id: post.user_id
            }));
        } else {
            return data.map(p => ({
                id: p.id,
                name: p.name,
                role: p.role,
                avatar: p.avatar,
                bio: p.bio,
                skills: p.skills || [],
                experience: p.experience || []
            }));
        }

    } catch (err) {
        console.error("Feil ved henting av favoritt-objekter:", err);
        return [];
    }
}


// --- KONTO-HÅNDTERING ---

// Slett nåværende bruker og all tilhørende data
async function deleteCurrentUserAccount() {
    const user = await getSessionUser();
    if (!user) return { success: false, message: "Ikke logget inn" };

    try {
        // 1. Slett meldinger (både sendte og mottatte)
        const { error: msgError } = await db.from('messages')
            .delete()
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`);

        if (msgError) {
            console.error("Feil ved sletting av meldinger:", msgError);
            return { success: false, message: "Kunne ikke slette meldinger: " + msgError.message };
        }

        // 2. Slett favoritter
        const { error: favError } = await db.from('favorites')
            .delete()
            .eq('user_id', user.id);

        if (favError) {
            console.error("Feil ved sletting av favoritter:", favError);
            return { success: false, message: "Kunne ikke slette favoritter: " + favError.message };
        }

        // 3. Slett innlegg
        const { error: postError } = await db.from('posts')
            .delete()
            .eq('user_id', user.id);

        if (postError) {
            console.error("Feil ved sletting av innlegg:", postError);
            return { success: false, message: "Kunne ikke slette innlegg: " + postError.message };
        }

        // 4. Slett profil
        const { error: profileError } = await db.from('profiles')
            .delete()
            .eq('id', user.id);

        if (profileError) {
            console.error("Feil ved sletting av profil:", profileError);
            return { success: false, message: "Kunne ikke slette profil: " + profileError.message };
        }

        // 5. TILSLUTT: Slett selve auth-brukeren (via RPC funksjonen vi lagde)
        // Dette hindrer at man kan logge inn igjen med samme e-post
        const { error: rpcError } = await db.rpc('delete_own_user');

        if (rpcError) {
            console.warn("Advarsel: Kunne ikke slette auth-bruker (kanskje SQL-funksjonen mangler?)", rpcError);
            // Vi fortsetter likevel, for profilen er slettet og brukeren logges ut.
        }

        return { success: true };
    } catch (error) {
        console.error("Uventet feil ved sletting av konto:", error);
        return { success: false, message: error.message };
    }
}
