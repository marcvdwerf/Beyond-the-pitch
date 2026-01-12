/**
 * Beyond the Pitch - Partner Dashboard Logic
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

// MAAK NAVIGATIE GLOBAL (zodat het menu werkt)
window.showSection = (sectionId, element) => {
    console.log("Schakelen naar sectie:", sectionId);
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    if (element) element.classList.add('active');
    
    if(sectionId === 'overview' && window.calendar) {
        setTimeout(() => window.calendar.render(), 100);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard initialiseren...");

    // 1. Check Autorisatie
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

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
    const tableContainer = document.getElementById('bookingsTableContainer');
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    
    const partnerID = localStorage.getItem("partnerID") || "all";
    console.log("Data ophalen voor ID:", partnerID);
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        
        if (!response.ok) throw new Error("Netwerk respons was niet ok");
        
        const data = await response.json();
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        console.log("Boekingen geladen:", bookings.length);

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        const syncTimeEl = document.getElementById('lastSyncTime');
        if (syncTimeEl) {
            syncTimeEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e);
        if (tableContainer) tableContainer.innerHTML = `<p style="color:red; padding:20px;">Connection Error: Please check your Google Script URL and permissions.</p>`;
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

    let html = `<table><thead><tr><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No bookings found for ${localStorage.getItem("partnerID")}.</td></tr>`;
    } else {
        bookings.forEach(b => {
            const name = b["Full Name"] || b["Full name"] || "-";
            const pkg = b["Choose Your Experience"] || b["Experience"] || "-"; 
            const guests = b["Number of Guests"] || b["Guests"] || "1";
            const date = b["Start Date"] || b["Date"] || "-";

            html += `<tr>
                <td><strong>${formatD(date)}</strong></td>
                <td>${name}</td>
                <td>${pkg}</td>
                <td>${guests}</td>
                <td><span class="badge-confirmed">Confirmed</span></td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStats(b) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');
    if (totalBookingsEl) totalBookingsEl.textContent = b.length;
    let count = 0;
    b.forEach(x => {
        count += parseInt(x["Number of Guests"] || x["Guests"]) || 1;
    });
    if (totalGuestsEl) totalGuestsEl.textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    const events = b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Number of Guests"] || 1})`,
        start: x["Start Date"] || x["Date"],
        allDay: true
    })).filter(event => event.start);
    window.calendar.addEventSource(events);
}
