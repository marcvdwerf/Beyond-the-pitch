/**
 * Beyond the Pitch - Authentication Logic
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
    const isLoginPage = document.querySelector('.tab-btn') !== null;
    
    if (isLoginPage) {
        // Al ingelogd? Stuur direct door naar dashboard
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        const userType = localStorage.getItem("userType");
        if (isAuthenticated === "true") {
            const user = users.find(u => u.role === userType);
            if (user) window.location.href = user.redirect;
        }

        // Tab Switching
        const tabButtons = document.querySelectorAll(".tab-btn");
        const loginForms = document.querySelectorAll(".login-form");

        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                loginForms.forEach(form => form.classList.remove("active"));

                button.classList.add("active");
                const targetId = `${button.dataset.tab}-form`;
                document.getElementById(targetId).classList.add("active");
            });
        });

        // Form Submit Handlers
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

function handleLogin(role) {
    const email = document.getElementById(`${role}-email`).value.trim();
    const password = document.getElementById(`${role}-password`).value.trim();
    const errorEl = document.getElementById(`${role}-error`);

    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (user) {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userType", user.role);
        localStorage.setItem("userName", user.name);
        window.location.href = user.redirect;
    } else {
        errorEl.textContent = "Invalid email or password.";
        setTimeout(() => { errorEl.textContent = ""; }, 3000);
    }
}

/**
 * Gebruik deze functie bovenaan elk dashboard-bestand om beveiliging te garanderen
 */
function checkAuth(requiredRole) {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");

    if (isAuthenticated !== "true" || userType !== requiredRole) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

function logout() {
    localStorage.clear();
    window.location.replace("index.html");
}

// Global scope
window.checkAuth = checkAuth;
window.logout = logout;
