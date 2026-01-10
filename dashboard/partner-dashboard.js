/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Geoptimaliseerd voor travelbeyondthepitch.com/dashboard/
 * Focus: Mobile Responsiveness & Date Formatting
 */

// ===============================
// CONFIGURATIE
// ===============================
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

    // 2. Welkomsttekst
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
        events: [] 
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
        if (!response.ok) throw new Error("Network response error");
        
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
        console.error("Sheet Fetch Error:", error);
        if (tableContainer) {
            tableContainer.innerHTML = `<p style="color:#ef4444; padding:20px; text-align:center;">⚠️ Error syncing data.</p>`;
        }
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Refresh Data";
    }
}

// ===============================
// UI RENDERING (MOBILE READY)
// ===============================
function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">No bookings found for your account.</p>';
        return;
    }

    const formatDisplayDate = (dateStr) => {
        if (!dateStr || dateStr === "N/A") return "N/A";
        try {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return dateStr; 
            return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return dateStr; }
    };

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest Details</th>
                    <th>Experience</th>
                    <th>Guests</th>
                    <th>Requests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    bookings.forEach(b => {
        const name = b["Full Name"] || b["Full name"] || "N/A";
        const email = b["Email Address"] || "";
        const phone = b["Phone Number"] || "";
        const rawDate = b["Start Date"] || b["Preferred Start Date"] || "N/A";
        const cleanDate = formatDisplayDate(rawDate);
        const pkg = b["Choose Your Experience"] || b["Select Your Package"] || "-";
        const guests = b["Number of Guests"] || "1";
        const requests = b["Special Requests"] || "None";

        // De data-label attributen hieronder zijn cruciaal voor de mobiele weergave
        html += `
            <tr>
                <td data-label="Date"><strong style="color: #1e293b;">${cleanDate}</strong></td>
                <td data-label="Guest">
                    <div style="font-weight:700; color:#1e293b;">${name}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${email} ${phone ? '• ' + phone : ''}</div>
                </td>
                <td data-label="Experience">${pkg}</td>
                <td data-label="Guests"><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px;">${guests}</span></td>
                <td data-label="Requests">
                    <div style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.8rem;" title="${requests}">
                        ${requests}
                    </div>
                </td>
                <td data-label="Status"><span class="badge badge-confirmed">Confirmed</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===============================
// OVERIGE FUNCTIES
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

async function updateAvailability(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('saveAvailBtn');
    const originalText = saveBtn.innerText;

    const formatDateForSheet = (dateStr) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };
    
    const availabilityData = {
        startDate: formatDateForSheet(document.getElementById('availStart').value),
        endDate: formatDateForSheet(document.getElementById('availEnd').value),
        status: document.getElementById('availStatus').value,
        partner: localStorage.getItem("userName") || "Global Partner"
    };

    if (!document.getElementById('availStart').value || !document.getElementById('availEnd').value) {
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
        showToast("✅ Availability synced!");
        event.target.reset();
    } catch (error) {
        alert("Error saving availability.");
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
}
