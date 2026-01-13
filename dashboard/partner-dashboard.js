/**
 * Beyond the Pitch - Partner Dashboard Logic
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

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
        document.getElementById('sidebar').classList.remove('open');
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
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        const bookings = data.filter(row => row["Full Name"] || row["Full name"]);

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { console.error(e); }
    if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
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
        const name = b["Full Name"] || b["Full name"] || "-";
        const pkg = b["Choose Your Experience"] || b["Select Your Package"] || "-";
        const guests = b["Number of Guests"] || "1";

        html += `<tr>
            <td data-label="Date"><strong>${formatD(b["Start Date"] || b["Preferred Start Date"])}</strong></td>
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
    b.forEach(x => count += parseInt(x["Number of Guests"]) || 1);
    document.getElementById('totalGuests').textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Number of Guests"] || 1})`,
        start: x["Start Date"] || x["Preferred Start Date"],
        allDay: true
    })));
}


