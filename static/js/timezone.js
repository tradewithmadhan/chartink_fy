/**
 * Adds a custom crosshair label to a chart container, showing the time at the crosshair in the correct timezone and format.
 * @param {object} chart - The chart instance 
 * @param {HTMLElement} container - The chart container element
 * @param {object} opts - { timezone: string, use12Hour: boolean }
 */
export function addCustomCrosshairLabel(chart, container, opts = {}) {
    const prev = container.querySelector('.my-crosshair-label');
    if (prev) prev.remove();
    const label = document.createElement('div');
    label.className = 'my-crosshair-label';
    Object.assign(label.style, {
        position: 'absolute', bottom: '0', left: '0', transform: 'translateX(-50%)',
        background: 'rgba(30,30,40,0.95)', color: '#fff', borderRadius: '4px', padding: '3px 8px',
        fontSize: '12px', fontFamily: 'monospace', zIndex: '1000', pointerEvents: 'none', display: 'none',
        whiteSpace: 'nowrap', minWidth: '70px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    });
    container.appendChild(label);
    let lastText = '', lastLeft = null, rafId = null, pending = false;
    function getSettings() {
        let tz = opts.timezone || 'Asia/Kolkata', use12 = opts.use12Hour !== undefined ? opts.use12Hour : false;
        try {
            const obj = JSON.parse(localStorage.getItem('chartSettings') || '{}');
            if (obj.timezone) tz = obj.timezone;
            if (obj.timeFormat === '12h') use12 = true;
            else if (obj.timeFormat === '24h') use12 = false;
        } catch {}
        return { tz, use12 };
    }
    function toDateFromTime(timeVal) {
        if (typeof timeVal === 'number') {
            // UTCTimestamp in seconds
            return new Date(timeVal * 1000);
        }
        if (typeof timeVal === 'string') {
            // ISO business day string or ISO timestamp
            const parsed = Date.parse(timeVal);
            if (!Number.isNaN(parsed)) return new Date(parsed);
        }
        if (timeVal && typeof timeVal === 'object' && 'year' in timeVal && 'month' in timeVal && 'day' in timeVal) {
            // BusinessDay object -> build UTC date
            const { year, month, day } = timeVal;
            return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        }
        return new Date();
    }
    function formatLabel(timeVal) {
        const { tz, use12 } = getSettings();
        const d = toDateFromTime(timeVal);
        const dateStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, year: '2-digit', month: '2-digit', day: '2-digit'
        }).format(d);
        const timeStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: use12
        }).format(d);
        return `${dateStr} - ${timeStr}`;
    }
    chart.subscribeCrosshairMove(param => {
        if (!param || typeof param.time === 'undefined' || !param.point || param.point.x < 0 || param.point.y < 0) {
            if (label.style.display !== 'none') label.style.display = 'none';
            lastText = ''; lastLeft = null; return;
        }
        const text = formatLabel(param.time);
        if (text !== lastText) { label.textContent = text; lastText = text; }
        if (!pending) {
            pending = true;
            rafId = requestAnimationFrame(() => {
                const labelW = label.offsetWidth || 80;
                const minX = labelW / 2, maxX = container.clientWidth - labelW / 2;
                const x = Math.max(minX, Math.min(maxX, param.point.x));
                if (x !== lastLeft) { label.style.left = `${x}px`; lastLeft = x; }
                if (label.style.display !== 'block') label.style.display = 'block';
                pending = false;
            });
        }
    });
    container.addEventListener('mouseleave', () => {
        if (label.style.display !== 'none') label.style.display = 'none';
        lastText = ''; lastLeft = null;
        if (rafId) cancelAnimationFrame(rafId);
        pending = false;
    });
}
/**
 * Formats a chart tick mark for the time axis using timezone and 12h/24h settings.
 * @param {number} time - Unix timestamp (seconds)
 * @param {number} tickType - Tick mark type (0-5)
 * @param {string} timezone - IANA timezone string (e.g., 'Asia/Kolkata')
 * @param {boolean} use12Hour - true for 12h format, false for 24h
 * @returns {string} Formatted time string
 */
export function tickMarkFormatter(time, tickType, timezone, use12Hour, locale) {
    const pad = n => n.toString().padStart(2, '0');
    const tz = timezone || 'Asia/Kolkata';
    const is12h = use12Hour !== undefined ? use12Hour : false;
    const loc = locale || 'en-US';
    const dt = new Date(time * 1000);

    // Extract date/time parts in target timezone without parsing localized strings
    const parts = new Intl.DateTimeFormat(loc, {
        timeZone: tz,
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: is12h
    }).formatToParts(dt);

    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    // Some locales include leading zeros for 12h hour; normalize to no leading zero when 12h
    const monthShort = map.month;
    const day = map.day; // already 2-digit
    const year = map.year;
    const ampm = map.dayPeriod || ((Number(map.hour) >= 12) ? 'PM' : 'AM');
    const h24 = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).format(dt);
    const h24Num = Number(h24);
    const m = map.minute?.padStart(2, '0') || '00';
    const s = map.second?.padStart(2, '0') || '00';
    const h12Num = ((h24Num % 12) || 12);

    switch (tickType) {
        case 0: return String(year); // YYYY
        case 1: return String(monthShort); // MMM
        case 2: return `${day}${monthShort}`; // 09Aug
        case 3: // HH:mm or h:mm AM/PM
            return is12h ? `${h12Num}:${m} ${ampm}` : `${pad(h24Num)}:${m}`;
        case 4: // HH:mm:ss or h:mm:ss
            return is12h ? `${h12Num}:${m}:${s}` : `${pad(h24Num)}:${m}:${s}`;
        case 5: // 09Aug HH:mm or 09Aug h:mm AM/PM
            return is12h ? `${day}${monthShort} ${h12Num}:${m} ${ampm}` : `${day}${monthShort} ${pad(h24Num)}:${m}`;
        default:
            return `${day}${monthShort}`;
    }
}
