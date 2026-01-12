/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Geoptimaliseerd met Top Experience statistiek en veilige auth-koppeling
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Autorisatie (Mag deze gebruiker hier zijn?)
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    // Welkomsttekst en Naam instellen
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

    // 2. Navigatie Logica
    window.showSection = (sectionId, element) => {
        // Verberg alle secties
        document.querySelectorAll('.content-section').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        
        // Deactiveer alle menu-items
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        // Toon geselecteerde sectie
        const target = document.getElementById(sectionId);
        if (target) {
            target.style.display = 'block';
            setTimeout(() => target.classList.add('active'), 10);
        }
        if (element) element.classList.add('active');
        
        // Calendar refresh fix als we naar overview gaan
        if(sectionId === 'overview' && window.calendar) {
            setTimeout(() => window.calendar.render(), 150);
        }
    };

    initCalendar();
    loadDataFromSheet();
});

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
 * Haalt data op en filtert op basis van de ingelogde partnerID
 */
async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    
    // Haal de partnerID op die tijdens login is opgeslagen
    const partnerID = localStorage.getItem("partnerID");
    
    if (!partnerID) {
        console.error("Geen partnerID gevonden in de sessie.");
        return;
    }
    
    try {
        // API call met de specifieke partnerID
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op geldige boekingen
        const bookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Full name"]) : [];

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        // Update sync tijd
        const syncTimeEl = document.getElementById('lastSyncTime');
        if (syncTimeEl) {
            syncTimeEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e); 
    } finally {
        if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
    }
}

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
                <td data-label="Status"><span class="badge-status status-confirmed" style="background:rgba(34,197,94,0.1); color:#22c55e; padding:4px 8px; border-radius:5px; font-size:0.75rem;">Confirmed</span></td>
            </tr>`;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Update de statistieken kaarten inclusief Top Experience (Optie 1)
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
        // Gasten tellen
        const guests = parseInt(x["Number of Guests"] || x["Guests"]) || 1;
        guestCount += guests;

        // Ervaringen tellen voor Top Experience
        const pkg = x["Choose Your Experience"] || x["Experience"] || "Standard";
        packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
    });

    // Bepaal meest populaire pakket
    let topPkg = Object.keys(packageCounts).reduce((a, b) => packageCounts[a] > packageCounts[b] ? a : b);

    // Update UI
    if (totalBookingsEl) totalBookingsEl.textContent = b.length;
    if (totalGuestsEl) totalGuestsEl.textContent = guestCount;
    if (topPackageEl) {
        topPackageEl.textContent = topPkg.length > 20 ? topPkg.substring(0, 18) + '...' : topPkg;
        topPackageEl.title = topPkg; 
    }
}

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
