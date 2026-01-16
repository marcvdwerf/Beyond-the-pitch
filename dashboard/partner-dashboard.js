/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Inclusief Hurling Planner & Excel Export
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdEZfxOmj9Hsnxz7-xQGhQc4Z88lTATYSSPK6-uzod_qeSICQ/formResponse';

// Officiële Wedstrijden 2026 voor de Hurling Planner
const GAA_MATCHES = [
    { id: 1, date: '2026-05-10', teams: 'Kilkenny vs Wexford', stadium: 'Nowlan Park', city: 'Kilkenny' },
    { id: 2, date: '2026-05-17', teams: 'Limerick vs Clare', stadium: 'TUS Gaelic Grounds', city: 'Limerick' },
    { id: 3, date: '2026-05-24', teams: 'Cork vs Tipperary', stadium: 'Páirc Uí Chaoimh', city: 'Cork' },
    { id: 4, date: '2026-06-07', teams: 'Galway vs Dublin', stadium: 'Pearse Stadium', city: 'Galway' }
];

let currentBookings = []; // Globale variabele voor Excel export

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }
    
    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    const partnerDisplayName = partnerID.charAt(0).toUpperCase() + partnerID.slice(1);
    
    // 2. UI Initialisatie
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome, ${partnerDisplayName} Dashboard`;

    // Hurling Planner alleen laden voor Ierland
    if (partnerID === 'ireland') {
        loadHurlingMatches();
    }

    initCalendar(partnerID);
    loadDataFromSheet();
});

// --- DATA & SYNC FUNCTIES ---

async function loadDataFromSheet() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    const myPartnerID = (localStorage.getItem("partnerID") || "").trim().toLowerCase();
    
    try {
        const response = await fetch(SHEET_API_URL, { redirect: 'follow' });
        const data = await response.json();
        
        // Filter op partner
        currentBookings = data.filter(row => {
            const hasName = row["Full Name"] || row["Full name"];
            const rowPartner = String(row["Partner"] || "").trim().toLowerCase();
            return hasName && rowPartner === myPartnerID;
        });

        renderTable(currentBookings);
        updateStats(currentBookings);
        populateCalendar(currentBookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Fout bij synchroniseren:", e); 
        showToast("❌ Sync failed");
    }
    if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
}

// --- EXCEL EXPORT ---

window.exportToExcel = function() {
    if (currentBookings.length === 0) {
        alert("Geen data om te exporteren.");
        return;
    }

    // Maak een werkblad van de huidige gefilterde boekingen
    const worksheet = XLSX.utils.json_to_sheet(currentBookings);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    // Genereer bestand en download
    const fileName = `BeyondThePitch_Bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast("📊 Excel gedownload");
};

// --- HURLING PLANNER LOGICA ---

function loadHurlingMatches() {
    const grid = document.getElementById('matchGrid');
    if (!grid) return;

    grid.innerHTML = GAA_MATCHES.map(match => `
        <div class="package-card" style="border-top: 4px solid var(--primary);">
            <div class="package-header">
                <strong>${match.teams}</strong>
            </div>
            <div class="package-body">
                <p><strong>Datum:</strong> ${new Date(match.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</p>
                <p style="font-size:0.85rem; color:var(--text-muted);">${match.stadium}, ${match.city}</p>
                <button onclick="bookHurlingMatch(${match.id})" style="width:100%; margin-top:15px; background:var(--primary); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:700;">
                    Plan Experience
                </button>
            </div>
        </div>
    `).join('');
}

window.bookHurlingMatch = async function(matchId) {
    const match = GAA_MATCHES.find(m => m.id === matchId);
    const partnerID = localStorage.getItem("partnerID") || "ireland";
    
    if (!confirm(`Wil je een boeking aanmaken voor ${match.teams}?`)) return;

    showToast("⏳ Bezig met boeken...");

    const params = new URLSearchParams();
    params.append('entry.761572476', `PARTNER_${partnerID.toUpperCase()}`); // Naam
    params.append('entry.1446094233', `Hurling: ${match.teams}`);           // Experience
    params.append('entry.301148404', match.date);                           // Datum
    params.append('entry.175134312', '1');                                  // Gasten

    try {
        await fetch(GOOGLE_FORM_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: params
        });

        showToast("✅ Wedstrijd toegevoegd!");
        setTimeout(loadDataFromSheet, 1500); // Ververs tabel
    } catch (e) {
        showToast("❌ Fout bij boeken");
    }
};

// --- UI & TABEL FUNCTIES ---

function renderTable(bookings) {
    const container = document.getElementById('bookingsTableContainer');
    if (!container) return;

    const partnerID = (localStorage.getItem("partnerID") || "lima").toLowerCase();
    const highlightColor = partnerID === 'ireland' ? '#ecfdf5' : '#f0f9ff';
    const textColor = partnerID === 'ireland' ? '#065f46' : '#0369a1';

    let html = `<table><thead><tr>
        <th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Status</th>
    </tr></thead><tbody>`;

    if (bookings.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding:30px; color:gray;">No bookings found.</td></tr>`;
    }

    bookings.forEach(b => {
        html += `<tr>
            <td><strong>${b["Start Date"] || "-"}</strong></td>
            <td>${b["Full Name"] || b["Full name"] || "-"}</td>
            <td><span style="background:${highlightColor}; color:${textColor}; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600;">
                ${b["Experience"] || b["Choose Your Experience"] || "-"}
            </span></td>
            <td><strong>${b["Guests"] || "1"}</strong></td>
            <td><span class="badge-confirmed">Confirmed</span></td>
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
    b.forEach(x => count += parseInt(x["Guests"]) || 1);
    if (totalG) totalG.textContent = count;
}

function initCalendar(partnerID) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        eventColor: partnerID === 'ireland' ? '#10b981' : '#38bdf8',
        height: 'auto'
    });
    window.calendar.render();
}

function populateCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    const events = b.map(x => {
        let d = x["Start Date"];
        if (d && d.includes('-')) {
            const p = d.split('-');
            if (p[2]?.length === 4) d = `${p[2]}-${p[1]}-${p[0]}`;
        }
        return { title: `${x["Full Name"] || "Guest"} (${x["Guests"] || 1})`, start: d, allDay: true };
    }).filter(e => e.start);
    window.calendar.addEventSource(events);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (t) {
        t.textContent = msg;
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 3000);
    }
}

// Global Nav functie
window.showSection = (sectionId, element) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (element) element.classList.add('active');
    if (sectionId === 'overview' && window.calendar) setTimeout(() => window.calendar.render(), 150);
};
