/**
 * Beyond the Pitch - Master Admin Dashboard Logic
 * Versie: 4.0 — Pipeline + Email Composer
 */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxDoEqNnYDf60dDVNjqzRTjh595ee3ufzpuKEyXJ-3Ns8pwTNLAZWw5DtjANUmVKr0irw/exec';

let revenueChart    = null;
let allBookings     = [];
let packagePriceCache = {};
let partnerInfoFromSheet = null;

// ─── Pipeline state ───────────────────────────────────────────────────────────
let selectedBooking   = null;   // het huidig geselecteerde booking-object
let activeTemplate    = 'confirmation';

// Status → kolomnaam mapping
const STAGE_MAP = {
    'Pending'   : 'new',
    'Confirmed' : 'confirmed',
    'Paid'      : 'paid',
    'Ready'     : 'ready',
    'Complete'  : 'complete',
    'Cancelled' : 'complete'   // geannuleerd toont in Complete kolom met aparte stijl
};

// ─── E-mail templates ─────────────────────────────────────────────────────────
const EMAIL_TEMPLATES = {

    // ── 1. BEVESTIGING (ontvangst aanvraag) ──────────────────────────────────
    confirmation: {
        label: 'Bevestiging',
        subject: (b) => `☘ We\'ve received your Beyond the Pitch request`,
        body: (b) => {
            const firstName = (b['Full Name'] || 'there').split(' ')[0];
            const date      = formatDateLong(b['Start Date']);
            const guests    = b['Guests'] || '1';
            const experience = b['Experience'] || 'your experience';
            const partner   = (b['Partner'] || '').toLowerCase();
            const isPrague  = partner.includes('prague');
            const closing   = isPrague
                ? 'Kamil and the team will be in touch within 24–48 hours.\n\nSee you in Prague,\nBeyond the Pitch\ntravelbeyondthepitch.com/prague'
                : 'Our team is checking availability with our local partner and will be in touch within 24–48 hours.\n\nSee you on the pitch,\nBeyond the Pitch\ntravelbeyondthepitch.com';
            return `Hi ${firstName},

Slán abhaile — welcome to Beyond the Pitch! ☘

We\'ve received your booking request and we\'re delighted to have you join us.

Experience: ${experience}
Date: ${date}
Guests: ${guests}

${closing}`;
        }
    },

    // ── 2. BETAALLINK (boeking goedgekeurd) ──────────────────────────────────
    payment: {
        label: 'Betaallink',
        subject: (b) => `✅ You\'re booked! – ${b['Experience'] || 'Beyond the Pitch'}`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const date       = formatDateLong(b['Start Date']);
            const guests     = b['Guests'] || '1';
            const experience = b['Experience'] || 'your experience';
            const partner    = (b['Partner'] || '').toLowerCase();
            const isPrague   = partner.includes('prague');
            const closing    = isPrague
                ? 'Kamil and the team are looking forward to seeing you in Prague.\n\nBeyond the Pitch\ntravelbeyondthepitch.com/prague'
                : 'A full preparation guide with directions, what to wear and what to bring will follow closer to your experience date.\n\nGo raibh míle maith agat,\nBeyond the Pitch\ntravelbeyondthepitch.com';
            return `Hi ${firstName},

Fáilte romhat — you\'re officially part of the Beyond the Pitch family! 🎉

Your spot is confirmed. Please complete payment via the link below to secure your booking:

→ [STRIPE PAYMENT LINK — paste before sending]

Confirmed booking details
Experience: ${experience}
Date: ${date}
Guests: ${guests}

${closing}`;
        }
    },

    // ── 3. 4 WEKEN VOOR DE ERVARING ──────────────────────────────────────────
    reminder_4weeks: {
        label: '4 weken voor',
        subject: (b) => `⏳ 4 weeks until your ${b['Experience'] || 'Beyond the Pitch'} experience!`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const date       = formatDateLong(b['Start Date']);
            const guests     = b['Guests'] || '1';
            const experience = b['Experience'] || 'your experience';
            const partner    = (b['Partner'] || '').toLowerCase();
            const isPrague   = partner.includes('prague');
            const isKilkenny = partner.includes('kilkenny') || partner.includes('ireland');

            const practicalInfo = isPrague
                ? `What to expect
The experience starts at the National Theatre (Národní divadlo), Ostrovní 1, Prague 1. Kamil will meet you at the main entrance.

The walk takes around 2 hours and covers central Prague on foot — wear comfortable shoes. The Czech Hockey Hall of Fame is indoors and takes about 45 minutes.

If you\'re doing Version B, your match ticket details will follow once the fixture is confirmed.`
                : isKilkenny
                ? `What to prepare
Wear comfortable, flexible sports clothing and sturdy footwear — you\'ll be on the pitch.
Bring a water bottle and a light rain jacket. This is Ireland, after all.
No prior experience needed. All equipment is provided on the day.

Your exact meeting point will be confirmed in your 48-hour reminder — either Freshford (The Square, Co. Kilkenny) or Kilkenny City (O\'Loughlin Gaels GAA Club). We\'ll let you know which applies to your session.`
                : `What to prepare
Wear comfortable, flexible sports clothing and sturdy footwear — you\'ll be on the pitch at Na Fianna GAA Club.
Bring a water bottle and a light rain jacket.
No prior experience needed. Hurleys, sliotars and footballs are all provided.

Meeting point: Na Fianna GAA Club, St Mobhi Rd, Drumcondra, Dublin 9`;

            return `Hi ${firstName},

Can you believe it\'s almost time? In just four weeks you\'ll be joining us for ${experience} on ${date}.

${practicalInfo}

If you have any questions before the day, just reply to this email — we\'re always happy to help.

See you soon,
Beyond the Pitch
travelbeyondthepitch.com`;
        }
    },

    // ── 4. 48 UUR VOOR DE ERVARING ───────────────────────────────────────────
    reminder: {
        label: '48u reminder',
        subject: (b) => `🏆 48 hours to go – everything you need for ${b['Experience'] || 'your experience'}`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const date       = formatDateLong(b['Start Date']);
            const experience = b['Experience'] || 'your experience';
            const partner    = (b['Partner'] || '').toLowerCase();
            const isPrague   = partner.includes('prague');
            const isKilkenny = partner.includes('kilkenny') || partner.includes('ireland');

            const logistics = isPrague
                ? `📍 Meeting point: National Theatre (Národní divadlo), Ostrovní 1, Prague 1
   Meet Kamil at the main entrance — he\'ll be there to welcome you
⏰ Please arrive 5–10 minutes before your start time
👟 Comfortable walking shoes — you\'ll be on your feet for about 2 hours
🎒 No special gear needed — just curiosity and a bit of appetite for history`
                : isKilkenny
                ? `📍 Meeting point: [FRESHFORD — The Square, Freshford, Co. Kilkenny OR Kilkenny City — O\'Loughlin Gaels GAA Club — confirm which applies]
⏰ Please arrive 10 minutes before the session starts
👟 Wear sports clothes and sturdy footwear
💧 Bring water — it\'s an active session!
🏑 All equipment (hurleys, sliotars) is provided on the day`
                : `📍 Na Fianna GAA Club, St Mobhi Rd, Drumcondra, Dublin 9
⏰ Please arrive 10 minutes before the session starts
👟 Wear sports clothes and trainers
💧 Bring water — it\'s an active session!
🏑 All equipment (hurleys, sliotars, footballs) is provided on the day`;

            const fixture = b['Fixture'] ? `\nMatch: ${b['Fixture']}` : '';

            return `Hi ${firstName},

Just 48 hours to go — we\'re looking forward to seeing you at ${experience} on ${date}!${fixture}

${logistics}

If anything comes up last minute, reply to this email or reach us at info@travelbeyondthepitch.com.

Feicfimid thú — see you there! ☘
Beyond the Pitch
travelbeyondthepitch.com`;
        }
    },

    // ── 5. ANNULERING ────────────────────────────────────────────────────────
    cancellation: {
        label: 'Annulering',
        subject: (b) => `Your Beyond the Pitch booking has been cancelled`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const date       = formatDateLong(b['Start Date']);
            const experience = b['Experience'] || 'your experience';
            return `Hi ${firstName},

We\'ve processed the cancellation of your booking for ${experience} on ${date}.

We\'re sorry you won\'t be joining us this time — we hope everything is okay.

If your plans change or you\'d like to rebook for a future date, we\'d love to welcome you back. Just reply to this email and we\'ll sort something out.

Refund information
As per our cancellation policy, any applicable refund will be processed within 5–10 business days. If you have questions about your refund, just reply here.

With warmest wishes,
Beyond the Pitch
travelbeyondthepitch.com`;
        }
    },

    // ── 6. HERVERSCHEDULING ──────────────────────────────────────────────────
    reschedule: {
        label: 'Herverscheduling',
        subject: (b) => `📅 Your Beyond the Pitch experience has been rescheduled`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const experience = b['Experience'] || 'your experience';
            return `Hi ${firstName},

We\'ve updated your booking with a new date for ${experience}.

New date: [NEW DATE — fill in before sending]
Everything else stays the same — only the date has changed, and the craic is still guaranteed! 🎉

Please make sure your travel plans reflect the new date. If you have any questions, just reply here.

Go raibh míle maith agat,
Beyond the Pitch
travelbeyondthepitch.com`;
        }
    },

    // ── 7. FOLLOW-UP (2–3 dagen na de ervaring) ──────────────────────────────
    followup: {
        label: 'Follow-up',
        subject: (b) => `🏆 Thank you for experiencing ${b['Experience'] || 'Beyond the Pitch'}!`,
        body: (b) => {
            const firstName  = (b['Full Name'] || 'there').split(' ')[0];
            const experience = b['Experience'] || 'your experience';
            const partner    = (b['Partner'] || '').toLowerCase();
            const isPrague   = partner.includes('prague');

            const reviewAsk = isPrague
                ? `Kamil puts a huge amount of care into every session — a short review genuinely helps him reach more people who\'d appreciate what he does.`
                : `Your feedback helps future guests understand what awaits them — and it means the world to our local partners and coaches.`;

            const socialTag = isPrague
                ? `Share your photos on Instagram and tag us @travelbeyondthepitch — Kamil loves seeing them.`
                : `Share your photos on Instagram and tag us @travelbeyondthepitch — we\'d love to repost!`;

            return `Hi ${firstName},

Go raibh míle maith agat — a thousand thank-yous! ☘

What an incredible time it was having you at ${experience}. We hope you\'re already telling people about it — because that\'s exactly what Beyond the Pitch is all about.

${reviewAsk}

→ Leave a review or share your feedback: https://travelbeyondthepitch.com/feedback/

${socialTag}

Come back again
Whether it\'s another session, a different experience, or a completely new destination — we\'d love to have you back. Browse what\'s coming up at travelbeyondthepitch.com.

Refer a friend and mention your name — we\'ll make sure they\'re looked after.

Until next time,
Beyond the Pitch
travelbeyondthepitch.com`;
        }
    }

};
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLong(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function normalizeDate(date) {
    if (!date) return '';
    if (date.includes('-')) {
        const parts = date.split('-');
        if (parts.length === 3 && parts[0].length <= 2) {
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
    }
    return date;
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (c) =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
}

function normalizePartnerKey(v = '') { return String(v).trim().toLowerCase(); }

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
window.renderPipeline = function() {
    const filterVal = (document.getElementById('pipelinePartnerFilter')?.value || 'all').toLowerCase();

    const filtered = filterVal === 'all'
        ? allBookings
        : allBookings.filter(b => (b['Partner'] || '').toLowerCase().includes(filterVal));

    // Reset columns
    const colIds = ['new','confirmed','paid','ready','complete'];
    colIds.forEach(id => {
        const el = document.getElementById('col-' + id);
        if (el) el.innerHTML = '';
        const cnt = document.getElementById('cnt-' + id);
        if (cnt) cnt.textContent = '0';
    });

    const counts = { new:0, confirmed:0, paid:0, ready:0, complete:0 };

    filtered.forEach((b, idx) => {
        const rawStatus = (b['Status'] || 'Pending');
        const colKey    = STAGE_MAP[rawStatus] || 'new';
        const col       = document.getElementById('col-' + colKey);
        if (!col) return;

        counts[colKey]++;

        const partner  = (b['Partner'] || '').toLowerCase();
        const tagClass = partner.includes('dublin') ? 'tag-dublin'
                       : partner.includes('kilkenny') || partner.includes('ireland') ? 'tag-kilkenny'
                       : 'tag-pax';
        const tagLabel = partner.includes('dublin') ? 'Dublin' : partner.includes('kilkenny') || partner.includes('ireland') ? 'Kilkenny' : b['Partner'] || '—';

        const payStatus = (b['PaymentStatus'] || '').toLowerCase();
        const payTag    = payStatus === 'paid'
            ? '<span class="pill-tag tag-paid">Paid</span>'
            : '<span class="pill-tag tag-unpaid">Unpaid</span>';

        const isCancelled = rawStatus === 'Cancelled';
        const pill = document.createElement('div');
        pill.className = 'booking-pill' + (isCancelled ? ' opacity-50' : '');
        pill.style.opacity = isCancelled ? '0.45' : '1';
        pill.dataset.idx   = allBookings.indexOf(b);
        pill.innerHTML = `
            <div class="pill-name">${escapeHtml(b['Full Name'] || 'Guest')}</div>
            <div class="pill-meta">${escapeHtml(tagLabel)} · ${formatDateShort(b['Start Date'])}</div>
            <div class="pill-tags">
                <span class="pill-tag ${tagClass}">${escapeHtml(tagLabel)}</span>
                <span class="pill-tag tag-pax">${b['Guests'] || 1} pax</span>
                ${payTag}
            </div>`;

        pill.addEventListener('click', () => selectBooking(b, pill));
        col.appendChild(pill);
    });

    // Update counts
    Object.entries(counts).forEach(([k, v]) => {
        const el = document.getElementById('cnt-' + k);
        if (el) el.textContent = v;
    });
};

function selectBooking(b, pillEl) {
    // Highlight geselecteerde pill
    document.querySelectorAll('.booking-pill').forEach(p => p.classList.remove('selected'));
    if (pillEl) pillEl.classList.add('selected');

    selectedBooking = b;

    // Toon detail panel
    const detail = document.getElementById('pipelineDetail');
    if (detail) detail.classList.add('visible');

    // Vul detail rows in
    const rows = document.getElementById('detailRows');
    if (rows) {
        rows.innerHTML = `
            <div class="detail-row"><span class="dl">Naam</span><span class="dv">${escapeHtml(b['Full Name'] || '—')}</span></div>
            <div class="detail-row"><span class="dl">Experience</span><span class="dv">${escapeHtml(b['Experience'] || '—')}</span></div>
            <div class="detail-row"><span class="dl">Datum</span><span class="dv">${formatDateLong(b['Start Date'])}</span></div>
            <div class="detail-row"><span class="dl">Gasten</span><span class="dv">${b['Guests'] || 1} pax</span></div>
            <div class="detail-row"><span class="dl">Partner</span><span class="dv">${escapeHtml(b['Partner'] || '—')}</span></div>
            <div class="detail-row"><span class="dl">E-mail</span><span class="dv" style="font-size:0.75rem;">${escapeHtml(b['Email Address'] || '—')}</span></div>
            <div class="detail-row"><span class="dl">Telefoon</span><span class="dv">${escapeHtml(b['Phone Number'] || '—')}</span></div>
            <div class="detail-row"><span class="dl">Status</span><span class="dv">${escapeHtml(b['Status'] || 'Pending')}</span></div>
            <div class="detail-row"><span class="dl">Betaling</span><span class="dv">${escapeHtml(b['PaymentStatus'] || 'Unpaid')}</span></div>
            <div class="detail-row"><span class="dl">PackageCode</span><span class="dv">${escapeHtml(b['PackageCode'] || '—')}</span></div>
            ${b['Special Requests'] ? `<div class="detail-row" style="flex-direction:column; gap:4px;"><span class="dl">Opmerkingen</span><span class="dv" style="font-size:0.75rem; text-align:left;">${escapeHtml(b['Special Requests'])}</span></div>` : ''}
        `;
    }

    // Toon stage mover
    const moverWrap = document.getElementById('stageMoverWrap');
    if (moverWrap) moverWrap.style.display = 'block';

    // Highlight huidige stage knop
    const currentStage = b['Status'] || 'Pending';
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.classList.toggle('current', btn.textContent.trim() === currentStage ||
            (btn.textContent.trim() === 'New' && currentStage === 'Pending'));
    });

    // Ververs email preview
    renderEmailPreview();

    // Toon/verberg Stripe knop bij payment template
    updateStripeBtn();

    // Activeer send knop
    const sendBtn = document.getElementById('sendEmailBtn');
    if (sendBtn) sendBtn.disabled = false;

    // Reset feedback
    const fb = document.getElementById('sendFeedback');
    if (fb) { fb.className = 'send-feedback'; fb.textContent = ''; }
}

window.selectTemplate = function(tplKey, btnEl) {
    activeTemplate = tplKey;
    document.querySelectorAll('.tpl-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderEmailPreview();
    updateStripeBtn();
};

function renderEmailPreview() {
    const tpl    = EMAIL_TEMPLATES[activeTemplate];
    const subjEl = document.getElementById('emailSubjectPreview');
    const bodyEl = document.getElementById('emailBodyPreview');
    if (!tpl || !selectedBooking) {
        if (subjEl) subjEl.value = '—';
        if (bodyEl) bodyEl.value = 'Selecteer eerst een boeking.';
        return;
    }
    if (subjEl) subjEl.value = tpl.subject(selectedBooking);
    if (bodyEl) bodyEl.value = tpl.body(selectedBooking);
}

function updateStripeBtn() {
    const stripeBtn = document.getElementById('stripeBtn');
    if (!stripeBtn) return;
    stripeBtn.style.display = (activeTemplate === 'payment') ? 'flex' : 'none';
}

window.openStripeLink = function() {
    if (!selectedBooking) return;
    const pkg = selectedBooking['PackageCode'] || '';
    alert(`Genereer een Stripe Payment Link voor:\n${selectedBooking['Full Name']} — ${selectedBooking['Experience']}\nPackageCode: ${pkg || 'onbekend'}\n\nKopieer de link en plak hem in het e-mailveld voor je verstuurt.`);
};

window.copyEmailBody = function() {
    const el = document.getElementById('emailBodyPreview');
    const body = el?.value || el?.textContent || '';
    navigator.clipboard.writeText(body).then(() => {
        showFeedback('E-mailtekst gekopieerd naar klembord.', 'success');
    });
};

window.sendEmailFromDashboard = async function() {
    if (!selectedBooking) return;

    const tpl     = EMAIL_TEMPLATES[activeTemplate];
    // Read from editable fields (user may have modified the text)
    const subject = document.getElementById('emailSubjectPreview')?.value || tpl.subject(selectedBooking);
    const body    = document.getElementById('emailBodyPreview')?.value    || tpl.body(selectedBooking);
    const toEmail = selectedBooking['Email Address'];
    const name    = selectedBooking['Full Name'];
    const date    = normalizeDate(selectedBooking['Start Date'] || selectedBooking['Date'] || '');

    if (!toEmail) {
        showFeedback('Geen e-mailadres gevonden voor deze boeking.', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendEmailBtn');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Versturen...'; }

    try {
        const url = `${SHEET_API_URL}?action=sendEmail`
            + `&to=${encodeURIComponent(toEmail)}`
            + `&name=${encodeURIComponent(name)}`
            + `&date=${encodeURIComponent(date)}`
            + `&subject=${encodeURIComponent(subject)}`
            + `&body=${encodeURIComponent(body)}`
            + `&template=${encodeURIComponent(activeTemplate)}`;

        const resp = await fetch(url, { redirect: 'follow' });
        const text = await resp.text();

        let result;
        try { result = JSON.parse(text); } catch(e) { result = { status: 'success' }; }

        if (result.status === 'success' || result.status === undefined) {
            showFeedback(`E-mail verstuurd naar ${toEmail}`, 'success');
        } else {
            showFeedback('Fout bij versturen: ' + (result.message || 'onbekende fout'), 'error');
        }
    } catch(e) {
        showFeedback('Verbindingsfout. Controleer de Apps Script URL.', 'error');
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Verstuur e-mail'; }
    }
};

function showFeedback(msg, type) {
    const fb = document.getElementById('sendFeedback');
    if (!fb) return;
    fb.textContent  = msg;
    fb.className    = `send-feedback ${type}`;
}

// ─── Stage verplaatsen ────────────────────────────────────────────────────────
window.moveToStage = async function(newStatus) {
    if (!selectedBooking) return;

    const name = selectedBooking['Full Name'] || '';
    const rawDate = selectedBooking['Start Date'] || selectedBooking['Date'] || '';
    const date = normalizeDate(rawDate);

    // Optimistisch updaten in geheugen
    selectedBooking['Status'] = newStatus;

    // Ververs pipeline kaarten
    renderPipeline();

    // Highlight bijwerken
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.classList.toggle('current', btn.textContent.trim() === newStatus ||
            (btn.textContent.trim() === 'New' && newStatus === 'Pending'));
    });

    // Bijwerken in sheet
    try {
        await fetch(
            `${SHEET_API_URL}?action=updateStatus&name=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&status=${encodeURIComponent(newStatus)}`,
            { redirect: 'follow' }
        );
    } catch(e) {
        console.error('Stage update fout:', e);
    }
};

// ─── PARTNER OPERATIONAL INFO ─────────────────────────────────────────────────
const partnerOperationalInfo = {
    dublin: {
        partnerId: 'Dublin', partnerName: 'Dublin Experience',
        sheetIds: ['Dublin', 'dublin', 'Dublin Experience', 'Na Fianna'],
        defaultLocationId: 'dublin-city',
        locations: [{
            id: 'dublin-city', label: 'Dublin',
            venue: 'Na Fianna GAA Club', address: 'St Mobhi Rd, Drumcondra, Dublin 9',
            contactName: '', contactPhone: '', contactEmail: '',
            bookingCutoffHours: 24, maxGroupSize: null, privateMinGroup: 10,
            sessionSchedule: 'Publieke sessies: ma-vr 10:00, za 11:00.',
            netRatePerPerson: 39.50,
            notes: 'Boekingsdeadline: min. 24u van tevoren.\n\nPrivate sessies: min. 10 personen. Copy eerst ter goedkeuring voorleggen aan partner.'
        }]
    },
    ireland: {
        partnerId: 'Ireland', partnerName: 'Ireland Experience',
        sheetIds: ['Ireland', 'ireland', 'Ireland Experience', 'Hurling Tours Ireland', 'Kilkenny'],
        defaultLocationId: 'ireland-kilkenny',
        locations: [{
            id: 'ireland-kilkenny', label: 'Kilkenny',
            venue: '', address: '', contactName: '', contactPhone: '', contactEmail: '',
            bookingCutoffHours: 48, maxGroupSize: 12, privateMinGroup: null,
            sessionSchedule: '', netRatePerPerson: 0, notes: ''
        }]
    }
};

// ─── SHEET-GEBASEERDE PARTNER INFO (BUG FIXED) ───────────────────────────────
async function fetchPartnerInfoFromSheet() {
    try {
        const response = await fetch(`${SHEET_API_URL}?action=getPartnerInfo`, { redirect: 'follow' });
        const rows = await response.json();

        if (!Array.isArray(rows) || rows.length === 0) return;

        const grouped = {};
        rows.forEach(row => {
            const pid = (row.PartnerID || '').trim();
            if (!pid) return;
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(row);
        });

        Object.entries(grouped).forEach(([pid, locations]) => {
            const key      = pid.toLowerCase();
            const existing = partnerOperationalInfo[key];
            const sheetIds = existing?.sheetIds || [pid];

            partnerOperationalInfo[key] = {
                partnerId:         pid,
                partnerName:       existing?.partnerName || pid,
                sheetIds:          sheetIds,
                defaultLocationId: locations[0]?.LocationID || `${key}-main`,
                locations: locations.map(row => ({
                    id:                 row.LocationID          || `${key}-main`,
                    label:              row.LocationLabel        || pid,
                    venue:              row.Venue                || '',
                    address:            row.Address              || '',
                    contactName:        row.ContactName          || '',
                    contactPhone:       row.ContactPhone         || '',
                    contactEmail:       row.ContactEmail         || '',
                    bookingCutoffHours: row.BookingCutoffHours   ? parseInt(row.BookingCutoffHours) : null,
                    maxGroupSize:       row.MaxGroupSize         ? parseInt(row.MaxGroupSize)       : null,
                    privateMinGroup:    row.PrivateMinGroup      ? parseInt(row.PrivateMinGroup)    : null,
                    sessionSchedule:    row.SessionSchedule      || '',
                    netRatePerPerson:   row.NetRatePerPerson     ? parseFloat(row.NetRatePerPerson) : null,
                    notes:              row.Notes                || ''
                }))
            };
        });

        partnerInfoFromSheet = true;
        renderPartnerInfoFromSelection();
    } catch(e) {
        console.warn('PartnerInfo Sheet niet bereikbaar, hardcoded data gebruikt:', e);
    }
}

function getPartnerOperationalEntry(partnerId = '') {
    const n = normalizePartnerKey(partnerId);
    if (!n) return null;
    return Object.values(partnerOperationalInfo).find(entry => {
        if (normalizePartnerKey(entry.partnerId)   === n) return true;
        if (normalizePartnerKey(entry.partnerName) === n) return true;
        if (Array.isArray(entry.sheetIds)) return entry.sheetIds.some(id => normalizePartnerKey(id) === n);
        return false;
    }) || null;
}

function ensurePartnerOperationalEntry(partnerId = '', partnerName = '') {
    const key = normalizePartnerKey(partnerId || partnerName);
    if (!key) return null;
    if (!partnerOperationalInfo[key]) {
        const displayName = partnerName || partnerId || key;
        partnerOperationalInfo[key] = {
            partnerId: partnerId || key, partnerName: displayName,
            defaultLocationId: `${key}-main`,
            locations: [{ id: `${key}-main`, label: displayName, venue: displayName, address: '', contactName: '', contactPhone: '', contactEmail: '', notes: 'Nog geen operationele info ingevuld.' }]
        };
    }
    return partnerOperationalInfo[key];
}

function initPartnerInfoEvents() {
    const ps = document.getElementById('partnerInfoPartnerSelect');
    const ls = document.getElementById('partnerInfoLocationSelect');
    if (ps && !ps.dataset.bound) {
        ps.addEventListener('change', () => populatePartnerInfoSelectors(ps.value));
        ps.dataset.bound = 'true';
    }
    if (ls && !ls.dataset.bound) {
        ls.addEventListener('change', renderPartnerInfoFromSelection);
        ls.dataset.bound = 'true';
    }
}

function populatePartnerInfoSelectors(defaultPartnerId = 'dublin') {
    const ps = document.getElementById('partnerInfoPartnerSelect');
    const ls = document.getElementById('partnerInfoLocationSelect');
    if (!ps || !ls) return;

    const entries = Object.values(partnerOperationalInfo);
    if (!entries.length) { ps.innerHTML = '<option value="">No partners</option>'; ls.innerHTML = '<option value="">No locations</option>'; return; }

    ps.innerHTML = entries.map(e => `<option value="${escapeHtml(e.partnerId)}">${escapeHtml(e.partnerName)}</option>`).join('');

    let sel = getPartnerOperationalEntry(defaultPartnerId) || getPartnerOperationalEntry(ps.value) || entries[0];
    ps.value = sel.partnerId;

    const locs = Array.isArray(sel.locations) ? sel.locations : [];
    ls.innerHTML = locs.length
        ? locs.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.label)}</option>`).join('')
        : '<option value="">No locations</option>';
    if (locs.length) ls.value = sel.defaultLocationId || locs[0].id;

    renderPartnerInfoFromSelection();
}

window.renderPartnerInfoFromSelection = function() {
    const ps  = document.getElementById('partnerInfoPartnerSelect');
    const ls  = document.getElementById('partnerInfoLocationSelect');
    const con = document.getElementById('partnerInfoContent');
    if (!ps || !ls || !con) return;

    const partner = getPartnerOperationalEntry(ps.value);
    if (!partner) { con.innerHTML = '<p style="color:#94a3b8;">No partner info found.</p>'; return; }

    const locs  = Array.isArray(partner.locations) ? partner.locations : [];
    const loc   = locs.find(l => l.id === ls.value) || locs.find(l => l.id === partner.defaultLocationId) || locs[0];
    if (!loc) { con.innerHTML = '<p style="color:#94a3b8;">No location info.</p>'; return; }

    const tile = (icon, label, value, highlight = false) => `
        <div style="padding:12px; border-radius:10px; background:${highlight ? 'rgba(197,160,89,0.08)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${highlight ? 'rgba(197,160,89,0.2)' : 'rgba(255,255,255,0.07)'};">
            <div style="font-size:0.7rem; color:#64748b; margin-bottom:5px; display:flex; align-items:center; gap:5px;">
                <i class="${escapeHtml(icon)}" style="color:#c5a059; font-size:0.7rem;"></i>${escapeHtml(label)}
            </div>
            <div style="font-weight:700; color:#f1f5f9; font-size:0.85rem; line-height:1.5;">${value || '<span style="color:#475569;">—</span>'}</div>
        </div>`;

    const cutoff   = loc.bookingCutoffHours ? `${loc.bookingCutoffHours}u van tevoren` : '';
    const maxGroup = loc.maxGroupSize       ? `Max. ${loc.maxGroupSize} gasten`         : '';
    const netRate  = loc.netRatePerPerson   ? `€${loc.netRatePerPerson} p.p.`           : '';
    const privMin  = loc.privateMinGroup    ? `Min. ${loc.privateMinGroup} personen`     : '';

    con.innerHTML = `
        <div style="border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);">
            <div style="background:#0f172a; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                    <div style="font-weight:800; color:#fff; font-size:0.95rem;">${escapeHtml(partner.partnerName)}</div>
                    <div style="color:#c5a059; font-size:0.75rem; margin-top:2px;">${escapeHtml(loc.label)}</div>
                </div>
                ${netRate ? `<span style="background:rgba(197,160,89,0.15); color:#c5a059; border:1px solid rgba(197,160,89,0.3); padding:4px 10px; border-radius:999px; font-size:0.75rem; font-weight:800;">${escapeHtml(netRate)} netto</span>` : ''}
            </div>
            <div style="padding:14px; background:rgba(0,0,0,0.2);">
                <p style="font-size:0.65rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px;">Locatie & contact</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px;">
                    ${tile('fa-solid fa-location-dot','Venue', escapeHtml(loc.venue))}
                    ${tile('fa-solid fa-map-pin','Adres', escapeHtml(loc.address))}
                    ${tile('fa-solid fa-user','Contact', escapeHtml(loc.contactName))}
                    ${tile('fa-solid fa-phone','Telefoon', escapeHtml(loc.contactPhone))}
                    ${tile('fa-solid fa-envelope','E-mail', escapeHtml(loc.contactEmail))}
                </div>
                <p style="font-size:0.65rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px;">Boekingsregels</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px;">
                    ${tile('fa-solid fa-clock','Deadline', escapeHtml(cutoff), true)}
                    ${tile('fa-solid fa-users','Max. groep', escapeHtml(maxGroup), true)}
                    ${tile('fa-solid fa-user-group','Min. privé', escapeHtml(privMin), true)}
                    ${tile('fa-solid fa-calendar-days','Sessietijden', escapeHtml(loc.sessionSchedule), true)}
                </div>
                ${loc.notes ? `
                <p style="font-size:0.65rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 8px;">Notities</p>
                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px; color:#94a3b8; font-size:0.82rem; line-height:1.6; white-space:pre-wrap;">${escapeHtml(loc.notes)}</div>
                ` : ''}
            </div>
        </div>`;
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuth === 'function') {
        if (!window.checkAuth('admin')) return;
    }

    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    initCalendar();
    initPartnerInfoEvents();
    populatePartnerInfoSelectors('dublin');
    loadPartnerFilterOptions();
    loadAdminData();
    fetchPartnerInfoFromSheet();

    setInterval(loadAdminData, 5 * 60 * 1000);
});

// ─── NAVIGATIE ────────────────────────────────────────────────────────────────
window.showSection = (sId, el) => {
    document.querySelectorAll('.content-section').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
    const target = document.getElementById(sId);
    if (target) { target.style.display = 'block'; setTimeout(() => target.classList.add('active'), 10); }
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    if (sId === 'pipeline')  renderPipeline();
    if (sId === 'partners')  { loadPartnerList(); initPartnerInfoEvents(); populatePartnerInfoSelectors('dublin'); fetchPartnerInfoFromSheet(); }
    if (sId === 'packages')  loadPackageList();
    if (sId === 'overview')  {
        setTimeout(() => {
            if (window.calendar) { window.calendar.updateSize(); window.calendar.render(); }
            if (revenueChart) revenueChart.update();
        }, 150);
    }
};

// ─── DATA LADEN ───────────────────────────────────────────────────────────────
async function loadAdminData() {
    const syncBtn    = document.getElementById('syncBtn');
    const filterVal  = document.getElementById('partnerFilter')?.value || 'all';

    if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const [bookingResp, packageResp] = await Promise.all([
            fetch(`${SHEET_API_URL}?partnerID=${encodeURIComponent(filterVal)}`, { redirect:'follow' }),
            fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`, { redirect:'follow' })
        ]);

        const data = await bookingResp.json();
        allBookings = Array.isArray(data) ? data.filter(r => r['Full Name'] || r['Experience']) : [];

        try {
            const pkgs = await packageResp.json();
            packagePriceCache = { _byCode: {}, _byPartner: {} };
            if (Array.isArray(pkgs)) {
                const partnerSums = {};
                pkgs.forEach(p => {
                    const code  = (p.PackageCode || '').trim().toUpperCase();
                    const price = parseFloat(p.SellPrice) || 0;
                    if (code) packagePriceCache._byCode[code] = price;

                    const partnerKey = (p.PartnerID || '').trim().toLowerCase();
                    if (partnerKey) {
                        if (!partnerSums[partnerKey]) partnerSums[partnerKey] = [];
                        partnerSums[partnerKey].push(price);
                    }
                });
                Object.entries(partnerSums).forEach(([k, arr]) => {
                    packagePriceCache._byPartner[k] = arr.reduce((a,b)=>a+b,0) / arr.length;
                });
            }
        } catch(e) { console.warn('Package prijzen konden niet geladen worden:', e); }

        renderAdminTable(allBookings);
        updateAdminStats(allBookings);
        populateAdminCalendar(allBookings);
        updateRevenueChart(allBookings);

        // Herlaad pipeline als die zichtbaar is
        const pipelineSection = document.getElementById('pipeline');
        if (pipelineSection && pipelineSection.style.display !== 'none') renderPipeline();

    } catch(e) {
        console.error('Sync fout:', e);
    } finally {
        if (syncBtn) syncBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync Data';
    }
}

async function loadPartnerFilterOptions() {
    try {
        const resp     = await fetch(`${SHEET_API_URL}?action=getPartners`, { redirect:'follow' });
        const partners = await resp.json();
        if (!partners?.length) return;

        partners.forEach(p => ensurePartnerOperationalEntry(p.partnerID, p.name));

        const sel = document.getElementById('partnerFilter');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="all">Global View</option>';
            partners.forEach(p => { const o = document.createElement('option'); o.value = p.partnerID; o.textContent = p.name || p.partnerID; sel.appendChild(o); });
            sel.value = cur || 'all';
        }

        const pkgSel = document.getElementById('pkg_partnerid');
        if (pkgSel) {
            pkgSel.innerHTML = '';
            partners.forEach(p => { const o = document.createElement('option'); o.value = p.partnerID; o.textContent = p.name || p.partnerID; pkgSel.appendChild(o); });
        }

        // Pipeline filter bijwerken
        const pipeSel = document.getElementById('pipelinePartnerFilter');
        if (pipeSel) {
            const curPipe = pipeSel.value;
            pipeSel.innerHTML = '<option value="all">Alle partners</option>';
            partners.forEach(p => { const o = document.createElement('option'); o.value = p.partnerID; o.textContent = p.name || p.partnerID; pipeSel.appendChild(o); });
            pipeSel.value = curPipe || 'all';
        }

        populatePartnerInfoSelectors(document.getElementById('partnerInfoPartnerSelect')?.value || 'dublin');
    } catch(e) {
        console.error('Partnerfilter kon niet geladen worden:', e);
    }
}

// ─── TABEL ────────────────────────────────────────────────────────────────────
function renderAdminTable(bookings) {
    const container = document.getElementById('adminTableContainer');
    if (!container) return;
    if (!bookings.length) { container.innerHTML = "<p style='padding:20px; color:#64748b;'>No bookings found.</p>"; return; }

    const sorted = [...bookings].sort((a,b) => new Date(b['Start Date']||b['Date']) - new Date(a['Start Date']||a['Date']));

    let html = `<table class="admin-table"><thead><tr><th>Partner</th><th>Date</th><th>Guest</th><th>Experience</th><th>Pax</th><th>Status</th></tr></thead><tbody>`;

    sorted.forEach((b) => {
        const idx       = allBookings.indexOf(b);
        const d         = new Date(b['Start Date'] || b['Date']);
        const fDate     = !isNaN(d) ? d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—';
        const rawDate   = b['Start Date'] || b['Date'] || '';
        const rawStatus = b['Status'] || 'Pending';
        const name      = (b['Full Name'] || 'Guest').replace(/'/g,"\\'");

        html += `<tr>
            <td><span class="badge-partner">${b['Partner'] || '—'}</span></td>
            <td><strong>${fDate}</strong></td>
            <td><span onclick="openBookingModal(${idx})" style="cursor:pointer; color:#c5a059; font-weight:700;">${b['Full Name'] || 'Guest'}</span></td>
            <td style="font-size:0.8rem;">${b['Experience'] || '—'}</td>
            <td>${b['Guests'] || 1}</td>
            <td>
                <select onchange="updateBookingStatus('${name}','${rawDate}',this.value,this)"
                    style="padding:5px 8px; border-radius:6px; border:1px solid #e2e8f0; font-size:0.8rem; font-weight:600; cursor:pointer;
                    background:${rawStatus==='Confirmed'?'#dcfce7':rawStatus==='Cancelled'?'#fee2e2':rawStatus==='Paid'?'#dbeafe':'#fef3c7'};
                    color:${rawStatus==='Confirmed'?'#166534':rawStatus==='Cancelled'?'#991b1b':rawStatus==='Paid'?'#1e40af':'#92400e'};">
                    <option value="Pending"   ${rawStatus==='Pending'  ?'selected':''}>Pending</option>
                    <option value="Confirmed" ${rawStatus==='Confirmed'?'selected':''}>Confirmed</option>
                    <option value="Paid"      ${rawStatus==='Paid'     ?'selected':''}>Paid</option>
                    <option value="Ready"     ${rawStatus==='Ready'    ?'selected':''}>Ready</option>
                    <option value="Complete"  ${rawStatus==='Complete' ?'selected':''}>Complete</option>
                    <option value="Cancelled" ${rawStatus==='Cancelled'?'selected':''}>Cancelled</option>
                </select>
            </td>
        </tr>`;
    });

    container.innerHTML = html + '</tbody></table>';
}

// ─── STATUS UPDATE (ook gebruikt door tabel-dropdown) ─────────────────────────
async function updateBookingStatus(name, date, newStatus, selectEl) {
    if (selectEl) {
        const colors = { Confirmed:'#dcfce7', Cancelled:'#fee2e2', Paid:'#dbeafe', Ready:'#ede9fe', Complete:'#f1f5f9' };
        const texts  = { Confirmed:'#166534', Cancelled:'#991b1b', Paid:'#1e40af', Ready:'#5b21b6', Complete:'#475569' };
        selectEl.style.background = colors[newStatus] || '#fef3c7';
        selectEl.style.color      = texts[newStatus]  || '#92400e';
    }

    const normalizedDate = normalizeDate(date);

    try {
        const resp = await fetch(
            `${SHEET_API_URL}?action=updateStatus&name=${encodeURIComponent(name)}&date=${encodeURIComponent(normalizedDate)}&status=${encodeURIComponent(newStatus)}`,
            { redirect:'follow' }
        );
        const text = await resp.text();
        try { const r = JSON.parse(text); if (r.status !== 'success') console.warn('Status update:', r.message); }
        catch(e) { /* redirect response, OK */ }
    } catch(e) {
        console.error('Status update fout:', e);
    }
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
window.openBookingModal = function(index) {
    const b = allBookings[index];
    if (b) showAdminBookingModal(b);
};

function showAdminBookingModal(b) {
    const existing = document.getElementById('adminBookingModal');
    if (existing) existing.remove();

    const rawStatus = b['Status'] || 'Pending';
    const statusColor = rawStatus === 'Confirmed' ? '#166534' : rawStatus === 'Cancelled' ? '#991b1b' : '#92400e';
    const statusBg    = rawStatus === 'Confirmed' ? '#dcfce7' : rawStatus === 'Cancelled' ? '#fee2e2' : '#fef3c7';

    const modal = document.createElement('div');
    modal.id        = 'adminBookingModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <button class="modal-close" onclick="document.getElementById('adminBookingModal').remove()"><i class="fa-solid fa-xmark"></i></button>
            <h3 style="margin-bottom:20px; color:#1e293b;">Booking Details</h3>
            <div class="modal-row"><div class="modal-label">Partner</div><div class="modal-value">${b['Partner']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Guest</div><div class="modal-value">${b['Full Name']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Experience</div><div class="modal-value">${b['Experience']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Date</div><div class="modal-value">${formatDateLong(b['Start Date'])}</div></div>
            <div class="modal-row"><div class="modal-label">Guests</div><div class="modal-value">${b['Guests']||1} pax</div></div>
            <div class="modal-row"><div class="modal-label">Email</div><div class="modal-value">${b['Email Address']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Phone</div><div class="modal-value">${b['Phone Number']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Special Requests</div><div class="modal-value">${b['Special Requests']||'—'}</div></div>
            <div class="modal-row"><div class="modal-label">Status</div><div style="margin-top:4px;"><span style="padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; text-transform:uppercase; background:${statusBg}; color:${statusColor};">${rawStatus}</span></div></div>
        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}
function resolveBookingPrice(booking) {
    const code = (booking['PackageCode'] || '').trim().toUpperCase();
    if (code && packagePriceCache._byCode?.[code] !== undefined) {
        return packagePriceCache._byCode[code];
    }
    const partnerKey = (booking['Partner'] || '').trim().toLowerCase();
    if (partnerKey && packagePriceCache._byPartner?.[partnerKey] !== undefined) {
        return packagePriceCache._byPartner[partnerKey];
    }
    return 75;
}
// ─── STATS ────────────────────────────────────────────────────────────────────
function updateAdminStats(b) {
    const g = b.reduce((s,x) => s + (parseInt(x['Guests'])||0), 0);
    const revenue = b.reduce((sum,x) => {
        const guests = parseInt(x['Guests'])||0;
        return sum + guests * resolveBookingPrice(x);
    }, 0);

    document.getElementById('totalBookings').textContent  = b.length;
    document.getElementById('totalGuests').textContent    = g;
    document.getElementById('totalRevenue').textContent   = `€${revenue.toLocaleString('nl-NL', { minimumFractionDigits:0, maximumFractionDigits:0 })}`;
    document.getElementById('activePartners').textContent = new Set(b.map(x => x['Partner'])).size;
}

// ─── KALENDER ─────────────────────────────────────────────────────────────────
function initCalendar() {
    const el = document.getElementById('calendar');
    if (!el || typeof FullCalendar === 'undefined') return;
    window.calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        headerToolbar: { left:'prev,next', center:'title', right:'today' },
        eventColor: '#c5a059'
    });
    window.calendar.render();
}

function populateAdminCalendar(b) {
    if (!window.calendar) return;
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(b.map(x => ({ title: `[${x.Partner}] ${x['Full Name']}`, start: x['Start Date'], allDay: true })));
}

// ─── REVENUE CHART ────────────────────────────────────────────────────────────
function updateRevenueChart(bookings) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (revenueChart) revenueChart.destroy();

    const monthly = {};
    bookings.forEach(b => {
        const d = new Date(b['Start Date']||b['Date']);
        if (isNaN(d)) return;
        const key    = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const guests = parseInt(b['Guests'])||0;
        const price  = resolveBookingPrice(b);
        monthly[key] = (monthly[key]||0) + guests * price;
    });

    const keys   = Object.keys(monthly).sort();
    const labels = keys.map(k => { const [y,m] = k.split('-'); return new Date(y,m-1).toLocaleDateString('en-GB',{month:'short',year:'2-digit'}); });
    const vals   = keys.map(k => monthly[k]);

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels.length ? labels : ['No data'], datasets: [{ label:'Revenue (€)', data: vals.length ? vals : [0], borderColor:'#c5a059', backgroundColor:'rgba(197,160,89,0.1)', tension:0.4, fill:true, pointBackgroundColor:'#c5a059' }] },
        options: { responsive:true, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c => `€${Math.round(c.parsed.y).toLocaleString('nl-NL')}` } } }, scales:{ y:{ beginAtZero:true, ticks:{ color:'#94a3b8', callback: v => `€${Math.round(v).toLocaleString('nl-NL')}` } }, x:{ ticks:{ color:'#94a3b8' } } } }
    });
}

// ─── PARTNERS & PACKAGES ─────────────────────────────────────────────────────
async function loadPartnerList() {
    const c = document.getElementById('partnersTableContainer');
    if (!c) return;
    try {
        const r = await fetch(`${SHEET_API_URL}?action=getPartners`);
        const p = await r.json();
        p.forEach(x => ensurePartnerOperationalEntry(x.partnerID, x.name));
        let h = `<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>ID</th></tr></thead><tbody>`;
        p.forEach(x => { h += `<tr><td><strong>${x.name}</strong></td><td>${x.email}</td><td>${x.partnerID}</td></tr>`; });
        c.innerHTML = h + '</tbody></table>';
        populatePartnerInfoSelectors(document.getElementById('partnerInfoPartnerSelect')?.value || 'dublin');
    } catch(e) { c.innerHTML = 'Error.'; }
}

async function submitNewPartner() {
    const n  = document.getElementById('p_name')?.value;
    const e  = document.getElementById('p_user')?.value;
    const p  = document.getElementById('p_pass')?.value;
    const id = document.getElementById('p_id')?.value;
    if (!n||!e||!p||!id) return alert('Fill in all fields.');
    await fetch(`${SHEET_API_URL}?action=addPartner&name=${encodeURIComponent(n)}&user=${encodeURIComponent(e)}&pass=${encodeURIComponent(p)}&partnerID=${encodeURIComponent(id)}`, { redirect:'follow' });
    ensurePartnerOperationalEntry(id, n);
    document.getElementById('addPartnerForm').style.display = 'none';
    loadPartnerList(); loadPartnerFilterOptions(); populatePartnerInfoSelectors(id);
    alert(`Partner "${n}" successfully added!`);
}

async function loadPackageList() {
    const c = document.getElementById('packagesTableContainer');
    if (!c) return;
    c.innerHTML = 'Loading...';
    try {
        const r    = await fetch(`${SHEET_API_URL}?action=getPackages&partnerID=all`);
        const pkgs = await r.json();
        let h = `<table class="admin-table"><thead><tr><th>Partner</th><th>Package</th><th>Net</th><th>Sell</th><th>Profit</th><th>Action</th></tr></thead><tbody>`;
        pkgs.forEach(p => {
            const n = parseFloat(p.NetPrice)||0; const s = parseFloat(p.SellPrice)||0;
            h += `<tr><td>${p.PartnerID}</td><td><strong>${p.PackageName}</strong></td><td>€${n.toFixed(2)}</td><td>€${s.toFixed(2)}</td><td style="color:#10b981;font-weight:bold">€${(s-n).toFixed(2)}</td><td><button class="btn-delete" onclick="deletePackage('${p.PackageName}','${p.PartnerID}')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
        c.innerHTML = h + '</tbody></table>';
    } catch(e) { c.innerHTML = 'Error loading packages.'; }
}

async function deletePackage(name, partner) {
    if (!confirm(`Delete ${name}?`)) return;
    try { await fetch(`${SHEET_API_URL}?action=deletePackage&name=${encodeURIComponent(name)}&partnerID=${encodeURIComponent(partner)}`, { redirect:'follow' }); }
    catch(e) {}
    loadPackageList();
}

async function submitNewPackage() {
    const pID  = document.getElementById('pkg_partnerid')?.value;
    const name = document.getElementById('pkg_name')?.value;
    const net  = document.getElementById('pkg_net')?.value;
    const sell = document.getElementById('pkg_sell')?.value;
    await fetch(`${SHEET_API_URL}?action=addPackage&partnerID=${encodeURIComponent(pID)}&name=${encodeURIComponent(name)}&net=${net}&sell=${sell}`, { redirect:'follow' });
    document.getElementById('addPackageForm').style.display = 'none';
    loadPackageList();
}

window.calculateSellPrice = () => {
    const net  = parseFloat(document.getElementById('pkg_net')?.value)||0;
    const comm = parseFloat(document.getElementById('pkg_comm')?.value)||0;
    const el   = document.getElementById('pkg_sell');
    if (el) el.value = (net * (1 + comm/100)).toFixed(2);
};

// ─── EXPORT ───────────────────────────────────────────────────────────────────
window.exportBookingsToCSV = function() {
    if (!allBookings.length) return alert('No data to export.');
    const headers = ['Partner','Full Name','Email Address','Phone Number','Experience','Start Date','Guests','Status','PaymentStatus','Special Requests'];
    const csv = [ headers.join(','), ...allBookings.map(r => headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(',')) ].join('\n');
    const a   = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }));
    a.download = `BTP_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
window.toggleSidebar = function() {
    document.querySelector('.sidebar')?.classList.toggle('open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('open');
};
window.logout = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
window.togglePartnerForm = () => { const f = document.getElementById('addPartnerForm'); if(f) f.style.display = f.style.display==='none'?'block':'none'; };
window.togglePackageForm = () => { const f = document.getElementById('addPackageForm'); if(f) f.style.display = f.style.display==='none'?'block':'none'; };
