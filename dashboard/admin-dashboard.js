const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

let revenueChart = null;
let allBookings = []; // Buffer voor lokale filtering

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return; 
    }
    
    document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-GB', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    initCalendar();
    loadAdminData();
});

async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        allBookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);

    } catch (e) { console.error("Error:", e); }
    finally { if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; }
}

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    let html = `<table class="admin-table"><thead><tr><th>Partner</th><th>Date</th><th>Guest</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;
    
    bookings.forEach(b => {
        const rawDate = b["Start Date"] || b["Date"];
        const dateObj = new Date(rawDate);
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

        html += `<tr>
            <td><span class="badge-partner">${b["Partner"] || b["PartnerID"] || "Lima"}</span></td>
            <td><strong>${formattedDate}</strong></td>
            <td><strong>${b["Full Name"] || b["Full name"]}</strong></td>
            <td>${b["Number of Guests"] || 1}</td>
            <td><span class="badge-status status-confirmed">Confirmed</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterByTime(period, btn) {
    // UI Update
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const now = new Date();
    const startOfToday = new Date(now.setHours(0,0,0,0));
    
    let filtered = allBookings.filter(b => {
        const bDate = new Date(b["Start Date"] || b["Date"]);
        if (period === 'today') return bDate.toDateString() === new Date().toDateString();
        if (period === 'week') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return bDate >= startOfToday && bDate <= nextWeek;
        }
        if (period === 'month') return bDate.getMonth() === new Date().getMonth() && bDate.getFullYear() === new Date().getFullYear();
        return true;
    });

    renderAdminTable(filtered);
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    const events = b.map(x => {
        const d = x["Start Date"] || x["Date"];
        return {
            title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
            start: d ? d.substring(0,10) : null,
            allDay: true
        };
    }).filter(e => e.start);
    window.calendar.addEventSource(events);
}

function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    const monthlyData = {};
    const labels = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const m = d.toLocaleString('en-GB', { month: 'short' });
        labels.push(m); monthlyData[m] = 0;
    }
    bookings.forEach(b => {
        const d = new Date(b["Start Date"] || b["Date"]);
        const m = d.toLocaleString('en-GB', { month: 'short' });
        if (monthlyData.hasOwnProperty(m)) monthlyData[m] += (parseInt(b["Number of Guests"]) || 1) * 75;
    });
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue', data: labels.map(l => monthlyData[l]), borderColor: '#c5a059', fill: true, backgroundColor: 'rgba(197,160,89,0.1)', tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let g = 0; let r = 0; const p = new Set();
    b.forEach(x => {
        const pax = parseInt(x["Number of Guests"]) || 1;
        g += pax; r += (pax * 75);
        p.add(x["Partner"] || x["PartnerID"]);
    });
    document.getElementById('totalGuests').textContent = g;
    document.getElementById('totalRevenue').textContent = `€${r}`;
    document.getElementById('activePartners').textContent = p.size;
}

function initCalendar() {
    const el = document.getElementById('calendar');
    if (!el) return;
    window.calendar = new FullCalendar.Calendar(el, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' }, eventColor: '#c5a059' });
    window.calendar.render();
}

function togglePartnerForm() {
    const f = document.getElementById('addPartnerForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    c.innerHTML = "Loading...";
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const p = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>User</th><th>ID</th></tr></thead><tbody>`;
        p.forEach(x => h += `<tr><td>${x.name}</td><td>${x.email}</td><td><span class="badge-partner">${x.partnerID}</span></td></tr>`);
        c.innerHTML = h + `</tbody></table>`;
    } catch (e) { c.innerHTML = "Error."; }
}

async function submitNewPartner() {
    const name = document.getElementById('p_name').value;
    const user = document.getElementById('p_user').value;
    const pass = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;
    if(!name || !user || !pass || !id) return alert("Fill all fields");
    try {
        await fetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&partnerID=${encodeURIComponent(id)}`, { redirect: 'follow' });
        alert("Partner added!"); togglePartnerForm(); loadPartnerList();
    } catch (e) { alert("Partner added!"); loadPartnerList(); }
}

window.showSection = (sId, el) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sId).classList.add('active');
    if (el) el.classList.add('active');
    if (sId === 'partners') loadPartnerList();
    if (sId === 'overview' && window.calendar) setTimeout(() => window.calendar.render(), 150);
};
