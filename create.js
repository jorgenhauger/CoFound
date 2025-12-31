const form = document.getElementById('create-post-form');
const imageFileInput = document.getElementById('image-file');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

// Forhåndsvisning av bilde
if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
}

// Slette bilde funksjonalitet
if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
        // Tøm preview
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';

        // Tøm input-felter
        imageFileInput.value = '';
        const imageUrlField = document.getElementById('image-url');
        if (imageUrlField) imageUrlField.value = '';
    });
}

// Sjekk om vi er i "Redigerings-modus"
const urlParams = new URLSearchParams(window.location.search);
const editPostId = urlParams.get('edit');

if (editPostId) {
    // Endre tittel og knappetekst
    const pageTitle = document.querySelector('h2');
    if (pageTitle) pageTitle.innerText = "Rediger Innlegg";

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.innerText = "Oppdater Innlegg";

    // Last inn data for posten
    loadPostData(editPostId);
}

async function loadPostData(postId) {
    const post = await getPostById(postId); // Fra data.js
    if (!post) {
        alert("Fant ikke innlegget.");
        window.location.href = 'feed.html';
        return;
    }

    // Fyll ut skjemaet
    document.getElementById('title').value = post.title;
    document.getElementById('category').value = post.category;
    document.getElementById('description').value = post.description;

    // Tags (fjern kategorien fra tags-listen hvis den er der, for å vise bare custom tags)
    const customTags = post.tags.filter(t => t !== post.category).join(', ');
    document.getElementById('custom-tags').value = customTags;

    // Bilde
    if (post.image) {
        document.getElementById('image-url').value = post.image;
        imagePreview.src = post.image;
        imagePreviewContainer.style.display = 'block';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Hindrer siden i å laste på nytt

    // Sjekk om bruker er logget inn
    requireAuth();

    // Henter verdier fra skjemaet
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const customTagsInput = document.getElementById('custom-tags').value;
    const description = document.getElementById('description').value;

    // URL-håndtering (kan også la bruker lime inn URL hvis vi vil, men nå prioriterer vi upload)
    const imageUrlField = document.getElementById('image-url');
    let finalImageUrl = imageUrlField ? imageUrlField.value : '';

    // Behandle tags
    let tagsArray = [category];
    if (customTagsInput) {
        const customTags = customTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        tagsArray = tagsArray.concat(customTags);
    }
    const tagsString = tagsArray.join(',');

    // UI Feedback
    const sendBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = sendBtn.innerText;
    sendBtn.innerText = editPostId ? "Oppdaterer..." : "Publiserer..."; // Dynamisk tekst
    sendBtn.disabled = true;

    // 1. Last opp bilde hvis valgt
    const file = imageFileInput.files[0];
    if (file) {
        sendBtn.innerText = "Laster opp bilde...";
        try {
            // 'post-images' MÅ eksistere i Supabase Storage
            const uploadedUrl = await uploadImage(file, 'post-images');
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
            }
        } catch (err) {
            console.error("Feil ved opplasting:", err);
            showToast("Kunne ikke laste opp bilde, beholder det gamle (hvis noen).", "warning");
        }
    }

    sendBtn.innerText = "Lagrer...";

    // 2. Send posten til databasen (Oppdater eller Ny)
    let result;
    if (editPostId) {
        result = await updatePost(editPostId, title, description, category, tagsString, finalImageUrl);
    } else {
        result = await addNewPost(title, description, category, tagsString, finalImageUrl);
    }

    if (result.success) {
        showToast(editPostId ? "Innlegg oppdatert! ✅" : "Innlegg publisert! 🚀", "success");
        setTimeout(() => {
            // Redirect tilbake til profil hvis man redigerte, ellers feed
            window.location.href = editPostId ? 'profile.html' : 'feed.html';
        }, 1500);
    } else {
        showToast(result.message, "error");
        sendBtn.innerText = originalBtnText;
        sendBtn.disabled = false;
    }
});
