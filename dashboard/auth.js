// ===============================
// MOCK USER DATABASE (DEMO ONLY)
// ===============================
const users = [
    {
        role: "partner",
        email: "peru@demo.com",
        password: "peru123",
        redirect: "partner-dashboard.html"
    },
    {
        role: "admin",
        email: "admin@demo.com",
        password: "admin123",
        redirect: "admin-dashboard.html"
    }
];

// ===============================
// TAB SWITCHING (PARTNER / ADMIN)
// ===============================
const tabButtons = document.querySelectorAll(".tab-btn");
const loginForms = document.querySelectorAll(".login-form");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        // Reset active states
        tabButtons.forEach(btn => btn.classList.remove("active"));
        loginForms.forEach(form => form.classList.remove("active"));

        // Activate selected tab & form
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

    // Find user
    const user = users.find(
        u => u.role === role && u.email === email && u.password === password
    );

    if (!user) {
        errorElement.textContent = "Invalid email or password.";
        return;
    }

    // ===============================
    // STORE SESSION DATA
    // ===============================
    sessionStorage.setItem("isAuthenticated", "true");
    sessionStorage.setItem("userType", user.role);
    sessionStorage.setItem("userData", JSON.stringify({
        email: user.email,
        role: user.role
    }));

    console.log("✅ Login successful, redirecting to:", user.redirect);

    // Redirect to dashboard
    window.location.href = user.redirect;
}
