// ===============================
// AUTH CHECK
// ===============================
const authUser = JSON.parse(localStorage.getItem("authUser"));

if (!authUser || authUser.role !== "partner") {
    window.location.href = "index.html";
}

// ===============================
// MOCK PARTNER DATA (DEMO ONLY)
// ===============================
const partnerData = {
    email: authUser.email,
    companyName: "Peru Adventure Co.",
    country: "Peru",
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
        }
    ],
    messages: [
        {
            from: "Beyond the Pitch",
            subject: "Welcome to the platform!",
            date: "2026-01-15",
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
// DATA LOADERS
// ===============================
function loadPartnerData() {
    document.getElementById("partnerName").textContent = partnerData.companyName;
    document.getElementById("partnerCountry").textContent = `📍 ${partnerData.country}`;
    document.getElementById("welcomeText").textContent =
        `Welcome, ${partnerData.companyName}!`;

    const totalBookings = partnerData.bookings.length;
    const activeExperiences = partnerData.experiences.length;
    const avgRating = (
        partnerData.experiences.reduce((sum, e) => sum + e.rating, 0) /
        activeExperiences
    ).toFixed(1);
    const totalGuests = partnerData.bookings.reduce(
        (sum, b) => sum + b.guests,
        0
    );

    document.getElementById("totalBookings").textContent = totalBookings;
    document.getElementById("activeExperiences").textContent = activeExperiences;
    document.getElementById("avgRating").textContent = avgRating;
    document.getElementById("totalGuests").textContent = totalGuests;

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

    tbody.innerHTML = upcoming.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("en-GB")}</td>
            <td>${b.guests} guests</td>
            <td><span class="badge badge-${b.status}">
                ${b.status === "confirmed" ? "Confirmed" : "Pending"}
            </span></td>
            <td>€${b.amount}</td>
        </tr>
    `).join("");
}

function loadAllBookings() {
    const tbody = document.getElementById("allBookings");

    tbody.innerHTML = partnerData.bookings.map(b => `
        <tr>
            <td><strong>${b.id}</strong></td>
            <td>${b.experienceName}</td>
            <td>${b.customer}</td>
            <td>${new Date(b.date).toLocaleDateString("en-GB")}</td>
            <td>${b.guests} guests</td>
            <td><span class="badge badge-${b.status}">
                ${b.status === "confirmed" ? "Confirmed" : "Pending"}
            </span></td>
            <td>€${b.amount}</td>
            <td>
                <button class="btn btn-secondary"
                    onclick="viewBooking('${b.id}')">
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

    grid.innerHTML = partnerData.experiences.map(exp => `
        <div class="experience-card">
            <h3>${exp.title}</h3>
            <p style="color:#888">${exp.type}</p>
            <div style="display:flex;justify-content:space-between">
                <strong>€${exp.price}</strong>
                <span>⭐ ${exp.rating}</span>
            </div>
            <button class="btn btn-primary"
                onclick="editExperience(${exp.id})">
                Edit experience
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

    for (let day = 1; day <= 28; day++) {
        const booked = partnerData.bookings.some(
            b => new Date(b.date).getDate() === day
        );

        grid.innerHTML += `
            <div class="calendar-day ${booked ? "booked" : "available"}"
                onclick="toggleAvailability(${day})">
                <strong>${day}</strong>
                <div>${booked ? "Booked" : "Available"}</div>
            </div>
        `;
    }
}

// ===============================
// MESSAGES & SETTINGS
// ===============================
function loadMessages() {
    const container = document.getElementById("messagesContainer");

    if (!partnerData.messages.length) {
        container.innerHTML = "<p>No messages</p>";
        return;
    }

    container.innerHTML = partnerData.messages.map(m => `
        <div class="message ${!m.read ? "unread" : ""}">
            <strong>${m.from}</strong>
            <p>${m.subject}</p>
        </div>
    `).join("");
}

function loadSettings() {
    document.getElementById("companyName").value = partnerData.companyName;
    document.getElementById("contactName").value = partnerData.contactName;
    document.getElementById("phone").value = partnerData.phone;
    document.getElementById("languages").value =
        partnerData.languages.join(", ");
}

// ===============================
// ACTIONS
// ===============================
function viewBooking(id) {
    alert(`Viewing booking ${id} (demo only)`);
}

function editExperience(id) {
    alert(`Editing experience ${id} (demo only)`);
}

function toggleAvailability(day) {
    alert(`Toggled availability for day ${day} (demo only)`);
}

function logout() {
    localStorage.removeItem("authUser");
    window.location.href = "index.html";
}
