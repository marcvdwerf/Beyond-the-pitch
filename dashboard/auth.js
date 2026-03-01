/**
 * Beyond the Pitch - Authentication Logic
 * Versie: 2.0 - Veilige POST login + Token validatie
 */

const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbxPkyCqIml8BmoV5btvqZ5l3rsB77P1gLvX7HFyE-_5UNaTx6v2GKfLcUzi4yZLxiGe2w/exec';

// ─── 1. ROUTE BEVEILIGING ────────────────────────────────────────────────────
// Controleer bij elke dashboardpagina of er een geldig token in sessie zit
(function guardPage() {
    const protectedPages = ['partner-dashboard.html', 'admin-dashboard.html'];
    const onProtectedPage = protectedPages.some(p => window.location.pathname.includes(p));
    if (!onProtectedPage) return;

    const token     = sessionStorage.getItem("authToken");
    const role      = sessionStorage.getItem("userRole");
    const expiresAt = parseInt(sessionStorage.getItem("tokenExpires") || "0");

    // Token ontbreekt, verlopen, of verkeerde rol → terug naar login
    if (!token || Date.now() > expiresAt) {
        sessionStorage.clear();
        window.location.href = "index.html";
        return;
    }

    // Verkeerde rol (admin probeert partner-dashboard te openen, of andersom)
    if (window.location.pathname.includes('admin-dashboard.html') && role !== 'admin') {
        window.location.href = "index.html";
    }
    if (window.location.pathname.includes('partner-dashboard.html') && role === 'admin') {
        window.location.href = "admin-dashboard.html";
    }
})();

// ─── 2. LOGIN PAGINA LOGICA ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    if (tabButtons.length === 0) return; // Niet op index.html

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".login-form").forEach(f => f.classList.remove("active"));
            button.classList.add("active");
            document.getElementById(`${button.dataset.tab}-form`).classList.add("active");
        });
    });

    // Form submits
    document.getElementById("partner-form")?.addEventListener("submit", e => {
        e.preventDefault();
        handleLogin("partner");
    });
    document.getElementById("admin-form")?.addEventListener("submit", e => {
        e.preventDefault();
        handleLogin("admin");
    });
});

// ─── 3. LOGIN HANDLER (POST) ─────────────────────────────────────────────────
async function handleLogin(role) {
    const userEl  = document.getElementById(`${role}-email`);
    const passEl  = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);
    const btn     = document.querySelector(`#${role}-form .login-btn`);

    errorEl.textContent = "";
    btn.disabled  = true;
    btn.innerText = "Verifying...";

    try {
        // GET request — Apps Script ondersteunt geen externe POST via CORS
        const params = new URLSearchParams({
            action: 'login',
            user: userEl.value.trim(),
            pass: passEl.value.trim()
        });
        const response = await fetch(`${MASTER_API_URL}?${params.toString()}`, { redirect: 'follow' });

        const result = await response.json();

        if (result.status === "success") {
            // Token + vervaldatum (8 uur sessie) opslaan
            const expiresAt = Date.now() + (8 * 60 * 60 * 1000);

            sessionStorage.setItem("isAuthenticated", "true");   // backwards compat
            sessionStorage.setItem("authToken",        result.token);
            sessionStorage.setItem("tokenExpires",     expiresAt.toString());
            sessionStorage.setItem("userRole",         result.role);
            sessionStorage.setItem("partnerID",        result.partnerID);
            sessionStorage.setItem("userName",         result.name);

            window.location.href = (result.role === "admin")
                ? "admin-dashboard.html"
                : "partner-dashboard.html";
        } else {
            errorEl.textContent = "Invalid email or password.";
            btn.disabled  = false;
            btn.innerText = "Sign In";
        }

    } catch (err) {
        console.error("Login error:", err);
        errorEl.textContent = "Connection error. Please try again.";
        btn.disabled  = false;
        btn.innerText = "Sign In";
    }
}

// ─── 4. HELPER: Token meesturen bij API calls ────────────────────────────────
// Gebruik deze functie overal waar je de Sheet API aanroept
window.apiFetch = async function(url, options = {}) {
    const token = sessionStorage.getItem("authToken");
    const expires = parseInt(sessionStorage.getItem("tokenExpires") || "0");

    // Token verlopen → forceer uitloggen
    if (!token || Date.now() > expires) {
        sessionStorage.clear();
        window.location.href = "index.html";
        return null;
    }

    // Voeg token toe als header bij elke request
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    // Voor GET requests: token als query param (Apps Script ondersteunt geen custom headers op GET)
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl  = options.method === 'POST'
        ? url
        : `${url}${separator}authToken=${encodeURIComponent(token)}`;

    const finalOptions = options.method === 'POST'
        ? { ...options, headers, body: JSON.stringify({ ...JSON.parse(options.body || '{}'), authToken: token }) }
        : { ...options, headers, redirect: 'follow' };

    const response = await fetch(finalUrl, finalOptions);
    return response.json();
};

// ─── 5. LOGOUT ───────────────────────────────────────────────────────────────
window.logout = function() {
    sessionStorage.clear();
    window.location.href = "index.html";
};
