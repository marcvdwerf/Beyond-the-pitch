// ===============================
// AUTH CHECK
// ===============================
console.log("🚀 Partner Dashboard Loading...");
checkAuth("partner");

const userEmail = localStorage.getItem("userEmail");

// ===============================
// DEMO DATA
// ===============================
const partnerData = {
    email: userEmail,
    companyName: "Peru Adventure Co.",
    country: "🇵🇪 Peru",
    bookings: [
        { id: "BTP-1001", experienceName: "Machu Picchu Hike", customer: "John Smith", date: "2026-02-10", guests: 4, status: "confirmed", amount: 800 },
        { id: "BTP-1002", experienceName: "Cusco City Tour", customer: "Emily Clark", date: "2026-02-14", guests: 2, status: "pending", amount: 250 },
        { id: "BTP-1003", experienceName: "Sacred Valley", customer: "Michael Johnson", date: "2026-02-20", guests: 3, status: "confirmed", amount: 450 }
    ],
    experiences: [
        { id: 1, title: "Machu Picchu Hike", type: "Trek", price: 1200, rating: 4.8, bookings: 18 },
        { id: 2, title: "Cusco City Tour", type: "City", price: 120, rating: 4.5, bookings: 34 },
        { id: 3, title: "Sacred Valley", type: "Cultural", price: 180, rating: 4.9, bookings: 24 }
    ],
    messages: [
        { from: "Beyond the Pitch", subject: "Welcome!", message: "We're excited to have you!", date: "2026-01-15", read: true },
        { from: "Beyond the Pitch", subject: "New booking", message: "You have a new booking from John Smith.", date: "2026-01-20", read: false }
    ]
};

// ===============================
// LOAD DATA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("📊 Loading partner data...");
    loadPartnerData();
});

function loadPartnerData() {
    document.getElementById("partnerName").textContent = partnerData.companyName;
    document.getElementById("partnerCountry").textContent = partnerData.country;
    document.getElementById("welcomeText").textContent = `Welkom, ${partnerData.companyName}!`;

    const totalBookings = partnerData.bookings.length;
    const activeExperiences = partnerData.experiences.length;
    const avgRating = (partnerData.experiences.reduce((sum, e) => sum + e.rating, 0) / activeExperiences).toFixed(1);
    const totalGuests = partnerData.bookings.reduce((sum, b) => sum + b.guests, 0);

    document.getElementById("totalBookings").textContent = totalBookings;
    document.getElementById("activeExperiences").textContent = activeExperiences;
    document.getElementById("avgRating").textContent = avgRating;
    document.getElementById("totalGuests").textContent = totalGuests;

    loadBookings();
    loadExperiences();
    loadMessages();
    
    console.log("✅ Partner data loaded!");
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
// BOOKINGS
// ===============================
function loadBookings() {
    const tbody = document.getElementById("allBookings");
    tbody.innerHTML = partnerData.bookings.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("nl-NL")}</td>
            <td>${b.guests}</td>
            <td><span class="badge badge-${b.status}">${b.status === "confirmed" ? "Bevestigd" : "In afwachting"}</span></td>
            <td><strong>€${b.amount}</strong></td>
        </tr>
    `).join("");
}

// ===============================
// EXPERIENCES
// ===============================
function loadExperiences() {
    const grid = document.getElementById("experiencesGrid");
    grid.innerHTML = partnerData.experiences.map(exp => `
        <div style="border:2px solid #e0e0e0; border-radius:15px; padding:20px; margin-bottom:15px;">
            <h3 style="color:#333;">${exp.title}</h3>
            <p style="color:#888; margin:10px 0;">${exp.type}</p>
            <div style="display:flex; justify-content:space-between; margin:10px 0;">
                <span><strong>€${exp.price}</strong> per persoon</span>
                <span>⭐ ${exp.rating}</span>
            </div>
            <p style="color:#666; font-size:0.9rem;">${exp.bookings} boekingen</p>
        </div>
    `).join("");
}

// ===============================
// MESSAGES
// ===============================
function loadMessages() {
    const container = document.getElementById("messagesContainer");
    container.innerHTML = partnerData.messages.map(m => `
        <div style="background:${m.read ? '#f8f9fa' : '#e3f2fd'}; padding:20px; border-radius:10px; margin-bottom:15px; border-left:4px solid ${m.read ? '#e0e0e0' : '#667eea'};">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${m.from}</strong>
                <span style="color:#888; font-size:0.9rem;">${new Date(m.date).toLocaleDateString("nl-NL")}</span>
            </div>
            <h4 style="color:#667eea; margin-bottom:10px;">${m.subject}</h4>
            <p style="color:#666;">${m.message}</p>
            ${!m.read ? '<span style="color:#667eea; font-weight:600;">● NIEUW</span>' : ''}
        </div>
    `).join("");
}
