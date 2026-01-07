// Mock user database (DEMO ONLY)
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

// Tab switching
const tabButtons = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".login-form");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        forms.forEach(f => f.classList.remove("active"));

        button.classList.add("active");
        document
            .getElementById(`${button.dataset.tab}-form`)
            .classList.add("active");
    });
});

// Form submit handlers
document.getElementById("partner-form").addEventListener("submit", event => {
    event.preventDefault();
    handleLogin("partner");
});

document.getElementById("admin-form").addEventListener("submit", event => {
    event.preventDefault();
    handleLogin("admin");
});

function handleLogin(role) {
    const email = document.getElementById(`${role}-email`).value;
    const password = document.getElementById(`${role}-password`).value;
    const errorElement = document.getElementById(`${role}-error`);

    errorElement.textContent = "";

    const user = users.find(
        u => u.role === role && u.email === email && u.password === password
    );

    if (!user) {
        errorElement.textContent = "Invalid email or password.";
        return;
    }

    // Store demo session
    localStorage.setItem(
        "authUser",
        JSON.stringify({
            role: user.role,
            email: user.email
        })
    );

    window.location.href = user.redirect;
}
