/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Hersteld: Menu-functionaliteit voor Desktop & Mobiel
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzQ1ZRCue9z1sehve_V7lNMYqKkBRj6Fxl_JAXWOi2NZoQAn_ROwauEEdRLLx1ZPSlwww/exec';

// ===============================
// INITIALISATIE
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Beveiliging check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    } else {
        window.location.href = "index.html";
        return;
    }

    // 2. Welkomsttekst & UI
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeHeader = document.getElementById('welcomeText');
    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${partnerName}`;

    // 3. Maak de showSection functie globaal beschikbaar voor de onclick events
    window.showSection = (sectionId, element) => {
        // Verberg alle secties
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        // Deactiveer alle menu items
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        // Toon geselecteerde sectie
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');
        
        // Markeer menu item als actief
        if (element) element.classList.add('active');
        
        // Sluit sidebar op mobiel na klik
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        
        // Herteken kalender indien nodig
        if(sectionId === 'overview' && window.calendar) {
            setTimeout(() => { window.calendar.render(); }, 100);
        }
    };

    // 4. Mobiele Sidebar Toggle
    window.toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    };

    // 5. Start onderdelen
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
        events: [] 
    });
    window.calendar.render();
}

// ===============================
// DATA OPHALEN & RENDERING
// ===============================
async function loadDataFromSheet() {
    const tableContainer = document.getElementById('bookingsTableContainer');
    const syncBtn = document.getElementById('syncBtn');
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";

    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        const activeBookings = data.filter(row => (row["Full Name"] || row["Full name"]));

        renderTable(activeBookings);
        updateStats(activeBookings);
        populateCalendar(activeBookings);

        const lastSyncEl = document.getElementById('lastSyncTime');
        if (lastSyncEl) {
            const now = new Date();
            lastSyncEl.textContent = `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    } catch (error) {
        console.error("Fetch error:", error);
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
    }
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    const formatDisplayDate = (dateStr) => {
        if (!dateStr || dateStr === "N/A") return "N/A";
        try {
            const dateObj = new Date(dateStr);
            return isNaN(dateObj.getTime()) ? dateStr : dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return dateStr; }
    };

    let html = `<table><thead><tr><th>Date</th><th>Guest</th><th>Experience</th><th>Guests</th><th>Requests</th><th>Status</th></tr></thead><tbody>`;

    bookings.forEach(b => {
        const name = b["Full Name"] || b["Full name"] || "N/A";
        const email = b["Email Address"] || "";
        const rawDate = b["Start Date"] || b["Preferred Start Date"] || "N/A";
        const pkg = b["Choose Your Experience"] || b["Select Your Package"] || "-";
        const guests = b["Number of Guests"] || "1";
        const requests = b["Special Requests"] || "None";

        html += `
            <tr>
                <td data-label="Date"><strong>${formatDisplayDate(rawDate)}</strong></td>
                <td data-label="Guest">
                    <div style="font-weight:700;">${name}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${email}</div>
                </td>
                <td data-label="Experience">${pkg}</td>
                <td data-label="Guests">${guests}</td>
                <td data-label="Requests">${requests}</td>
                <td data-label="Status"><span class="badge-confirmed">Confirmed</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===============================
// STATS & UTILS
// ===============================
function populateCalendar(bookings) {
    if (!window.calendar) return;
    const events = bookings.map(b => ({
        title: `${b["Full Name"] || 'Guest'} (${b["Number of Guests"] || 1})`,
        start: b["Start Date"] || b["Preferred Start Date"],
        allDay: true
    }));
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

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
}
