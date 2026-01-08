// ===============================
// MOCK USER DATABASE (DEMO ONLY)
// ===============================
const users = [
    { role: "partner", email: "peru@demo.com", password: "peru123", redirect: "partner-dashboard.html" },
    { role: "admin", email: "admin@demo.com", password: "admin123", redirect: "admin-dashboard.html" }
];

// ===============================
// TAB SWITCHING (PARTNER / ADMIN)
// ===============================
const tabButtons = document.querySelectorAll(".tab-btn");
const loginForms = document.querySelectorAll(".login-form");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(btn => btn.classList.remove("active"));
        loginForms.forEach(form => form.classList.remove("active"));

        button.classList.add("active");
        const targetForm = document.getElementById(`${button.dataset.tab}-form`);
        targetForm.classList.add("active");
    });
});

// ===============================
// FORM SUBMISSION HANDLERS
// ===============================
document.getElementById("partner-form").addEventListener("submit", event => {
    event.preventDefault();
    handleLogin("partner");
});

document.getElementById("admin-form").addEventListener("submit", event => {
    event.preventDefault();
    handleLogin("admin");
});

// ===============================
// LOGIN HANDLER
// ===============================
function handleLogin(role) {
    const emailInput = document.getElementById(`${role}-email`);
    const passwordInput = document.getElementById(`${role}-password`);
    const errorElement = document.getElementById(`${role}-error`);

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Reset error
    errorElement.textContent = "";

    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (!user) {
        errorElement.textContent = "Invalid email or password.";
        return;
    }

    // ✅ Login succesvol → opslaan in localStorage
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userType", user.role);
    localStorage.setItem("userEmail", user.email);

    console.log("✅ Login successful:", user.role, "Redirecting to:", user.redirect);

    // Redirect naar juiste dashboard
    window.location.href = user.redirect;
}

// ===============================
// CHECK LOGIN STATUS ON DASHBOARD
// ===============================
function checkAuth(requiredRole) {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");

    if (isAuthenticated !== "true" || userType !== requiredRole) {
        console.warn(`⛔ Unauthorized access to ${requiredRole} dashboard`);
        window.location.href = "index.html";
        return false;
    }

    return true;
}

// ===============================
// LOGOUT FUNCTION
// ===============================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}
window.logout = logout;

// ===============================
// AUTO-REDIRECT IF ALREADY LOGGED IN
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");

    if (isAuthenticated === "true") {
        // Als gebruiker al ingelogd is, direct doorsturen
        const user = users.find(u => u.role === userType);
        if (user) {
            window.location.href = user.redirect;
        }
    }
});
