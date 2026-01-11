/**
 * Beyond the Pitch - Admin Dashboard Logic
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbw0_gnWADW3vzCYhNIbpsfs_eClptWnpfl2wWz7VIxLbbttQK66HQP7IQ8tMo8CmXwPzw/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Forceer Admin Check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return; 
    }

    initCalendar();
    loadAdminData();
});

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: '#1e293b' // Donkere kleur voor Admin
    });
    window.calendar.render();
}

async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    
    try {
        // De Admin vraagt altijd om partnerID="all" of een specifieke partner
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderAdminTable(bookings);
        updateAdminStats(bookings);
        populateAdminCalendar(bookings);

    } catch (e) {
        console.error("Admin Fetch Error:", e);
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync All";
    }
}

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!container) return;

    let html = `<table><thead><tr>
        <th>Partner</th><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding:20px;">No data found.</td></tr>`;
    } else {
        bookings.forEach(b => {
            // Kolom A in je Master Sheet moet de Partner naam bevatten!
            const partner = b["Partner"] || b["PartnerID"] || "Unknown"; 
            const name = b["Full Name"] || b["Full name"] || "-";
            const date = b["Start Date"] || "-";
            const pkg = b["Choose Your Experience"] || "-";

            html += `<tr>
                <td><span class="badge-partner">${partner}</span></td>
                <td>${date}</td>
                <td><strong>${name}</strong></td>
                <td>${pkg}</td>
                <td>${b["Number of Guests"] || 1}</td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let guests = 0;
    b.forEach(x => guests += parseInt(x["Number of Guests"]) || 1);
    document.getElementById('totalGuests').textContent = guests;
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
        start: x["Start Date"],
        allDay: true
    })));
}

window.showSection = (sectionId, element) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (element) element.classList.add('active');
};
