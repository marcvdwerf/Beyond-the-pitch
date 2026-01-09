// ===============================
// AUTH.JS - Authentication System
// Beyond the Pitch
// ===============================

console.log("🔐 Auth system loaded");

/**
 * Check if user is authenticated
 * @param {string} requiredRole - Required role: 'partner', 'admin', or 'user'
 */
function checkAuth(requiredRole) {
    const userEmail = localStorage.getItem("userEmail");
    const userRole = localStorage.getItem("userRole");
    
    // If no user is logged in, redirect to login
    if (!userEmail) {
        console.warn("⚠️ No user logged in, redirecting to login...");
        // Uncomment this when you have a login page:
        // window.location.href = "index.html";
        return false;
    }
    
    // Check if user has required role
    if (requiredRole && userRole !== requiredRole) {
        console.warn(`⚠️ User role '${userRole}' does not match required role '${requiredRole}'`);
        alert("Je hebt geen toegang tot deze pagina.");
        // window.location.href = "index.html";
        return false;
    }
    
    console.log(`✅ User authenticated: ${userEmail} (${userRole})`);
    return true;
}

/**
 * Login function (demo version)
 * @param {string} email 
 * @param {string} password 
 * @param {string} role 
 */
function login(email, password, role = 'partner') {
    // Demo: Accept any email/password
    // In production, verify against backend/Firebase
    
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userRole", role);
    
    console.log(`✅ Logged in as ${email} (${role})`);
    
    // Redirect based on role
    if (role === 'partner') {
        window.location.href = "partner-dashboard.html";
    } else if (role === 'admin') {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "index.html";
    }
}

/**
 * Logout function
 */
function logout() {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        console.log("👋 Logged out");
        window.location.href = "index.html";
    }
}

/**
 * Get current user info
 */
function getCurrentUser() {
    return {
        email: localStorage.getItem("userEmail"),
        role: localStorage.getItem("userRole")
    };
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return !!localStorage.getItem("userEmail");
}

// Make functions available globally
window.checkAuth = checkAuth;
window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;

// Auto-login for demo purposes (REMOVE IN PRODUCTION)
if (!isLoggedIn() && window.location.pathname.includes('partner-dashboard')) {
    console.log("🔧 Demo mode: Auto-login as partner");
    localStorage.setItem("userEmail", "demo-partner@travelbeyondthepitch.com");
    localStorage.setItem("userRole", "partner");
}
