/**
 * Beyond the Pitch - Authentication Logic
 * Beheert inloggen, uitloggen en toegangscontrole
 */

// ===============================
// MOCK USER DATABASE
// ===============================
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

// ===============================
// INITIALISATIE & TAB SWITCHING
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // Check of we op de loginpagina zijn (index.html)
    const isLoginPage = document.querySelector('.tab-btn') !== null;
    
    if (isLoginPage) {
        // Voorkom dat ingelogde mensen weer inloggen
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        const userType = localStorage.getItem("userType");
        if (isAuthenticated === "true") {
            const user = users.find(u => u.role === userType);
            if (user) window.location.href = user.redirect;
        }

        // Tab switching logica
        const tabButtons = document.querySelectorAll(".tab-btn");
        const loginForms = document.querySelectorAll(".login-form");

        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                loginForms.forEach(form => form.classList.remove("active"));

                button.classList.add("active");
                const targetForm = document.getElementById(`${button.dataset.tab}-form`);
                if(targetForm) targetForm.classList.add("active");
            });
        });

        // Form submits koppelen
        document.getElementById("partner-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("partner");
        });

        document.getElementById("admin-form")?.addEventListener("submit", e => {
            e.preventDefault();
            handleLogin("admin");
        });
    }
});

// ===============================
// LOGIN HANDLER
// ===============================
function handleLogin(role) {
    const emailInput = document.getElementById(`${role}-email`);
    const passwordInput = document.getElementById(`${role}-password`);
    const errorElement = document.getElementById(`${role}-error`);

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(errorElement) errorElement.textContent = "";

    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (!user) {
        if(errorElement) errorElement.textContent = "Ongeldig e-mailadres of wachtwoord.";
        return;
    }

    // ✅ Sessie opslaan
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userType", user.role);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userName", user.name);

    window.location.href = user.redirect;
}

// ===============================
// AUTH CHECK (Voor gebruik in dashboards)
// ===============================
function checkAuth(requiredRole) {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");

    if (isAuthenticated !== "true" || userType !== requiredRole) {
        console.warn("Niet geautoriseerd. Redirect naar login...");
        window.location.href = "index.html";
        return false;
    }
    return true;
}

// ===============================
// LOGOUT (De ontbrekende schakel)
// ===============================
function logout() {
    console.log("🚪 Uitloggen gestart...");
    
    // Wis de volledige lokale opslag van de sessie
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    
    // Redirect naar de hoofdpagina/loginpagina
    window.location.replace("index.html");
}

// ✅ Maak functies globaal beschikbaar
window.checkAuth = checkAuth;
window.logout = logout;
