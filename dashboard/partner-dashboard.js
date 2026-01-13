/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Volledig geoptimaliseerd en gefilterd op Partner
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzQ1ZRCue9z1sehve_V7lNMYqKkBRj6Fxl_JAXWOi2NZoQAn_ROwauEEdRLLx1ZPSlwww/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }
    
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

    // 2. Navigatie Functie (Global voor HTML)
    window.showSection = (sectionId, element) => {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        if (element) element.classList.add('active');
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        
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

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    // De partner-ID (bijv. "lima") uit de login halen
    const myPartnerID = (localStorage.getItem("partnerID") || "").trim().toLowerCase();
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        
        // FILTER: Alleen rijen waar de naam gevuld is EN de partner kolom (A) matcht
        const bookings = data.filter(row => {
            const hasName = row["Full Name"] || row["Full name"];
            const rowPartner = String(row["Partner"] || "").trim().toLowerCase();
            return hasName && rowPartner === myPartnerID;
        });

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e); 
    }
    if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    const formatD = (d) => {
        if (!d || d === "N/A") return "-";
        // Voor het geval dat de datum als DD-MM-YYYY binnenkomt
        return d; 
    };

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:gray;">No bookings found for your account.</td></tr>`;
    }

    bookings.forEach(b => {
        // Gebruik de exacte kolomnamen uit je screenshot
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

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateStats(b) {
    const totalB = document.getElementById('totalBookings');
    const totalG = document.getElementById('totalGuests');
    
    if (totalB) totalB.textContent = b.length;
    
    let count = 0;
    b.forEach(x => {
        // Gebruik kolom "Guests" voor de optelling
        count += parseInt(x["Guests"]) || 1;
    });
    
    if (totalG) totalG.textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => {
        // Probeer datum format DD-MM-YYYY om te zetten naar YYYY-MM-DD voor FullCalendar
        let dateVal = x["Start Date"];
        if (dateVal && dateVal.includes('-')) {
            const parts = dateVal.split('-');
            if (parts[2].length === 4) { // Als het DD-MM-YYYY is
                dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        return {
            title: `${x["Full Name"]} (${x["Guests"] || 1})`,
            start: dateVal,
            allDay: true
        };
    }).filter(e => e.start);

    window.calendar.addEventSource(events);
}
