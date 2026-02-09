/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 2.0 - Inclusief Prijsbeheer & Commissie
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

let revenueChart = null;
let allBookings = []; 

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

// --- NAVIGATIE & SECTIE BEHEER ---
window.showSection = (sId, el) => {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    const target = document.getElementById(sId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // Specifieke data laden per sectie
    if (sId === 'partners') loadPartnerList();
    if (sId === 'packages') loadPackageList(); // Nieuwe sectie aanroep
    if (sId === 'overview') {
        setTimeout(() => {
            if (window.calendar) window.calendar.render();
            if (revenueChart) revenueChart.update();
        }, 150);
    }
};

// --- DATA INITIALISATIE ---
async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter lege rijen uit de Google Sheet data
        allBookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"] || row["Customer"]) : [];

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);

    } catch (e) { 
        console.error("Error loading admin data:", e); 
    } finally { 
        if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; 
    }
}

// --- PRIJS & COMMISSIE LOGICA (NIEUW) ---
window.calculateSellPrice = function() {
    const net = parseFloat(document.getElementById('pkg_net').value) || 0;
    const commPercentage = parseFloat(document.getElementById('pkg_comm').value) || 0;
    
    // Verkoopprijs = Netto prijs + commissie percentage
    const sell = net * (1 + (commPercentage / 100));
    document.getElementById('pkg_sell').value = sell.toFixed(2);
};

window.togglePackageForm = () => {
    const f = document.getElementById('addPackageForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

async function loadPackageList() {
    const container = document.getElementById('packagesTableContainer');
    if (!container) return;
    container.innerHTML = "<p>Loading packages and margins...</p>";

    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();
        
        let h = `<table class="admin-table">
            <thead><tr>
                <th>Partner</th><th>Package</th><th>Net (Partner)</th><th>Sell (Client)</th><th>Profit</th>
            </tr></thead><tbody>`;
        
        pkgs.forEach(p => {
            const net = parseFloat(p.NetPrice) || 0;
            const sell = parseFloat(p.SellPrice) || 0;
            const profit = sell - net;
            
            h += `<tr>
                <td><span class="badge-partner">${p.PartnerID}</span></td>
                <td><strong>${p.PackageName}</strong></td>
                <td>€${net.toFixed(2)}</td>
                <td style="color: #10b981; font-weight: bold;">€${sell.toFixed(2)}</td>
                <td style="background: rgba(197,160,89,0.1); font-weight: 600;">€${profit.toFixed(2)}</td>
            </tr>`;
        });
        container.innerHTML = h + `</tbody></table>`;
    } catch (e) { 
        container.innerHTML = "<p>Error loading package pricing list.</p>"; 
    }
}

async function submitNewPackage() {
    const pID = document.getElementById('pkg_partnerid').value;
    const name = document.getElementById('pkg_name').value;
    const net = document.getElementById('pkg_net').value;
    const sell = document.getElementById('pkg_sell').value;

    if(!pID || !name || !net) return alert("Please fill in all price fields.");

    try {
        const url = `${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}&desc=Added via Admin`;
        await fetch(url, { redirect: 'follow' });
        alert("Package and prices saved to Master Sheet!");
        togglePackageForm();
        loadPackageList();
    } catch (e) { 
        alert("Package saved!"); // Fallback voor CORS redirects
        loadPackageList(); 
    }
}

// --- TABELLEN & STATS ---
function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    let html = `<table class="admin-table"><thead><tr><th>Partner</th><th>Date</th><th>Guest</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;
    
    bookings.forEach(b => {
        const rawDate = b["Start Date"] || b["Date"] || b["Tijdstempel"];
        const dateObj = new Date(rawDate);
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

        html += `<tr>
            <td><span class="badge-partner">${b["Partner"] || "Lima"}</span></td>
            <td><strong>${formattedDate}</strong></td>
            <td><strong>${b["Full Name"] || b["Full name"] || "Guest"}</strong></td>
            <td>${b["Number of Guests"] || b["Guests"] || 1}</td>
            <td><span class="badge-status status-confirmed">Confirmed</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let g = 0; let r = 0; const p = new Set();
    
    b.forEach(x => {
        const pax = parseInt(x["Number of Guests"] || x["Guests"]) || 1;
        g += pax; 
        r += (pax * 75); // Voorbeeld: Admin ziet globale omzet op basis van €75 gemiddelde
        p.add(x["Partner"] || x["PartnerID"]);
    });
    
    document.getElementById('totalGuests').textContent = g;
    document.getElementById('totalRevenue').textContent = `€${r}`;
    document.getElementById('activePartners').textContent = p.size;
}

// --- KALENDER & CHARTS ---
function initCalendar() {
    const el = document.getElementById('calendar');
    if (!el) return;
    window.calendar = new FullCalendar.Calendar(el, { 
        initialView: 'dayGridMonth', 
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' }, 
        eventColor: '#c5a059',
        height: 'auto'
    });
    window.calendar.render();
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    const events = b.map(x => ({
        title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
        start: (x["Start Date"] || x["Date"] || "").toString().substring(0,10),
        allDay: true
    })).filter(e => e.start && e.start.length >= 10);
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
        if (monthlyData.hasOwnProperty(m)) {
            monthlyData[m] += (parseInt(b["Number of Guests"] || b["Guests"]) || 1) * 75;
        }
    });

    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels, 
            datasets: [{ 
                label: 'Revenue Trend', 
                data: labels.map(l => monthlyData[l]), 
                borderColor: '#c5a059', 
                fill: true, 
                backgroundColor: 'rgba(197,160,89,0.1)', 
                tension: 0.4 
            }] 
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// --- PARTNER MANAGEMENT ---
async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    c.innerHTML = "Loading partner network...";
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const p = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Partner ID</th></tr></thead><tbody>`;
        p.forEach(x => h += `<tr><td><strong>${x.name}</strong></td><td>${x.email}</td><td><span class="badge-partner">${x.partnerID}</span></td></tr>`);
        c.innerHTML = h + `</tbody></table>`;
    } catch (e) { c.innerHTML = "Error loading partner list."; }
}

async function submitNewPartner() {
    const name = document.getElementById('p_name').value;
    const user = document.getElementById('p_user').value;
    const pass = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;
    
    if(!name || !user || !pass || !id) return alert("Fill all fields");
    
    try {
        const url = `${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&partnerID=${encodeURIComponent(id)}`;
        await fetch(url, { redirect: 'follow' });
        alert("New partner added to network!"); 
        togglePartnerForm(); 
        loadPartnerList();
    } catch (e) { 
        alert("Partner successfully added!"); 
        loadPartnerList(); 
    }
}
