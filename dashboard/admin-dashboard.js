/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 4.0 - apiFetch + dynamische partner filter + echte revenue chart
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwo_jAnamlQ2h9HZ_0imBBURqILeJZn71WQy_svoGQZ7fFM9agCmSZS9t34AThXccN0gw/exec';

let revenueChart = null;
let allBookings  = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const name = sessionStorage.getItem("userName") || "Admin";
    document.getElementById('welcomeText').textContent = `Welcome back, ${name}`;

    initCalendar();
    loadPartnerFilterOptions(); // Dynamisch partners laden in dropdown
    loadAdminData();
});

// ─── NAVIGATIE ────────────────────────────────────────────────────────────────

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
    if (sId === 'overview') {
        setTimeout(() => {
            if (window.adminCalendar) { window.adminCalendar.updateSize(); window.adminCalendar.render(); }
            if (revenueChart) revenueChart.update();
        }, 150);
    }
};

// ─── PARTNER FILTER DYNAMISCH LADEN ──────────────────────────────────────────

async function loadPartnerFilterOptions() {
    try {
        const partners = await window.apiFetch(`${SHEET_API_URL}?action=getPartners`);
        if (!partners || !partners.length) return;

        const select = document.getElementById('partnerFilter');
        if (!select) return;

        // Behoud de "Global View" optie, voeg partners dynamisch toe
        select.innerHTML = `<option value="all">Global View</option>`;
        partners.forEach(p => {
            const opt = document.createElement('option');
            opt.value       = p.partnerID;
            opt.textContent = p.name || p.partnerID;
            select.appendChild(opt);
        });

        // Vul ook de "Add Package" partner dropdown bij
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
        console.error("Could not load partner filter options:", e);
    }
}

// ─── ADMIN DATA ───────────────────────────────────────────────────────────────

async function loadAdminData() {
    const syncBtn     = document.getElementById('syncBtn');
    const filterValue = document.getElementById('partnerFilter').value;
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const data = await window.apiFetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`);
        if (!data) return;

        allBookings = Array.isArray(data)
            ? data.filter(row => row["Full Name"] || row["Experience"])
            : [];

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);

    } catch (e) {
        console.error("Sync error:", e);
    } finally {
        if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
    }
}

// ─── TABEL ────────────────────────────────────────────────────────────────────

function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');

    if (!bookings.length) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#94a3b8;">
                <i class="fa-solid fa-calendar-xmark" style="font-size:2.5rem; margin-bottom:10px; display:block;"></i>
                <p style="font-weight:600;">No bookings found</p>
            </div>`;
        return;
    }

    // Sorteren op datum (nieuwste eerst)
    const sorted = [...bookings].sort((a, b) =>
        new Date(b["Start Date"] || b["Date"]) - new Date(a["Start Date"] || a["Date"])
    );

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

    sorted.forEach(b => {
        const d     = new Date(b["Start Date"] || b["Date"]);
        const fDate = !isNaN(d) ? d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : "-";
        const rawStatus  = b["Status"] || "Pending";
        const statusClass = rawStatus.toLowerCase() === 'confirmed' ? 'status-confirmed' : 'status-pending';

        html += `
            <tr>
                <td><span class="badge-partner">${b["Partner"] || "-"}</span></td>
                <td><strong>${fDate}</strong></td>
                <td><strong>${b["Full Name"] || "Guest"}</strong></td>
                <td style="font-size:0.8rem;">${b["Experience"] || "-"}</td>
                <td>${b["Guests"] || 1}</td>
                <td><span class="status-badge ${statusClass}">${rawStatus}</span></td>
            </tr>`;
    });

    container.innerHTML = html + '</tbody></table>';
}

// ─── STATS ────────────────────────────────────────────────────────────────────

function updateAdminStats(b) {
    document.getElementById('totalBookings').textContent = b.length;

    const guests = b.reduce((s, x) => s + (parseInt(x["Guests"]) || 0), 0);
    document.getElementById('totalGuests').textContent = guests;

    // Revenue op basis van echte pakketprijzen (gemiddeld €75 als fallback)
    const revenue = b.reduce((s, x) => s + ((parseInt(x["Guests"]) || 0) * (parseFloat(x["SellPrice"]) || 75)), 0);
    document.getElementById('totalRevenue').textContent = `€${revenue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`;

    document.getElementById('activePartners').textContent = new Set(b.map(x => x["Partner"]).filter(Boolean)).size;
}

// ─── KALENDER ────────────────────────────────────────────────────────────────

function initCalendar() {
    window.adminCalendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today,listWeek' },
        eventColor: '#c5a059',
        height: 'auto'
    });
    window.adminCalendar.render();
}

function populateAdminCalendar(b) {
    window.adminCalendar.removeAllEvents();
    window.adminCalendar.addEventSource(b.map(x => ({
        title: `[${x["Partner"] || "?"}] ${x["Full Name"] || "Guest"}`,
        start: x["Start Date"] || x["Date"],
        allDay: true
    })));
}

// ─── REVENUE CHART (echte data) ───────────────────────────────────────────────

function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    if (revenueChart) { revenueChart.destroy(); revenueChart = null; }

    // Groepeer omzet per maand op basis van echte boekingen
    const monthlyRevenue = {};
    bookings.forEach(b => {
        const d = new Date(b["Start Date"] || b["Date"]);
        if (isNaN(d)) return;
        const key     = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const revenue = (parseInt(b["Guests"]) || 0) * (parseFloat(b["SellPrice"]) || 75);
        monthlyRevenue[key] = (monthlyRevenue[key] || 0) + revenue;
    });

    const sortedKeys = Object.keys(monthlyRevenue).sort();
    const labels     = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    });
    const values = sortedKeys.map(k => monthlyRevenue[k]);

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (€)',
                data:  values,
                borderColor:     '#c5a059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                tension:  0.4,
                fill:     true,
                pointBackgroundColor: '#c5a059'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => `€${v}` } } }
        }
    });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

window.exportBookingsToCSV = function() {
    if (!allBookings.length) return alert("No data to export.");
    const headers = ["Partner", "Full Name", "Email Address", "Phone Number", "Experience", "Start Date", "Guests", "Special Requests", "Status"];
    const csvContent = [
        headers.join(","),
        ...allBookings.map(row =>
            headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(",")
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `BTP_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// ─── PACKAGE BEHEER ───────────────────────────────────────────────────────────

async function loadPackageList() {
    const container = document.getElementById('packagesTableContainer');
    container.innerHTML = "<p style='padding:20px; color:#64748b;'>Loading...</p>";
    try {
        const pkgs = await window.apiFetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        if (!pkgs || !pkgs.length) { container.innerHTML = "<p style='padding:20px;'>No packages found.</p>"; return; }

        let h = `<table class="admin-table"><thead><tr><th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th></tr></thead><tbody>`;
        pkgs.forEach(p => {
            const n = parseFloat(p.NetPrice)  || 0;
            const s = parseFloat(p.SellPrice) || 0;
            h += `
                <tr>
                    <td>${p.PartnerID}</td>
                    <td><strong>${p.PackageName}</strong></td>
                    <td>€${n.toFixed(2)}</td>
                    <td>€${s.toFixed(2)}</td>
                    <td style="color:#10b981; font-weight:bold;">€${(s - n).toFixed(2)}</td>
                    <td><button class="btn-delete" onclick="deletePackage('${p.PackageName}','${p.PartnerID}')">
                        <i class="fa-solid fa-trash"></i>
                    </button></td>
                </tr>`;
        });
        container.innerHTML = h + "</tbody></table>";
    } catch (e) { container.innerHTML = "<p style='color:#ef4444; padding:20px;'>Error loading packages.</p>"; }
}

async function deletePackage(name, partner) {
    if (!confirm(`Delete package "${name}" for ${partner}?`)) return;
    try {
        await window.apiFetch(`${SHEET_API_URL}?action=deletePackage&name=${encodeURIComponent(name)}&partnerID=${encodeURIComponent(partner)}`);
        loadPackageList();
    } catch (e) { loadPackageList(); }
}

async function submitNewPackage() {
    const pID  = document.getElementById('pkg_partnerid').value;
    const name = document.getElementById('pkg_name').value.trim();
    const net  = document.getElementById('pkg_net').value;
    const sell = document.getElementById('pkg_sell').value;

    if (!name || !net) return alert("Fill in all required fields.");

    await window.apiFetch(`${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}`);
    document.getElementById('addPackageForm').style.display = 'none';
    loadPackageList();
}

window.calculateSellPrice = () => {
    const net  = parseFloat(document.getElementById('pkg_net').value)  || 0;
    const comm = parseFloat(document.getElementById('pkg_comm').value) || 0;
    document.getElementById('pkg_sell').value = (net * (1 + comm / 100)).toFixed(2);
};

// ─── PARTNER BEHEER ───────────────────────────────────────────────────────────

async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    try {
        const p = await window.apiFetch(`${SHEET_API_URL}?action=getPartners`);
        if (!p || !p.length) { c.innerHTML = "<p style='padding:20px;'>No partners found.</p>"; return; }

        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Partner ID</th><th>Role</th></tr></thead><tbody>`;
        p.forEach(x => h += `
            <tr>
                <td><strong>${x.name}</strong></td>
                <td>${x.email}</td>
                <td><code>${x.partnerID}</code></td>
                <td>${x.role}</td>
            </tr>`);
        c.innerHTML = h + "</tbody></table>";
    } catch (e) { c.innerHTML = "<p style='color:#ef4444; padding:20px;'>Error loading partners.</p>"; }
}

async function submitNewPartner() {
    const n  = document.getElementById('p_name').value.trim();
    const e  = document.getElementById('p_user').value.trim();
    const p  = document.getElementById('p_pass').value.trim();
    const id = document.getElementById('p_id').value.trim();

    if (!n || !e || !p || !id) return alert("Fill in all fields.");

    await window.apiFetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(n)}&user=${encodeURIComponent(e)}&pass=${encodeURIComponent(p)}&partnerID=${encodeURIComponent(id)}`);

    // Feedback aan de gebruiker
    document.getElementById('addPartnerForm').style.display = 'none';
    loadPartnerList();
    loadPartnerFilterOptions(); // Dropdown direct bijwerken
    alert(`Partner "${n}" successfully added!`);
}

// ─── LOGOUT & TOGGLES ─────────────────────────────────────────────────────────

window.logout            = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
window.togglePartnerForm = () => { const f = document.getElementById('addPartnerForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
window.togglePackageForm = () => { const f = document.getElementById('addPackageForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
