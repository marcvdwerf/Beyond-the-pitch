/**
 * Beyond the Pitch - Partner Dashboard Logic
 * Geoptimaliseerd voor flexibele kolomnamen en automatische data-mapping
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwM3W72PX26NIB5_2AR5Zat1Buw8NhzcN2fKvNifmrkbEDPYvresi129kEsjpGMcApC0Q/exec';

document.addEventListener('DOMContentLoaded', () => {
    const partnerID = sessionStorage.getItem("partnerID");
    const userName = sessionStorage.getItem("userName");

    if (!partnerID) {
        console.warn("Geen partnerID gevonden in sessie, redirect naar login...");
        return; 
    }

    // UI Initialiseren
    document.getElementById("welcomeText").innerText = `Welcome, ${userName || 'Partner'}`;
    
    // Data laden
    loadDataFromSheet();
    loadPackages();
});

// 1. Boekingen ophalen
async function loadDataFromSheet() {
    const pID = sessionStorage.getItem("partnerID");
    const syncBtn = document.getElementById("syncBtn");
    if(syncBtn) syncBtn.innerText = "Syncing...";

    try {
        const response = await fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(pID)}`);
        const data = await response.json();
        
        console.log("Ontvangen boekingen:", data); // Debugging: check dit in F12 console

        if (!data || data.error) {
            throw new Error(data.error || "Geen geldige data ontvangen");
        }

        renderStats(data);
        renderTable(data);
        renderCalendar(data);
        
        if(syncBtn) syncBtn.innerText = "🔄 Sync Data";
    } catch (error) {
        console.error("Error loading bookings:", error);
        document.getElementById("bookingsTableContainer").innerHTML = `<p style="color:red;">Fout bij laden data: ${error.message}</p>`;
    }
}

// 2. Dynamische Pakketten ophalen
async function loadPackages() {
    const pID = sessionStorage.getItem("partnerID");
    const pkgGrid = document.getElementById("dynamicPackagesGrid");
    
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=${encodeURIComponent(pID)}`);
        const packages = await response.json();

        console.log("Ontvangen pakketten:", packages);

        if (!packages || packages.length === 0) {
            pkgGrid.innerHTML = "<p>No packages available for your region yet.</p>";
            return;
        }

        pkgGrid.innerHTML = packages.map(pkg => `
            <div class="stat-card">
                <img src="${pkg.ImageURL || 'https://via.placeholder.com/300x150'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
                <h3 style="margin-bottom:5px;">${pkg.PackageName || 'Naamloos pakket'}</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:15px; min-height:40px;">${pkg.Description || 'Geen omschrijving beschikbaar.'}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:var(--primary);">${pkg.Currency || '€'} ${pkg.Price || '0'}</span>
                    <button class="btn btn-outline" style="padding:5px 10px; font-size:0.75rem;">View Details</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error loading packages:", error);
        pkgGrid.innerHTML = "<p>Could not load packages.</p>";
    }
}

// Hulpfuncties voor UI
function renderStats(data) {
    document.getElementById("totalBookings").innerText = data.length;
    // Zoek naar kolomnamen die 'guest' bevatten
    const guestKey = Object.keys(data[0] || {}).find(k => k.toLowerCase().includes("guest"));
    const guests = data.reduce((sum, row) => sum + (parseInt(row[guestKey]) || 0), 0);
    document.getElementById("totalGuests").innerText = guests;
}

/**
 * Verbeterde renderTable: Past zich aan op basis van de kolommen in de Google Sheet
 */
function renderTable(data) {
    const container = document.getElementById("bookingsTableContainer");
    if (!data || data.length === 0) { 
        container.innerHTML = "No bookings found."; 
        return; 
    }

    // Pak de headers dynamisch uit de data (alle keys van het eerste object)
    const headers = Object.keys(data[0]);

    let html = `<table><thead><tr>`;
    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.forEach(row => {
        html += `<tr>`;
        headers.forEach(h => {
            let value = row[h] || '-';
            // Styling voor specifieke kolommen
            if (h.toLowerCase().includes("package")) {
                value = `<span class="badge">${value}</span>`;
            }
            html += `<td>${value}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function showSection(sectionId, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    el.classList.add('active');
}

// Kalender setup (FullCalendar)
function renderCalendar(data) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !data.length) return;

    // Zoek dynamisch naar de datum- en naamkolom
    const dateKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("date") || k.toLowerCase().includes("time"));
    const nameKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("customer"));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: data.map(row => ({
            title: row[nameKey] || "Booking",
            start: row[dateKey],
            backgroundColor: 'var(--primary)',
            borderColor: 'var(--primary-dark)'
        }))
    });
    calendar.render();
}

/**
 * Exporteer huidige data naar Excel
 */
window.exportToExcel = function() {
    const partnerID = sessionStorage.getItem("partnerID") || "Export";
    const table = document.querySelector("table");
    if (!table) return alert("Geen data om te exporteren");
    
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `Bookings_BeyondThePitch_${partnerID}.xlsx`);
};
