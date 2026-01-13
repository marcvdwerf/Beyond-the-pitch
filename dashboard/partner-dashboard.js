/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Volledig geoptimaliseerd en gefilterd op Partner (Lima/Ireland)
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }
    
    // Bepaal de partner voor thema en welkomsttekst
    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    const partnerDisplayName = partnerID.charAt(0).toUpperCase() + partnerID.slice(1);
    
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${partnerDisplayName} Dashboard`;

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

    initCalendar(partnerID);
    loadDataFromSheet();
});

function initCalendar(partnerID) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // Dynamische kleur: Groen voor Ireland, Blauw voor Lima
    const themeColor = partnerID === 'ireland' ? '#10b981' : '#38bdf8';

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        eventColor: themeColor,
        height: 'auto'
    });
    window.calendar.render();
}

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    const myPartnerID = (localStorage.getItem("partnerID") || "").trim().toLowerCase();
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        
        // FILTER: Check op naam en of de partner kolom (A) matcht met de ingelogde partner
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

    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    const highlightColor = partnerID === 'ireland' ? '#ecfdf5' : '#f0f9ff';
    const textColor = partnerID === 'ireland' ? '#065f46' : '#0369a1';

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Requests</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding:30px; color:gray;">No bookings found for your account.</td></tr>`;
    }

    bookings.forEach(b => {
        const name = b["Full Name"] || b["Full name"] || "-";
        // Pakt 'Experience' of de specifieke Ierse kolomnaam
        const pkg = b["Experience"] || b["Choose Your Experience"] || "-";
        const guests = b["Guests"] || "1";
        const date = b["Start Date"] || "-";
        const email = b["Email Address"] || "";
        const requests = b["Special Requests"] || "-";

        html += `<tr>
            <td data-label="Date"><strong>${date}</strong></td>
            <td data-label="Guest"><div>${name}</div><div style="font-size:0.7rem; color:gray;">${email}</div></td>
            <td data-label="Experience">
                <span style="background:${highlightColor}; color:${textColor}; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600;">
                    ${pkg}
                </span>
            </td>
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
        count += parseInt(x["Guests"]) || 1;
    });
    
    if (totalG) totalG.textContent = count;
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    
    const events = b.map(x => {
        let dateVal = x["Start Date"];
        // Datum converteren van DD-MM-YYYY naar YYYY-MM-DD voor de kalender
        if (dateVal && dateVal.includes('-')) {
            const parts = dateVal.split('-');
            if (parts[2] && parts[2].length === 4) { 
                dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        return {
            title: `${x["Full Name"] || x["Full name"]} (${x["Guests"] || 1})`,
            start: dateVal,
            allDay: true
        };
    }).filter(e => e.start);

    window.calendar.addEventSource(events);
}
