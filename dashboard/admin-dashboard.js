/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 2.3 - Inclusief Delete Package Functie
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbw7TZYAZjftT2346xjhs-Ec4BfioYqcRkvtjCkKy0jQW0rJ_C4ifdmX1G-jDZ06UqCbIA/exec';

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

// --- NAVIGATIE ---
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

    if (sId === 'partners') loadPartnerList();
    if (sId === 'packages') loadPackageList(); 
};

// --- BOEKINGEN DATA ---
async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        allBookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Experience"]) : [];

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

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    let html = `<table class="admin-table"><thead><tr><th>Partner</th><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th></tr></thead><tbody>`;
    
    bookings.forEach(b => {
        const rawDate = b["Start Date"] || b["Date"];
        const dateObj = new Date(rawDate);
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

        html += `<tr>
            <td><span class="badge-partner">${b["Partner"] || "Lima"}</span></td>
            <td><strong>${formattedDate}</strong></td>
            <td><strong>${b["Full Name"] || "Guest"}</strong></td>
            <td style="font-size: 0.85rem;">${b["Experience"] || "-"}</td>
            <td>${b["Guests"] || 1}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// --- PACKAGES & PRICING ---
window.calculateSellPrice = function() {
    const net = parseFloat(document.getElementById('pkg_net').value) || 0;
    const commPercentage = parseFloat(document.getElementById('pkg_comm').value) || 0;
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
    container.innerHTML = "<p>Loading data from Master Sheet...</p>";

    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();
        
        let h = `<table class="admin-table">
            <thead><tr>
                <th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th>
            </tr></thead><tbody>`;
        
        pkgs.forEach((p, index) => {
            const partner = p.PartnerID || "N/A";
            const name = p.PackageName || "No Name";
            const net = parseFloat(p.NetPrice) || 0;
            const sell = parseFloat(p.SellPrice) || 0;
            const profit = sell - net;
            
            h += `<tr>
                <td><span class="badge-partner">${partner}</span></td>
                <td><strong>${name}</strong></td>
                <td>€${net.toFixed(2)}</td>
                <td style="color: #10b981; font-weight: bold;">€${sell.toFixed(2)}</td>
                <td style="background: rgba(197,160,89,0.1); font-weight: 600;">€${profit.toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="deletePackage('${name}', '${partner}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
        container.innerHTML = h + `</tbody></table>`;
    } catch (e) { 
        container.innerHTML = "<p>Could not connect to Google Sheets.</p>"; 
    }
}

async function submitNewPackage() {
    const pID = document.getElementById('pkg_partnerid').value;
    const name = document.getElementById('pkg_name').value;
    const net = document.getElementById('pkg_net').value;
    const sell = document.getElementById('pkg_sell').value;

    if(!pID || !name || !net) return alert("Fill in all fields.");

    try {
        const url = `${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}&desc=Experience`;
        await fetch(url, { redirect: 'follow' });
        alert("Package saved!");
        togglePackageForm();
        loadPackageList();
    } catch (e) { 
        loadPackageList(); 
    }
}

// --- NIEUW: DELETE PACKAGE ---
async function deletePackage(packageName, partnerID) {
    if (!confirm(`Are you sure you want to delete "${packageName}" for ${partnerID}?`)) return;

    try {
        const url = `${SHEET_API_URL}?action=deletePackage&name=${encodeURIComponent(packageName)}&partnerID=${encodeURIComponent(partnerID)}`;
        await fetch(url, { redirect: 'follow' });
        alert("Package deleted!");
        loadPackageList();
    } catch (e) {
        alert("Package removed from list.");
        loadPackageList();
    }
}

// --- DASHBOARD STATS & VISUALS ---
function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let g = 0; let r = 0; const p = new Set();
    
    b.forEach(x => {
        const pax = parseInt(x["Guests"]) || 1;
        g += pax; 
        r += (pax * 75); 
        p.add(x["Partner"]);
    });
    
    document.getElementById('totalGuests').textContent = g;
    document.getElementById('totalRevenue').textContent = `€${r}`;
    document.getElementById('activePartners').textContent = p.size;
}

function initCalendar() {
    const el = document.getElementById('calendar');
    if (!el) return;
    window.calendar = new FullCalendar.Calendar(el, { 
        initialView: 'dayGridMonth', 
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' }, 
        eventColor: '#c5a059'
    });
    window.calendar.render();
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    const events = b.map(x => ({
        title: `[${x["Partner"] || 'P'}] ${x["Full Name"] || 'Guest'}`,
        start: (x["Start Date"] || "").toString().substring(0,10),
        allDay: true
    })).filter(e => e.start);
    window.calendar.addEventSource(events);
}

function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    const monthlyData = {}; const labels = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const m = d.toLocaleString('en-GB', { month: 'short' });
        labels.push(m); monthlyData[m] = 0;
    }
    bookings.forEach(b => {
        const d = new Date(b["Start Date"]);
        const m = d.toLocaleString('en-GB', { month: 'short' });
        if (monthlyData.hasOwnProperty(m)) {
            monthlyData[m] += (parseInt(b["Guests"]) || 1) * 75;
        }
    });
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue', data: labels.map(l => monthlyData[l]), borderColor: '#c5a059', fill: true, backgroundColor: 'rgba(197,160,89,0.1)', tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// --- PARTNER BEHEER ---
async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    c.innerHTML = "Loading...";
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const p = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>ID</th></tr></thead><tbody>`;
        p.forEach(x => h += `<tr><td><strong>${x.name}</strong></td><td>${x.email}</td><td><span class="badge-partner">${x.partnerID}</span></td></tr>`);
        c.innerHTML = h + `</tbody></table>`;
    } catch (e) { c.innerHTML = "Error."; }
}

async function submitNewPartner() {
    const name = document.getElementById('p_name').value;
    const user = document.getElementById('p_user').value;
    const pass = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;
    if(!name || !user || !pass || !id) return alert("Fill fields");
    try {
        await fetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&partnerID=${encodeURIComponent(id)}`, { redirect: 'follow' });
        alert("Partner added!"); togglePartnerForm(); loadPartnerList();
    } catch (e) { alert("Partner added!"); loadPartnerList(); }
}

window.logout = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
