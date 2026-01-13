/**
 * Beyond the Pitch - Partner Dashboard Logic (Geoptimaliseerd voor jouw Sheet)
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzQ1ZRCue9z1sehve_V7lNMYqKkBRj6Fxl_JAXWOi2NZoQAn_ROwauEEdRLLx1ZPSlwww/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Autorisatie
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }

    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

    // 2. Navigatie Logica (Global maken voor de onclick in HTML)
    window.showSection = (sectionId, element) => {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        if (element) element.classList.add('active');
        
        // Sluit sidebar op mobiel
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        
        if(sectionId === 'overview' && window.calendar) {
            setTimeout(() => window.calendar.render(), 100);
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
        eventColor: '#38bdf8'
    });
    window.calendar.render();
}

/**
 * Haalt data op en filtert op basis van de kolom "Partner" (Kolom A)
 */
async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    // De waarde "lima" uit localStorage halen
    const currentPartnerID = localStorage.getItem("partnerID") || "";
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        
        console.log("Data ontvangen van Sheet:", data); // Check dit in F12 console

        // FILTER: Alleen rijen waar Kolom A overeenkomt met de ingelogde partner
        const bookings = data.filter(row => {
            const sheetPartner = String(row["Partner"] || "").trim().toLowerCase();
            const myID = currentPartnerID.trim().toLowerCase();
            const hasName = row["Full Name"] || row["Full name"];
            
            return hasName && sheetPartner === myID;
        });

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        const lastSyncEl = document.getElementById('lastSyncTime');
        if (lastSyncEl) {
            lastSyncEl.textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e); 
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
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
        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:gray;">No bookings found for ${localStorage.getItem("partnerID") || 'this partner'}.</td></tr>`;
    } else {
        bookings.forEach(b => {
            // Kolomnamen gebaseerd op jouw screenshot
            const name = b["Full Name"] || "-";
            const pkg = b["Experience"] || "-"; 
            const guests = b["Guests"] || "1";
            const date = b["Start Date"] || "-";
            const email = b["Email Address"] || "";
            const requests = b["Special Requests"] || "-";

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

function updateStats(b) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');
    
    if (totalBookingsEl) totalBookingsEl.textContent = b.length;
    
    let count = 0;
    b.forEach(x => {
        const guests = parseInt(x["Guests"]) || 1;
        count += guests;
    });
    
    if (totalGuestsEl) totalGuestsEl.textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => ({
        title: `${x["Full Name"] || 'Guest'} (${x["Guests"] || 1})`,
        start: x["Start Date"],
        allDay: true
    })).filter(event => event.start);

    window.calendar.addEventSource(events);
}
