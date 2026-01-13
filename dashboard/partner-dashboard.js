/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Volledig afgestemd op jouw Google Sheet kolommen
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

    // 2. Navigatie (Zorg dat dit buiten de listener bereikbaar is voor HTML)
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
    const container = document.getElementById('bookingsTableContainer');
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    // Haal de inlognaam op (bijv. "Lima")
    const currentPartnerID = (localStorage.getItem("partnerID") || "").trim().toLowerCase();
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        
        // FILTER: We vergelijken alles in kleine letters om fouten te voorkomen
        const bookings = data.filter(row => {
            const sheetPartner = String(row["Partner"] || "").trim().toLowerCase();
            const hasName = row["Full Name"] || row["Full name"];
            
            // Controleer of de partner in de sheet ("Lima") matcht met de inlog ("lima")
            return hasName && sheetPartner === currentPartnerID;
        });

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Fout bij laden:", e);
        if (container) container.innerHTML = "<p style='color:red;'>Connection error. Please check your Google Script.</p>";
    } finally {
        if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
    }
}

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:gray;">No bookings found for ${localStorage.getItem("partnerID")}.</td></tr>`;
    } else {
        bookings.forEach(b => {
            // EXACTE MATCH MET JOUW SCREENSHOTS
            const name = b["Full Name"] || "-";
            const pkg = b["Experience"] || "-";
            const guests = b["Guests"] || "1";
            const date = b["Start Date"] || "-";
            const requests = b["Special Requests"] || "-";
            const email = b["Email Address"] || "";

            html += `<tr>
                <td data-label="Date"><strong>${date}</strong></td>
                <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${email}</div></td>
                <td data-label="Experience" style="font-size:0.8rem;">${pkg}</td>
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
    const bCount = document.getElementById('totalBookings');
    const gCount = document.getElementById('totalGuests');
    
    if (bCount) bCount.textContent = b.length;
    
    let totalGuests = 0;
    b.forEach(x => {
        totalGuests += parseInt(x["Guests"]) || 0;
    });
    
    if (gCount) gCount.textContent = totalGuests;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => {
        // Formatteer datum van DD-MM-YYYY naar YYYY-MM-DD voor de kalender
        const d = x["Start Date"] ? x["Start Date"].split('-').reverse().join('-') : null;
        return {
            title: `${x["Full Name"]} (${x["Guests"]})`,
            start: d,
            allDay: true
        };
    }).filter(e => e.start);

    window.calendar.addEventSource(events);
}
