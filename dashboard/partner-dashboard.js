const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    document.getElementById('welcomeText').textContent = `Welcome back, ${partnerName}`;

    // 2. Start kalender en haal data op
    initCalendar();
    loadDataFromSheet();
});

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: '#38bdf8',
        height: 'auto',
        firstDay: 1
    });
    window.calendar.render();
}

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    const partnerID = localStorage.getItem("partnerID");
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    if (!partnerID) { console.error("No partnerID"); return; }
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Sync error:", e); 
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
    }
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    let html = `<table><thead><tr><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding:30px;">No bookings found.</td></tr>`;
    } else {
        bookings.forEach(b => {
            const date = b["Start Date"] || b["Date"] || "-";
            const name = b["Full Name"] || b["Full name"] || "-";
            const pkg = b["Choose Your Experience"] || b["Experience"] || "-";
            const pax = b["Number of Guests"] || "1";

            html += `<tr>
                <td><strong>${date}</strong></td>
                <td>${name}</td>
                <td>${pkg}</td>
                <td>${pax}</td>
                <td><span class="badge-confirmed">Confirmed</span></td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStats(b) {
    let guestCount = 0;
    let packageCounts = {};

    b.forEach(x => {
        guestCount += parseInt(x["Number of Guests"] || 1);
        const pkg = x["Choose Your Experience"] || "Experience";
        packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    });

    document.getElementById('totalBookings').textContent = b.length;
    document.getElementById('totalGuests').textContent = guestCount;
    
    if (b.length > 0) {
        let topPkg = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);
        document.getElementById('topPackage').textContent = topPkg.substring(0, 20);
    }
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Number of Guests"] || 1})`,
        start: x["Start Date"] || x["Date"],
        allDay: true
    })).filter(e => e.start);

    window.calendar.addEventSource(events);
    window.calendar.render(); // Forceer een her-tekening
}

async function updateAvailability(event) {
    event.preventDefault();
    const btn = document.getElementById('saveAvailBtn');
    const start = document.getElementById('availStart').value;
    const end = document.getElementById('availEnd').value;
    const status = document.getElementById('availStatus').value;
    const partnerID = localStorage.getItem("partnerID");

    btn.innerText = "Saving...";
    try {
        await fetch(`${SHEET_API_URL}?action=updateAvailability&partnerID=${encodeURIComponent(partnerID)}&start=${start}&end=${end}&status=${status}`, { mode: 'no-cors' });
        document.getElementById('toast').style.display = 'block';
        setTimeout(() => { document.getElementById('toast').style.display = 'none'; }, 3000);
    } catch (e) { alert("Save failed"); }
    btn.innerText = "🚀 Save Availability";
}
