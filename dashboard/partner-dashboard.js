/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Versie: 3.2 - Mobile First, Anti-Undefined & Status Badges
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbw68geaupfYuRGBIZotaYpLo8mfwBW4m2fpGb2q21hgBf35JanVAD5yFG2fT52QZuMHpA/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) {
        window.location.href = 'index.html'; 
        return;
    }

    if (partnerID.toLowerCase() === "ireland") {
        document.body.classList.add("theme-ireland");
    }

    document.getElementById("welcomeText").innerText = `Welcome, ${userName || partnerID}`;
    
    loadDataFromSheet();
    loadPackages();

    // Automatisch elke 5 minuten verversen
    setInterval(loadDataFromSheet, 5 * 60 * 1000);
});

// 2. Boekingen ophalen en Stats berekenen
async function loadDataFromSheet() {
    const pID = sessionStorage.getItem("partnerID");
    const syncBtn = document.getElementById("syncBtn");
    if(syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(pID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        if (!data || data.error) throw new Error(data.error || "No data found");

        // Filter lege rijen uit de Google Sheet
        const cleanData = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Experience"]) : [];

        renderStats(cleanData);
        renderTable(cleanData);
        renderCalendar(cleanData);
        
    } catch (error) {
        console.error("Error loading bookings:", error);
        const container = document.getElementById("bookingsTableContainer");
        if(container) container.innerHTML = "No active bookings found.";
    } finally {
        if(syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
    }
}

// 3. Pakketten ophalen (Nu zonder 'undefined'!)
async function loadPackages() {
    const pID = sessionStorage.getItem("partnerID");
    const pkgGrid = document.getElementById("dynamicPackagesGrid");
    if (!pkgGrid) return;
    
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=${encodeURIComponent(pID)}`, { redirect: 'follow' });
        const packages = await response.json();
        console.log("PACKAGES RAW:", packages);
console.log("FIRST ITEM:", packages?.[0]);

        if (!packages || packages.length === 0) {
            pkgGrid.innerHTML = "<p>No packages assigned to your account yet.</p>";
            return;
        }

        pkgGrid.innerHTML = packages.map(pkg => {
            // Beveiliging tegen lege velden uit de sheet
            const name = pkg.PackageName || "Experience";
            const desc = pkg.Description || "Check our experience details.";
            const price = pkg.NetPrice || "0.00";
            const img = pkg.ImageURL || 'https://via.placeholder.com/300x150?text=Beyond+The+Pitch';

            return `
                <div class="stat-card" style="display: flex; flex-direction: column; gap: 10px;">
                    <img src="${img}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                    <h3 style="font-size: 1.1rem; margin-top: 5px;">${name}</h3>
                    <p style="color: #64748b; font-size: 0.8rem; flex-grow: 1;">${desc}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px;">
                        <span style="font-weight: 800; color: var(--primary);">€ ${price}</span>
                        <span style="font-size: 0.65rem; font-weight: bold; color: #94a3b8;">NETTO PRICE</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) { 
        console.error("Error loading packages:", error);
        pkgGrid.innerHTML = "Error loading packages."; 
    }
}

// 4. Kalender (Lijstweergave op Mobiel)
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !data) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        height: 'auto',
        events: data.map(row => ({
            title: row["Full Name"] || 'Guest',
            start: row["Start Date"] || row["Date"],
            allDay: true,
            extendedProps: {
                experience: row["Experience"]       || "Not specified",
                guests:     row["Guests"]           || "1",
                status:     row["Status"]           || "Pending",
                email:      row["Email Address"]    || "-",
                phone:      row["Phone Number"]     || "-",
                requests:   row["Special Requests"] || "-"
            }
        })),
        eventClick: function(info) {
            showBookingModal(info.event);
        }
    });

    calendar.render();
}

function showBookingModal(event) {
    const existing = document.getElementById('bookingModal');
    if (existing) existing.remove();

    const p = event.extendedProps;
    const statusClass = p.status.toLowerCase() === 'confirmed' ? 'status-confirmed' : 'status-pending';
    const dateStr = new Date(event.start).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const modal = document.createElement('div');
    modal.id = 'bookingModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <button class="modal-close" onclick="document.getElementById('bookingModal').remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 style="margin-bottom:20px; color:#1e293b;">Booking Details</h3>
            <div class="modal-row">
                <div class="modal-label">Guest</div>
                <div class="modal-value">${event.title}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Experience</div>
                <div class="modal-value">${p.experience}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Date</div>
                <div class="modal-value">${dateStr}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Guests</div>
                <div class="modal-value">${p.guests} pax</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Email</div>
                <div class="modal-value">${p.email}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Phone</div>
                <div class="modal-value">${p.phone}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Special Requests</div>
                <div class="modal-value">${p.requests}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Status</div>
                <div style="margin-top:4px;">
                    <span class="status-badge ${statusClass}">${p.status}</span>
                </div>
            </div>
        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}
// 5. Tabel Rendering (Responsive met Labels)
function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 15px; display: block;"></i>
                <p style="font-weight: 600; font-size: 1rem;">No bookings yet</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Your upcoming bookings will appear here.</p>
            </div>`;
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Experience</th>
                    <th>Pax</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;
    
    data.forEach(row => {
        const rawStatus = row["Status"] || "Pending";
        const statusClass = rawStatus.toLowerCase() === 'confirmed' ? 'status-confirmed' : 'status-pending';
        
        const d = new Date(row["Start Date"] || row["Date"]);
        const fDate = !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "-";

        html += `
            <tr>
                <td data-label="Date"><strong>${fDate}</strong></td>
                <td data-label="Guest"><strong>${row["Full Name"] || '-'}</strong></td>
                <td data-label="Experience">${row["Experience"] || '-'}</td>
                <td data-label="Pax">${row["Guests"] || '1'}</td>
                <td data-label="Status">
                    <span class="status-badge ${statusClass}">${rawStatus}</span>
                </td>
            </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// 6. Stats & Navigatie
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    const guests = data.reduce((sum, row) => sum + (parseInt(row["Guests"]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

window.showSection = function(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    
    const target = document.getElementById(sectionId);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(el) el.classList.add('active');

    // Als sidebar open is op mobiel, sluit deze
    const sidebar = document.getElementById('sidebar');
    if(sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}

window.logout = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Export functie voor Partners
window.exportToExcel = function() {
    const pID = sessionStorage.getItem("partnerID");

    // Haal de data op uit de al geladen tabel
    const rows = document.querySelectorAll(".admin-table tbody tr");
    if (!rows || rows.length === 0) {
        alert("No bookings to export.");
        return;
    }

    let csv = "Date,Guest,Experience,Pax,Status\n";

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return;
        const line = [
            cells[0].innerText.trim(),
            cells[1].innerText.trim(),
            cells[2].innerText.trim(),
            cells[3].innerText.trim(),
            cells[4].innerText.trim()
        ].map(val => `"${val.replace(/"/g, '""')}"`).join(",");
        csv += line + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BeyondThePitch_${pID}_Bookings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

