/**
 * Beyond the Pitch - Authentication Logic
 * Versie: 1.0 ORIGINEEL
 */
const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';

if (window.location.pathname.includes('partner-dashboard.html') || window.location.pathname.includes('admin-dashboard.html')) {
    if (sessionStorage.getItem("isAuthenticated") !== "true") {
        window.location.href = "index.html";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                document.querySelectorAll(".login-form").forEach(f => f.classList.remove("active"));
                button.classList.add("active");
                document.getElementById(`${button.dataset.tab}-form`).classList.add("active");
            });
        });
        document.getElementById("partner-form")?.addEventListener("submit", e => { e.preventDefault(); handleLogin("partner"); });
        document.getElementById("admin-form")?.addEventListener("submit", e => { e.preventDefault(); handleLogin("admin"); });
    }
});

async function handleLogin(role) {
    const userEl = document.getElementById(`${role}-email`);
    const passEl = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);
    const btn = document.querySelector(`#${role}-form .login-btn`);
    try {
        btn.disabled = true;
        btn.innerText = "Verifying...";
        
        const params = new URLSearchParams({
            action: 'login',
            user: userEl.value.trim(),
            pass: passEl.value.trim()
        });
        const response = await fetch(`${MASTER_API_URL}?${params.toString()}`);
        const result = await response.json();

        if (result.status === "success") {
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem("userRole", result.role);
            sessionStorage.setItem("partnerID", result.partnerID);
            sessionStorage.setItem("userName", result.name);
            window.location.href = (result.role === "admin") ? "admin-dashboard.html" : "partner-dashboard.html";
        } else {
            errorEl.textContent = "Invalid credentials.";
            btn.disabled = false;
            btn.innerText = "Sign In";
        }
    } catch (err) {
        errorEl.textContent = "Connection error.";
        btn.disabled = false;
    }
}

window.logout = function() {
    sessionStorage.clear();
    window.location.href = "index.html";
};
