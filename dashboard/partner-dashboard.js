/**
 * Beyond the Pitch - Partner Dashboard Logic (Full Version)
 * Inclusief: Boekingen, Kalender, Statistieken en Availability POST
 */

// ===============================
// CONFIGURATIE
// ===============================
// Zorg dat deze URL de allernieuwste is na je 'doPost' implementatie in Google Sheets
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzQ1ZRCue9z1sehve_V7lNMYqKkBRj6Fxl_JAXWOi2NZoQAn_ROwauEEdRLLx1ZPSlwww/exec';

// ===============================
// INITIALISATIE
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Controleer login status
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return;
    }

    // 2. Gebruikersnaam instellen
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    // 3. Start onderdelen
    initCalendar();
    loadDataFromSheet();
});

// ===============================
// KALENDER LOGICA
// ===============================
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        eventColor: '#38bdf8',
        displayEventTime: false,
        events: [] // Wordt gevuld door loadDataFromSheet
    });
    window.calendar.render();
}

// ===============================
// DATA OPHALEN (GET)
// ===============================
async function loadDataFromSheet() {
    const tableContainer = document.getElementById('bookingsTableContainer');
    const syncBtn = document.getElementById('syncBtn');
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";

    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        if (!response.ok) throw new Error("Network response was niet ok");
        
        const data = await response.json();
        
        // Filter op rijen die minimaal een naam hebben
        const activeBookings = data.filter(row => (row["Full Name"] || row["Full name"]));

        // UI updaten
        renderTable(activeBookings);
        updateStats(activeBookings);
        populateCalendar(activeBookings);

        // Tijdstip update
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lastSyncEl = document.getElementById('lastSyncTime');
        if (lastSyncEl) lastSyncEl.textContent = `Today at ${timeString}`;

    } catch (error) {
        console.error("Sheet Fetch Error:", error);
        if (tableContainer) {
            tableContainer.innerHTML = `<p style="color:red; padding:20px;">Error syncing data. Check connection.</p>`;
        }
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Refresh Data";
    }
}

// ===============================
// UI RENDERING
// ===============================
function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">No bookings found.</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest Details</th>
                    <th>Package / Experience</th>
                    <th>Guests</th>
                    <th>Special Requests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    bookings.forEach(b => {
        const name = b["Full Name"] || b["Full name"] || "N/A";
        const email = b["Email Address"] || "N/A";
        const phone = b["Phone Number"] || "N/A";
        const date = b["Start Date"] || b["Preferred Start Date"] || "N/A";
        const pkg = b["Choose Your Experience"] || b["Select Your Package"] || "-";
        const guests = b["Number of Guests"] || "1";
        const requests = b["Special Requests"] || "None";

        html += `
            <tr>
                <td><strong>${date}</strong></td>
                <td>
                    <div class="name-cell">${name}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${email} • ${phone}</div>
                </td>
                <td>${pkg}</td>
                <td>${guests}</td>
                <td><div class="request-note" title="${requests}">${requests}</div></td>
                <td><span class="badge badge-confirmed">Confirmed</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function populateCalendar(bookings) {
    if (!window.calendar) return;

    const events = bookings.map(b => {
        const dateStr = b["Start Date"] || b["Preferred Start Date"];
        return {
            title: `${b["Full Name"] || 'Guest'} (${b["Number of Guests"] || 1})`,
            start: dateStr,
            allDay: true,
            extendedProps: {
                package: b["Choose Your Experience"]
            }
        };
    });
    
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(events);
}

function updateStats(bookings) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');

    if (totalBookingsEl) totalBookingsEl.textContent = bookings.length;
    
    let guestCount = 0;
    bookings.forEach(b => {
        const num = parseInt(b["Number of Guests"]);
        guestCount += isNaN(num) ? 1 : num;
    });
    
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
}

// ===============================
// AVAILABILITY OPSLAAN (POST)
// ===============================
async function updateAvailability(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveAvailBtn');
    const originalText = saveBtn.innerText;
    
    const availabilityData = {
        startDate: document.getElementById('availStart').value,
        endDate: document.getElementById('availEnd').value,
        status: document.getElementById('availStatus').value,
        partner: localStorage.getItem("userName") || "Unknown Partner"
    };

    if (!availabilityData.startDate || !availabilityData.endDate) {
        alert("Please select both dates.");
        return;
    }

    try {
        saveBtn.innerText = "⏳ Saving...";
        saveBtn.disabled = true;

        await fetch(SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(availabilityData)
        });

        showToast("✅ Availability updated in Google Sheet!");
        event.target.reset();

    } catch (error) {
        console.error("Save error:", error);
        alert("Error saving availability.");
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

// Helper: Toast melding
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
}

// Uitlog functie
function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
}
