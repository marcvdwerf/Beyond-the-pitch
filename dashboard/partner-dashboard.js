const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdEZfxOmj9Hsnxz7-xQGhQc4Z88lTATYSSPK6-uzod_qeSICQ/formResponse';

const PARTNER_CONTENT = {
    "lima": { name: "Lima", packages: [{ title: "Full Day - Hidden Spots", price: "€120", desc: "City tour & Alianza match", features: ["Tickets", "Guide"] }] },
    "ireland": { name: "Ireland", packages: [{ title: "Hurling Masterclass", price: "€45", desc: "Local club experience", features: ["Hurling kit", "Match entry"] }] }
};

const GAA_MATCHES = [
    { id: 1, date: '2026-05-10', teams: 'Kilkenny vs Wexford' },
    { id: 2, date: '2026-05-17', teams: 'Limerick vs Clare' }
];

let currentBookings = [];

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    
    if(partnerID === 'ireland') {
        document.body.classList.add('theme-ireland');
        document.querySelectorAll('.hurling-only').forEach(el => el.style.display = 'flex');
        loadHurlingMatches();
    }

    renderPackages(partnerID);
    initCalendar(partnerID);
    loadDataFromSheet();
    document.getElementById('welcomeText').textContent = `Welcome, ${partnerID.toUpperCase()}`;
});

async function loadDataFromSheet() {
    const myPartnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    try {
        const resp = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await resp.json();
        currentBookings = data.filter(row => String(row["Partner"]).toLowerCase().includes(myPartnerID));
        renderTable(currentBookings);
        updateStats(currentBookings);
        populateCalendar(currentBookings);
    } catch(e) { console.error(e); }
}

function renderTable(data) {
    const container = document.getElementById('bookingsTableContainer');
    let html = '<table><thead><tr><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th></tr></thead><tbody>';
    data.forEach(b => {
        html += `<tr><td>${b["Start Date"]}</td><td>${b["Full Name"]}</td><td>${b["Experience"]}</td><td>${b["Guests"]}</td></tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(currentBookings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, `BeyondPitch_Export.xlsx`);
}

function renderPackages(id) {
    const grid = document.getElementById('dynamicPackagesGrid');
    const content = PARTNER_CONTENT[id] || PARTNER_CONTENT.lima;
    grid.innerHTML = content.packages.map(p => `
        <div class="package-card"><div class="package-header">${p.title}</div>
        <div class="package-body"><p>${p.desc}</p><strong>${p.price}</strong></div></div>
    `).join('');
}

function loadHurlingMatches() {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = GAA_MATCHES.map(m => `
        <div class="package-card"><div class="package-header">${m.teams}</div>
        <div class="package-body"><p>${m.date}</p><button onclick="bookMatch('${m.teams}', '${m.date}')" class="btn btn-primary" style="width:100%; margin-top:10px;">Book Match</button></div></div>
    `).join('');
}

async function bookMatch(teams, date) {
    const formData = new URLSearchParams();
    formData.append('entry.761572476', `PARTNER_${localStorage.getItem("partnerID").toUpperCase()}`);
    formData.append('entry.1446094233', `Hurling: ${teams}`);
    formData.append('entry.301148404', date);
    formData.append('entry.175134312', '1');
    await fetch(FORM_URL, { method: 'POST', mode: 'no-cors', body: formData });
    alert("Match added!");
    loadDataFromSheet();
}

function initCalendar(id) {
    window.calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        eventColor: id === 'ireland' ? '#10b981' : '#38bdf8'
    });
    window.calendar.render();
}

function updateStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let g = 0; b.forEach(x => g += (parseInt(x.Guests) || 1));
    document.getElementById('totalGuests').textContent = g;
}

function populateCalendar(b) {
    window.calendar.removeAllEvents();
    const events = b.map(x => ({ title: x["Full Name"], start: x["Start Date"], allDay: true }));
    window.calendar.addEventSource(events);
}

function showSection(id, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
}
