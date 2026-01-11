/**
 * Beyond the Pitch - Partner Dashboard Logic (Fase 2 - Gelijkgetrokken)
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbw0_gnWADW3vzCYhNIbpsfs_eClptWnpfl2wWz7VIxLbbttQK66HQP7IQ8tMo8CmXwPzw/exec';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    document.getElementById('welcomeText').textContent = `Welcome back, ${partnerName}`;

    window.showSection = (sectionId, element) => {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        if (element) element.classList.add('active');
        if(sectionId === 'overview' && window.calendar) setTimeout(() => window.calendar.render(), 100);
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

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    
    const partnerID = localStorage.getItem("partnerID") || "all";
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op rijen die een naam hebben
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"]) : [];

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Fout:", e); 
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

    bookings.forEach(b => {
        // HIER WORDEN DE KOLOMNAMEN GEMATCHT MET JE SCREENSHOTS
        const name = b["Full Name"] || "-";
        const pkg = b["Choose Your Experience"] || "-"; 
        const guests = b["Number of Guests"] || "1";
        const date = b["Start Date"] || "-";

        html += `<tr>
            <td data-label="Date"><strong>${formatD(date)}</strong></td>
            <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${b["Email Address"] || ''}</div></td>
            <td data-label="Experience" style="max-width:150px; font-size:0.8rem;">${pkg}</td>
            <td data-label="Pax"><strong>${guests}</strong></td>
            <td data-label="Requests" style="font-size:0.75rem; color:#64748b;">${b["Special Requests"] || '-'}</td>
            <td data-label="Status"><span class="badge-confirmed">Confirmed</span></td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let count = 0;
    b.forEach(x => {
        count += parseInt(x["Number of Guests"]) || 1;
    });
    document.getElementById('totalGuests').textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Number of Guests"] || 1})`,
        start: x["Start Date"],
        allDay: true
    })));
}
