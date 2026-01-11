/**
 * Beyond the Pitch - Partner Dashboard Logic (Fase 2)
 * Gekoppeld aan Master Sheet API met filtering per partner
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzQ1ZRCue9z1sehve_V7lNMYqKkBRj6Fxl_JAXWOi2NZoQAn_ROwauEEdRLLx1ZPSlwww/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Autorisatie (Mag zowel partner als admin zijn)
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    document.getElementById('welcomeText').textContent = `Welcome back, ${partnerName}`;

    // 2. Navigatie logica
    window.showSection = (sectionId, element) => {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        if (element) element.classList.add('active');
        document.getElementById('sidebar').classList.remove('open');
        
        // Render kalender opnieuw bij switchen naar overview
        if(sectionId === 'overview' && window.calendar) {
            setTimeout(() => window.calendar.render(), 100);
        }
    };

    initCalendar();
    loadDataFromSheet();
});

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: '#38bdf8'
    });
    window.calendar.render();
}

/**
 * Haalt data op uit Master Sheet gefilterd op PartnerID
 */
async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    
    // Haal het unieke PartnerID op dat tijdens login in localStorage is gezet
    const partnerID = localStorage.getItem("partnerID") || "all";
    
    try {
        // We sturen de partnerID mee als parameter naar de Google Apps Script API
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Zorg dat we een array hebben om mee te werken
        const bookings = Array.isArray(data) ? data : [];

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        const lastSyncEl = document.getElementById('lastSyncTime');
        if (lastSyncEl) {
            lastSyncEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    } catch (e) { 
        console.error("Fout bij ophalen data:", e); 
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync Data";
    }
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    const formatD = (d) => {
        if (!d || d === "N/A") return "-";
        const dateObj = new Date(d);
        return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:20px;">No bookings found for this partner.</td></tr>`;
    } else {
        bookings.forEach(b => {
            // Kolomnamen moeten exact overeenkomen met de headers in je Master Sheet
            const name = b["Full Name"] || "-";
            const pkg = b["Experience"] || "-"; 
            const guests = b["Guests"] || "1";

            html += `<tr>
                <td data-label="Date"><strong>${formatD(b["Start Date"])}</strong></td>
                <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${b["Email Address"] || ''}</div></td>
                <td data-label="Experience" style="max-width:150px; font-size:0.8rem;">${pkg}</td>
                <td data-label="Pax"><strong>${guests}</strong></td>
                <td data-label="Requests" style="font-size:0.75rem; color:#64748b;">${b["Special Requests"] || '-'}</td>
                <td data-label="Status"><span class="badge-confirmed">Confirmed</span></td>
            </tr>`;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let count = 0;
    b.forEach(x => {
        const num = parseInt(x["Guests"]) || 1;
        count += num;
    });
    document.getElementById('totalGuests').textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Guests"] || 1})`,
        start: x["Start Date"],
        allDay: true
    })));
}
