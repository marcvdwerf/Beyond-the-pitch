/**
 * Beyond the Pitch - Robuuste Authentication Logic
 * Werkt zowel lokaal als op travelbeyondthepitch.com
 */

const users = [
    { 
        role: "partner", 
        email: "peru@demo.com", 
        password: "peru123", 
        name: "Lima Experience Partner",
        redirect: "partner-dashboard.html" 
    },
    { 
        role: "admin", 
        email: "admin@demo.com", 
        password: "admin123", 
        name: "System Admin",
        redirect: "admin-dashboard.html" 
    }
];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth System Geladen...");

    // 1. Tab switching logica (Partner / Admin)
    const tabButtons = document.querySelectorAll(".tab-btn");
    const loginForms = document.querySelectorAll(".login-form");

    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                loginForms.forEach(form => form.classList.remove("active"));

                button.classList.add("active");
                const targetId = `${button.dataset.tab}-form`;
                const targetForm = document.getElementById(targetId);
                if (targetForm) targetForm.classList.add("active");
            });
        });

        // 2. Form Submit Handlers
        document.getElementById("partner-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("partner");
        });

        document.getElementById("admin-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("admin");
        });
    }

    // 3. Auto-redirect als je al bent ingelogd op de loginpagina
    const isLoginPage = document.querySelector('.tab-btn') !== null;
    if (isLoginPage && localStorage.getItem("isAuthenticated") === "true") {
        const userType = localStorage.getItem("userType");
        const user = users.find(u => u.role === userType);
        if (user) {
            console.log("Al ingelogd, doorsturen...");
            window.location.href = user.redirect;
        }
    }
});

function handleLogin(role) {
    const emailInput = document.getElementById(`${role}-email`);
    const passwordInput = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Zoek gebruiker in de lijst
    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (user) {
        console.log("Login succesvol voor:", user.name);
        
        // Sla sessie op
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userType", user.role);
        localStorage.setItem("userName", user.name);
        
        // De redirect: We gebruiken een relatieve pad-bepaling
        // Dit zorgt dat het werkt op je-site.com/map/bestand.html
        const currentPath = window.location.pathname;
        const directory = currentPath.substring(0, currentPath.lastIndexOf('/'));
        const targetUrl = directory + '/' + user.redirect;
        
        console.log("Redirecting naar:", targetUrl);
        window.location.href = user.redirect; 
    } else {
        if (errorEl) {
            errorEl.textContent = "Invalid email or password.";
            errorEl.style.color = "#ef4444";
        }
    }
}

/**
 * Gebruik checkAuth('partner') bovenaan je partner-dashboard.js
 */
window.checkAuth = function(requiredRole) {
    const auth = localStorage.getItem("isAuthenticated");
    const role = localStorage.getItem("userType");

    if (auth !== "true" || role !== requiredRole) {
        console.warn("Niet ingelogd of verkeerde rol.");
        window.location.href = "index.html";
        return false;
    }
    return true;
};

window.logout = function() {
    localStorage.clear();
    window.location.href = "index.html";
};
