/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 3.0 - Inclusief Export, Delete en Master Sheet Sync
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

// --- DATA INITIALISATIE ---
async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Sync met kolommen: "Full Name", "Experience", "Start Date", "Guests"
        allBookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Experience"]) : [];

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);

    } catch (e) { console.error("Error:", e); }
    finally { if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; }
}

// --- TABELLEN RENDERING ---
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
            <td style="font-size: 0.8rem;">${b["Experience"] || "-"}</td>
            <td>${b["Guests"] || 1}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// --- EXPORT FUNCTIE ---
window.exportBookingsToCSV = function() {
    if (!allBookings.length) return alert("No data to export.");
    const headers = ["Partner", "Full Name", "Email Address", "Phone Number", "Experience", "Start Date", "Guests", "Special Requests"];
    const csvContent = [
        headers.join(","),
        ...allBookings.map(row => headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BeyondThePitch_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// --- PACKAGES MANAGEMENT ---
window.calculateSellPrice = () => {
    const net = parseFloat(document.getElementById('pkg_net').value) || 0;
    const comm = parseFloat(document.getElementById('pkg_comm').value) || 0;
    document.getElementById('pkg_sell').value = (net * (1 + comm/100)).toFixed(2);
};

async function loadPackageList() {
    const container = document.getElementById('packagesTableContainer');
    container.innerHTML = "Loading...";
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th></tr></thead><tbody>`;
        pkgs.forEach(p => {
            const net = parseFloat(p.NetPrice) || 0;
            const sell = parseFloat(p.SellPrice) || 0;
            h += `<tr>
                <td><span class="badge-partner">${p.PartnerID}</span></td>
                <td><strong>${p.PackageName}</strong></td>
                <td>€${net.toFixed(2)}</td><td>€${sell.toFixed(2)}</td>
                <td style="background:rgba(16,185,129,0.1)">€${(sell-net).toFixed(2)}</td>
                <td><button class="btn-delete" onclick="deletePackage('${p.PackageName}','${p.PartnerID}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        });
        container.innerHTML = h + "</tbody></table>";
    } catch (e) { container.innerHTML = "Error loading packages."; }
}

async function deletePackage(name, partner) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
        await fetch(`${SHEET_API_URL}?action=deletePackage&name=${encodeURIComponent(name)}&partnerID=${encodeURIComponent(partner)}`, { redirect: 'follow' });
        loadPackageList();
    } catch (e) { loadPackageList(); }
}

async function submitNewPackage() {
    const pID = document.getElementById('pkg_partnerid').value;
    const name = document.getElementById('pkg_name').value;
    const net = document.getElementById('pkg_net').value;
    const sell = document.getElementById('pkg_sell').value;
    await fetch(`${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}`, { redirect: 'follow' });
    document.getElementById('addPackageForm').style.display = 'none';
    loadPackageList();
}

// --- OVERIGE DASHBOARD FUNCTIES ---
window.showSection = (sId, el) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(sId).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    if (sId === 'packages') loadPackageList();
};

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    let g = b.reduce((s, x) => s + (parseInt(x["Guests"]) || 0), 0);
    document.getElementById('totalGuests').textContent = g;
    document.getElementById('totalRevenue').textContent = `€${g * 75}`;
    document.getElementById('activePartners').textContent = new Set(b.map(x => x["Partner"])).size;
}

function initCalendar() {
    window.calendar = new FullCalendar.Calendar(document.getElementById('calendar'), { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next', center: 'title', right: 'today' }, eventColor: '#c5a059' });
    window.calendar.render();
}

function populateAdminCalendar(b) {
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({ title: `[${x.Partner}] ${x["Full Name"]}`, start: x["Start Date"], allDay: true })));
}

function updateRevenueChart(b) {
    const ctx = document.getElementById('revenueChart');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, { type: 'line', data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ label: 'Revenue', data: [100, 200, 150, 300, 250, 400], borderColor: '#c5a059', tension: 0.4 }] } });
}

window.logout = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
window.togglePackageForm = () => { const f = document.getElementById('addPackageForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
