/**
 * Beyond the Pitch - Optimized Authentication
 */

// Gebruik de URL van je Google Apps Script
const MASTER_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    checkExistingSession();

    // Form Events
    document.getElementById("partner-form")?.addEventListener("submit", e => {
        e.preventDefault();
        handleLogin("partner");
    });

    document.getElementById("admin-form")?.addEventListener("submit", e => {
        e.preventDefault();
        handleLogin("admin");
    });
});

function initTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const loginForms = document.querySelectorAll(".login-form");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            loginForms.forEach(form => form.classList.remove("active"));
            
            button.classList.add("active");
            const targetId = `${button.dataset.tab}-form`;
            document.getElementById(targetId)?.classList.add("active");
            document.querySelectorAll('.error-message').forEach(el => el.textContent = "");
        });
    });
}

async function handleLogin(role) {
    const userEl = document.getElementById(`${role}-email`);
    const passEl = document.getElementById(`${role}-password`);
    const errorEl = document.getElementById(`${role}-error`);
    const submitBtn = document.querySelector(`#${role}-form .login-btn`);

    const username = userEl.value.trim().toLowerCase(); // Altijd lowercase voor database match
    const password = passEl.value.trim();

    try {
        toggleLoading(submitBtn, true, role);
        errorEl.textContent = "";

        // API Call
        const params = new URLSearchParams({
            action: 'login',
            user: username,
            pass: password,
            role: role // We geven mee of ze als partner of admin proberen in te loggen
        });

        const response = await fetch(`${MASTER_API_URL}?${params.toString()}`);
        const result = await response.json();

        if (result.status === "success") {
            // Sla sessie op (sessionStorage is veiliger dan localStorage voor logins)
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem("userRole", result.role);
            sessionStorage.setItem("partnerID", result.partnerID);
            sessionStorage.setItem("userName", result.name);

            // Redirect op basis van de Role uit de DATABASE, niet uit de tab
            window.location.href = result.role === "admin" ? "admin-dashboard.html" : "partner-dashboard.html";
        } else {
            errorEl.textContent = result.message || "Invalid credentials.";
        }
    } catch (error) {
        errorEl.textContent = "Server connection failed. Try again later.";
        console.error("Auth error:", error);
    } finally {
        toggleLoading(submitBtn, false, role);
    }
}

function toggleLoading(btn, isLoading, role) {
    btn.disabled = isLoading;
    if (isLoading) {
        btn.innerHTML = '<span class="spinner"></span> Verifying...';
    } else {
        btn.innerText = role === "admin" ? "Admin Access" : "Sign In";
    }
}

function checkExistingSession() {
    const auth = sessionStorage.getItem("isAuthenticated");
    const role = sessionStorage.getItem("userRole");
    
    if (auth === "true") {
        window.location.href = (role === "admin") ? "admin-dashboard.html" : "partner-dashboard.html";
    }
}
