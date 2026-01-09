// ===============================
// AUTH CHECK
// ===============================
console.log("🚀 Admin dashboard loading...");
checkAuth("admin");

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
        type: "Sports club",
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
    const flags = { "Peru": "🇵🇪", "Ireland": "🇮🇪", "Mongolia": "🇲🇳" };
    return flags[country] || "🌍";
}

// ===============================
// PAGE LOAD
// ===============================
window.addEventListener('DOMContentLoaded', function() {
    console.log("📊 Initializing Admin Dashboard...");
    setTimeout(function() {
        populateExperienceDropdown(); // Vul de dropdown bij start
        updateStats();
        renderPartners('all');
        renderExperiences();
        renderBookings();
        console.log("✅ Admin Dashboard loaded!");
    }, 100);
});

// ===============================
// STATS
// ===============================
function updateStats() {
    document.getElementById('totalPartners').textContent = partnersData.length;
    document.getElementById('totalExperiences').textContent = experiencesData.length;
    document.getElementById('totalBookings').textContent = bookingsData.length;
    const pending = partnersData.filter(p => p.status === 'pending').length;
    document.getElementById('pendingApprovals').textContent = pending;
}

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}
window.showSection = showSection;

// ===============================
// BOOKING FORM LOGIC
// ===============================

// Zorg dat de dropdown de juiste experiences toont uit de data
function populateExperienceDropdown() {
    const select = document.getElementById('event-select');
    if (!select) return;
    
    // Behoud alleen de eerste (default) optie
    select.innerHTML = '<option value="">Selecteer experience...</option>';
    
    experiencesData.forEach(exp => {
        const option = document.createElement('option');
        option.value = exp.id;
        option.textContent = `${exp.name} (€${exp.price})`;
        select.appendChild(option);
    });
}

const addBookingForm = document.getElementById('add-booking-form');
if (addBookingForm) {
    addBookingForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const selectedExpId = parseInt(document.getElementById('event-select').value);
        const selectedExp = experiencesData.find(exp => exp.id === selectedExpId);
        const guestCount = parseInt(document.getElementById('persons').value);

        if (!selectedExp) {
            alert("Selecteer a.u.b. een experience");
            return;
        }

        // Maak het nieuwe boeking object
        const newBooking = {
            id: "BTP-" + (1000 + bookingsData.length + 1),
            experienceId: selectedExpId,
            partnerId: selectedExp.partnerId,
            customer: document.getElementById('group-name').value,
            date: new Date().toISOString().split('T')[0], // Vandaag
            guests: guestCount,
            status: 'confirmed',
            amount: selectedExp.price * guestCount
        };

        // Voeg toe aan de data array
        bookingsData.push(newBooking);

        // Update de pagina
        renderBookings();
        updateStats();
        
        // Reset formulier
        this.reset();
        alert(`✅ Boeking voor ${newBooking.customer} succesvol toegevoegd!`);
    });
}

// ===============================
// PARTNERS
// ===============================
function renderPartners(filterCountry) {
    const grid = document.getElementById('partnersGrid');
    if (!grid) return;
    
    let filtered = filterCountry === 'all' ? partnersData : partnersData.filter(p => p.country === filterCountry);
    
    grid.innerHTML = filtered.map(partner => `
        <div class="partner-card">
            <div class="partner-header">
                <h3>${partner.name}</h3>
                <span class="partner-country">${getCountryFlag(partner.country)} ${partner.country}</span>
            </div>
            <div class="partner-info">
                📧 ${partner.email}<br>
                👤 ${partner.contactName}<br>
                📞 ${partner.phone}
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
            <div style="text-align:center; margin:10px 0;">
                <span class="badge badge-${partner.status}">
                    ${partner.status === 'active' ? 'Actief' : 'In afwachting'}
                </span>
            </div>
            <div class="partner-actions">
                <button class="btn btn-primary" onclick="viewPartner(${partner.id})">Details</button>
                ${partner.status === 'pending' ? 
                    `<button class="btn btn-success" onclick="approvePartner(${partner.id})">Goedkeuren</button>` : ''}
            </div>
        </div>
    `).join('');
}

function filterPartners(country) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
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
    
    tbody.innerHTML = experiencesData.map(exp => {
        const partner = partnersData.find(p => p.id === exp.partnerId);
        return `
            <tr>
                <td><strong>${exp.name}</strong></td>
                <td>${partner ? partner.name : 'N/A'}</td>
                <td>${getCountryFlag(exp.country)} ${exp.country}</td>
                <td>${exp.type}</td>
                <td><strong>€${exp.price}</strong></td>
                <td>${exp.rating ? '⭐ ' + exp.rating : 'N/A'}</td>
                <td>${exp.bookings}</td>
                <td><button class="btn btn-secondary" onclick="alert('Edit feature')">Bewerk</button></td>
            </tr>
        `;
    }).join('');
}

// ===============================
// BOOKINGS
// ===============================
function renderBookings() {
    const tbody = document.getElementById('bookingsBody');
    if (!tbody) return;
    
    // We tonen de nieuwste boekingen bovenaan
    const displayData = [...bookingsData].reverse();
    
    tbody.innerHTML = displayData.map(booking => {
        const experience = experiencesData.find(e => e.id === booking.experienceId);
        const partner = partnersData.find(p => p.id === booking.partnerId);
        return `
            <tr>
                <td><strong>${booking.id}</strong></td>
                <td>${experience ? experience.name : 'N/A'}</td>
                <td>${partner ? partner.name : 'N/A'}</td>
                <td>${booking.customer}</td>
                <td>${new Date(booking.date).toLocaleDateString('nl-NL')}</td>
                <td>${booking.guests}</td>
                <td><span class="badge badge-${booking.status}">
                    ${booking.status === 'confirmed' ? 'Bevestigd' : 'In afwachting'}
                </span></td>
                <td><strong>€${booking.amount}</strong></td>
            </tr>
        `;
    }).join('');
}

// ===============================
// ACTIONS
// ===============================
function viewPartner(id) {
    const partner = partnersData.find(p => p.id === id);
    if (partner) alert(`👤 Partner: ${partner.name}\n📧 ${partner.email}\n🌍 ${partner.country}`);
}
window.viewPartner = viewPartner;

function approvePartner(id) {
    const partner = partnersData.find(p => p.id === id);
    if (partner) {
        partner.status = 'active';
        renderPartners('all');
        updateStats();
        alert(`✅ Partner '${partner.name}' goedgekeurd!`);
    }
}
window.approvePartner = approvePartner;

// ===============================
// MODALS
// ===============================
function openAddPartnerModal() {
    document.getElementById('addPartnerModal').classList.add('active');
}
window.openAddPartnerModal = openAddPartnerModal;

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
window.closeModal = closeModal;

function addPartner(event) {
    event.preventDefault();
    const newPartner = {
        id: partnersData.length + 1,
        name: document.getElementById('newCompanyName').value,
        email: document.getElementById('newEmail').value,
        country: document.getElementById('newCountry').value,
        type: 'Partner',
        contactName: 'New Contact',
        phone: '+00 000 000 000',
        status: 'pending',
        bookings: 0,
        rating: null
    };
    partnersData.push(newPartner);
    closeModal('addPartnerModal');
    renderPartners('all');
    updateStats();
    alert(`✅ Partner '${newPartner.name}' toegevoegd!`);
    event.target.reset();
}
window.addPartner = addPartner;

function sendBroadcast(event) {
    event.preventDefault();
    alert("📤 Broadcast verstuurd!");
    event.target.reset();
}
window.sendBroadcast = sendBroadcast;
