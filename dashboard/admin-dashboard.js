/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 3.1 - FIXED Navigation & Export
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwo_jAnamlQ2h9HZ_0imBBURqILeJZn71WQy_svoGQZ7fFM9agCmSZS9t34AThXccN0gw/exec';

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
    loadPartnerFilterOptions();
    loadAdminData();
});

async function loadPartnerFilterOptions() {
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const partners = await response.json();
        if (!partners || !partners.length) return;

        const select = document.getElementById('partnerFilter');
        if (!select) return;

        const current = select.value;

        select.innerHTML = `<option value="all">Global View</option>`;
        partners.forEach(p => {
            const opt = document.createElement('option');
            opt.value       = p.partnerID;
            opt.textContent = p.name || p.partnerID;
            select.appendChild(opt);
        });

        select.value = current;

        const pkgSelect = document.getElementById('pkg_partnerid');
        if (pkgSelect) {
            pkgSelect.innerHTML = '';
            partners.forEach(p => {
                const opt = document.createElement('option');
                opt.value       = p.partnerID;
                opt.textContent = p.name || p.partnerID;
                pkgSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Could not load partner filter:", e);
    }
}

// --- MENU FIX: Wisselen tussen secties ---
window.showSection = (sId, el) => {
    // 1. Verberg alles
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    // 2. Toon doel
    const target = document.getElementById(sId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    // 3. Navigatie styling
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // 4. Refresh acties
    if (sId === 'partners') loadPartnerList();
    if (sId === 'packages') loadPackageList();
    if (sId === 'overview') {
        setTimeout(() => {
            if (window.calendar) { window.calendar.updateSize(); window.calendar.render(); }
            if (revenueChart) revenueChart.update();
        }, 150);
    }
};

// --- DATA LOGICA ---
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

    } catch (e) { console.error("Sync error:", e); }
    finally { if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data'; }
}

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!bookings.length) {
        container.innerHTML = "<p style='padding:20px; color:#64748b;'>No bookings found.</p>";
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Partner</th>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Experience</th>
                    <th>Pax</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    bookings.forEach(b => {
        const d = new Date(b["Start Date"] || b["Date"]);
        const fDate = !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "-";
        const rawDate   = b["Start Date"] || b["Date"] || "";
        const rawStatus = b["Status"] || "Pending";
        const name = (b["Full Name"] || "Guest").replace(/'/g, "\\'");

        html += `
            <tr>
                <td><span class="badge-partner">${b["Partner"] || "-"}</span></td>
                <td><strong>${fDate}</strong></td>
                <td><strong>${b["Full Name"] || "Guest"}</strong></td>
                <td style="font-size:0.8rem;">${b["Experience"] || "-"}</td>
                <td>${b["Guests"] || 1}</td>
                <td>
                    <select onchange="updateBookingStatus('${name}', '${rawDate}', this.value, this)"
                        style="padding:5px 8px; border-radius:6px; border:1px solid #e2e8f0; font-size:0.8rem; font-weight:600; cursor:pointer;
                        background:${rawStatus.toLowerCase() === 'confirmed' ? '#dcfce7' : '#fef3c7'};
                        color:${rawStatus.toLowerCase() === 'confirmed' ? '#166534' : '#92400e'};">
                        <option value="Pending"   ${rawStatus === 'Pending'   ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${rawStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Cancelled" ${rawStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>`;
    });

    container.innerHTML = html + '</tbody></table>';
}

async function updateBookingStatus(name, date, newStatus, selectEl) {
    selectEl.style.background = newStatus === 'Confirmed' ? '#dcfce7' : newStatus === 'Cancelled' ? '#fee2e2' : '#fef3c7';
    selectEl.style.color      = newStatus === 'Confirmed' ? '#166534' : newStatus === 'Cancelled' ? '#991b1b' : '#92400e';

    try {
        const response = await fetch(`${SHEET_API_URL}?action=updateStatus&name=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&status=${encodeURIComponent(newStatus)}`, { redirect: 'follow' });
        const result = await response.json();
        if (result.status !== "success") {
            alert("Could not update status. Please try again.");
        }
    } catch (e) {
        alert("Connection error. Please try again.");
    }
}

// --- EXPORT & PRIJZEN ---
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
    link.download = `BTP_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

window.calculateSellPrice = () => {
    const net = parseFloat(document.getElementById('pkg_net').value) || 0;
    const comm = parseFloat(document.getElementById('pkg_comm').value) || 0;
    document.getElementById('pkg_sell').value = (net * (1 + comm/100)).toFixed(2);
};

// --- PACKAGE BEHEER ---
async function loadPackageList() {
    const container = document.getElementById('packagesTableContainer');
    container.innerHTML = "Loading...";
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th></tr></thead><tbody>`;
        pkgs.forEach(p => {
            const n = parseFloat(p.NetPrice) || 0; const s = parseFloat(p.SellPrice) || 0;
            h += `<tr><td>${p.PartnerID}</td><td><strong>${p.PackageName}</strong></td><td>€${n.toFixed(2)}</td><td>€${s.toFixed(2)}</td>
                <td style="color:#10b981;font-weight:bold">€${(s-n).toFixed(2)}</td>
                <td><button class="btn-delete" onclick="deletePackage('${p.PackageName}','${p.PartnerID}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
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

// --- STATS & CHARTS ---
function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;
    const g = b.reduce((s, x) => s + (parseInt(x["Guests"]) || 0), 0);
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
    revenueChart = new Chart(ctx, { type: 'line', data: { labels: ['M1','M2','M3','M4','M5','M6'], datasets: [{ label: 'Revenue', data: [150, 230, 180, 310, 290, 420], borderColor: '#c5a059', tension: 0.4 }] } });
}

async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`);
        const p = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>ID</th></tr></thead><tbody>`;
        p.forEach(x => h += `<tr><td><strong>${x.name}</strong></td><td>${x.email}</td><td>${x.partnerID}</td></tr>`);
        c.innerHTML = h + "</tbody></table>";
    } catch (e) { c.innerHTML = "Error."; }
}

async function submitNewPartner() {
    const n  = document.getElementById('p_name').value;
    const e  = document.getElementById('p_user').value;
    const p  = document.getElementById('p_pass').value;
    const id = document.getElementById('p_id').value;
    if (!n || !e || !p || !id) return alert("Fill in all fields.");
    await fetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(n)}&user=${encodeURIComponent(e)}&pass=${encodeURIComponent(p)}&partnerID=${encodeURIComponent(id)}`, { redirect: 'follow' });
    document.getElementById('addPartnerForm').style.display = 'none';
    loadPartnerList();
    loadPartnerFilterOptions(); // ← dropdown direct bijwerken
    alert(`Partner "${n}" successfully added!`);
}
window.logout = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
window.togglePartnerForm = () => { const f = document.getElementById('addPartnerForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
window.togglePackageForm = () => { const f = document.getElementById('addPackageForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };

