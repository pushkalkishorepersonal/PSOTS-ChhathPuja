/*  ══════════════════════════════════════════════════════════
    PSOTS Chhath Puja — Google Apps Script Backend
    ══════════════════════════════════════════════════════════

    This script connects your Google Sheet to the PSOTS website.
    It handles:
      - Recording new contributions (POST from payment page)
      - Listing contributions (GET for homepage, admin, portal)
      - User profiles (GET/POST for portal)

    SETUP:  Run the setupSheets() function ONCE after pasting this code.
            Then deploy as Web App (see setup-guide.html for details).
    ══════════════════════════════════════════════════════════ */

// ─── Sheet Names ───
const SHEET_CONTRIBUTIONS = 'Contributions';
const SHEET_PROFILES      = 'Profiles';
const SHEET_FINANCE       = 'Finance';
const SHEET_ANNOUNCEMENTS = 'Announcements';
const SHEET_VOLUNTEERS    = 'Volunteers';
const SHEET_GALLERY       = 'GallerySubmissions';

// ─── Column headers ───
const CON_HEADERS  = ['Timestamp','Name','Flat','Mobile','Amount','Method','Date','Status','AccountType','UserID','Year'];
const PROF_HEADERS = ['UserID','Name','Email','Flat','Mobile','IsVrati','Photo','LastUpdated','WaOptIn'];
const FIN_HEADERS  = ['Key','Value'];
const ANN_HEADERS  = ['Tag','Meta','Text'];
const VOL_HEADERS  = ['Timestamp','Name','Flat','Mobile','Days','Tasks','AssignedTask','Status','Note','CheckedIn','CheckinTime'];
const GAL_HEADERS  = ['Timestamp','Name','Flat','Year','Moment','Caption','DriveUrl','Status'];

/* ══════════════════════════════════════════════════════════
   INITIAL SETUP — Run this ONCE
══════════════════════════════════════════════════════════ */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Contributions sheet
  let con = ss.getSheetByName(SHEET_CONTRIBUTIONS);
  if (!con) {
    con = ss.insertSheet(SHEET_CONTRIBUTIONS);
    con.appendRow(CON_HEADERS);
    con.getRange(1, 1, 1, CON_HEADERS.length)
       .setFontWeight('bold')
       .setBackground('#E85C00')
       .setFontColor('#FFFFFF');
    con.setFrozenRows(1);
    // Set column widths
    con.setColumnWidth(1, 160); // Timestamp
    con.setColumnWidth(2, 180); // Name
    con.setColumnWidth(3, 80);  // Flat
    con.setColumnWidth(4, 120); // Mobile
    con.setColumnWidth(5, 90);  // Amount
    con.setColumnWidth(6, 100); // Method
    con.setColumnWidth(7, 100); // Date
    con.setColumnWidth(8, 130); // Status
  }

  // Create Profiles sheet
  let prof = ss.getSheetByName(SHEET_PROFILES);
  if (!prof) {
    prof = ss.insertSheet(SHEET_PROFILES);
    prof.appendRow(PROF_HEADERS);
    prof.getRange(1, 1, 1, PROF_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1A5276')
        .setFontColor('#FFFFFF');
    prof.setFrozenRows(1);
  }

  // Create Finance sheet
  let fin = ss.getSheetByName(SHEET_FINANCE);
  if (!fin) {
    fin = ss.insertSheet(SHEET_FINANCE);
    fin.appendRow(FIN_HEADERS);
    fin.appendRow(['carry',    '104670']);
    fin.appendRow(['collected','0']);
    fin.appendRow(['budget',   '282000']);
    fin.appendRow(['expenses', '0']);
    fin.appendRow(['expTent',  '0']);
    fin.appendRow(['expKharna','0']);
    fin.appendRow(['expThekua','0']);
    fin.appendRow(['expAV',    '0']);
    fin.appendRow(['expCultural','0']);
    fin.appendRow(['expMisc',  '0']);
    fin.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1A5276').setFontColor('#FFF');
  }

  // Create Announcements sheet
  let ann = ss.getSheetByName(SHEET_ANNOUNCEMENTS);
  if (!ann) {
    ann = ss.insertSheet(SHEET_ANNOUNCEMENTS);
    ann.appendRow(ANN_HEADERS);
    ann.appendRow(['🎊 5th Year', '2026 — Grand Celebration', "This year marks our पंच वर्ष महोत्सव! Grander ghat, extended cultural programme. ₹1,04,670 carried forward from 2025."]);
    ann.appendRow(['🙏 Prasad',  '2026 — Prasad Details', '2nd Nov खरना प्रसाद & 4th Nov ठेकुआ प्रसाद for all PSOTS residents after Arghya.']);
    ann.appendRow(['🤝 Volunteer','2026 — Volunteers', 'Volunteers needed for ghat decoration on 2nd November. Breakfast provided for all volunteers.']);
    ann.appendRow(['⏰ Important','2026 — Deadline', 'Contribute before 25th October 2026 to be on the prasad list.']);
    ann.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#2C7744').setFontColor('#FFF');
  }

  // Create Volunteers sheet
  let vol = ss.getSheetByName(SHEET_VOLUNTEERS);
  if (!vol) {
    vol = ss.insertSheet(SHEET_VOLUNTEERS);
    vol.appendRow(VOL_HEADERS);
    vol.getRange(1, 1, 1, VOL_HEADERS.length)
       .setFontWeight('bold')
       .setBackground('#2C7744')
       .setFontColor('#FFFFFF');
    vol.setFrozenRows(1);
    vol.setColumnWidth(1, 160); // Timestamp
    vol.setColumnWidth(2, 180); // Name
    vol.setColumnWidth(3, 80);  // Flat
    vol.setColumnWidth(4, 120); // Mobile
    vol.setColumnWidth(5, 130); // Days
    vol.setColumnWidth(6, 200); // Preferred Tasks
    vol.setColumnWidth(7, 180); // Assigned Task
    vol.setColumnWidth(8, 110); // Status
  }

  // Create Gallery Submissions sheet
  let gal = ss.getSheetByName(SHEET_GALLERY);
  if (!gal) {
    gal = ss.insertSheet(SHEET_GALLERY);
    gal.appendRow(GAL_HEADERS);
    gal.getRange(1, 1, 1, GAL_HEADERS.length)
       .setFontWeight('bold')
       .setBackground('#5C3299')
       .setFontColor('#FFFFFF');
    gal.setFrozenRows(1);
    gal.setColumnWidth(1, 160); // Timestamp
    gal.setColumnWidth(2, 160); // Name
    gal.setColumnWidth(3, 80);  // Flat
    gal.setColumnWidth(4, 60);  // Year
    gal.setColumnWidth(5, 160); // Moment
    gal.setColumnWidth(6, 220); // Caption
    gal.setColumnWidth(7, 280); // DriveUrl
    gal.setColumnWidth(8, 120); // Status
  }

  // Remove default Sheet1 if it exists and is empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() <= 1) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }

  Logger.log('✅ setupSheets complete — Contributions, Profiles, Finance, Announcements, Volunteers, GallerySubmissions sheets ready.');
}

/* ══════════════════════════════════════════════════════════
   WEB APP ENTRY POINTS
══════════════════════════════════════════════════════════ */

// Handle GET requests
function doGet(e) {
  const action = (e.parameter.action || '').trim();
  let result;

  switch (action) {
    case 'list':
      result = actionList();
      break;
    case 'list_all':
      result = actionListAll();
      break;
    case 'myContribs':
      result = actionMyContribs(e.parameter.flat, e.parameter.mobile);
      break;
    case 'getProfile':
      result = actionGetProfile(e.parameter.uid);
      break;
    case 'getFinance':
      result = actionGetFinance();
      break;
    case 'getAnnouncements':
      result = actionGetAnnouncements();
      break;
    case 'getWaSubscribers':
      result = actionGetWaSubscribers();
      break;
    case 'getVolunteers':
      result = actionGetVolunteers();
      break;
    case 'ping':
      result = { ok: true, message: 'PSOTS Backend is running!' };
      break;
    case 'sendOtp':
      result = actionSendOtp(e.parameter.email);
      break;
    case 'verifyOtp':
      result = actionVerifyOtp(e.parameter.email, e.parameter.otp);
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests (new contributions + profile saves)
function doPost(e) {
  let result;

  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'saveProfile') {
      result = actionSaveProfile(body);
    } else if (body.action === 'updateStatus') {
      result = actionUpdateStatus(body.flat, body.year, body.newStatus);
    } else if (body.action === 'deleteEntry') {
      result = actionDeleteEntry(body.flat, body.year, body.amount);
    } else if (body.action === 'updateFinance') {
      result = actionUpdateFinance(body);
    } else if (body.action === 'bulkImport') {
      result = actionBulkImport(body.records || []);
    } else if (body.action === 'updateAnnouncements') {
      result = actionUpdateAnnouncements(body.data || []);
    } else if (body.action === 'saveVolunteers') {
      result = actionSaveVolunteers(body.data || []);
    } else if (body.action === 'volunteerCheckin') {
      result = actionVolunteerCheckin(body);
    } else if (body.action === 'uploadPhoto') {
      result = actionUploadPhoto(body);
    } else {
      // Default: new contribution
      result = actionAddContribution(body);
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════════════════════
   ACTION: List contributors (public — for homepage)
══════════════════════════════════════════════════════════ */
function actionList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { contributors: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();

  // Only return verified contributions, grouped by flat
  const verified = data.filter(r => String(r[7]).includes('Received'));

  const contributors = verified.map(r => ({
    name:   String(r[1]),
    flat:   String(r[2]),
    amount: Number(r[4]) || 0,
    method: String(r[5]),
    date:   String(r[6]),
    status: String(r[7])
  }));

  // Sort by amount descending
  contributors.sort((a, b) => b.amount - a.amount);

  return { contributors };
}

/* ══════════════════════════════════════════════════════════
   ACTION: List ALL contributions (admin only)
══════════════════════════════════════════════════════════ */
function actionListAll() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { all: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();

  const all = data.map(r => ({
    ts:     String(r[0]),
    name:   String(r[1]),
    flat:   String(r[2]),
    mobile: String(r[3]),
    amount: Number(r[4]) || 0,
    method: String(r[5]),
    date:   String(r[6]),
    status: String(r[7]),
    accountType: String(r[8]),
    year:   Number(r[10]) || new Date().getFullYear()
  }));

  return { all };
}

/* ══════════════════════════════════════════════════════════
   ACTION: My contributions (portal — by flat/mobile)
══════════════════════════════════════════════════════════ */
function actionMyContribs(flat, mobile) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { contributions: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();

  const mine = data.filter(r => {
    if (flat && String(r[2]).trim() === String(flat).trim()) return true;
    if (mobile && String(r[3]).replace(/\D/g, '').slice(-10) === String(mobile).replace(/\D/g, '').slice(-10)) return true;
    return false;
  });

  const contributions = mine.map(r => ({
    year:   Number(r[10]) || new Date().getFullYear(),
    amount: Number(r[4]) || 0,
    method: String(r[5]),
    date:   String(r[6]),
    status: String(r[7])
  }));

  // Sort by year descending
  contributions.sort((a, b) => b.year - a.year);

  return { contributions };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Add new contribution (POST from payment page)
══════════════════════════════════════════════════════════ */
function actionAddContribution(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet) return { error: 'Contributions sheet not found' };

  const year = extractYear(body.date) || new Date().getFullYear();

  sheet.appendRow([
    body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    body.name   || '',
    body.flat   || '',
    body.mobile || '',
    Math.round(Number(body.amount) || 0),
    body.method || 'UPI',
    body.date   || '',
    body.status || 'Pending Verification',
    body.accountType || 'Guest 👤',
    body.userId || '',
    year
  ]);

  return { success: true, message: 'Contribution recorded!' };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Update contribution status (admin)
══════════════════════════════════════════════════════════ */
function actionUpdateStatus(flat, year, newStatus) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No data' };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][2]).trim() === String(flat).trim() &&
        (Number(data[i][10]) === Number(year) || !year)) {
      sheet.getRange(i + 2, 8).setValue(newStatus); // Status column
      return { success: true };
    }
  }

  return { error: 'Entry not found' };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Delete entry (admin)
══════════════════════════════════════════════════════════ */
function actionDeleteEntry(flat, year, amount) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No data' };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();

  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][2]).trim() === String(flat).trim() &&
        Number(data[i][10]) === Number(year) &&
        Number(data[i][4]) === Number(amount)) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }

  return { error: 'Entry not found' };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get user profile (portal)
══════════════════════════════════════════════════════════ */
function actionGetProfile(uid) {
  if (!uid) return { profile: null };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
  if (!sheet || sheet.getLastRow() < 2) return { profile: null };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, PROF_HEADERS.length).getValues();

  for (const r of data) {
    if (String(r[0]) === String(uid)) {
      return {
        profile: {
          uid:     String(r[0]),
          name:    String(r[1]),
          email:   String(r[2]),
          flat:    String(r[3]),
          mobile:  String(r[4]),
          isVrati: String(r[5]) === 'true',
          photo:   String(r[6]),
          waOptIn: String(r[8]) === 'true'
        }
      };
    }
  }

  return { profile: null };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Save user profile (portal POST)
══════════════════════════════════════════════════════════ */
function actionSaveProfile(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
  if (!sheet) return { error: 'Profiles sheet not found' };

  const uid = body.uid || body.userId || '';
  if (!uid) return { error: 'No user ID' };

  // Check if profile exists
  if (sheet.getLastRow() >= 2) {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(uid)) {
        // Update existing row
        const row = i + 2;
        sheet.getRange(row, 2).setValue(body.name || '');
        sheet.getRange(row, 3).setValue(body.email || '');
        sheet.getRange(row, 4).setValue(body.flat || '');
        sheet.getRange(row, 5).setValue(body.mobile || '');
        sheet.getRange(row, 6).setValue(String(body.isVrati || false));
        sheet.getRange(row, 7).setValue(body.photo || '');
        sheet.getRange(row, 8).setValue(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        sheet.getRange(row, 9).setValue(String(body.waOptIn === true || body.waOptIn === 'true'));
        return { success: true, updated: true };
      }
    }
  }

  // Insert new profile
  sheet.appendRow([
    uid,
    body.name || '',
    body.email || '',
    body.flat || '',
    body.mobile || '',
    String(body.isVrati || false),
    body.photo || '',
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    String(body.waOptIn === true || body.waOptIn === 'true')
  ]);

  return { success: true, created: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Send email OTP (non-Google login fallback)
══════════════════════════════════════════════════════════ */
function actionSendOtp(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, msg: 'Invalid email address' };
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  PropertiesService.getScriptProperties().setProperty(
    'otp_' + email,
    JSON.stringify({ otp, expiry })
  );
  try {
    MailApp.sendEmail({
      to: email,
      subject: 'PSOTS Chhath 2026 — Sign-in Code: ' + otp,
      htmlBody: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <h2 style="color:#e85c00;margin-bottom:.5rem">🌅 PSOTS Chhath Puja 2026</h2>
        <p style="color:#333">Your one-time sign-in code for the PSOTS resident portal is:</p>
        <div style="font-size:2.5rem;font-weight:900;letter-spacing:.3em;color:#e85c00;margin:1.5rem 0;font-family:monospace">${otp}</div>
        <p style="color:#555">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
        <hr style="border:none;border-top:1px solid #f0d5b8;margin:1.5rem 0"/>
        <p style="color:#999;font-size:.8rem">Prestige Song of the South · Bengaluru<br/>If you did not request this, please ignore.</p>
      </div>`
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, msg: 'Could not send email: ' + err.message };
  }
}

/* ══════════════════════════════════════════════════════════
   ACTION: Verify email OTP and return profile if exists
══════════════════════════════════════════════════════════ */
function actionVerifyOtp(email, code) {
  if (!email || !code) return { ok: false, msg: 'Email and code are required' };
  const key = 'otp_' + email;
  const stored = PropertiesService.getScriptProperties().getProperty(key);
  if (!stored) return { ok: false, msg: 'Code expired or not found. Please request a new one.' };
  let parsed;
  try { parsed = JSON.parse(stored); } catch(e) {
    return { ok: false, msg: 'Invalid session. Please request a new code.' };
  }
  if (Date.now() > parsed.expiry) {
    PropertiesService.getScriptProperties().deleteProperty(key);
    return { ok: false, msg: 'Code expired. Please request a new one.' };
  }
  if (String(code).trim() !== parsed.otp) {
    return { ok: false, msg: 'Incorrect code. Please try again.' };
  }
  PropertiesService.getScriptProperties().deleteProperty(key);
  const userId = 'email_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const profileData = actionGetProfile(userId);
  return { ok: true, userId, profile: profileData.profile };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get WhatsApp opt-in subscribers (admin GET)
══════════════════════════════════════════════════════════ */
function actionGetWaSubscribers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
  if (!sheet || sheet.getLastRow() < 2) return { subscribers: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, PROF_HEADERS.length).getValues();
  const subscribers = [];
  for (const r of data) {
    if (String(r[8]) === 'true' && String(r[4]).trim()) {
      subscribers.push({ name: String(r[1]), flat: String(r[3]), mobile: String(r[4]) });
    }
  }
  return { subscribers, total: subscribers.length };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get finance data (public GET)
══════════════════════════════════════════════════════════ */
function actionGetFinance() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FINANCE);
  if (!sheet || sheet.getLastRow() < 2) return { finance: {} };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const finance = {};
  data.forEach(r => { if (r[0]) finance[String(r[0])] = String(r[1]); });
  return { finance };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Update finance data (admin POST)
══════════════════════════════════════════════════════════ */
function actionUpdateFinance(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FINANCE);
  if (!sheet) return { error: 'Finance sheet not found. Run setupSheets() first.' };

  const keys = ['carry','collected','budget','expenses','expTent','expKharna','expThekua','expAV','expCultural','expMisc',
                 'timEveTime','timEveDate','timEveLoc','timMornTime','timMornDate','timMornLoc','timKharnaTime','timKharnaDate'];
  const data = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues()
    : [];

  keys.forEach(key => {
    if (body[key] === undefined) return;
    const idx = data.findIndex(r => String(r[0]) === key);
    if (idx >= 0) {
      sheet.getRange(idx + 2, 2).setValue(String(body[key]));
    } else {
      sheet.appendRow([key, String(body[key])]);
    }
  });

  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Bulk import historical records (data-manager POST)
══════════════════════════════════════════════════════════ */
function actionBulkImport(records) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet) return { error: 'Contributions sheet not found' };

  // Build a set of existing records to avoid duplicates (flat+year+amount)
  const existing = new Set();
  if (sheet.getLastRow() >= 2) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, CON_HEADERS.length).getValues();
    rows.forEach(r => existing.add(`${r[2]}_${r[10]}_${r[4]}`));
  }

  const toAdd = records.filter(r => !existing.has(`${r.flat}_${r.year || ''}_${r.amount || 0}`));
  if (toAdd.length === 0) return { success: true, added: 0, skipped: records.length };

  const rows = toAdd.map(r => [
    r.date || r.ts || '',
    r.name  || '',
    r.flat  || '',
    r.mobile|| '',
    Math.round(Number(r.amount) || 0),
    r.method|| 'UPI',
    r.date  || '',
    r.status|| '✅ Received',
    r.accountType || 'Historical Import',
    r.userId|| '',
    r.year  || new Date().getFullYear()
  ]);

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CON_HEADERS.length).setValues(rows);
  return { success: true, added: toAdd.length, skipped: records.length - toAdd.length };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get announcements (public GET)
══════════════════════════════════════════════════════════ */
function actionGetAnnouncements() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ANNOUNCEMENTS);
  if (!sheet || sheet.getLastRow() < 2) return { announcements: [] };
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const announcements = rows
    .filter(r => r[0] || r[2])
    .map(r => ({ tag: String(r[0]), meta: String(r[1]), text: String(r[2]) }));
  return { announcements };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Update announcements (admin POST)
══════════════════════════════════════════════════════════ */
function actionUpdateAnnouncements(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ANNOUNCEMENTS);
  if (!sheet) return { error: 'Announcements sheet not found. Run setupSheets() first.' };

  // Clear existing data rows
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
  }
  // Write new rows
  if (data.length > 0) {
    const rows = data.map(a => [a.tag || '', a.meta || '', a.text || '']);
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get all volunteers (admin GET)
══════════════════════════════════════════════════════════ */
function actionGetVolunteers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOLUNTEERS);
  if (!sheet || sheet.getLastRow() < 2) return { volunteers: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, VOL_HEADERS.length).getValues();
  const volunteers = data
    .filter(r => r[1] || r[2]) // must have name or flat
    .map(r => ({
      ts:           String(r[0]),
      name:         String(r[1]),
      flat:         String(r[2]),
      mobile:       String(r[3]),
      days:         String(r[4]),
      tasks:        String(r[5]),
      assignedTask: String(r[6]),
      status:       String(r[7]),
      note:         String(r[8]),
      checkedIn:    String(r[9]) === 'true',
      checkinTime:  String(r[10])
    }));

  return { volunteers };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Save / sync full volunteer list (admin POST)
   Replaces all rows — called after admin assigns tasks or confirms
══════════════════════════════════════════════════════════ */
function actionSaveVolunteers(records) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOLUNTEERS);
  if (!sheet) return { error: 'Volunteers sheet not found. Run setupSheets() first.' };

  // Clear existing data rows
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, VOL_HEADERS.length).clearContent();
  }

  if (records.length === 0) return { success: true, saved: 0 };

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const rows = records.map(v => [
    v.ts || now,
    v.name         || '',
    v.flat         || '',
    v.mobile       || '',
    v.days         || '',
    v.tasks        || '',
    v.assignedTask || '',
    v.status       || 'Registered',
    v.note         || '',
    String(v.checkedIn || false),
    v.checkinTime  || ''
  ]);

  sheet.getRange(2, 1, rows.length, VOL_HEADERS.length).setValues(rows);

  // Highlight confirmed rows in green
  for (let i = 0; i < rows.length; i++) {
    const status = rows[i][7];
    if (status === 'Confirmed') {
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground('#E8F5E9');
    } else if (rows[i][9] === 'true') { // checked in
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground('#E3F2FD');
    } else {
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground(null);
    }
  }

  return { success: true, saved: rows.length };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Record volunteer check-in on event day (portal POST)
══════════════════════════════════════════════════════════ */
function actionVolunteerCheckin(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOLUNTEERS);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No volunteer records' };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, VOL_HEADERS.length).getValues();
  const name = String(body.name || '').toLowerCase();
  const flat = String(body.flat || '').trim();
  const now  = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  for (let i = 0; i < data.length; i++) {
    const rowFlat = String(data[i][2]).trim();
    const rowName = String(data[i][1]).toLowerCase();
    if ((flat && rowFlat === flat) || (name && rowName === name)) {
      sheet.getRange(i + 2, 10).setValue('true');       // CheckedIn
      sheet.getRange(i + 2, 11).setValue(now);           // CheckinTime
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground('#E3F2FD');
      return { success: true, name: data[i][1], day: body.day };
    }
  }

  // Volunteer not pre-registered — still log their check-in as a new row
  sheet.appendRow([
    now,
    body.name || '',
    body.flat || '',
    body.mobile || '',
    body.day || '',
    '',
    '',
    'Walk-in',
    'Checked in without prior registration',
    'true',
    now
  ]);
  return { success: true, walkin: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Upload photo to Drive + log to GallerySubmissions
   Body fields: imageBase64, year, moment, name, flat, caption
══════════════════════════════════════════════════════════ */
function actionUploadPhoto(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GALLERY);
  if (!sheet) return { error: 'GallerySubmissions sheet not found. Run setupSheets() first.' };

  const { imageBase64, year, moment, name, flat, caption } = body;
  if (!imageBase64) return { error: 'No image data received' };
  if (!name || !flat) return { error: 'Name and flat number are required' };

  let driveUrl = '';
  try {
    // Strip data URL prefix and decode base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      `${year || 'unknown'}_${moment || 'photo'}_${flat}_${Date.now()}.jpg`
    );

    // Find or create the gallery folder in Drive
    const folderName = 'PSOTS Gallery Photos';
    let folder;
    const folderIter = DriveApp.getFoldersByName(folderName);
    folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder(folderName);

    // Create year sub-folder
    const yearName = String(year || 'misc');
    let yearFolder;
    const yearIter = folder.getFoldersByName(yearName);
    yearFolder = yearIter.hasNext() ? yearIter.next() : folder.createFolder(yearName);

    // Save file
    const file = yearFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    driveUrl = `https://drive.google.com/uc?id=${file.getId()}`;
  } catch (err) {
    // Log the submission even if Drive upload fails, for manual follow-up
    driveUrl = 'Drive upload failed: ' + err.message;
  }

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  sheet.appendRow([now, name, flat, year || '', moment || '', caption || '', driveUrl, 'Pending Review']);

  return { success: true, driveUrl, message: 'Photo submitted for review!' };
}

/* ══════════════════════════════════════════════════════════
   HELPER: Extract year from date string
══════════════════════════════════════════════════════════ */
function extractYear(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/(\d{4})/);
  if (m1) return parseInt(m1[1]);
  return null;
}
