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
const SHEET_MEMBERS       = 'Members';
const SHEET_RECEIPTS      = 'Receipts';
const SHEET_ROLE_PERMS    = 'RolePerms';

// ─── Column headers ───
// Col indices: 0=Timestamp 1=Name 2=Flat 3=Mobile 4=Amount 5=Method 6=PaymentDate 7=Status 8=AccountType 9=UserID 10=Year 11=DocId
const CON_HEADERS  = ['Timestamp','Name','Flat','Mobile','Amount','Method','PaymentDate','Status','AccountType','UserID','Year','DocId'];
const PROF_HEADERS = ['UserID','Name','Email','Flat','Mobile','IsVrati','Photo','LastUpdated','WaOptIn'];
const FIN_HEADERS  = ['Key','Value'];
const ANN_HEADERS  = ['Tag','Meta','Text'];
const VOL_HEADERS  = ['Timestamp','Name','Flat','Mobile','Days','Tasks','AssignedTask','Status','Note','CheckedIn','CheckinTime'];
const GAL_HEADERS  = ['Timestamp','Name','Flat','Year','Moment','Caption','DriveUrl','Status'];
const MEM_HEADERS  = ['Email','DisplayName','Role','AddedBy','AddedAt'];
const RCPT_HEADERS = ['ID','Category','Vendor','Amount','Date','Link','Notes'];
const RPERMS_HEADERS = ['Role','Tabs'];

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

  // Create Members sheet
  let mem = ss.getSheetByName(SHEET_MEMBERS);
  if (!mem) {
    mem = ss.insertSheet(SHEET_MEMBERS);
    mem.appendRow(MEM_HEADERS);
    mem.getRange(1, 1, 1, MEM_HEADERS.length)
       .setFontWeight('bold')
       .setBackground('#7A3800')
       .setFontColor('#FFFFFF');
    mem.setFrozenRows(1);
    mem.setColumnWidth(1, 220); // Email
    mem.setColumnWidth(2, 160); // DisplayName
    mem.setColumnWidth(3, 140); // Role
    mem.setColumnWidth(4, 200); // AddedBy
    mem.setColumnWidth(5, 180); // AddedAt
  }

  // Create Receipts sheet
  let rcpt = ss.getSheetByName(SHEET_RECEIPTS);
  if (!rcpt) {
    rcpt = ss.insertSheet(SHEET_RECEIPTS);
    rcpt.appendRow(RCPT_HEADERS);
    rcpt.getRange(1, 1, 1, RCPT_HEADERS.length)
        .setFontWeight('bold').setBackground('#7A3800').setFontColor('#FFFFFF');
    rcpt.setFrozenRows(1);
    rcpt.setColumnWidth(1, 130); // ID
    rcpt.setColumnWidth(2, 140); // Category
    rcpt.setColumnWidth(3, 180); // Vendor
    rcpt.setColumnWidth(4, 90);  // Amount
    rcpt.setColumnWidth(5, 100); // Date
    rcpt.setColumnWidth(6, 220); // Link
    rcpt.setColumnWidth(7, 220); // Notes
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
    case 'getGalleryPhotos':
      result = actionGetGalleryPhotos(e.parameter.year, e.parameter.status);
      break;
    case 'getMembers':
      result = actionGetMembers();
      break;
    case 'getReceipts':
      result = actionGetReceipts();
      break;
    case 'getReminders':
      result = actionGetReminders();
      break;
    case 'getRolePerms':
      result = actionGetRolePerms();
      break;
    case 'getRsvps':
    case 'getRSVPs':
      result = actionGetRsvps();
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
    case 'findByFlat':
      result = actionFindByFlat(e.parameter.flat);
      break;
    case 'sendInvoiceEmail':
      result = actionSendInvoiceEmail(e.parameter);
      break;
    case 'getFonnteStatus':
      result = actionGetFonnteStatus();
      break;
    case 'sendFonnteMessage':
      result = actionSendFonnteMessage({
        targets: (e.parameter.targets || '').split(',').filter(Boolean),
        message: e.parameter.message || ''
      });
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
      result = actionUpdateStatus(body);
    } else if (body.action === 'deleteEntry') {
      result = actionDeleteEntry(body);
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
    } else if (body.action === 'updateGalleryStatus') {
      result = actionUpdateGalleryStatus(body);
    } else if (body.action === 'saveMembers') {
      result = actionSaveMembers(body.members || []);
    } else if (body.action === 'saveReceipts') {
      result = actionSaveReceipts(body.receipts || []);
    } else if (body.action === 'saveReminders') {
      result = actionSaveReminders(body.reminders || []);
    } else if (body.action === 'saveRolePerms') {
      result = actionSaveRolePerms(body.perms || {});
    } else if (body.action === 'sendInvoiceEmail') {
      result = actionSendInvoiceEmail(body);
    } else if (body.action === 'submitRSVP') {
      result = actionSubmitRsvp(body);
    } else if (body.action === 'submitVolunteer') {
      result = actionSubmitVolunteer(body);
    } else if (body.action === 'sendFonnteMessage') {
      result = actionSendFonnteMessage(body);
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
    status: String(r[7]),
    year:   Number(r[10]) || extractYear(String(r[6])) || new Date().getFullYear()
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
    ts:          String(r[0]),
    name:        String(r[1]),
    flat:        String(r[2]),
    mobile:      String(r[3]),
    amount:      Number(r[4]) || 0,
    method:      String(r[5]),
    paymentDate: String(r[6]),  // ISO "YYYY-MM-DD" for new rows; old rows have locale date
    date:        String(r[6]),  // kept for backwards compat in admin _mapConRow
    status:      String(r[7]),
    accountType: String(r[8]),
    year:        Number(r[10]) || extractYear(String(r[6])) || new Date().getFullYear(),
    _id:         String(r[11] || ''),  // Firestore docId — enables reliable updates/deletes
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
    ts:          String(r[0]),
    name:        String(r[1]),
    year:        Number(r[10]) || extractYear(String(r[6])) || new Date().getFullYear(),
    amount:      Number(r[4]) || 0,
    method:      String(r[5]),
    paymentDate: String(r[6]),
    date:        String(r[6]),
    status:      String(r[7]),
    _id:         String(r[11] || ''),
  }));

  // Sort by submitted timestamp descending (latest first)
  contributions.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return { contributions };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Add new contribution (POST from payment page)
══════════════════════════════════════════════════════════ */
function actionAddContribution(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet) return { error: 'Contributions sheet not found' };

  // Input validation
  const amount = Math.round(Number(body.amount) || 0);
  if (amount < 1)        return { error: 'Amount must be at least ₹1' };
  if (amount > 1000000)  return { error: 'Amount exceeds ₹10,00,000 — please contact the committee' };
  const name = String(body.name || '').trim().slice(0, 120);
  const flat = String(body.flat || '').trim().slice(0, 20);
  if (!name) return { error: 'Name is required' };

  // paymentDate is ISO "YYYY-MM-DD" from new schema; fall back for legacy callers
  const paymentDate = body.paymentDate || body.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  const year = Number(String(paymentDate).slice(0, 4)) || new Date().getFullYear();
  // timestamp stored as ISO string — no locale ambiguity
  const timestamp = body.timestamp || new Date().toISOString();

  sheet.appendRow([
    timestamp,
    name,
    flat,
    String(body.mobile || '').replace(/\D/g, '').slice(-10), // digits only, last 10
    amount,
    body.method || 'UPI',
    paymentDate,
    body.status || 'pending',
    body.accountType || 'Guest 👤',
    body.userId || '',
    year,
    body.docId  || ''   // Firestore auto-ID — links Sheet row ↔ Firestore doc
  ]);

  // Notify committee on WhatsApp (fire-and-forget)
  try { notifyCommitteeWhatsApp(body); } catch(e) {}

  // Send WhatsApp receipt to contributor (fire-and-forget)
  try { sendContributorWhatsApp({
    phone:  body.mobile || '',
    name:   body.name   || '',
    flat:   body.flat   || '',
    amount: body.amount || '',
    method: body.method || 'UPI',
    date:   paymentDate,
    txnid:  ''
  }); } catch(e) {}

  return { success: true, message: 'Contribution recorded!' };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Update contribution status (admin)
   body: { docId, flat, year, status }
   Matches by docId (col 12) first; falls back to flat+year.
   status: "verified" | "rejected" | "pending"
══════════════════════════════════════════════════════════ */
function actionUpdateStatus(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No data' };

  const newStatus = body.status || body.newStatus || '';
  const docId     = String(body.docId || '').trim();
  const flat      = String(body.flat  || '').trim();
  const year      = Number(body.year) || 0;

  const numCols = Math.max(CON_HEADERS.length, 12);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

  let rowIdx = -1;
  // 1. Match by Firestore docId (column 12, index 11) — exact, no ambiguity
  if (docId) {
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][11] || '').trim() === docId) { rowIdx = i; break; }
    }
  }
  // 2. Fall back to flat + year (for pre-docId rows)
  if (rowIdx === -1 && flat) {
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][2]).trim() === flat && (Number(data[i][10]) === year || !year)) {
        rowIdx = i; break;
      }
    }
  }
  if (rowIdx === -1) return { error: 'Entry not found' };

  sheet.getRange(rowIdx + 2, 8).setValue(newStatus); // col 8 = Status

  // WhatsApp to contributor
  const name   = String(data[rowIdx][1] || '');
  const mobile = String(data[rowIdx][3] || '');
  const amount = data[rowIdx][4] || 0;
  const method = String(data[rowIdx][5] || 'UPI');
  const date   = String(data[rowIdx][6] || '');
  const flatDisp = String(data[rowIdx][2] || flat);
  const amt = amount ? '₹' + parseFloat(amount).toLocaleString('en-IN') : '';

  if (mobile) {
    if (newStatus === 'verified') {
      sendWA(mobile,
        '🌅 *PSOTS Chhath Puja 2026*\n✅ *Payment Verified!*\n\n' +
        '👤 ' + name + '\n🏠 Flat ' + flatDisp + ' · Prestige Song of the South\n' +
        '💰 *' + amt + '* via ' + method + '\n' +
        (date ? '📅 ' + date + '\n' : '') +
        '\n📋 View receipt: https://chhath.psots.in/portal.html\n\n' +
        'आपके योगदान के लिए हृदय से धन्यवाद! 🙏\nजय छठी मैया! 🌅'
      );
    } else if (newStatus === 'rejected') {
      sendWA(mobile,
        '🌅 *PSOTS Chhath Puja 2026*\n❌ *Payment Not Verified*\n\n' +
        'नमस्ते ' + name + ' जी 🙏\n\n' +
        'We could not verify your payment of *' + amt + '* for Flat ' + flatDisp + '.\n' +
        'Please contact the committee: 📞 9482088904\n\nजय छठी मैया! 🌅'
      );
    }
  }

  return { success: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Delete entry (admin)
   body: { docId, flat, year, amount }
   Matches by docId (col 12) first; falls back to flat+year+amount.
══════════════════════════════════════════════════════════ */
function actionDeleteEntry(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No data' };

  const docId  = String(body.docId  || '').trim();
  const flat   = String(body.flat   || '').trim();
  const year   = Number(body.year)  || 0;
  const amount = Number(body.amount) || 0;

  const numCols = Math.max(CON_HEADERS.length, 12);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

  // 1. Match by docId — exact, no ambiguity
  if (docId) {
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][11] || '').trim() === docId) {
        sheet.deleteRow(i + 2);
        return { success: true };
      }
    }
  }
  // 2. Fall back to flat + year + amount
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][2]).trim() === flat &&
        Number(data[i][10]) === year &&
        Number(data[i][4]) === amount) {
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

  // Rate limit: max 3 OTP requests per 15 minutes per email
  const rateProp = 'otp_rate_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    const rateData = PropertiesService.getScriptProperties().getProperty(rateProp);
    const rate = rateData ? JSON.parse(rateData) : { count: 0, window: Date.now() };
    const windowMs = 15 * 60 * 1000;
    if (Date.now() - rate.window > windowMs) {
      rate.count = 0; rate.window = Date.now();
    }
    if (rate.count >= 3) {
      return { ok: false, msg: 'Too many OTP requests. Please wait 15 minutes before trying again.' };
    }
    rate.count++;
    PropertiesService.getScriptProperties().setProperty(rateProp, JSON.stringify(rate));
  } catch (rErr) { /* ignore rate limit errors — don't block legit users */ }

  // Check daily email quota before attempting
  try {
    const remaining = MailApp.getRemainingDailyQuota();
    if (remaining < 1) {
      return { ok: false, msg: 'Daily email limit reached. Please use Google sign-in or try again tomorrow.' };
    }
  } catch (qErr) {
    // getRemainingDailyQuota may fail if MailApp not authorized — continue and let sendEmail surface the real error
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  PropertiesService.getScriptProperties().setProperty(
    'otp_' + email,
    JSON.stringify({ otp, expiry })
  );
  const yr = new Date().getFullYear();
  try {
    MailApp.sendEmail({
      to: email,
      name: 'PSOTS Chhath Puja Committee',
      noReply: true,
      subject: 'PSOTS Chhath ' + yr + ' — Your Sign-in Code',
      htmlBody: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">' +
        '<h2 style="color:#e85c00;margin-bottom:.5rem">PSOTS Chhath Puja ' + yr + '</h2>' +
        '<p style="color:#333">Your one-time sign-in code for the PSOTS resident portal is:</p>' +
        '<div style="font-size:2.5rem;font-weight:900;letter-spacing:.3em;color:#e85c00;margin:1.5rem 0;font-family:monospace">' + otp + '</div>' +
        '<p style="color:#555">Valid for <strong>10 minutes</strong>. Do not share this code.</p>' +
        '<hr style="border:none;border-top:1px solid #f0d5b8;margin:1.5rem 0"/>' +
        '<p style="color:#999;font-size:.8rem">Prestige Song of the South, Bengaluru<br/>If you did not request this, please ignore.</p>' +
        '</div>',
      body: 'Your PSOTS sign-in code is: ' + otp + ' (valid 10 minutes)'
    });
    return { ok: true };
  } catch (err) {
    // Log for debugging in Apps Script dashboard
    console.error('OTP email failed for ' + email + ': ' + err.message);
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
  const emailUserId = 'email_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  let profileData = actionGetProfile(emailUserId);

  // Fallback: search Profiles sheet by email in case user previously signed in via Google
  if (!profileData.profile) {
    const pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
    if (pSheet && pSheet.getLastRow() >= 2) {
      const rows = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, PROF_HEADERS.length).getValues();
      for (const r of rows) {
        if (String(r[2]).toLowerCase() === email.toLowerCase()) {
          profileData = {
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
          break;
        }
      }
    }
  }

  // Use the profile's actual UID so the portal can sync correctly on next load.
  // If no profile found, fall back to the email-derived UID (new user).
  const userId = (profileData.profile && profileData.profile.uid) ? profileData.profile.uid : emailUserId;

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

  // Build allowed keys — include committee role slots (cmte_0 … cmte_11 + cmte_count)
  const cmteKeys = ['cmte_count'];
  for (let i = 0; i < 12; i++) cmteKeys.push('cmte_' + i);
  const keys = ['carry','collected','budget','expenses','expTent','expKharna','expThekua','expAV','expCultural','expMisc',
                 'budTent','budKharna','budThekua','budAV','budCultural','budMisc',
                 'timEveTime','timEveDate','timEveLoc','timMornTime','timMornDate','timMornLoc','timKharnaTime','timKharnaDate',
                 ...cmteKeys];
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
    r.status|| 'verified',
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

  // Write new rows first, then trim excess — prevents data loss if write fails
  if (data.length > 0) {
    const rows = data.map(a => [a.tag || '', a.meta || '', a.text || '']);
    const startRow = 2;
    sheet.getRange(startRow, 1, rows.length, 3).setValues(rows);
    // Remove any extra rows beyond new data length
    const newLastRow = startRow + rows.length - 1;
    if (sheet.getLastRow() > newLastRow) {
      sheet.deleteRows(newLastRow + 1, sheet.getLastRow() - newLastRow);
    }
  } else if (sheet.getLastRow() > 1) {
    // No data — clear rows safely
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
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

  // Snapshot existing data to detect status/task changes
  const prevMap = {};
  if (sheet.getLastRow() > 1) {
    const prev = sheet.getRange(2, 1, sheet.getLastRow() - 1, VOL_HEADERS.length).getValues();
    for (const r of prev) {
      const key = String(r[2]).trim() || String(r[1]).toLowerCase(); // flat or name
      prevMap[key] = { assignedTask: String(r[6] || ''), status: String(r[7] || '') };
    }
    // Note: we read the snapshot BEFORE writing new data (safe — no clear-first)
  }

  if (records.length === 0) {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, VOL_HEADERS.length).clearContent();
    }
    return { success: true, saved: 0 };
  }

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

  // Write new data first (safe), then remove any excess rows from a previous larger set
  sheet.getRange(2, 1, rows.length, VOL_HEADERS.length).setValues(rows);
  const newLastRow = rows.length + 1;
  if (sheet.getLastRow() > newLastRow) {
    sheet.deleteRows(newLastRow + 1, sheet.getLastRow() - newLastRow);
  }

  // Highlight rows and send WA where something meaningful changed
  for (let i = 0; i < rows.length; i++) {
    const status       = rows[i][7];
    const assignedTask = rows[i][6];
    const mobile       = rows[i][3];
    const name         = rows[i][1];
    const flat         = rows[i][2];
    const days         = rows[i][4];

    if (status === 'Confirmed') {
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground('#E8F5E9');
    } else if (rows[i][9] === 'true') {
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground('#E3F2FD');
    } else {
      sheet.getRange(i + 2, 1, 1, VOL_HEADERS.length).setBackground(null);
    }

    if (!mobile) continue;
    const key  = String(flat).trim() || String(name).toLowerCase();
    const prev = prevMap[key] || {};

    // Task newly assigned or changed
    if (assignedTask && assignedTask !== prev.assignedTask) {
      sendWA(mobile,
        '🌅 *PSOTS Chhath Puja 2026 — Task Assigned* 🛠️\n\n' +
        'नमस्ते ' + name + ' जी 🙏\n\n' +
        'The committee has assigned you a task:\n\n' +
        '🛠️ *' + assignedTask + '*\n' +
        '📅 Days: ' + (days || 'TBD') + '\n' +
        '🏠 Flat: ' + flat + '\n\n' +
        'Please confirm your availability by replying to this message.\n' +
        '📞 9482088904\n\n' +
        'जय छठी मैया! 🌅'
      );
    }
    // Status changed to Confirmed
    else if (status === 'Confirmed' && prev.status !== 'Confirmed') {
      sendWA(mobile,
        '🌅 *PSOTS Chhath Puja 2026 — Volunteer Confirmed* ✅\n\n' +
        'नमस्ते ' + name + ' जी 🙏\n\n' +
        'Your volunteer registration is *confirmed*!\n\n' +
        '📅 Days: ' + (days || 'TBD') + '\n' +
        (assignedTask ? '🛠️ Task: ' + assignedTask + '\n' : '') +
        '🏠 Flat: ' + flat + '\n\n' +
        'We\'ll see you at the event. Thank you for serving!\n\n' +
        'जय छठी मैया! 🌅'
      );
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

      // Notify committee of check-in
      const volName     = data[i][1] || '';
      const volFlat     = data[i][2] || '';
      const assignedTask = data[i][6] || data[i][5] || 'Not assigned yet';
      notifyCommittee(
        '✅ *Volunteer Checked In — Chhath 2026*\n' +
        '👤 ' + volName + ' · Flat ' + volFlat + '\n' +
        '📅 ' + (body.day || 'Event day') + '\n' +
        '🛠️ Task: ' + assignedTask + '\n' +
        '🕐 ' + now
      );
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

  // Notify committee of walk-in
  notifyCommittee(
    '🚶 *Walk-in Volunteer — Chhath 2026*\n' +
    '👤 ' + (body.name || '?') + ' · Flat ' + (body.flat || '?') + '\n' +
    '📅 Day: ' + (body.day || 'Event day') + '\n' +
    '⚠️ Not pre-registered — checked in on arrival'
  );
  return { success: true, walkin: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Get gallery photos (public GET — only Approved ones by default)
   Params: year (optional), status (optional, default 'Approved')
══════════════════════════════════════════════════════════ */
function actionGetGalleryPhotos(year, status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GALLERY);
  if (!sheet || sheet.getLastRow() < 2) return { photos: [] };

  const filterStatus = status || 'Approved';
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, GAL_HEADERS.length).getValues();

  let photos = data
    .filter(r => r[7] === filterStatus)                          // Status column
    .filter(r => !year || String(r[3]) === String(year))         // Year filter (optional)
    .filter(r => r[6] && !String(r[6]).startsWith('Drive upload failed')) // must have valid url
    .map(r => ({
      ts:      String(r[0]),
      name:    String(r[1]),
      flat:    String(r[2]),
      year:    String(r[3]),
      moment:  String(r[4]),
      caption: String(r[5]),
      url:     String(r[6]),
      status:  String(r[7])
    }));

  // Newest first
  photos.reverse();
  return { photos };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Update gallery photo status (admin POST)
   Body: { driveUrl, newStatus } where newStatus is 'Approved' | 'Rejected'
══════════════════════════════════════════════════════════ */
function actionUpdateGalleryStatus(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GALLERY);
  if (!sheet || sheet.getLastRow() < 2) return { error: 'No gallery submissions' };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, GAL_HEADERS.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][6]) === String(body.driveUrl)) {
      sheet.getRange(i + 2, 8).setValue(body.newStatus);

      // Notify the uploader — need their mobile from Profiles sheet
      const name    = data[i][1] || '';
      const flat    = data[i][2] || '';
      const year    = data[i][3] || '';
      const moment  = data[i][4] || '';
      const caption = data[i][5] || '';
      const newStatus = body.newStatus || '';

      // Look up mobile from Profiles by flat
      const profSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
      let mobile = '';
      if (profSheet && profSheet.getLastRow() > 1) {
        const profiles = profSheet.getRange(2, 1, profSheet.getLastRow() - 1, PROF_HEADERS.length).getValues();
        for (const p of profiles) {
          if (String(p[3]).trim() === String(flat).trim()) { mobile = String(p[4] || ''); break; }
        }
      }

      if (mobile) {
        if (newStatus === 'Approved') {
          sendWA(mobile,
            '🌅 *PSOTS Chhath Puja 2026 — Photo Approved* ✅\n\n' +
            'नमस्ते ' + name + ' जी 🙏\n\n' +
            'Your photo is now *live in the gallery*! 📸\n\n' +
            '📷 ' + (caption || (moment + ' — ' + year)) + '\n' +
            '🏠 Flat: ' + flat + '\n\n' +
            'View it at: https://chhath.psots.in/pages/gallery.html\n\n' +
            'जय छठी मैया! 🌅'
          );
        } else if (newStatus === 'Rejected') {
          sendWA(mobile,
            '🌅 *PSOTS Chhath Puja 2026 — Photo Update*\n\n' +
            'नमस्ते ' + name + ' जी 🙏\n\n' +
            'Unfortunately your photo could not be approved for the gallery.\n\n' +
            '📷 ' + (caption || (moment + ' — ' + year)) + '\n\n' +
            'If you have questions, please contact the committee:\n' +
            '📞 9482088904\n\n' +
            'जय छठी मैया! 🌅'
          );
        }
      }

      return { success: true };
    }
  }
  return { error: 'Photo not found' };
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

  // Sanitize user-supplied fields used in file name — allow only safe characters
  function _safeName(s) { return String(s || '').replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 40); }
  const safeYear   = _safeName(year   || 'unknown');
  const safeMoment = _safeName(moment || 'photo');
  const safeFlat   = _safeName(flat);

  let driveUrl = '';
  try {
    // Strip data URL prefix and decode base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Guard: base64 string length > ~10MB of data is suspicious
    if (base64Data.length > 14_000_000) {
      return { error: 'Image too large — please upload under 10 MB' };
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      safeYear + '_' + safeMoment + '_' + safeFlat + '_' + Date.now() + '.jpg'
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
  const status = body.adminUpload === true ? 'Approved' : 'Pending Review';
  sheet.appendRow([now, name, flat, year || '', moment || '', caption || '', driveUrl, status]);

  const mobile = body.mobile || '';

  // Confirm to uploader
  if (mobile) {
    sendWA(mobile,
      '🌅 *PSOTS Chhath Puja 2026 — Photo Received* 📸\n\n' +
      'नमस्ते ' + name + ' जी 🙏\n\n' +
      (body.adminUpload
        ? 'Your photo has been published to the gallery! ✅\n'
        : 'Your photo has been submitted and is *under review*. We\'ll notify you once approved.\n') +
      '\n📷 ' + (caption || (moment + ' — ' + year)) + '\n' +
      '🏠 Flat: ' + flat + '\n\n' +
      'जय छठी मैया! 🌅'
    );
  }

  // Notify committee
  notifyCommittee(
    '📸 *New Gallery Photo — PSOTS Chhath 2026*\n' +
    '👤 ' + name + ' · Flat ' + flat + '\n' +
    '🗓️ ' + (year || '') + ' · ' + (moment || '') + '\n' +
    (caption ? '💬 ' + caption : '') + '\n' +
    'Status: ' + status
  );

  return { success: true, driveUrl, status, message: body.adminUpload ? 'Photo published to gallery!' : 'Photo submitted for review!' };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Find existing data by flat number (profile setup helper)
   Helps returning residents link their history without re-entering everything
══════════════════════════════════════════════════════════ */
function actionFindByFlat(flat) {
  if (!flat || !String(flat).trim()) return { ok: false, msg: 'Flat number required' };
  const flatStr = String(flat).trim();

  // 1. Search Profiles sheet first
  const pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFILES);
  if (pSheet && pSheet.getLastRow() >= 2) {
    const rows = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, PROF_HEADERS.length).getValues();
    for (const r of rows) {
      if (String(r[3]).trim() === flatStr) {
        return {
          ok: true, found: true, source: 'profile',
          name:    String(r[1]),
          // email intentionally omitted — not needed by callers and is PII
          flat:    String(r[3]),
          mobile:  String(r[4]),
          isVrati: String(r[5]) === 'true'
        };
      }
    }
  }

  // 2. Fall back to Contributions sheet to get name/mobile
  const cSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTRIBUTIONS);
  if (cSheet && cSheet.getLastRow() >= 2) {
    const rows = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, CON_HEADERS.length).getValues();
    // Prefer most-recent record (last match)
    let match = null;
    for (const r of rows) {
      if (String(r[2]).trim() === flatStr) match = r;
    }
    if (match) {
      return {
        ok: true, found: true, source: 'contributions',
        name:   String(match[1]),
        flat:   flatStr,
        mobile: String(match[3])
      };
    }
  }

  return { ok: true, found: false };
}

/* ══════════════════════════════════════════════════════════
   HELPER: Send WhatsApp receipt to contributor via Fonnte
   Setup: fonnte.com → add device → scan QR with your WhatsApp
          → Script Properties: FONNTE_TOKEN
══════════════════════════════════════════════════════════ */
/* Run this ONCE to grant Apps Script permission to make external HTTP calls.
   After running it successfully, all Fonnte/WhatsApp features will work. */
function authorizeExternalRequests() {
  UrlFetchApp.fetch('https://api.fonnte.com/');
  Logger.log('Authorization granted — external requests are now allowed.');
}

function sendContributorWhatsApp(p) {
  const amt = p.amount ? '₹' + parseFloat(p.amount).toLocaleString('en-IN') : '';
  const ref = p.txnid  ? '\n🔖 Ref: ' + p.txnid : '';

  const msg =
    '🌅 *PSOTS Chhath Puja 2026*\n' +
    '✅ *Payment Received*\n\n' +
    '👤 ' + (p.name || 'Contributor') + '\n' +
    (p.flat   ? '🏠 Flat ' + p.flat + ' · Prestige Song of the South\n' : '') +
    '💰 *' + amt + '*' +
    (p.method ? ' via ' + p.method : '') + '\n' +
    (p.date   ? '📅 ' + p.date + '\n' : '') +
    ref + '\n\n' +
    (p.verified ? '✅ Payment confirmed by gateway.\n' : '⏳ Will be verified by committee within 24 hours.\n') +
    '👉 View receipt: chhath.psots.in/portal.html\n\n' +
    'जय छठी मैया! 🙏';

  sendWA(p.phone, msg);
}

/* ══════════════════════════════════════════════════════════
   ACTION: Check whether FONNTE_TOKEN is set
══════════════════════════════════════════════════════════ */
function actionGetFonnteStatus() {
  const token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  return { ok: true, configured: !!token };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Send WhatsApp message(s) via Fonnte API
   Body: { targets: ['phone1','phone2',...], message: '...' }
   - targets are normalised to E.164 (91xxxxxxxxxx)
   - Fonnte /send accepts comma-separated targets for bulk
══════════════════════════════════════════════════════════ */
function actionSendFonnteMessage(body) {
  const token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  if (!token) return { ok: false, msg: 'Fonnte not configured — add FONNTE_TOKEN to Script Properties' };

  const rawTargets = Array.isArray(body.targets) ? body.targets : [body.targets];
  const message    = String(body.message || '').trim();
  if (!message) return { ok: false, msg: 'No message provided' };

  // Normalise: strip non-digits, remove leading 0, add 91 prefix
  const targets = rawTargets.map(function(t) {
    var p = String(t || '').replace(/\D/g, '');
    if (!p) return null;
    if (p.startsWith('0')) p = p.slice(1);
    if (!p.startsWith('91')) p = '91' + p;
    return p.length >= 12 ? p : null;          // must be at least 91 + 10 digits
  }).filter(Boolean);

  if (!targets.length) return { ok: false, msg: 'No valid phone numbers after normalisation' };

  try {
    var resp = UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method:  'post',
      headers: { 'Authorization': token },
      payload: {
        target:      targets.join(','),
        message:     message,
        countryCode: '91'
      },
      muteHttpExceptions: true
    });
    var parsed = JSON.parse(resp.getContentText());
    Logger.log('Fonnte sendFonnteMessage → ' + JSON.stringify(parsed));
    if (parsed.status === false) {
      return { ok: false, msg: parsed.reason || 'Fonnte rejected the request', detail: parsed };
    }
    return { ok: true, sent: targets.length, detail: parsed };
  } catch(e) {
    Logger.log('Fonnte sendFonnteMessage error: ' + e.message);
    return { ok: false, msg: 'Network error: ' + e.message };
  }
}

/* ══════════════════════════════════════════════════════════
   HELPER: Generic single-number WhatsApp send via Fonnte
   phone: raw string — normalised to 91xxxxxxxxxx internally
══════════════════════════════════════════════════════════ */
function sendWA(phone, message) {
  const token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  if (!token) return;

  var p = String(phone || '').replace(/\D/g, '');
  if (!p) return;
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91')) p = '91' + p;
  if (p.length < 12) return;

  try {
    UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method:  'post',
      headers: { 'Authorization': token },
      payload: { target: p, message: message, countryCode: '91' },
      muteHttpExceptions: true
    });
  } catch(e) {
    Logger.log('sendWA failed (' + p + '): ' + e.message);
  }
}

/* ══════════════════════════════════════════════════════════
   HELPER: Notify committee on WhatsApp via Fonnte
   Script Properties: COMMITTEE_PHONE (e.g. 919482088904)
══════════════════════════════════════════════════════════ */
function notifyCommitteeWhatsApp(body) {
  const props = PropertiesService.getScriptProperties();
  const phone = props.getProperty('COMMITTEE_PHONE');
  if (!phone) return;

  const amt    = body.amount ? '₹' + parseFloat(body.amount).toLocaleString('en-IN') : '?';
  const name   = body.name   || 'Unknown';
  const flat   = body.flat   || '?';
  const method = body.method || 'UPI';
  const date   = body.date   || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy');

  const msg =
    '🌅 *New Chhath 2026 Payment*\n' +
    '👤 ' + name + ' · Flat ' + flat + '\n' +
    '💰 ' + amt + ' via ' + method + '\n' +
    '📅 ' + date + '\n' +
    '⏳ Pending verification';

  sendWA(phone, msg);
}

/* ══════════════════════════════════════════════════════════
   HELPER: Notify committee with a custom message
══════════════════════════════════════════════════════════ */
function notifyCommittee(message) {
  const props = PropertiesService.getScriptProperties();
  const phone = props.getProperty('COMMITTEE_PHONE');
  if (!phone) return;
  sendWA(phone, message);
}

/* ══════════════════════════════════════════════════════════
   ACTION: Send payment invoice email
══════════════════════════════════════════════════════════ */
function actionSendInvoiceEmail(params) {
  const email     = String(params.email     || '').trim();
  const name      = String(params.name      || 'Contributor').trim();
  const flat      = String(params.flat      || '').trim();
  const amount    = String(params.amount    || '').trim();
  const txnid     = String(params.txnid     || '').trim();
  const mihpayid  = String(params.mihpayid  || '').trim();
  const mode      = String(params.mode      || 'Online').trim();
  const dateStr   = String(params.date      || '').trim() ||
                    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, msg: 'Invalid or missing email' };
  }

  // Avoid re-sending for the same txnid (idempotency guard)
  if (txnid) {
    const sentKey = 'inv_sent_' + txnid;
    const alreadySent = PropertiesService.getScriptProperties().getProperty(sentKey);
    if (alreadySent) return { ok: true, skipped: true };
    PropertiesService.getScriptProperties().setProperty(sentKey, '1');
  }

  const amtFormatted = amount ? '₹' + parseFloat(amount).toLocaleString('en-IN') : '';
  const refLine      = mihpayid ? mihpayid : (txnid || '—');
  const portalUrl    = 'https://chhath.psots.in/portal.html';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5ede0;font-family:'DM Sans',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5ede0;padding:32px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:520px;width:100%">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1a0800,#3d1200);padding:32px 28px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🌅</div>
      <div style="font-family:serif;font-size:22px;color:#ffc200;font-weight:bold;letter-spacing:.03em">PSOTS Chhath Puja 2026</div>
      <div style="font-size:11px;color:#c8a880;letter-spacing:.12em;margin-top:4px;text-transform:uppercase">Payment Receipt &amp; Thank You</div>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:28px 28px 0">
      <p style="margin:0;font-size:16px;color:#3d1200;font-weight:600">Dear ${name},</p>
      <p style="margin:12px 0 0;font-size:14px;color:#5a3010;line-height:1.7">
        Thank you for your generous contribution to <strong>PSOTS Chhath Puja 2026</strong>.<br/>
        Your payment has been received and a committee member will verify it within <strong>24 hours</strong>.
      </p>
    </td>
  </tr>

  <!-- Amount highlight -->
  <tr>
    <td style="padding:20px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fff8ed,#ffefd4);border-radius:12px;border:1.5px solid #ffd080">
        <tr>
          <td style="padding:20px;text-align:center">
            <div style="font-size:13px;color:#7a4010;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Amount Contributed</div>
            <div style="font-size:36px;font-weight:800;color:#c84800">${amtFormatted}</div>
            <div style="font-size:12px;color:#9a6030;margin-top:4px">✅ Payment Received</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Transaction details -->
  <tr>
    <td style="padding:0 28px 20px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #f0e0cc;overflow:hidden">
        ${flat      ? `<tr style="background:#fdf8f4"><td style="padding:10px 14px;font-size:12px;color:#7a4010;font-weight:600;width:42%;border-bottom:1px solid #f0e0cc">FLAT</td><td style="padding:10px 14px;font-size:13px;color:#2a1000;font-weight:700;border-bottom:1px solid #f0e0cc">${flat} · Prestige Song of the South</td></tr>` : ''}
        ${mode      ? `<tr style="background:#fff"><td style="padding:10px 14px;font-size:12px;color:#7a4010;font-weight:600;border-bottom:1px solid #f0e0cc">MODE</td><td style="padding:10px 14px;font-size:13px;color:#2a1000;border-bottom:1px solid #f0e0cc">${mode}</td></tr>` : ''}
        ${dateStr   ? `<tr style="background:#fdf8f4"><td style="padding:10px 14px;font-size:12px;color:#7a4010;font-weight:600;border-bottom:1px solid #f0e0cc">DATE</td><td style="padding:10px 14px;font-size:13px;color:#2a1000;border-bottom:1px solid #f0e0cc">${dateStr}</td></tr>` : ''}
        <tr style="background:#fff"><td style="padding:10px 14px;font-size:12px;color:#7a4010;font-weight:600">REFERENCE</td><td style="padding:10px 14px;font-size:12px;color:#2a1000;font-family:monospace">${refLine}</td></tr>
      </table>
    </td>
  </tr>

  <!-- What's next -->
  <tr>
    <td style="padding:0 28px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fff4;border-radius:10px;border:1px solid #a5d6a7">
        <tr>
          <td style="padding:14px 16px">
            <div style="font-size:12px;font-weight:700;color:#2e7d32;margin-bottom:6px">WHAT HAPPENS NEXT</div>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#1b5e20;line-height:1.8">
              <li>✅ Your payment has been confirmed by the gateway</li>
              <li>Your name will appear on the Contributors page shortly</li>
              <li>You can view your receipt anytime in the <a href="${portalUrl}" style="color:#c84800">Resident Portal</a></li>
            </ul>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Event info -->
  <tr>
    <td style="background:#1a0800;padding:18px 28px;text-align:center">
      <div style="font-size:13px;color:#ffc200;font-weight:700;margin-bottom:4px">🌅 Chhath Puja 2026</div>
      <div style="font-size:12px;color:#c8a880">Nov 1–4, 2026 · Society Ghat · Bengaluru</div>
      <div style="font-size:14px;color:#ffd060;margin-top:8px">जय छठी मैया! 🙏</div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:14px 28px;text-align:center">
      <p style="margin:0;font-size:11px;color:#9a7050">This is an auto-generated receipt from PSOTS Chhath Puja Committee.<br/>For queries contact the committee via the <a href="${portalUrl}" style="color:#c84800">portal</a>.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    MailApp.sendEmail({
      to:       email,
      subject:  '🌅 Payment Received — PSOTS Chhath Puja 2026 (' + amtFormatted + ')',
      htmlBody: html,
      name:     'PSOTS Chhath Puja Committee'
    });
  } catch (err) {
    Logger.log('Invoice email failed: ' + err.message);
    return { ok: false, msg: err.message };
  }

  // Send WhatsApp receipt to contributor via Fonnte (fire-and-forget)
  try { sendContributorWhatsApp({
    phone:    params.phone    || '',
    name:     name,
    flat:     flat,
    amount:   amount,
    method:   mode,
    date:     dateStr,
    txnid:    mihpayid || txnid,
    verified: true   // PayU gateway — instant confirmation
  }); } catch(e) {}

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Team Members / Roles  (stored in Members sheet)
   Sheet columns: Email | DisplayName | Role | AddedBy | AddedAt
   Roles: admin | treasurer | core_committee | volunteer_coordinator
   Edit directly in the sheet — changes are picked up instantly.
══════════════════════════════════════════════════════════ */
function actionGetMembers() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let   mem = ss.getSheetByName(SHEET_MEMBERS);
  // Auto-create the sheet if it doesn't exist yet
  if (!mem) {
    mem = ss.insertSheet(SHEET_MEMBERS);
    mem.appendRow(MEM_HEADERS);
    mem.getRange(1, 1, 1, MEM_HEADERS.length)
       .setFontWeight('bold').setBackground('#7A3800').setFontColor('#FFFFFF');
    mem.setFrozenRows(1);
  }
  const lastRow = mem.getLastRow();
  if (lastRow < 2) return { members: [] };
  const rows = mem.getRange(2, 1, lastRow - 1, MEM_HEADERS.length).getValues();
  const members = rows
    .filter(r => r[0] && String(r[0]).includes('@'))  // skip blank rows
    .map(r => ({
      email:   String(r[0]).trim().toLowerCase(),
      name:    String(r[1]).trim(),
      role:    String(r[2]).trim() || 'admin',
      addedBy: String(r[3]).trim(),
      addedAt: r[4] ? new Date(r[4]).getTime() : 0,
    }));
  return { members };
}

function actionSaveMembers(members) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let   mem = ss.getSheetByName(SHEET_MEMBERS);
  if (!mem) {
    mem = ss.insertSheet(SHEET_MEMBERS);
    mem.appendRow(MEM_HEADERS);
    mem.getRange(1, 1, 1, MEM_HEADERS.length)
       .setFontWeight('bold').setBackground('#7A3800').setFontColor('#FFFFFF');
    mem.setFrozenRows(1);
  }
  // Write new data first (safe), then trim excess rows
  if (members.length > 0) {
    const rows = members.map(m => [
      (m.email   || '').toLowerCase().trim(),
      m.name     || '',
      m.role     || 'admin',
      m.addedBy  || '',
      m.addedAt  ? new Date(m.addedAt).toISOString() : new Date().toISOString(),
    ]);
    mem.getRange(2, 1, rows.length, MEM_HEADERS.length).setValues(rows);
    const newLastRow = rows.length + 1;
    if (mem.getLastRow() > newLastRow) {
      mem.deleteRows(newLastRow + 1, mem.getLastRow() - newLastRow);
    }
  } else if (mem.getLastRow() > 1) {
    mem.deleteRows(2, mem.getLastRow() - 1);
  }
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   Expense Receipts — stored in Receipts sheet (editable)
   Sheet columns: ID | Category | Vendor | Amount | Date | Link | Notes
   Edit rows directly in the sheet; changes are picked up on next load.
══════════════════════════════════════════════════════════ */
function actionGetReceipts() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let   rcpt = ss.getSheetByName(SHEET_RECEIPTS);
  if (!rcpt) return { receipts: [] };
  const lastRow = rcpt.getLastRow();
  if (lastRow < 2) return { receipts: [] };
  const rows = rcpt.getRange(2, 1, lastRow - 1, RCPT_HEADERS.length).getValues();
  const receipts = rows
    .filter(r => r[2] && String(r[2]).trim())   // must have Vendor
    .map(r => ({
      id:     Number(r[0]) || Date.now(),
      cat:    String(r[1]).trim(),
      vendor: String(r[2]).trim(),
      amount: Number(r[3]) || 0,
      date:   String(r[4]).trim(),
      link:   String(r[5]).trim(),
      notes:  String(r[6]).trim(),
    }));
  return { receipts };
}

function actionSaveReceipts(receipts) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let   rcpt = ss.getSheetByName(SHEET_RECEIPTS);
  if (!rcpt) {
    rcpt = ss.insertSheet(SHEET_RECEIPTS);
    rcpt.appendRow(RCPT_HEADERS);
    rcpt.getRange(1, 1, 1, RCPT_HEADERS.length)
        .setFontWeight('bold').setBackground('#7A3800').setFontColor('#FFFFFF');
    rcpt.setFrozenRows(1);
  }
  const lastRow = rcpt.getLastRow();
  if (lastRow > 1) rcpt.deleteRows(2, lastRow - 1);
  if (receipts.length > 0) {
    const rows = receipts.map(r => [r.id||'', r.cat||'', r.vendor||'', r.amount||0, r.date||'', r.link||'', r.notes||'']);
    rcpt.getRange(2, 1, rows.length, RCPT_HEADERS.length).setValues(rows);
  }
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   Reminders — stored in Script Properties (admin-only config)
   JSON array: [{date, template, note}]
══════════════════════════════════════════════════════════ */
function actionGetReminders() {
  const raw = PropertiesService.getScriptProperties().getProperty('PSOTS_REMINDERS');
  return { reminders: raw ? JSON.parse(raw) : [] };
}

function actionSaveReminders(reminders) {
  PropertiesService.getScriptProperties().setProperty('PSOTS_REMINDERS', JSON.stringify(reminders));
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   Role Permissions — stored in RolePerms sheet
   Columns: Role | Tabs (JSON array of tab keys)
   One row per role; sheet is auto-created on first access.
══════════════════════════════════════════════════════════ */
function _getRolePermsSheet(ss) {
  let sh = ss.getSheetByName(SHEET_ROLE_PERMS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ROLE_PERMS);
    sh.appendRow(RPERMS_HEADERS);
    sh.getRange(1, 1, 1, RPERMS_HEADERS.length)
      .setFontWeight('bold').setBackground('#7A3800').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 200);
    sh.setColumnWidth(2, 500);
  }
  return sh;
}

function actionGetRolePerms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = _getRolePermsSheet(ss);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { perms: null };  // null = use client defaults
  const rows = sh.getRange(2, 1, lastRow - 1, 2).getValues();
  const perms = {};
  rows.forEach(r => {
    const role = String(r[0]).trim();
    if (!role) return;
    try { perms[role] = JSON.parse(String(r[1])); } catch(e) { perms[role] = []; }
  });
  return { perms: Object.keys(perms).length ? perms : null };
}

function actionSaveRolePerms(perms = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = _getRolePermsSheet(ss);
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.deleteRows(2, lastRow - 1);
  const rows = Object.entries(perms).map(([role, tabs]) => [role, JSON.stringify(tabs)]);
  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   Prasad RSVPs — stored in Script Properties (JSON array)
   Fields: name, flat, mobile, family, kharnaPlates, thekuaPackets, timestamp
══════════════════════════════════════════════════════════ */
function actionGetRsvps() {
  const raw = PropertiesService.getScriptProperties().getProperty('PSOTS_RSVPS');
  return { rsvps: raw ? JSON.parse(raw) : [] };
}

function actionSubmitRsvp(body) {
  const props = PropertiesService.getScriptProperties();
  const raw   = props.getProperty('PSOTS_RSVPS');
  const rsvps = raw ? JSON.parse(raw) : [];

  const flatStr = String(body.flat || '').trim();
  // Prevent duplicate RSVPs from the same flat
  const dupIdx = rsvps.findIndex(r => r.flat && String(r.flat).trim() === flatStr && flatStr);
  const entry = {
    timestamp:    body.timestamp || new Date().toISOString(),
    name:         String(body.name   || '').trim(),
    flat:         flatStr,
    mobile:       String(body.mobile || '').replace(/\D/g, '').slice(-10),
    family:       Number(body.family)       || 0,
    kharnaPlates: Number(body.kharnaPlates) || 0,
    thekuaPackets:Number(body.thekuaPackets)|| 0
  };
  if (dupIdx >= 0) {
    rsvps[dupIdx] = entry; // update existing RSVP from same flat
  } else {
    rsvps.push(entry);
  }

  const serialized = JSON.stringify(rsvps);
  // Script Properties total limit is 500KB — warn at 400KB, refuse at 480KB
  if (serialized.length > 480000) {
    return { ok: false, error: 'RSVP storage is full — please contact the committee to clear old data.' };
  }
  props.setProperty('PSOTS_RSVPS', serialized);

  const name    = body.name   || 'Resident';
  const flat    = body.flat   || '?';
  const mobile  = body.mobile || '';
  const kharna  = Number(body.kharnaPlates)  || 0;
  const thekua  = Number(body.thekuaPackets) || 0;
  const family  = Number(body.family)        || 0;

  // Confirm to resident
  if (mobile) {
    sendWA(mobile,
      '🌅 *PSOTS Chhath Puja 2026 — RSVP Confirmed* ✅\n\n' +
      'नमस्ते ' + name + ' जी 🙏\n\n' +
      'Your prasad RSVP has been recorded:\n' +
      '🏠 Flat: ' + flat + '\n' +
      '👨‍👩‍👧‍👦 Family members: ' + family + '\n' +
      '🍽️ Kharna plates: ' + kharna + '\n' +
      '🪔 Thekua packets: ' + thekua + '\n\n' +
      'Event: *Nov 1–4, 2026*\n' +
      'Kharna: Nov 2  |  Thekua: Nov 4\n\n' +
      'जय छठी मैया! 🌅'
    );
  }

  // Notify committee
  notifyCommittee(
    '🙏 *New RSVP — PSOTS Chhath 2026*\n' +
    '👤 ' + name + ' · Flat ' + flat + '\n' +
    '👨‍👩‍👧‍👦 Family: ' + family + '  |  🍽️ Kharna: ' + kharna + '  |  🪔 Thekua: ' + thekua
  );

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════
   ACTION: Individual volunteer sign-up (POST from volunteer page)
   Appends one row to the Volunteers sheet
══════════════════════════════════════════════════════════ */
function actionSubmitVolunteer(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOLUNTEERS);
  if (!sheet) return { error: 'Volunteers sheet not found' };
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  sheet.appendRow([
    body.timestamp ? new Date(body.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : now,
    body.name   || '',
    body.flat   || '',
    body.mobile || '',
    body.days   || '',
    body.tasks  || '',
    '',               // AssignedTask (blank until admin assigns)
    body.status || 'Registered',
    body.note   || '',
    'false',          // CheckedIn
    ''                // CheckinTime
  ]);

  const name   = body.name   || 'Volunteer';
  const flat   = body.flat   || '?';
  const mobile = body.mobile || '';
  const days   = body.days   || 'TBD';
  const tasks  = body.tasks  || 'TBD';

  // Confirm to volunteer
  if (mobile) {
    sendWA(mobile,
      '🌅 *PSOTS Chhath Puja 2026 — Volunteer Registered* ✅\n\n' +
      'नमस्ते ' + name + ' जी 🙏\n\n' +
      'Thank you for signing up to volunteer!\n\n' +
      '🏠 Flat: ' + flat + '\n' +
      '📅 Days: ' + days + '\n' +
      '🛠️ Tasks: ' + tasks + '\n\n' +
      'The committee will be in touch with your assigned role closer to the event.\n\n' +
      'जय छठी मैया! 🌅\n— PSOTS Chhath Committee'
    );
  }

  // Notify committee
  notifyCommittee(
    '🙋 *New Volunteer — PSOTS Chhath 2026*\n' +
    '👤 ' + name + ' · Flat ' + flat + '\n' +
    '📅 Days: ' + days + '\n' +
    '🛠️ Tasks: ' + tasks
  );

  return { ok: true };
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
