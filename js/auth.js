import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const AUTH_URL = "https://noppo-auth.noppo5319.workers.dev";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2YXZhc3JkeGd1cWtpaWdjeGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk5ODcsImV4cCI6MjA4Mjk5NTk4N30.CVq3lyRbxek7Ejs4tP5sN9-0JNEXSLtCsC2Pj-skFFQ";

const firebaseConfig = {
    apiKey: "AIzaSyAwe9BsUFXA4MdzYYuekNsLo320MHqfXww",
    projectId: "tribal-bonsai-470002-u0",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const fbAuth = getAuth(app);

export async function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get('ticket');
    
    if (ticket) {
        try {
            const res = await fetch(`${AUTH_URL}/auth/v1/user?ticket=${ticket}`, {
                method: 'GET',
                headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const user = await res.json();
                // Firestoreルールを通すために必須
                await signInAnonymously(fbAuth); 
                const profile = {
                    userId: user.userId || "NoppoUser",
                    avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.id}`,
                    uid: user.id
                };
                localStorage.setItem('noppo_user', JSON.stringify(profile));
                window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                return profile;
            }
        } catch (e) { console.error(e); }
    }
    const cached = localStorage.getItem('noppo_user');
    if (cached) {
        if (!fbAuth.currentUser) await signInAnonymously(fbAuth);
        return JSON.parse(cached);
    }
    return null;
}

export function login() {
    window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(window.location.href)}`;
}

export function logout() {
    localStorage.removeItem('noppo_user');
    fbAuth.signOut();
    window.location.href = `${AUTH_URL}/logout?redirect=${encodeURIComponent(window.location.origin)}`;
}