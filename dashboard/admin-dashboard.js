/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 3.3
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyYtHXhkPFEy2UgaPOfY3m85G6rOYmw2xjnibSKVDLhgnSsuUqm0SnMjURyndvIOZOMhQ/exec?action=getPartnerInfo';

let revenueChart = null;
let allBookings = [];
let packagePriceCache = {};      // { "PackageName": sellPrice }
let partnerInfoFromSheet = null; // geladen vanuit PartnerInfo tab in Sheet

// --- PARTNER OPERATIONAL INFO ---
// Vul hieronder per partner de operationele details in.
// partnerId moet exact overeenkomen met de partnerID in je Google Sheet.
// Je kunt meerdere locations toevoegen per partner.
const partnerOperationalInfo = {

    dublin: {
        partnerId: 'Dublin',
        partnerName: 'Dublin Experience',
        sheetIds: ['Dublin', 'dublin', 'Dublin Experience', 'Na Fianna'],
        defaultLocationId: 'dublin-city',
        locations: [
            {
                id: 'dublin-city',
                label: 'Dublin',
                venue: 'Na Fianna GAA Club',
                address: 'St Mobhi Rd, Drumcondra, Dublin 9',
                contactName: '',
                contactPhone: '',
                contactEmail: '',
                bookingCutoffHours: 24,
                maxGroupSize: null,
                sessionSchedule: 'Publieke sessies: ma-vr 10:00, za 11:00. Zomer: ook Galway ma-za 11:00.',
                netRatePerPerson: 39.50,
                privateMinGroup: 10,
                notes: 'Boekingsdeadline: min. 24u van tevoren, meer notice is beter.\n\nPublieke & private sessies hebben dezelfde basisstructuur (introductie + veld). Private groepen kunnen worden aangepast: meer sport of competitief element mogelijk.\n\nPrivate sessies: min. 10 personen (Dublin & Galway). Belfast en Cork: alleen groepsboeking (min. 10), geen dagelijkse publieke sessie.\n\nCopy: sessiebeschrijving eerst ter goedkeuring voorleggen aan partner voor publicatie. Niet overpromisen.'
            }
        ]
    },

    ireland: {
        partnerId: 'Ireland',
        partnerName: 'Ireland Experience',
        sheetIds: ['Ireland', 'ireland', 'Ireland Experience', 'Hurling Tours Ireland'],  // voeg hier elke naam toe die in je sheet kan staan
        defaultLocationId: 'ireland-kilkenny',
        locations: [
            {
                id: 'ireland-kilkenny',
                label: 'Kilkenny',
                venue: '',
                address: '',
                contactName: '',
                contactPhone: '',
                contactEmail: '',
                bookingCutoffHours: 48,
                maxGroupSize: 12,
                sessionSchedule: '',
                netRatePerPerson: 0,
                notes: ''
            }
        ]
    }

};


// --- SHEET-GEBASEERDE PARTNER INFO ---
// Haalt partner operationele info op uit de 'PartnerInfo' tab in Google Sheet.
// Overschrijft de hardcoded partnerOperationalInfo zodra de Sheet geladen is.
async function fetchPartnerInfoFromSheet() {
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartnerInfo`, { redirect: 'follow' });
        const rows = await response.json();

        if (!Array.isArray(rows) || rows.length === 0) return;

        // Groepeer rijen per PartnerID
        const grouped = {};
        rows.forEach(row => {
            const pid = (row.PartnerID || '').trim();
            if (!pid) return;
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(row);
        });

        // Bouw partnerOperationalInfo opnieuw op vanuit Sheet data
        Object.entries(grouped).forEach(([pid, locations]) => {
            const key = pid.toLowerCase();
            const existing = partnerOperationalInfo[key];

            // Behoud sheetIds uit de hardcoded config als die er is
            const sheetIds = existing?.sheetIds || [pid];

            partnerOperationalInfo[key] = {
                partnerId: pid,
                partnerName: existing?.partnerName || pid,
                sheetIds: sheetIds,
                defaultLocationId: locations[0]?.LocationID || `${key}-main`,
                locations: locations.map(row => ({
                    id:                  row.LocationID      || `${key}-main`,
                    label:               row.LocationLabel   || pid,
                    venue:               row.Venue           || '',
                    address:             row.Address         || '',
                    contactName:         row.ContactName     || '',
                    contactPhone:        row.ContactPhone    || '',
                    contactEmail:        row.ContactEmail    || '',
                    bookingCutoffHours:  row.BookingCutoffHours ? parseInt(row.BookingCutoffHours) : null,
                    maxGroupSize:        row.MaxGroupSize        ? parseInt(row.MaxGroupSize)       : null,
                    privateMinGroup:     row.PrivateMinGroup     ? parseInt(row.PrivateMinGroup)    : null,
                    sessionSchedule:     row.SessionSchedule || '',
                    netRatePerPerson:    row.NetRatePerPerson ? parseFloat(row.NetRatePerPerson) : null,
                    notes:               row.Notes           || ''
                }))
            };
        });

        partnerInfoFromSheet = true;
        console.log('PartnerInfo geladen vanuit Sheet:', Object.keys(grouped));

        // Herrender het paneel als dat open is
        renderPartnerInfoFromSelection();

    } catch (e) {
        console.warn('PartnerInfo Sheet niet bereikbaar, hardcoded data wordt gebruikt:', e);
    }
}

function normalizePartnerKey(value = '') {
    return String(value).trim().toLowerCase();
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getPartnerOperationalEntry(partnerId = '') {
    const normalized = normalizePartnerKey(partnerId);
    if (!normalized) return null;
    return Object.values(partnerOperationalInfo).find(entry => {
        // Match op partnerId of partnerName
        if (normalizePartnerKey(entry.partnerId) === normalized) return true;
        if (normalizePartnerKey(entry.partnerName) === normalized) return true;
        // Match op alle sheetIds — voeg hier waarden toe als de sheet-naam wijzigt
        if (Array.isArray(entry.sheetIds)) {
            return entry.sheetIds.some(id => normalizePartnerKey(id) === normalized);
        }
        return false;
    }) || null;
}

function ensurePartnerOperationalEntry(partnerId = '', partnerName = '') {
    const key = normalizePartnerKey(partnerId || partnerName);
    if (!key) return null;

    if (!partnerOperationalInfo[key]) {
        const displayName = partnerName || partnerId || key;
        partnerOperationalInfo[key] = {
            partnerId: partnerId || key,
            partnerName: displayName,
            defaultLocationId: `${key}-main`,
            locations: [
                {
                    id: `${key}-main`,
                    label: displayName,
                    venue: displayName,
                    address: '',
                    contactName: '',
                    contactPhone: '',
                    contactEmail: '',
                    notes: 'Nog geen operationele info ingevuld.'
                }
            ]
        };
    } else {
        if (partnerId && !partnerOperationalInfo[key].partnerId) {
            partnerOperationalInfo[key].partnerId = partnerId;
        }
        if (partnerName && (!partnerOperationalInfo[key].partnerName || partnerOperationalInfo[key].partnerName === partnerOperationalInfo[key].partnerId)) {
            partnerOperationalInfo[key].partnerName = partnerName;
        }
    }

    return partnerOperationalInfo[key];
}

function initPartnerInfoEvents() {
    const partnerSelect = document.getElementById('partnerInfoPartnerSelect');
    const locationSelect = document.getElementById('partnerInfoLocationSelect');

    if (partnerSelect && !partnerSelect.dataset.bound) {
        partnerSelect.addEventListener('change', () => {
            populatePartnerInfoSelectors(partnerSelect.value);
        });
        partnerSelect.dataset.bound = 'true';
    }

    if (locationSelect && !locationSelect.dataset.bound) {
        locationSelect.addEventListener('change', () => {
            renderPartnerInfoFromSelection();
        });
        locationSelect.dataset.bound = 'true';
    }
}

function populatePartnerInfoSelectors(defaultPartnerId = 'dublin') {
    const partnerSelect = document.getElementById('partnerInfoPartnerSelect');
    const locationSelect = document.getElementById('partnerInfoLocationSelect');

    if (!partnerSelect || !locationSelect) return;

    const partnerEntries = Object.values(partnerOperationalInfo);
    if (!partnerEntries.length) {
        partnerSelect.innerHTML = '<option value="">No partners</option>';
        locationSelect.innerHTML = '<option value="">No locations</option>';
        renderPartnerInfoFromSelection();
        return;
    }

    partnerSelect.innerHTML = partnerEntries.map(entry => `
        <option value="${escapeHtml(entry.partnerId)}">${escapeHtml(entry.partnerName)}</option>
    `).join('');

    let selectedPartner = getPartnerOperationalEntry(defaultPartnerId);

    if (!selectedPartner) {
        selectedPartner =
            getPartnerOperationalEntry(partnerSelect.value) ||
            getPartnerOperationalEntry('dublin') ||
            partnerEntries[0];
    }

    partnerSelect.value = selectedPartner.partnerId;

    const locations = Array.isArray(selectedPartner.locations) ? selectedPartner.locations : [];

    locationSelect.innerHTML = locations.length
        ? locations.map(loc => `
            <option value="${escapeHtml(loc.id)}">${escapeHtml(loc.label)}</option>
        `).join('')
        : '<option value="">No locations</option>';

    if (locations.length) {
        locationSelect.value = selectedPartner.defaultLocationId || locations[0].id;
    }

    renderPartnerInfoFromSelection();
}

function renderPartnerInfoFromSelection() {
    const partnerSelect = document.getElementById('partnerInfoPartnerSelect');
    const locationSelect = document.getElementById('partnerInfoLocationSelect');
    const container = document.getElementById('partnerInfoContent');

    if (!partnerSelect || !locationSelect || !container) return;

    const partner = getPartnerOperationalEntry(partnerSelect.value);

    if (!partner) {
        container.innerHTML = `
            <div style="padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#fff;">
                <strong style="color:#0f172a;">No partner info found.</strong>
            </div>
        `;
        return;
    }

    const locations = Array.isArray(partner.locations) ? partner.locations : [];
    const selectedLocation =
        locations.find(loc => loc.id === locationSelect.value) ||
        locations.find(loc => loc.id === partner.defaultLocationId) ||
        locations[0];

    if (!selectedLocation) {
        container.innerHTML = `
            <div style="padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#fff;">
                <strong style="color:#0f172a;">No location info available.</strong>
            </div>
        `;
        return;
    }

    const tile = (icon, label, value, yellow = false) => `
        <div style="padding:14px; border-radius:12px; background:${yellow ? '#fffbeb' : '#f8fafc'}; border:1px solid ${yellow ? '#fde68a' : '#e2e8f0'};">
            <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                <i class="${escapeHtml(icon)}" style="color:#c5a059; font-size:0.75rem;"></i>
                ${escapeHtml(label)}
            </div>
            <div style="font-weight:700; color:#0f172a; font-size:0.9rem; line-height:1.5;">${value || '<span style="color:#94a3b8;">—</span>'}</div>
        </div>`;

    const cutoff    = selectedLocation.bookingCutoffHours ? `${selectedLocation.bookingCutoffHours} uur van tevoren` : '';
    const maxGroup  = selectedLocation.maxGroupSize      ? `Max. ${selectedLocation.maxGroupSize} gasten`            : '';
    const netRate   = selectedLocation.netRatePerPerson  ? `€${selectedLocation.netRatePerPerson} p.p.`              : '';
    const privMin   = selectedLocation.privateMinGroup   ? `Min. ${selectedLocation.privateMinGroup} personen`        : '';

    container.innerHTML = `
        <div style="border-radius:14px; overflow:hidden; border:1px solid #e2e8f0;">

            <div style="background:#0f172a; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <div style="font-weight:800; color:#fff; font-size:1rem;">${escapeHtml(partner.partnerName)}</div>
                    <div style="color:#c5a059; font-size:0.8rem; margin-top:2px;">${escapeHtml(selectedLocation.label)}</div>
                </div>
                ${netRate ? `<span style="background:rgba(197,160,89,0.15); color:#c5a059; border:1px solid rgba(197,160,89,0.3); padding:5px 12px; border-radius:999px; font-size:0.8rem; font-weight:800;">${escapeHtml(netRate)} netto</span>` : ''}
            </div>

            <div style="padding:16px; background:#fff;">

                <p style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">Locatie & contact</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
                    ${tile('fa-solid fa-location-dot', 'Venue', escapeHtml(selectedLocation.venue))}
                    ${tile('fa-solid fa-map-pin', 'Adres', escapeHtml(selectedLocation.address))}
                    ${tile('fa-solid fa-user', 'Contact', escapeHtml(selectedLocation.contactName))}
                    ${tile('fa-solid fa-phone', 'Telefoon', escapeHtml(selectedLocation.contactPhone))}
                    ${tile('fa-solid fa-envelope', 'E-mail', escapeHtml(selectedLocation.contactEmail))}
                </div>

                <p style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">Boekingsregels</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:16px;">
                    ${tile('fa-solid fa-clock', 'Boekingsdeadline', escapeHtml(cutoff), true)}
                    ${tile('fa-solid fa-users', 'Max. groep (publiek)', escapeHtml(maxGroup), true)}
                    ${tile('fa-solid fa-user-group', 'Min. privé groep', escapeHtml(privMin), true)}
                    ${tile('fa-solid fa-calendar-days', 'Sessietijden', escapeHtml(selectedLocation.sessionSchedule), true)}
                </div>

                ${selectedLocation.notes ? `
                <p style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">Notities</p>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; color:#475569; font-size:0.88rem; line-height:1.6; white-space:pre-wrap;">${escapeHtml(selectedLocation.notes)}</div>
                ` : ''}

            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === "function") {
        if (!window.checkAuth('admin')) return;
    }

    const currentDateDisplay = document.getElementById('currentDateDisplay');
    if (currentDateDisplay) {
        currentDateDisplay.textContent = new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    initCalendar();
    initPartnerInfoEvents();
    populatePartnerInfoSelectors('dublin');
    loadPartnerFilterOptions();
    loadAdminData();
    fetchPartnerInfoFromSheet();

    // Automatisch elke 5 minuten verversen
    setInterval(loadAdminData, 5 * 60 * 1000);
});

async function loadPartnerFilterOptions() {
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect: 'follow' });
        const partners = await response.json();
        if (!partners || !partners.length) return;

        partners.forEach(p => ensurePartnerOperationalEntry(p.partnerID, p.name));

        const select = document.getElementById('partnerFilter');
        if (select) {
            const current = select.value;
            select.innerHTML = `<option value="all">Global View</option>`;
            partners.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.partnerID;
                opt.textContent = p.name || p.partnerID;
                select.appendChild(opt);
            });
            select.value = current || 'all';
        }

        const pkgSelect = document.getElementById('pkg_partnerid');
        if (pkgSelect) {
            pkgSelect.innerHTML = '';
            partners.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.partnerID;
                opt.textContent = p.name || p.partnerID;
                pkgSelect.appendChild(opt);
            });
        }

        const currentPartnerInfoValue = document.getElementById('partnerInfoPartnerSelect')?.value || 'dublin';
        populatePartnerInfoSelectors(currentPartnerInfoValue);
    } catch (e) {
        console.error("Could not load partner filter:", e);
    }
}

// --- NAVIGATIE ---
window.showSection = (sId, el) => {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    const target = document.getElementById(sId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    if (sId === 'partners') {
        loadPartnerList();
        initPartnerInfoEvents();
        populatePartnerInfoSelectors('dublin');
        fetchPartnerInfoFromSheet();
    }

    if (sId === 'packages') {
        loadPackageList();
    }

    if (sId === 'overview') {
        setTimeout(() => {
            if (window.calendar) {
                window.calendar.updateSize();
                window.calendar.render();
            }
            if (revenueChart) revenueChart.update();
        }, 150);
    }
};

// --- DATA LADEN ---
async function loadAdminData() {
    const syncBtn = document.getElementById('syncBtn');
    const filterEl = document.getElementById('partnerFilter');
    const filterValue = filterEl ? filterEl.value : 'all';

    if (syncBtn) {
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    }

    try {
        const [bookingResponse, packageResponse] = await Promise.all([
            fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterValue)}`, { redirect: 'follow' }),
            fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`, { redirect: 'follow' })
        ]);

        const data = await bookingResponse.json();
        allBookings = Array.isArray(data) ? data.filter(row => row["Full Name"] || row["Experience"]) : [];

        // Bouw een lookup: "Experience naam" → sell price
        try {
            const packages = await packageResponse.json();
            packagePriceCache = {};
            if (Array.isArray(packages)) {
                packages.forEach(p => {
                    const key = (p.PackageName || '').trim().toLowerCase();
                    if (key) packagePriceCache[key] = parseFloat(p.SellPrice) || 0;
                });
            }
        } catch (pkgErr) {
            console.warn("Could not load package prices, falling back to €75/guest:", pkgErr);
        }

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);
    } catch (e) {
        console.error("Sync error:", e);
    } finally {
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
        }
    }
}

// --- TABEL ---
function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!container) return;

    if (!bookings.length) {
        container.innerHTML = "<p style='padding:20px; color:#64748b;'>No bookings found.</p>";
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Partner</th>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Experience</th>
                    <th>Pax</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    const sorted = [...bookings].sort((a, b) => {
        return new Date(b["Start Date"] || b["Date"]) - new Date(a["Start Date"] || a["Date"]);
    });

    sorted.forEach((b) => {
        const index = allBookings.indexOf(b);
        const d = new Date(b["Start Date"] || b["Date"]);
        const fDate = !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "-";
        const rawDate = b["Start Date"] || b["Date"] || "";
        const rawStatus = b["Status"] || "Pending";
        const name = (b["Full Name"] || "Guest").replace(/'/g, "\\'");

        html += `
            <tr>
                <td><span class="badge-partner">${b["Partner"] || "-"}</span></td>
                <td><strong>${fDate}</strong></td>
                <td><span onclick="openBookingModal(${index})" style="cursor:pointer; color:#c5a059; font-weight:700;">${b["Full Name"] || "Guest"}</span></td>
                <td style="font-size:0.8rem;">${b["Experience"] || "-"}</td>
                <td>${b["Guests"] || 1}</td>
                <td>
                    <select onchange="updateBookingStatus('${name}', '${rawDate}', this.value, this)"
                        style="padding:5px 8px; border-radius:6px; border:1px solid #e2e8f0; font-size:0.8rem; font-weight:600; cursor:pointer;
                        background:${rawStatus.toLowerCase() === 'confirmed' ? '#dcfce7' : rawStatus.toLowerCase() === 'cancelled' ? '#fee2e2' : '#fef3c7'};
                        color:${rawStatus.toLowerCase() === 'confirmed' ? '#166534' : rawStatus.toLowerCase() === 'cancelled' ? '#991b1b' : '#92400e'};">
                        <option value="Pending" ${rawStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${rawStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Cancelled" ${rawStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>`;
    });

    container.innerHTML = html + '</tbody></table>';
}

// --- STATUS UPDATE ---
async function updateBookingStatus(name, date, newStatus, selectEl) {
    if (selectEl) {
        selectEl.style.background = newStatus === 'Confirmed'
            ? '#dcfce7'
            : newStatus === 'Cancelled'
                ? '#fee2e2'
                : '#fef3c7';

        selectEl.style.color = newStatus === 'Confirmed'
            ? '#166534'
            : newStatus === 'Cancelled'
                ? '#991b1b'
                : '#92400e';
    }

    try {
        const response = await fetch(`${SHEET_API_URL}?action=updateStatus&name=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&status=${encodeURIComponent(newStatus)}`, { redirect: 'follow' });
        const text = await response.text();

        try {
            const result = JSON.parse(text);
            if (result.status !== "success") {
                console.warn("Status update warning:", result.message);
            }
        } catch (parseErr) {
            console.log("Status updated (redirect response)");
        }
    } catch (e) {
        console.error("Connection error:", e);
    }
}

// --- BOOKING MODAL ---
window.openBookingModal = function(index) {
    const b = allBookings[index];
    if (b) showAdminBookingModal(b);
};

function showAdminBookingModal(b) {
    const existing = document.getElementById('adminBookingModal');
    if (existing) existing.remove();

    const rawStatus = b["Status"] || "Pending";
    const statusColor = rawStatus.toLowerCase() === 'confirmed'
        ? '#166534'
        : rawStatus.toLowerCase() === 'cancelled'
            ? '#991b1b'
            : '#92400e';

    const statusBg = rawStatus.toLowerCase() === 'confirmed'
        ? '#dcfce7'
        : rawStatus.toLowerCase() === 'cancelled'
            ? '#fee2e2'
            : '#fef3c7';

    const d = new Date(b["Start Date"] || b["Date"]);
    const dateStr = !isNaN(d)
        ? d.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : "-";

    const modal = document.createElement('div');
    modal.id = 'adminBookingModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <button class="modal-close" onclick="document.getElementById('adminBookingModal').remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 style="margin-bottom:20px; color:#1e293b;">Booking Details</h3>
            <div class="modal-row">
                <div class="modal-label">Partner</div>
                <div class="modal-value">${b["Partner"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Guest</div>
                <div class="modal-value">${b["Full Name"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Experience</div>
                <div class="modal-value">${b["Experience"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Date</div>
                <div class="modal-value">${dateStr}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Guests</div>
                <div class="modal-value">${b["Guests"] || "1"} pax</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Email</div>
                <div class="modal-value">${b["Email Address"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Phone</div>
                <div class="modal-value">${b["Phone Number"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Special Requests</div>
                <div class="modal-value">${b["Special Requests"] || "-"}</div>
            </div>
            <div class="modal-row">
                <div class="modal-label">Status</div>
                <div style="margin-top:4px;">
                    <span style="padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; text-transform:uppercase; background:${statusBg}; color:${statusColor};">
                        ${rawStatus}
                    </span>
                </div>
            </div>
        </div>`;

    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// --- EXPORT ---
window.exportBookingsToCSV = function() {
    if (!allBookings.length) return alert("No data to export.");

    const headers = ["Partner", "Full Name", "Email Address", "Phone Number", "Experience", "Start Date", "Guests", "Special Requests"];
    const csvContent = [
        headers.join(","),
        ...allBookings.map(row =>
            headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(",")
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BTP_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

window.calculateSellPrice = () => {
    const net = parseFloat(document.getElementById('pkg_net')?.value) || 0;
    const comm = parseFloat(document.getElementById('pkg_comm')?.value) || 0;
    const sellInput = document.getElementById('pkg_sell');
    if (sellInput) {
        sellInput.value = (net * (1 + comm / 100)).toFixed(2);
    }
};

// --- PACKAGES ---
async function loadPackageList() {
    const container = document.getElementById('packagesTableContainer');
    if (!container) return;

    container.innerHTML = "Loading...";

    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();

        let h = `<table class="admin-table"><thead><tr><th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th></tr></thead><tbody>`;
        pkgs.forEach(p => {
            const n = parseFloat(p.NetPrice) || 0;
            const s = parseFloat(p.SellPrice) || 0;
            h += `<tr>
                <td>${p.PartnerID}</td>
                <td><strong>${p.PackageName}</strong></td>
                <td>€${n.toFixed(2)}</td>
                <td>€${s.toFixed(2)}</td>
                <td style="color:#10b981;font-weight:bold">€${(s - n).toFixed(2)}</td>
                <td><button class="btn-delete" onclick="deletePackage('${p.PackageName}','${p.PartnerID}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        });

        container.innerHTML = h + "</tbody></table>";
    } catch (e) {
        container.innerHTML = "Error loading packages.";
    }
}

async function deletePackage(name, partner) {
    if (!confirm(`Delete ${name}?`)) return;

    try {
        await fetch(`${SHEET_API_URL}?action=deletePackage&name=${encodeURIComponent(name)}&partnerID=${encodeURIComponent(partner)}`, { redirect: 'follow' });
        loadPackageList();
    } catch (e) {
        loadPackageList();
    }
}

async function submitNewPackage() {
    const pID = document.getElementById('pkg_partnerid')?.value;
    const name = document.getElementById('pkg_name')?.value;
    const net = document.getElementById('pkg_net')?.value;
    const sell = document.getElementById('pkg_sell')?.value;

    await fetch(`${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}`, { redirect: 'follow' });

    const form = document.getElementById('addPackageForm');
    if (form) form.style.display = 'none';

    loadPackageList();
}

// --- STATS & CHARTS ---
function updateAdminStats(b) {
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalGuestsEl = document.getElementById('totalGuests');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const activePartnersEl = document.getElementById('activePartners');

    if (totalBookingsEl) totalBookingsEl.textContent = b.length;

    const g = b.reduce((s, x) => s + (parseInt(x["Guests"]) || 0), 0);

    // Revenue: gebruik echte SellPrice uit packages, anders fallback €75/gast
    const revenue = b.reduce((sum, x) => {
        const guests = parseInt(x["Guests"]) || 0;
        const experienceKey = (x["Experience"] || '').trim().toLowerCase();
        const pricePerPerson = packagePriceCache[experienceKey] || 75;
        return sum + (guests * pricePerPerson);
    }, 0);

    if (totalGuestsEl) totalGuestsEl.textContent = g;
    if (totalRevenueEl) totalRevenueEl.textContent = `€${revenue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (activePartnersEl) activePartnersEl.textContent = new Set(b.map(x => x["Partner"])).size;
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        eventColor: '#c5a059'
    });

    window.calendar.render();
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;

    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({
        title: `[${x.Partner}] ${x["Full Name"]}`,
        start: x["Start Date"],
        allDay: true
    })));
}

function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (revenueChart) revenueChart.destroy();

    const monthlyData = {};
    bookings.forEach(b => {
        const d = new Date(b["Start Date"] || b["Date"]);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const guests = parseInt(b["Guests"]) || 0;
        const experienceKey = (b["Experience"] || '').trim().toLowerCase();
        const pricePerPerson = packagePriceCache[experienceKey] || 75;
        monthlyData[key] = (monthlyData[key] || 0) + (guests * pricePerPerson);
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return new Date(y, m - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    });
    const values = sortedKeys.map(k => monthlyData[k]);

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No data'],
            datasets: [{
                label: 'Revenue (€)',
                data: values.length ? values : [0],
                borderColor: '#c5a059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#c5a059'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `€${Math.round(ctx.parsed.y).toLocaleString('nl-NL')}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: v => `€${Math.round(v).toLocaleString('nl-NL')}`
                    }
                },
                x: {
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// --- PARTNERS ---
async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    if (!c) return;

    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`);
        const p = await r.json();

        p.forEach(x => ensurePartnerOperationalEntry(x.partnerID, x.name));

        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>ID</th></tr></thead><tbody>`;
        p.forEach(x => {
            h += `<tr><td><strong>${x.name}</strong></td><td>${x.email}</td><td>${x.partnerID}</td></tr>`;
        });

        c.innerHTML = h + "</tbody></table>";

        const currentPartner = document.getElementById('partnerInfoPartnerSelect')?.value || 'dublin';
        populatePartnerInfoSelectors(currentPartner);
    } catch (e) {
        c.innerHTML = "Error.";
    }
}

async function submitNewPartner() {
    const n = document.getElementById('p_name')?.value;
    const e = document.getElementById('p_user')?.value;
    const p = document.getElementById('p_pass')?.value;
    const id = document.getElementById('p_id')?.value;

    if (!n || !e || !p || !id) return alert("Fill in all fields.");

    await fetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(n)}&user=${encodeURIComponent(e)}&pass=${encodeURIComponent(p)}&partnerID=${encodeURIComponent(id)}`, { redirect: 'follow' });

    ensurePartnerOperationalEntry(id, n);

    const form = document.getElementById('addPartnerForm');
    if (form) form.style.display = 'none';

    loadPartnerList();
    loadPartnerFilterOptions();
    populatePartnerInfoSelectors(id);

    alert(`Partner "${n}" successfully added!`);
}

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
};

window.logout = () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
};

window.togglePartnerForm = () => {
    const f = document.getElementById('addPartnerForm');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

window.togglePackageForm = () => {
    const f = document.getElementById('addPackageForm');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
};
