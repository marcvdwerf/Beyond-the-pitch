// --- CONFIGURATIE ---
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdEZfxOmj9Hsnxz7-xQGhQc4Z88lTATYSSPK6-uzod_qeSICQ/formResponse';

const PARTNER_CONTENT = {
    "lima": { name: "Peru (Lima)", color: "#38bdf8", packages: [{ title: "Alianza Lima Experience", price: "€120", desc: "Local food & Match ticket" }] },
    "ireland": { name: "Ireland", color: "#10b981", packages: [{ title: "GAA Hurling Masterclass", price: "€45", desc: "Full club immersion" }] }
};

const GAA_MATCHES = [
    { teams: 'Kilkenny vs Wexford', date: '2026-05-10', location: 'Nowlan Park' },
    { teams: 'Limerick vs Clare', date: '2026-05-17', location: 'TUS Gaelic Grounds' }
];

let currentBookings = [];
let calendar;

// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', () => {
    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    setupTheme(partnerID);
    initCalendar(partnerID);
    loadDataFromSheet();
    renderPackages(partnerID);
});

function setupTheme(id) {
    const partner = PARTNER_CONTENT[id] || PARTNER_CONTENT.lima;
    document.getElementById('welcomeText').textContent = `Hello, ${partner.name} 👋`;
    if(id === 'ireland') {
        document.body.classList.add('theme-ireland');
        document.querySelectorAll('.hurling-only').forEach(el => el.style.display = 'flex');
        renderHurlingMatches();
    }
}

// --- DATA FETCHING ---
async function loadDataFromSheet() {
    const btn = document.getElementById('syncBtn');
    btn.textContent = "⏳ Syncing...";
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        const myPartnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();

        // Filter en sorteer op datum
        currentBookings = data
            .filter(row => String(row["Partner"] || "").toLowerCase().includes(myPartnerID))
            .sort((a, b) => new Date(formatDate(b["Start Date"])) - new Date(formatDate(a["Start Date"])));

        updateUI();
    } catch (e) {
        console.error("Sync Error:", e);
        document.getElementById('bookingsTableContainer').innerHTML = "⚠️ Error loading data.";
    } finally {
        btn.textContent = "🔄 Sync Data";
    }
}

// --- UI UPDATES ---
function updateUI() {
    renderTable();
    updateStats();
    updateCalendar();
}

function renderTable() {
    const container = document.getElementById('bookingsTableContainer');
    if (currentBookings.length === 0) {
        container.innerHTML = "No bookings found.";
        return;
    }

    let html = `<table><thead><tr><th>Date</th><th>Guest Name</th><th>Experience</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;
    currentBookings.forEach(b => {
        html += `
            <tr>
                <td><strong>${b["Start Date"] || 'TBD'}</strong></td>
                <td>${b["Full Name"] || 'Unknown'}</td>
                <td>${b["Experience"] || 'Standard Tour'}</td>
                <td><span class="badge">${b["Guests"] || '1'} Persons</span></td>
                <td><span class="badge" style="background:#dcfce7; color:#166534;">Confirmed</span></td>
            </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function updateStats() {
    document.getElementById('totalBookings').textContent = currentBookings.length;
    const guests = currentBookings.reduce((sum, b) => sum + (parseInt(b["Guests"]) || 1), 0);
    document.getElementById('totalGuests').textContent = guests;
}

// --- HELPER FUNCTIONS ---
function formatDate(dateStr) {
    if(!dateStr) return new Date();
    // Als datum DD-MM-YYYY is, maak er YYYY-MM-DD van voor JS compatibility
    const parts = dateStr.split('-');
    if(parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

function initCalendar(partnerID) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
        height: 600,
        eventColor: partnerID === 'ireland' ? '#10b981' : '#38bdf8'
    });
    calendar.render();
}

function updateCalendar() {
    calendar.removeAllEvents();
    const events = currentBookings.map(b => ({
        title: `${b["Full Name"]} (${b["Guests"]})`,
        start: formatDate(b["Start Date"]),
        allDay: true
    }));
    calendar.addEventSource(events);
}

function showSection(id, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    if(id === 'overview') {
        setTimeout(() => calendar.updateSize(), 100);
    }
}

// --- EXPORT & SPECIALS ---
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(currentBookings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, `BTP_Bookings_${new Date().toLocaleDateString()}.xlsx`);
}

function renderPackages(id) {
    const grid = document.getElementById('dynamicPackagesGrid');
    const partner = PARTNER_CONTENT[id] || PARTNER_CONTENT.lima;
    grid.innerHTML = partner.packages.map(p => `
        <div class="stat-card">
            <h3 style="margin-bottom:10px;">${p.title}</h3>
            <p style="color:#64748b; font-size:0.9rem;">${p.desc}</p>
            <div style="margin-top:15px; font-weight:800; color:var(--primary);">${p.price}</div>
        </div>
    `).join('');
}

function renderHurlingMatches() {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = GAA_MATCHES.map(m => `
        <div class="stat-card">
            <h3 style="margin-bottom:5px;">${m.teams}</h3>
            <p style="color:#64748b; font-size:0.85rem;">📍 ${m.location}</p>
            <p style="margin: 10px 0; font-weight:600;">📅 ${m.date}</p>
            <button class="btn btn-primary" onclick="alert('Booking request sent for ${m.teams}')" style="width:100%;">Book Ticket</button>
        </div>
    `).join('');
}
