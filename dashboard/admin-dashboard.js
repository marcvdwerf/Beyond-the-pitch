/**
 * Beyond the Pitch - Admin Dashboard Logic
 * Version: 2.1
 */

// ===============================
// AUTH CHECK (Direct uitvoeren)
// ===============================
if (typeof checkAuth === 'function') {
    checkAuth("admin");
}

// ===============================
// STATE MANAGEMENT & DATA
// ===============================
const AdminDashboard = {
    // Laad data uit localStorage of gebruik de default demo data
    partners: JSON.parse(localStorage.getItem('btp_partners')) || [
        { id: 1, name: "Peru Adventure Co.", email: "peru@demo.com", country: "Peru", type: "Tour operator", contactName: "Juan Perez", phone: "+51 123 456 789", status: "active", joinDate: "2025-08-15", bookings: 45, rating: 4.8 },
        { id: 2, name: "Dublin Football Hostel", email: "ireland@demo.com", country: "Ireland", type: "Sports club", contactName: "Sean O'Brien", phone: "+353 87 123 4567", status: "active", joinDate: "2025-09-20", bookings: 32, rating: 4.9 },
        { id: 3, name: "Nomadic Ger Experience", email: "mongolia@demo.com", country: "Mongolia", type: "Cultural organization", contactName: "Bataar Erdene", phone: "+976 99 123 456", status: "pending", joinDate: "2026-01-05", bookings: 0, rating: null }
    ],

    experiences: [
        { id: 1, name: "Machu Picchu Hike", partnerId: 1, country: "Peru", type: "Trek", price: 1200, rating: 4.8, bookings: 18 },
        { id: 2, name: "Cusco City Tour", partnerId: 1, country: "Peru", type: "City Tour", price: 120, rating: 4.5, bookings: 34 },
        { id: 3, name: "GAA Training Session", partnerId: 2, country: "Ireland", type: "Sports", price: 150, rating: 4.9, bookings: 28 },
        { id: 4, name: "Dublin Football Experience", partnerId: 2, country: "Ireland", type: "Sports", price: 200, rating: 4.7, bookings: 22 },
        { id: 5, name: "Mongolian Wrestling", partnerId: 3, country: "Mongolia", type: "Cultural", price: 180, rating: null, bookings: 0 },
        { id: 6, name: "Steppe Football", partnerId: 3, country: "Mongolia", type: "Sports", price: 220, rating: null, bookings: 0 }
    ],

    bookings: JSON.parse(localStorage.getItem('btp_bookings')) || [
        { id: "BTP-1001", experienceId: 1, partnerId: 1, customer: "John Smith", date: "2026-02-10", guests: 4, status: "confirmed", amount: 4800 },
        { id: "BTP-1002", experienceId: 3, partnerId: 2, customer: "Emily Clark", date: "2026-02-14", guests: 2, status: "confirmed", amount: 300 }
    ],

    saveData() {
        localStorage.setItem('btp_partners', JSON.stringify(this.partners));
        localStorage.setItem('btp_bookings', JSON.stringify(this.bookings));
    }
};

// ===============================
// UI HELPERS
// ===============================
const UI = {
    getFlag: (country) => {
        const flags = { "Peru": "🇵🇪", "Ireland": "🇮🇪", "Mongolia": "🇲🇳" };
        return flags[country] || "🌍";
    },
    formatDate: (dateStr) => new Date(dateStr).toLocaleDateString('nl-NL', {
        day: '2-digit', month: 'short', year: 'numeric'
    })
};

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    console.log("📊 Initializing Admin Dashboard...");
    
    refreshUI();
    setupEventListeners();
});

function refreshUI() {
    updateStats();
    populateExperienceDropdown();
    renderPartners('all');
    renderExperiences();
    renderBookings();
}

function setupEventListeners() {
    const bookingForm = document.getElementById('add-booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
}

// ===============================
// CORE FUNCTIONS
// ===============================

function updateStats() {
    const elements = {
        totalPartners: AdminDashboard.partners.length,
        totalExperiences: AdminDashboard.experiences.length,
        totalBookings: AdminDashboard.bookings.length,
        pendingApprovals: AdminDashboard.partners.filter(p => p.status === 'pending').length
    };

    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });
}

function renderPartners(filterCountry) {
    const grid = document.getElementById('partnersGrid');
    if (!grid) return;
    
    const filtered = filterCountry === 'all' 
        ? AdminDashboard.partners 
        : AdminDashboard.partners.filter(p => p.country === filterCountry);
    
    grid.innerHTML = filtered.map(partner => `
        <div class="partner-card ${partner.status}">
            <div class="partner-header">
                <h3>${partner.name}</h3>
                <span class="partner-country">${UI.getFlag(partner.country)} ${partner.country}</span>
            </div>
            <div class="partner-info">
                <p><strong>Email:</strong> ${partner.email}</p>
                <p><strong>Contact:</strong> ${partner.contactName}</p>
            </div>
            <div class="partner-stats">
                <div class="partner-stat">
                    <span>${partner.bookings}</span>
                    <small>Boekingen</small>
                </div>
                <div class="partner-stat">
                    <span>${partner.rating || '—'}</span>
                    <small>Rating</small>
                </div>
            </div>
            <div class="status-badge-container">
                <span class="badge badge-${partner.status}">
                    ${partner.status === 'active' ? '✅ Actief' : '⏳ In afwachting'}
                </span>
            </div>
            <div class="partner-actions">
                <button class="btn btn-secondary" onclick="viewPartner(${partner.id})">Details</button>
                ${partner.status === 'pending' ? 
                    `<button class="btn btn-success" onclick="approvePartner(${partner.id})">Goedkeuren</button>` : 
                    `<button class="btn btn-outline" onclick="alert('Login als partner feature')">Inloggen</button>`}
            </div>
        </div>
    `).join('');
}

function handleBookingSubmit(e) {
    e.preventDefault();
    
    const expId = parseInt(document.getElementById('event-select').value);
    const customer = document.getElementById('group-name').value;
    const guests = parseInt(document.getElementById('persons').value);
    const experience = AdminDashboard.experiences.find(ex => ex.id === expId);

    if (!experience || !customer) return alert("Vul alle velden in");

    const newBooking = {
        id: `BTP-${1000 + AdminDashboard.bookings.length + 1}`,
        experienceId: expId,
        partnerId: experience.partnerId,
        customer: customer,
        date: new Date().toISOString(),
        guests: guests,
        status: 'confirmed',
        amount: experience.price * guests
    };

    AdminDashboard.bookings.push(newBooking);
    AdminDashboard.saveData();
    refreshUI();
    e.target.reset();
}

// ===============================
// EXPOSED GLOBAL FUNCTIONS
// ===============================

window.showSection = function(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

window.approvePartner = function(id) {
    const index = AdminDashboard.partners.findIndex(p => p.id === id);
    if (index !== -1) {
        AdminDashboard.partners[index].status = 'active';
        AdminDashboard.saveData();
        refreshUI();
        alert("Partner succesvol geactiveerd!");
    }
};

window.addPartner = function(event) {
    event.preventDefault();
    const name = document.getElementById('newCompanyName').value;
    const email = document.getElementById('newEmail').value;
    const country = document.getElementById('newCountry').value;

    const newPartner = {
        id: Date.now(), // Unieke ID
        name, email, country,
        status: 'pending',
        bookings: 0,
        rating: null,
        contactName: "Nieuwe Aanvraag",
        phone: "-"
    };

    AdminDashboard.partners.push(newPartner);
    AdminDashboard.saveData();
    window.closeModal('addPartnerModal');
    refreshUI();
    event.target.reset();
};

function populateExperienceDropdown() {
    const select = document.getElementById('event-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecteer experience...</option>' + 
        AdminDashboard.experiences.map(ex => `<option value="${ex.id}">${ex.name} (€${ex.price})</option>`).join('');
}

function renderBookings() {
    const tbody = document.getElementById('bookingsBody');
    if (!tbody) return;
    
    tbody.innerHTML = [...AdminDashboard.bookings].reverse().map(b => {
        const exp = AdminDashboard.experiences.find(e => e.id === b.experienceId);
        return `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>${exp ? exp.name : 'Verwijderd'}</td>
                <td>${b.customer}</td>
                <td>${UI.formatDate(b.date)}</td>
                <td>${b.guests}</td>
                <td><span class="badge badge-${b.status}">${b.status}</span></td>
                <td><strong>€${b.amount}</strong></td>
            </tr>
        `;
    }).join('');
}

function renderExperiences() {
    const tbody = document.getElementById('experiencesBody');
    if (!tbody) return;
    tbody.innerHTML = AdminDashboard.experiences.map(exp => `
        <tr>
            <td><strong>${exp.name}</strong></td>
            <td>${UI.getFlag(exp.country)} ${exp.country}</td>
            <td>€${exp.price}</td>
            <td>${exp.bookings}</td>
            <td><button class="btn btn-secondary" onclick="alert('Edit ID: ${exp.id}')">Bewerk</button></td>
        </tr>
    `).join('');
}
