// ===============================
// AUTH CHECK - MUST USE sessionStorage (not localStorage!)
// ===============================
const userData = sessionStorage.getItem("userData");
const userType = sessionStorage.getItem("userType");

// Redirect if not logged in or not a partner
if (!userData || userType !== "partner") {
    window.location.href = "index.html";
}

const authUser = JSON.parse(userData);

// ===============================
// MOCK PARTNER DATA (DEMO ONLY)
// ===============================
const partnerData = {
    email: authUser.email,
    companyName: "Peru Adventure Co.",
    country: "🇵🇪 Peru",
    contactName: "Juan Perez",
    phone: "+51 123 456 789",
    languages: ["English", "Spanish"],
    bookings: [
        {
            id: "BTP-1001",
            experienceName: "Machu Picchu Hike",
            customer: "John Smith",
            date: "2026-02-10",
            guests: 4,
            status: "confirmed",
            amount: 800
        },
        {
            id: "BTP-1002",
            experienceName: "Cusco City Tour",
            customer: "Emily Clark",
            date: "2026-02-14",
            guests: 2,
            status: "pending",
            amount: 250
        },
        {
            id: "BTP-1003",
            experienceName: "Sacred Valley Experience",
            customer: "Michael Johnson",
            date: "2026-02-20",
            guests: 3,
            status: "confirmed",
            amount: 450
        }
    ],
    experiences: [
        {
            id: 1,
            title: "Machu Picchu Hike",
            type: "Multi-day Trek",
            price: 1200,
            rating: 4.8,
            bookings: 18,
            capacity: { min: 2, max: 10 }
        },
        {
            id: 2,
            title: "Cusco City Tour",
            type: "City Experience",
            price: 120,
            rating: 4.5,
            bookings: 34,
            capacity: { min: 1, max: 15 }
        },
        {
            id: 3,
            title: "Sacred Valley Experience",
            type: "Cultural Tour",
            price: 180,
            rating: 4.9,
            bookings: 24,
            capacity: { min: 2, max: 12 }
        }
    ],
    messages: [
        {
            from: "Beyond the Pitch Team",
            subject: "Welcome to the platform!",
            message: "We're excited to have you on board. Complete your profile to get started.",
            date: "2026-01-15",
            read: true
        },
        {
            from: "Beyond the Pitch Team",
            subject: "New booking received",
            message: "You have a new booking from John Smith for Machu Picchu Hike.",
            date: "2026-01-20",
            read: false
        }
    ]
};

// ===============================
// INITIAL LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    loadPartnerData();
});

// ===============================
// NAVIGATION
// ===============================
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.remove("active");
    });

    // Remove active from all nav items
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    // Show selected section
    document.getElementById(sectionId).classList.add("active");

    // Add active to clicked nav item
    event.currentTarget.classList.add("active");
}

// ===============================
// DATA LOADERS
// ===============================
function loadPartnerData() {
    // Update header
    document.getElementById("partnerName").textContent = partnerData.companyName;
    document.getElementById("partnerCountry").textContent = partnerData.country;
    document.getElementById("welcomeText").textContent = `Welcome, ${partnerData.companyName}!`;

    // Calculate stats
    const totalBookings = partnerData.bookings.length;
    const activeExperiences = partnerData.experiences.length;
    const avgRating = (
        partnerData.experiences.reduce((sum, e) => sum + e.rating, 0) / activeExperiences
    ).toFixed(1);
    const totalGuests = partnerData.bookings.reduce((sum, b) => sum + b.guests, 0);

    // Update stats
    document.getElementById("totalBookings").textContent = totalBookings;
    document.getElementById("activeExperiences").textContent = activeExperiences;
    document.getElementById("avgRating").textContent = avgRating;
    document.getElementById("totalGuests").textContent = totalGuests;

    // Load all sections
    loadUpcomingBookings();
    loadAllBookings();
    loadExperiences();
    loadCalendar();
    loadMessages();
    loadSettings();
}

// ===============================
// BOOKINGS
// ===============================
function loadUpcomingBookings() {
    const tbody = document.getElementById("upcomingBookings");
    const upcoming = partnerData.bookings.filter(b => b.status !== "cancelled");

    if (upcoming.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">Geen aankomende boekingen</td></tr>';
        return;
    }

    tbody.innerHTML = upcoming.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("nl-NL")}</td>
            <td>${b.guests} gasten</td>
            <td><span class="badge badge-${b.status}">
                ${b.status === "confirmed" ? "Bevestigd" : "In afwachting"}
            </span></td>
            <td><strong>€${b.amount}</strong></td>
        </tr>
    `).join("");
}

function loadAllBookings() {
    const tbody = document.getElementById("allBookings");

    if (partnerData.bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888;">Geen boekingen beschikbaar</td></tr>';
        return;
    }

    tbody.innerHTML = partnerData.bookings.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("nl-NL")}</td>
            <td>${b.guests} gasten</td>
            <td><span class="badge badge-${b.status}">
                ${b.status === "confirmed" ? "Bevestigd" : "In afwachting"}
            </span></td>
            <td><strong>€${b.amount}</strong></td>
            <td>
                <button class="btn btn-secondary" onclick="viewBooking('${b.id}')">
                    Details
                </button>
            </td>
        </tr>
    `).join("");
}

// ===============================
// EXPERIENCES
// ===============================
function loadExperiences() {
    const grid = document.getElementById("experiencesGrid");

    if (partnerData.experiences.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #888;">Geen experiences beschikbaar</p>';
        return;
    }

    grid.innerHTML = partnerData.experiences.map(exp => `
        <div class="experience-card">
            <h3>${exp.title}</h3>
            <p style="color:#888; margin: 10px 0;">${exp.type}</p>
            <div class="experience-meta">
                <span><strong>€${exp.price}</strong> per persoon</span>
                <span class="rating">⭐ ${exp.rating}</span>
            </div>
            <p style="color:#666; margin: 10px 0; font-size: 0.9rem;">
                ${exp.bookings} boekingen • Capaciteit: ${exp.capacity.min}-${exp.capacity.max}
            </p>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="editExperience(${exp.id})">
                ✏️ Bewerk Experience
            </button>
        </div>
    `).join("");
}

// ===============================
// CALENDAR
// ===============================
function loadCalendar() {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    // Days of the week headers
    const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    days.forEach(day => {
        grid.innerHTML += `<div style="text-align: center; font-weight: 600; padding: 10px; color: #667eea;">${day}</div>`;
    });

    // Calendar days for February 2026 (28 days)
    for (let day = 1; day <= 28; day++) {
        const dateStr = `2026-02-${String(day).padStart(2, '0')}`;
        
        // Check if this date has a booking
        const booking = partnerData.bookings.find(b => b.date === dateStr);
        const isBooked = booking !== undefined;
        
        const className = isBooked ? "booked" : "available";
        const statusText = isBooked ? "Geboekt" : "Beschikbaar";
        const customerText = isBooked ? `<div style="font-size: 0.75rem; margin-top: 5px;">${booking.customer}</div>` : '';

        grid.innerHTML += `
            <div class="calendar-day ${className}" onclick="toggleAvailability(${day})">
                <strong>${day}</strong>
                <div style="font-size: 0.8rem; margin-top: 5px;">${statusText}</div>
                ${customerText}
            </div>
        `;
    }
}

// ===============================
// MESSAGES
// ===============================
function loadMessages() {
    const container = document.getElementById("messagesContainer");

    if (!partnerData.messages || partnerData.messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">Geen berichten</p>';
        return;
    }

    container.innerHTML = partnerData.messages.map(m => `
        <div style="
            background: ${m.read ? '#f8f9fa' : '#e3f2fd'};
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 4px solid ${m.read ? '#e0e0e0' : '#667eea'};
        ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #333;">${m.from}</strong>
                <span style="color: #888; font-size: 0.9rem;">${new Date(m.date).toLocaleDateString("nl-NL")}</span>
            </div>
            <h4 style="color: #667eea; margin-bottom: 10px;">${m.subject}</h4>
            <p style="color: #666;">${m.message}</p>
            ${!m.read ? '<span style="color: #667eea; font-weight: 600; font-size: 0.85rem;">● NIEUW</span>' : ''}
        </div>
    `).join("");
}

// ===============================
// SETTINGS
// ===============================
function loadSettings() {
    document.getElementById("companyName").value = partnerData.companyName;
    document.getElementById("contactName").value = partnerData.contactName;
    document.getElementById("phone").value = partnerData.phone;
    document.getElementById("languages").value = partnerData.languages.join(", ");
}

// Handle settings form submission
document.getElementById("settingsForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Update partner data (in real app, this would be sent to server)
    partnerData.companyName = document.getElementById("companyName").value;
    partnerData.contactName = document.getElementById("contactName").value;
    partnerData.phone = document.getElementById("phone").value;
    partnerData.languages = document.getElementById("languages").value.split(",").map(l => l.trim());
    
    // Update header
    document.getElementById("partnerName").textContent = partnerData.companyName;
    
    alert("✅ Instellingen succesvol opgeslagen!");
});

// ===============================
// ACTIONS
// ===============================
function viewBooking(id) {
    const booking = partnerData.bookings.find(b => b.id === id);
    if (booking) {
        alert(`📋 Booking Details:\n\nID: ${booking.id}\nExperience: ${booking.experienceName}\nKlant: ${booking.customer}\nDatum: ${new Date(booking.date).toLocaleDateString("nl-NL")}\nGasten: ${booking.guests}\nBedrag: €${booking.amount}\nStatus: ${booking.status}`);
    }
}

function editExperience(id) {
    const experience = partnerData.experiences.find(e => e.id === id);
    if (experience) {
        alert(`✏️ Bewerk Experience:\n\n${experience.title}\n\n(In de volledige versie opent hier een formulier)`);
    }
}

function toggleAvailability(day) {
    const dateStr = `2026-02-${String(day).padStart(2, '0')}`;
    const booking = partnerData.bookings.find(b => b.date === dateStr);
    
    if (booking) {
        alert(`Deze datum is al geboekt door ${booking.customer}`);
    } else {
        alert(`Beschikbaarheid voor ${day} februari gewijzigd!\n\n(In de volledige versie wordt dit opgeslagen in de database)`);
        // Reload calendar to show changes
        loadCalendar();
    }
}

function logout() {
    // Clear session
    sessionStorage.removeItem("userType");
    sessionStorage.removeItem("userData");
    
    // Redirect to login
    window.location.href = "index.html";
}
