/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Geoptimaliseerd voor jouw HTML en inclusief Top Experience statistiek
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Autorisatie (via auth.js)
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    // Welkomsttekst personaliseren met de naam uit localStorage
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

    initCalendar();
    loadDataFromSheet();
});

/**
 * Initialiseert de FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: '#38bdf8',
        height: 'auto'
    });
    window.calendar.render();
}

/**
 * Haalt data op van Google Sheets specifiek voor de ingelogde partner
 */
async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    const partnerID = localStorage.getItem("partnerID");
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Syncing...";
    
    if (!partnerID) {
        console.error("Geen partnerID gevonden in sessie.");
        return;
    }
    
    try {
        // Fetch data met partner filter
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op rijen met een geldige naam
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        // Update de laatste sync tijd in de UI
        const syncTimeEl = document.getElementById('lastSyncTime');
        if (syncTimeEl) {
            syncTimeEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e); 
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
    }
}

/**
 * Vult de tabel met boekingen
 */
function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    const formatD = (d) => {
        if (!d || d === "N/A") return "-";
        const dateObj = new Date(d);
        return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No bookings found for your account.</td></tr>`;
    } else {
        bookings.forEach(b => {
            const name = b["Full Name"] || b["Full name"] || "-";
            const pkg = b["Choose Your Experience"] || b["Experience"] || "-"; 
            const guests = b["Number of Guests"] || b["Guests"] || "1";
            const date = b["Start Date"] || b["Date"] || "-";
            const email = b["Email Address"] || b["Email"] || "";
            const requests = b["Special Requests"] || b["Requests"] || "-";

            html += `<tr>
                <td data-label="Date"><strong>${formatD(date)}</strong></td>
                <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${email}</div></td>
                <td data-label="Experience" style="max-width:150px; font-size:0.8rem;">${pkg}</td>
                <td data-label="Pax"><strong>${guests}</strong></td>
                <td data-label="Requests" style="font-size:0.75rem; color:#64748b;">${requests}</td>
                <td data-label="Status"><span class="badge-confirmed">Confirmed</span></td>
            </tr>`;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Berekent de statistieken en de Top Experience
 */
function updateStats(b) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');
    const topPackageEl = document.getElementById('topPackage');
    
    if (b.length === 0) {
        if (totalBookingsEl) totalBookingsEl.textContent = "0";
        if (totalGuestsEl) totalGuestsEl.textContent = "0";
        if (topPackageEl) topPackageEl.textContent = "-";
        return;
    }

    let guestCount = 0;
    let packageCounts = {};

    b.forEach(x => {
        // Gasten optellen
        const guests = parseInt(x["Number of Guests"] || x["Guests"]) || 1;
        guestCount += guests;

        // Pakketten tellen
        const pkg = x["Choose Your Experience"] || x["Experience"] || "Standard";
        packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    });

    // Zoek het meest populaire pakket
    let topPkg = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);

    // Update de kaarten in de HTML
    if (totalBookingsEl) totalBookingsEl.textContent = b.length;
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
    if (topPackageEl) {
        // Afkorten als de naam te lang is voor de kaart
        topPackageEl.textContent = topPkg.length > 18 ? topPkg.substring(0, 16) + '...' : topPkg;
    }
}

/**
 * Zet de boekingen als events in de kalender
 */
function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => {
        const name = x["Full Name"] || x["Full name"] || 'Guest';
        const guests = x["Number of Guests"] || x["Guests"] || 1;
        const date = x["Start Date"] || x["Date"];
        
        return {
            title: `${name} (${guests})`,
            start: date,
            allDay: true
        };
    }).filter(event => event.start);

    window.calendar.addEventSource(events);
}

/**
 * Update beschikbaarheid (Functie voor de Availability sectie)
 */
async function updateAvailability(event) {
    event.preventDefault();
    const btn = document.getElementById('saveAvailBtn');
    const toast = document.getElementById('toast');
    
    const start = document.getElementById('availStart').value;
    const end = document.getElementById('availEnd').value;
    const status = document.getElementById('availStatus').value;
    const partnerID = localStorage.getItem("partnerID");

    if (btn) btn.innerText = "Saving...";

    try {
        const url = `${SHEET_API_URL}?action=updateAvailability&partnerID=${encodeURIComponent(partnerID)}&start=${start}&end=${end}&status=${status}`;
        await fetch(url, { mode: 'no-cors' });
        
        if (toast) {
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
    } catch (e) {
        alert("Error saving availability.");
    } finally {
        if (btn) btn.innerText = "🚀 Save Availability";
    }
}
