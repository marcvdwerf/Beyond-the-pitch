// ===============================
// TEMPORARILY DISABLED AUTH FOR TESTING
// ===============================
console.log("🚀 Admin Dashboard Script Loading...");
console.log("⚠️ AUTH CHECK DISABLED FOR TESTING");

// COMMENTED OUT AUTH CHECK - ENABLE THIS LATER!
/*
const isAuthenticated = sessionStorage.getItem("isAuthenticated");
const userType = sessionStorage.getItem("userType");

if (!isAuthenticated || userType !== "admin") {
    console.log("❌ Not authorized");
    window.location.replace("index.html");
}
*/

console.log("✅ Loading dashboard without auth check...");

// ===============================
// DEMO DATA
// ===============================
const partnersData = [
    {
        id: 1,
        name: "Peru Adventure Co.",
        email: "peru@demo.com",
        country: "Peru",
        type: "Tour operator",
        contactName: "Juan Perez",
        phone: "+51 123 456 789",
        status: "active",
        joinDate: "2025-08-15",
        bookings: 45,
        rating: 4.8
    },
    {
        id: 2,
        name: "Dublin Football Hostel",
        email: "ireland@demo.com",
        country: "Ireland",
        type: "Sports club / academy",
        contactName: "Sean O'Brien",
        phone: "+353 87 123 4567",
        status: "active",
        joinDate: "2025-09-20",
        bookings: 32,
        rating: 4.9
    },
    {
        id: 3,
        name: "Nomadic Ger Experience",
        email: "mongolia@demo.com",
        country: "Mongolia",
        type: "Cultural organization",
        contactName: "Bataar Erdene",
        phone: "+976 99 123 456",
        status: "pending",
        joinDate: "2026-01-05",
        bookings: 0,
        rating: null
    }
];

const experiencesData = [
    { id: 1, name: "Machu Picchu Hike", partnerId: 1, country: "Peru", type: "Trek", price: 1200, rating: 4.8, bookings: 18 },
    { id: 2, name: "Cusco City Tour", partnerId: 1, country: "Peru", type: "City Tour", price: 120, rating: 4.5, bookings: 34 },
    { id: 3, name: "GAA Training Session", partnerId: 2, country: "Ireland", type: "Sports", price: 150, rating: 4.9, bookings: 28 },
    { id: 4, name: "Dublin Football Experience", partnerId: 2, country: "Ireland", type: "Sports", price: 200, rating: 4.7, bookings: 22 },
    { id: 5, name: "Mongolian Wrestling", partnerId: 3, country: "Mongolia", type: "Cultural", price: 180, rating: null, bookings: 0 },
    { id: 6, name: "Steppe Football", partnerId: 3, country: "Mongolia", type: "Sports", price: 220, rating: null, bookings: 0 }
];

const bookingsData = [
    { id: "BTP-1001", experienceId: 1, partnerId: 1, customer: "John Smith", date: "2026-02-10", guests: 4, status: "confirmed", amount: 4800 },
    { id: "BTP-1002", experienceId: 3, partnerId: 2, customer: "Emily Clark", date: "2026-02-14", guests: 2, status: "confirmed", amount: 300 },
    { id: "BTP-1003", experienceId: 2, partnerId: 1, customer: "Michael Johnson", date: "2026-02-20", guests: 3, status: "pending", amount: 360 },
    { id: "BTP-1004", experienceId: 4, partnerId: 2, customer: "Sarah Williams", date: "2026-02-25", guests: 5, status: "confirmed", amount: 1000 },
    { id: "BTP-1005", experienceId: 1, partnerId: 1, customer: "David Brown", date: "2026-03-01", guests: 2, status: "confirmed", amount: 2400 }
];

// ===============================
// HELPER FUNCTIONS
// ===============================
function getCountryFlag(country) {
    const flags = {
        "Peru": "🇵🇪",
        "Ireland": "🇮🇪",
        "Mongolia": "🇲🇳"
    };
    return flags[country] || "🌍";
}

// ===============================
// PAGE LOAD
// ===============================
window.addEventListener('DOMContentLoaded', function() {
    console.log("📊 DOM Ready - Initializing Admin Dashboard...");
    
    setTimeout(function() {
        try {
            updateStats();
            renderPartners('all');
            renderExperiences();
            renderBookings();
            console.log("✅ Admin Dashboard loaded successfully!");
        } catch (error) {
            console.error("❌ Error loading dashboard:", error);
        }
    }, 200);
});

// ===============================
// STATS
// ===============================
function updateStats() {
    const totalPartnersEl = document.getElementById('totalPartners');
    const totalExperiencesEl = document.getElementById('totalExperiences');
    const totalBookingsEl = document.getElementById('totalBookings');
    const pendingApprovalsEl = document.getElementById('pendingApprovals');

    if (totalPartnersEl) totalPartnersEl.textContent = partnersData.length;
    if (totalExperiencesEl) totalExperiencesEl.textContent = experiencesData.length;
    if (totalBookingsEl) totalBookingsEl.textContent = bookingsData.length;
    if (pendingApprovalsEl) {
        const pending = partnersData.filter(p => p.status === 'pending').length;
        pendingApprovalsEl.textContent = pending;
    }
}

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(function(section) {
        section.classList.remove('active');
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

window.showSection = showSection;

// ===============================
// PARTNERS
// ===============================
function renderPartners(filterCountry) {
    const grid = document.getElementById('partnersGrid');
    if (!grid) return;
    
    let filtered = partnersData;
    if (filterCountry !== 'all') {
        filtered = partnersData.filter(function(p) {
            return p.country === filterCountry;
        });
    }
    
    let html = '';
    
    filtered.forEach(function(partner) {
        html += `
            <div class="partner-card">
                <div class="partner-header">
                    <h3>${partner.name}</h3>
                    <span class="partner-country">${getCountryFlag(partner.country)} ${partner.country}</span>
                </div>
                <div class="partner-info">
                    📧 ${partner.email}<br>
                    👤 ${partner.contactName}<br>
                    📞 ${partner.phone}<br>
                    🏢 ${partner.type}
                </div>
                <div class="partner-stats">
                    <div class="partner-stat">
                        <div class="partner-stat-value">${partner.bookings}</div>
                        <div class="partner-stat-label">Boekingen</div>
                    </div>
                    <div class="partner-stat">
                        <div class="partner-stat-value">${partner.rating || 'N/A'}</div>
                        <div class="partner-stat-label">Rating</div>
                    </div>
                </div>
                <div style="text-align: center; margin: 10px 0;">
                    <span class="badge badge-${partner.status}">
                        ${partner.status === 'active' ? 'Actief' : 'In afwachting'}
                    </span>
                </div>
                <div class="partner-actions">
                    <button class="btn btn-primary" onclick="viewPartner(${partner.id})">Details</button>
                    <button class="btn btn-secondary" onclick="editPartner(${partner.id})">Bewerk</button>
                    ${partner.status === 'pending' ? 
                        `<button class="btn btn-success" onclick="approvePartner(${partner.id})">Goedkeuren</button>` 
                        : ''}
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function filterPartners(country) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    renderPartners(country);
}

window.filterPartners = filterPartners;

// ===============================
// EXPERIENCES
// ===============================
function renderExperiences() {
    const tbody = document.getElementById('experiencesBody');
    if (!tbody) return;
    
    let html = '';
    
    experiencesData.forEach(function(exp) {
        const partner = partnersData.find(function(p) {
            return p.id === exp.partnerId;
        });
        
        html += `
            <tr>
                <td><strong>${exp.name}</strong></td>
                <td>${partner ? partner.name : 'N/A'}</td>
                <td>${getCountryFlag(exp.country)} ${exp.country}</td>
                <td>${exp.type}</td>
                <td><strong>€${exp.price}</strong></td>
                <td>${exp.rating ? '⭐ ' + exp.rating : 'N/A'}</td>
                <td>${exp.bookings}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editExperience(${exp.id})">Bewerk</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ===============================
// BOOKINGS
// ===============================
function renderBookings() {
    const tbody = document.getElementById('bookingsBody');
    if (!tbody) return;
    
    let html = '';
    
    bookingsData.forEach(function(booking) {
        const experience = experiencesData.find(function(e) {
            return e.id === booking.experienceId;
        });
        const partner = partnersData.find(function(p) {
            return p.id === booking.partnerId;
        });
        
        const date = new Date(booking.date);
        const dateStr = date.toLocaleDateString('nl-NL');
        
        html += `
            <tr>
                <td><strong>${booking.id}</strong></td>
                <td>${experience ? experience.name : 'N/A'}</td>
                <td>${partner ? partner.name : 'N/A'}</td>
                <td>${booking.customer}</td>
                <td>${dateStr}</td>
                <td>${booking.guests}</td>
                <td>
                    <span class="badge badge-${booking.status}">
                        ${booking.status === 'confirmed' ? 'Bevestigd' : 'In afwachting'}
                    </span>
                </td>
                <td><strong>€${booking.amount}</strong></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ===============================
// ACTIONS
// ===============================
function viewPartner(id) {
    const partner = partnersData.find(function(p) {
        return p.id === id;
    });
    
    if (partner) {
        alert("👤 Partner: " + partner.name + "\n📧 " + partner.email + "\n🌍 " + partner.country + "\n📊 " + partner.bookings + " boekingen");
    }
}

window.viewPartner = viewPartner;

function editPartner(id) {
    alert("✏️ Partner bewerken (demo mode)");
}

window.editPartner = editPartner;

function approvePartner(id) {
    const partner = partnersData.find(function(p) {
        return p.id === id;
    });
    
    if (partner) {
        partner.status = 'active';
        renderPartners('all');
        updateStats();
        alert("✅ Partner '" + partner.name + "' goedgekeurd!");
    }
}

window.approvePartner = approvePartner;

function editExperience(id) {
    alert("✏️ Experience bewerken (demo mode)");
}

window.editExperience = editExperience;

// ===============================
// MODALS
// ===============================
function openAddPartnerModal() {
    const modal = document.getElementById('addPartnerModal');
    if (modal) modal.classList.add('active');
}

window.openAddPartnerModal = openAddPartnerModal;

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

window.closeModal = closeModal;

function addPartner(event) {
    event.preventDefault();
    
    const newPartner = {
        id: partnersData.length + 1,
        name: document.getElementById('newCompanyName').value,
        email: document.getElementById('newEmail').value,
        country: document.getElementById('newCountry').value,
        type: document.getElementById('newType').value,
        contactName: document.getElementById('newContactName').value,
        phone: document.getElementById('newPhone').value,
        status: 'pending',
        joinDate: new Date().toISOString().split('T')[0],
        bookings: 0,
        rating: null
    };
    
    partnersData.push(newPartner);
    
    closeModal('addPartnerModal');
    renderPartners('all');
    updateStats();
    
    alert("✅ Partner '" + newPartner.name + "' toegevoegd!");
    event.target.reset();
}

window.addPartner = addPartner;

function sendBroadcast(event) {
    event.preventDefault();
    alert("📤 Broadcast verstuurd!");
    event.target.reset();
}

window.sendBroadcast = sendBroadcast;

function logout() {
    sessionStorage.clear();
    window.location.href = "index.html";
}

window.logout = logout;

console.log("✅ Admin Dashboard ready (NO AUTH MODE)");
