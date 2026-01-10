/**
 * Beyond the Pitch - Authentication Logic
 * Geoptimaliseerd voor travelbeyondthepitch.com/dashboard/
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
    console.log("Auth System Geladen in /dashboard/");

    // 1. Tab switching
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

        // 2. Form Submits
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
        const userType = localStorage.getItem("userType");
        const user = users.find(u => u.role === userType);
        if (user) window.location.href = user.redirect;
    }
});

function handleLogin(role) {
    const emailInput = document.getElementById(`${role}-email`);
    const passwordInput = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (user) {
        console.log("Login succesvol. Redirect naar:", user.redirect);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userType", user.role);
        localStorage.setItem("userName", user.name);
        
        // Gebruik directe relatieve redirect voor bestanden in dezelfde map
        window.location.href = user.redirect; 
    } else {
        if (errorEl) {
            errorEl.textContent = "Invalid email or password.";
            errorEl.style.color = "#ef4444";
        }
    }
}

/**
 * Controleert autorisatie
 */
window.checkAuth = function(requiredRole) {
    const auth = localStorage.getItem("isAuthenticated");
    const role = localStorage.getItem("userType");

    if (auth !== "true" || role !== requiredRole) {
        // Altijd terug naar de index in de huidige map
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
