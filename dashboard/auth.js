/**
 * Beyond the Pitch - Authentication Logic (Fase 2)
 * Gekoppeld aan Master Google Sheet voor schaalbaarheid
 */

// De URL van je nieuwe Master Script (met checkLogin functie)
const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbx2wFd2ffQaUbzuUWJKjmufU1PcoB4aATfZ3Xg-q_yh0x2PHVPd_MPWn9uxWUZRjy13fw/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab switching (voor de login pagina)
    const tabButtons = document.querySelectorAll(".tab-btn");
    const loginForms = document.querySelectorAll(".login-form");

    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                loginForms.forEach(form => form.classList.remove("active"));
                button.classList.add("active");
                const targetId = `${button.dataset.tab}-form`;
                document.getElementById(targetId)?.classList.add("active");
            });
        });

        // 2. Form Submits koppelen aan de nieuwe handleLogin
        document.getElementById("partner-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("partner");
        });

        document.getElementById("admin-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("admin");
        });
    }

    // 3. Auto-redirect indien al ingelogd
    const isLoginPage = document.querySelector('.tab-btn') !== null;
    if (isLoginPage && localStorage.getItem("isAuthenticated") === "true") {
        const role = localStorage.getItem("userType");
        window.location.href = (role === "admin") ? "admin-dashboard.html" : "partner-dashboard.html";
    }
});

/**
 * Handelt het inloggen af via de Master Sheet API
 */
async function handleLogin(role) {
    const userEl = document.getElementById(`${role}-email`); // We gebruiken email veld als username
    const passEl = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);
    const submitBtn = document.querySelector(`#${role}-form button`);

    if (!userEl || !passEl) return;

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    try {
        if (submitBtn) submitBtn.innerText = "⏳ Checking...";
        
        // Roep de Google Sheet API aan
        const response = await fetch(`${MASTER_API_URL}?action=login&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
        const result = await response.json();

        if (result.status === "success") {
            // Sla gegevens op in localStorage
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("userType", result.role); // 'admin' of 'partner'
            localStorage.setItem("userName", result.name);
            localStorage.setItem("partnerID", result.partnerID); // Cruciaal voor filteren data

            // Redirect op basis van rol
            if (result.role === "admin") {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "partner-dashboard.html";
            }
        } else {
            if (errorEl) errorEl.textContent = "Invalid credentials. Please try again.";
        }
    } catch (error) {
        console.error("Login Error:", error);
        if (errorEl) errorEl.textContent = "Connection error. Try again later.";
    } finally {
        if (submitBtn) submitBtn.innerText = "Login";
    }
}

/**
 * Controleert autorisatie op de pagina's
 */
window.checkAuth = function(requiredRole) {
    const auth = localStorage.getItem("isAuthenticated");
    const role = localStorage.getItem("userType");

    // Als we admin zijn, mogen we overal in (ook in partner pagina's)
    if (auth === "true" && role === "admin") return true;

    // Anders moet de rol exact overeenkomen
    if (auth !== "true" || role !== requiredRole) {
        window.location.href = "index.html";
        return false;
    }
    return true;
};

/**
 * Uitloggen
 */
window.logout = function() {
    localStorage.clear();
    window.location.href = "index.html";
};
