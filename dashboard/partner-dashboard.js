/**
 * Beyond the Pitch - Partner Dashboard Logic (Stable Version)
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzDuYt-8z_lN_e63avbnrK8_Ik-67vt8t-zimn8VOvtz0glCgiEYOGC-Ywq_7ewZ1hrYA/exec';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth check
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('partner')) return; 
    }
    
    const partnerName = localStorage.getItem("userName") || "Partner";
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${partnerName}`;

    // 2. Global Navigation
    window.showSection = (sectionId, element) => {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        if (element) element.classList.add('active');
        
        // Sluit sidebar op mobiel na klik
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        
        // Forceer kalender refresh
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
    const partnerID = localStorage.getItem("partnerID"); // Haal het ID van de ingelogde partner op
    
    if (syncBtn) syncBtn.innerHTML = "⏳ Wait...";
    
    try {
        // We sturen de partnerID mee naar de sheet
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(partnerID)}`, { redirect: 'follow' });
        const data = await response.json();
        
        // FILTER: Alleen boekingen van deze partner tonen
        // Dit werkt als je in je Google Sheet een kolom "PartnerID" hebt
        const bookings = data.filter(row => {
            const hasName = row["Full Name"] || row["Full name"];
            const matchesPartner = !partnerID || row["PartnerID"] === partnerID;
            return hasName && matchesPartner;
        });

        renderTable(bookings);
        updateStats(bookings);
        populateCalendar(bookings);

        document.getElementById('lastSyncTime').textContent = `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch (e) { 
        console.error("Sync error:", e);
        const container = document.getElementById('bookingsTableContainer');
        if(container) container.innerHTML = "<p style='color:red;'>Error loading data. Please try again.</p>";
    }
    if (syncBtn) syncBtn.innerHTML = "🔄 Sync";
}

// ... De rest van je functies (renderTable, updateStats, populateCalendar) blijven hetzelfde als in jouw werkende code ...
