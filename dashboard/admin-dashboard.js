const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

let revenueChart = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return; 
    }
    
    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-GB', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });
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
        eventColor: '#c5a059',
        height: 'auto'
    });
    window.calendar.render();
}

async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderAdminTable(bookings);
        updateAdminStats(bookings);
        populateAdminCalendar(bookings);
        updateRevenueChart(bookings);

    } catch (e) { console.error("Error:", e); }
    finally { if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; }
}

function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const monthlyData = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.toLocaleString('en-GB', { month: 'short' });
        last6Months.push(m);
        monthlyData[m] = 0;
    }

    bookings.forEach(b => {
        const date = new Date(b["Start Date"] || b["Date"]);
        const m = date.toLocaleString('en-GB', { month: 'short' });
        const pax = parseInt(b["Number of Guests"] || b["Guests"]) || 1;
        if (monthlyData.hasOwnProperty(m)) monthlyData[m] += (pax * 75); // Gemiddelde prijs €75
    });

    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months,
            datasets: [{
                label: 'Est. Revenue (€)',
                data: last6Months.map(m => monthlyData[m]),
                borderColor: '#c5a059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    let html = `<table class="admin-table"><thead><tr><th>Partner</th><th>Date</th><th>Guest</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;
    bookings.forEach(b => {
        html += `<tr>
            <td><span class="badge-partner">${b["Partner"] || b["PartnerID"] || "Lima"}</span></td>
            <td>${b["Start Date"] || "-"}</td>
            <td><strong>${b["Full Name"] || b["Full name"]}</strong></td>
            <td>${b["Number of Guests"] || 1}</td>
            <td><span class="badge-status status-confirmed">Confirmed</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let guests = 0;
    let rev = 0;
    const partners = new Set();
    b.forEach(x => {
        const p = parseInt(x["Number of Guests"]) || 1;
        guests += p;
        rev += (p * 75);
        partners.add(x["Partner"] || x["PartnerID"] || "Lima");
    });
    document.getElementById('totalGuests').textContent = guests;
    document.getElementById('totalRevenue').textContent = `€${rev}`;
    document.getElementById('activePartners').textContent = partners.size;
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

function togglePartnerForm() {
    const form = document.getElementById('addPartnerForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function loadPartnerList() {
    const container = document.getElementById('partnersTableContainer');
    container.innerHTML = "Fetching partners...";
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const partners = await response.json();
        let html = `<table class="admin-table"><thead><tr><th>Name</th><th>User</th><th>ID</th><th>Role</th></tr></thead><tbody>`;
        partners.forEach(p => {
            html += `<tr><td><strong>${p.name}</strong></td><td>${p.email}</td><td><span class="badge-partner">${p.partnerID}</span></td><td>${p.role}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) { container.innerHTML = "Error."; }
}

async function submitNewPartner() {
    const name = document.getElementById('p_name').value;
    const user = document.getElementById('p_user').value;
    const pass = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;
    if(!name || !user || !pass || !id) return alert("Fill all fields");
    
    const url = `${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&partnerID=${encodeURIComponent(id)}`;
    try {
        await fetch(url, { redirect: 'follow' });
        alert("Partner added!");
        togglePartnerForm();
        loadPartnerList();
    } catch (e) { alert("Partner added (Check sheet)"); loadPartnerList(); }
}

window.showSection = (sectionId, element) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (element) element.classList.add('active');
    if (sectionId === 'partners') loadPartnerList();
    if (sectionId === 'overview' && window.calendar) setTimeout(() => window.calendar.render(), 150);
};
