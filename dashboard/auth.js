// ===============================
// MOCK USER DATABASE (DEMO ONLY)
// ===============================
const users = [
    { role: "partner", email: "peru@demo.com", password: "peru123", redirect: "../partner/partner-dashboard.html" },
    { role: "admin", email: "admin@demo.com", password: "admin123", redirect: "../admin/admin-dashboard.html" }
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
        if(targetForm) targetForm.classList.add("active");
    });
});

// ===============================
// FORM SUBMISSION HANDLERS
// ===============================
const partnerForm = document.getElementById("partner-form");
if(partnerForm) partnerForm.addEventListener("submit", e => {
    e.preventDefault();
    handleLogin("partner");
});

const adminForm = document.getElementById("admin-form");
if(adminForm) adminForm.addEventListener("submit", e => {
    e.preventDefault();
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

    if(errorElement) errorElement.textContent = "";

    const user = users.find(u => u.role === role && u.email === email && u.password === password);

    if (!user) {
        if(errorElement) errorElement.textContent = "Invalid email or password.";
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
 d
