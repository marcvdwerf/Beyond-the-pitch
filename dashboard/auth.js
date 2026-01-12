/**
 * Beyond the Pitch - Authentication Logic
 * Verbindt met Master Google Sheet voor validatie
 */

const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbx2wFd2ffQaUbzuUWJKjmufU1PcoB4aATfZ3Xg-q_yh0x2PHVPd_MPWn9uxWUZRjy13fw/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab switching (Partner vs Admin)
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
                
                // Wis foutmeldingen bij het wisselen van tab
                document.querySelectorAll('.error-message').forEach(el => el.textContent = "");
            });
        });

        // 2. Formulier inzendingen koppelen
        document.getElementById("partner-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("partner");
        });

        document.getElementById("admin-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("admin");
        });
    }

    // 3. Automatische redirect als de gebruiker al een sessie heeft
    checkExistingSession();
});

/**
 * Controleert of er al een geldige login sessie in de browser staat
 */
function checkExistingSession() {
    if (localStorage.getItem("isAuthenticated") === "true") {
        const role = localStorage.getItem("userType");
        const isLoginPage = document.querySelector('.tab-btn') !== null;
        
        if (isLoginPage) {
            if (role === "admin") {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "partner-dashboard.html";
            }
        }
    }
}

/**
 * Verifieert inloggegevens via de Master Sheet API
 */
async function handleLogin(role) {
    const userEl = document.getElementById(`${role}-email`);
    const passEl = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);
    const submitBtn = document.querySelector(`#${role}-form button`);

    if (!userEl || !passEl) return;

    const username = userEl.value.trim();
    const password = passEl.value.trim();

    try {
        // UI naar 'bezig' status
        if (submitBtn) {
            submitBtn.innerText = "Verifying...";
            submitBtn.disabled = true;
        }
        if (errorEl) errorEl.textContent = "";

        // API aanroep naar Google Apps Script
        const response = await fetch(`${MASTER_API_URL}?action=login&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
        
        if (!response.ok) throw new Error("Network response error");
        
        const result = await response.json();

        if (result.status === "success") {
            // Sessie opslaan in de browser
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("userType", result.role); // 'admin' of 'partner'
            localStorage.setItem("userName", result.name);
            localStorage.setItem("partnerID", result.partnerID);

            // Doorsturen naar de juiste pagina
            if (result.role === "admin") {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "partner-dashboard.html";
            }
        } else {
            if (errorEl) errorEl.textContent = "Invalid email or password. Please try again.";
        }
    } catch (error) {
        console.error("Login Error:", error);
        if (errorEl) errorEl.textContent = "Connection error. Please check your internet and try again.";
    } finally {
        if (submitBtn) {
            submitBtn.innerText = (role === "admin") ? "Admin Access" : "Sign In";
            submitBtn.disabled = false;
        }
    }
}

/**
 * Beveiligingscheck: wordt aangeroepen bovenaan dashboard pagina's
 */
window.checkAuth = function(requiredRole) {
    const auth = localStorage.getItem("isAuthenticated");
    const role = localStorage.getItem("userType");

    // Admins hebben toegang tot alle dashboards
    if (auth === "true" && role === "admin") return true;

    // Partners alleen tot hun eigen dashboard
    if (auth === "true" && role === requiredRole) return true;

    // Niet geautoriseerd? Terug naar login
    window.location.href = "index.html";
    return false;
};

/**
 * Logt de gebruiker uit en wist de browser sessie
 */
window.logout = function() {
    localStorage.clear();
    window.location.href = "index.html";
};
