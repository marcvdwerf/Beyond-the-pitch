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
// TAB SWITCHING
// ===============================
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

// ===============================
// LOGIN HANDLER
// ===============================
function handleLogin(role) {
    const emailInput = document.getElementById(`${role}-email`);
    const passwordInput = document.getElementById(`${role}-password`);
    const errorElement = document.getElementById(`${role}-error`);

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(errorElement) errorElement.textContent = "";

    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (!user) {
        if(errorElement) errorElement.textContent = "Ongeldig e-mailadres of wachtwoord.";
        return;
    }

    // ✅ Opslaan voor Dashboard gebruik
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userType", user.role);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userName", user.name);

    window.location.href = user.redirect;
}

// Events koppelen
document.getElementById("partner-form")?.addEventListener("submit", e => {
    e.preventDefault();
    handleLogin("partner");
});

document.getElementById("admin-form")?.addEventListener("submit", e => {
    e.preventDefault();
    handleLogin("admin");
});

// ===============================
// AUTH CHECK (Aanroepen bovenaan dashboard)
// ===============================
function checkAuth(requiredRole) {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");

    if (isAuthenticated !== "true" || userType !== requiredRole) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

window.checkAuth = checkAuth;
