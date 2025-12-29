
// supabase.js - Koblingen til databasen vår

// Vi trenger Supabase-biblioteket. Dette lastes inn via HTML-filene våre.
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// URL-en fant jeg fra bildet ditt!
const SUPABASE_URL = 'https://kzuzobcgxtytvucmmheu.supabase.co';

// Nøkkelen mangler vi. Den finner du sannsynligvis rett over "Project URL" på nettsiden.
// Den heter "anon public".
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dXpvYmNneHR5dHZ1Y21taGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjY0NzcsImV4cCI6MjA4MjUwMjQ3N30.skQGQMeTw3iseFZTds6TwwhX090scx--32U5xehcRRQ';

// Opprett tilkoblingen
let db = null;

if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Kobler til Supabase...');
} else {
    // Hvis scriptet ikke er lastet inn ennå (skjer av og til)
    console.warn('Supabase-biblioteket er ikke lastet inn.');
}

// Eksporter klienten slik at vi kan bruke den i andre filer
window.db = db;
