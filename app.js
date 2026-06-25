/**
 * 60 Days Behavior Change - Application Logic & State Management
 * Powered by LocalStorage with Mock DB and Real Sheet sync capability.
 */

// Initialize Web Audio Context for synthesized sound effects
let audioCtx = null;
function playSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        if (type === 'tick') {
            // Wheel tick sound (plip!)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'win') {
            // Winning fanfare (two-tone chord)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
            
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (type === 'click') {
            // Simple tap sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    } catch (e) {
        console.error("Audio Context error:", e);
    }
}

// -------------------------------------------------------------
// Base Data & LocalStorage Initialization
// -------------------------------------------------------------

const DEFAULT_MOCK_EMPLOYEES = [
    { empId: "01001", name: "สมชาย", surname: "รักดี", department: "IT", ldl: 145.5 },
    { empId: "01002", name: "สมหญิง", surname: "เรียนเก่ง", department: "HRD", ldl: 135.0 },
    { empId: "01003", name: "วันชัย", surname: "มีสุข", department: "FIN", ldl: 160.2 },
    { empId: "01004", name: "สุรชัย", surname: "ใฝ่รู้", department: "BSD1", ldl: 115.0 },
    { empId: "01005", name: "นารี", surname: "อ่อนหวาน", department: "PUR", ldl: 125.4 },
    { empId: "01006", name: "ประสิทธิ์", surname: "อดทน", department: "TRF", ldl: null },
    { empId: "01007", name: "เกศรา", surname: "รุ่งเรือง", department: "OP1", ldl: 152.1 },
    { empId: "01008", name: "ชลิตา", surname: "น่ารัก", department: "BSD2", ldl: 110.0 },
    { empId: "01009", name: "พีระพัฒน์", surname: "ก้าวหน้า", department: "FAC", ldl: 138.6 },
    { empId: "01010", name: "อภิสิทธิ์", surname: "ว่องไว", department: "TRFS", ldl: null }
];

let currentApprovalQueueTab = "pending";
let editingRoundId = null;

// Load settings or set defaults
let appSettings = JSON.parse(localStorage.getItem('bc_settings')) || {
    isRegOpen: true,
    isLdlAnnounced: false,
    campaignStartDate: "2026-06-01",
    drawRounds: [
        { id: "round_15", milestone: 15, date: "2026-06-10", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_30", milestone: 30, date: "2026-06-25", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_45", milestone: 45, date: "2026-07-10", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_60", milestone: 60, date: "2026-07-25", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] }
    ],
    syncSheetUrl: "https://docs.google.com/spreadsheets/d/1CDz9odSBT9gW6EmGJpxSFseEMtp0y3Oe8ZGY86q6C3w/edit?gid=0#gid=0"
};

if (appSettings.isLdlAnnounced === undefined) {
    appSettings.isLdlAnnounced = false;
    localStorage.setItem('bc_settings', JSON.stringify(appSettings));
}
if (appSettings.campaignStartDate === undefined) {
    appSettings.campaignStartDate = "2026-06-01";
    localStorage.setItem('bc_settings', JSON.stringify(appSettings));
}

// Migrate old format drawDates if they exist to the new format drawRounds
if (!appSettings.drawRounds) {
    appSettings.drawRounds = [
        { id: "round_15", milestone: 15, date: appSettings.drawDate_15 || "2026-06-10", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_30", milestone: 30, date: appSettings.drawDate_30 || "2026-06-25", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_45", milestone: 45, date: appSettings.drawDate_45 || "2026-07-10", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] },
        { id: "round_60", milestone: 60, date: appSettings.drawDate_60 || "2026-07-25", time: "09:00", maxPrizes: 7, remainingPrizes: 7, prizes: [
            { name: "กระเป๋าเป้สุขภาพ", maxQty: 1, remainingQty: 1 },
            { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3, remainingQty: 3 },
            { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3, remainingQty: 3 }
        ] }
    ];
    localStorage.setItem('bc_settings', JSON.stringify(appSettings));
} else {
    let migrated = false;
    appSettings.drawRounds.forEach(round => {
        if (!round.prizes) {
            const max = round.maxPrizes || 3;
            const rem = round.remainingPrizes !== undefined ? round.remainingPrizes : max;
            const p1 = Math.floor(max / 3) || 1;
            const p2 = Math.floor((max - p1) / 2) || 1;
            const p3 = Math.max(1, max - p1 - p2);
            
            const r1 = Math.min(p1, rem);
            const r2 = Math.min(p2, Math.max(0, rem - r1));
            const r3 = Math.max(0, rem - r1 - r2);
            
            round.prizes = [
                { name: "กระเป๋าเป้สุขภาพ", maxQty: p1, remainingQty: r1 },
                { name: "หมวกแก๊ปออกกำลังกาย", maxQty: p2, remainingQty: r2 },
                { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: p3, remainingQty: r3 }
            ];
            round.maxPrizes = p1 + p2 + p3;
            round.remainingPrizes = r1 + r2 + r3;
            migrated = true;
        }
    });
    if (migrated) {
        localStorage.setItem('bc_settings', JSON.stringify(appSettings));
    }
}

// Dynamic Questionnaire configuration
const DEFAULT_INITIAL_QUESTIONS = [
    { id: "init_1_1", section: "lifestyle", text: "1.1 ท่านรับประทานยาลดไขมันต่อเนื่องจากแพทย์", type: "boolean", originalKey: "lifestyle1" },
    { id: "init_1_2", section: "lifestyle", text: "1.2 ท่านรับประทานยาลดไขมัน แต่ไม่ต่อเนื่องจากแพทย์", type: "boolean", originalKey: "lifestyle2" },
    { id: "init_1_3", section: "lifestyle", text: "1.3 ท่านควบคุมอาหารด้วยตนเอง และไม่เคยรับประทานยาลดไขมัน", type: "boolean", originalKey: "lifestyle3" },
    { id: "init_1_4", section: "lifestyle", text: "1.4 ท่านออกกำลังกายสม่ำเสมอเฉลี่ย 3-5 วันต่อสัปดาห์", type: "boolean", originalKey: "lifestyle4" },
    { id: "init_1_5", section: "lifestyle", text: "1.5 ท่านไม่ได้ปฏิบัติทั้งการควบคุมอาหาร ออกกำลังกาย หรือรับประทานยาเลย", type: "boolean", originalKey: "lifestyle5" },
    { id: "init_2_1", section: "goal", text: "2.1 ควบคุมอาหารด้วยตนเองก่อน", type: "boolean", originalKey: "goal1" },
    { id: "init_2_2", section: "goal", text: "2.2 รับประทานยาลดไขมันตามสั่งแพทย์ต่อเนื่อง", type: "boolean", originalKey: "goal2" },
    { id: "init_2_3", section: "goal", text: "2.3 ออกกำลังกายสม่ำเสมอเฉลี่ยอย่างน้อย 3-5 วันต่อสัปดาห์", type: "boolean", originalKey: "goal3" },
    { id: "init_2_4", section: "goal", text: "2.4 มีความประสงค์จะเข้าพบแพทย์เพื่อขอรับยาลดไขมันมาทาน", type: "boolean", originalKey: "goal4" },
    { id: "init_3_1", section: "ldlTarget", text: "3.1 ต้องการให้ระดับไขมัน LDL อยู่ในเกณฑ์ปกติของห้องปฏิบัติการตรวจวิเคราะห์ (<130 mg/dL)", type: "boolean", originalKey: "ldlTarget1" },
    { id: "init_3_2", section: "ldlTarget", text: "3.2 ต้องการลดค่าไขมันลงมาเป้าหมายเฉพาะส่วนบุคคล (mg/dL)", type: "numeric", originalKey: "ldlTarget2", dependsOn: "init_3_1", showIfValue: "ไม่ใช่" }
];

const DEFAULT_DAILY_QUESTIONS = [
    { id: "daily_alcohol", text: "วันนี้ท่านได้ดื่มเครื่องดื่มแอลกอฮอล์หรือไม่?", type: "boolean", originalKey: "alcohol", isNegative: true },
    { id: "daily_sugar", text: "วันนี้ท่านดื่มเครื่องดื่มที่ใส่น้ำตาล/หวานหรือไม่?", type: "boolean", originalKey: "sugar", isNegative: true },
    { id: "daily_snack", text: "วันนี้ท่านรับประทานขนมจุบจิบ/ของว่างหรือไม่?", type: "boolean", originalKey: "snack", isNegative: true },
    { id: "daily_water", text: "วันนี้ท่านดื่มน้ำสะอาด 1.5 - 2 ลิตรหรือไม่?", type: "boolean", originalKey: "water" }
];

function getInitialQuestions() {
    const raw = localStorage.getItem('bc_initial_questions');
    if (!raw) {
        localStorage.setItem('bc_initial_questions', JSON.stringify(DEFAULT_INITIAL_QUESTIONS));
        return DEFAULT_INITIAL_QUESTIONS;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        localStorage.setItem('bc_initial_questions', JSON.stringify(DEFAULT_INITIAL_QUESTIONS));
        return DEFAULT_INITIAL_QUESTIONS;
    }
}

function setInitialQuestions(questions) {
    localStorage.setItem('bc_initial_questions', JSON.stringify(questions));
}

function getDailyQuestions() {
    const raw = localStorage.getItem('bc_daily_questions');
    if (!raw) {
        localStorage.setItem('bc_daily_questions', JSON.stringify(DEFAULT_DAILY_QUESTIONS));
        return DEFAULT_DAILY_QUESTIONS;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        localStorage.setItem('bc_daily_questions', JSON.stringify(DEFAULT_DAILY_QUESTIONS));
        return DEFAULT_DAILY_QUESTIONS;
    }
}

function setDailyQuestions(questions) {
    localStorage.setItem('bc_daily_questions', JSON.stringify(questions));
}

let HEALTHY_MENU_CATALOG = [];


function initHealthyMenuCatalog() {
    const raw = localStorage.getItem('bc_healthy_menu');
    if (raw) {
        try {
            HEALTHY_MENU_CATALOG = JSON.parse(raw);
            return;
        } catch (e) {
            console.error("Error parsing healthy menu catalog, resetting...", e);
        }
    }
    
    HEALTHY_MENU_CATALOG = [
        { id: "b1", name: "แกงจืดเต้าหู้หมูสับสาหร่าย", category: "boil" },
        { id: "b2", name: "ต้มยำปลากะพงน้ำใส", category: "boil" },
        { id: "b3", name: "ต้มแซ่บ", category: "boil" },
        { id: "b4", name: "ต้มจืด", category: "boil" },
        { id: "b5", name: "ต้มจับฉ่ายกระดูกหมู", category: "boil" },
        { id: "b6", name: "ต้มจืดผักกาดขาว", category: "boil" },
        { id: "b7", name: "ต้มจืดสาหร่าย", category: "boil" },
        { id: "b8", name: "ต้มจืดมะระหมูสับไม่ติดมัน", category: "boil" },
        { id: "b9", name: "ต้มจืดตำลึง", category: "boil" },
        { id: "b10", name: "ต้มยำปลา", category: "boil" },
        { id: "b11", name: "ต้มปลาทูสด", category: "boil" },
        { id: "b12", name: "ต้มยำเห็ด", category: "boil" },
        { id: "b13", name: "ต้มจืดฟัก", category: "boil" },
        { id: "b14", name: "ต้มจืดหัวไชเท้า", category: "boil" },

        { id: "c1", name: "แกงส้มกุ้งสดผักรวม", category: "curry" },
        { id: "c2", name: "แกงส้ม", category: "curry" },
        { id: "c3", name: "แกงป่า", category: "curry" },
        { id: "c4", name: "แกงเลียง", category: "curry" },
        { id: "c5", name: "แกงไตปลา", category: "curry" },
        { id: "c6", name: "แกงเหลือง", category: "curry" },
        { id: "c7", name: "แกงเห็ด", category: "curry" },
        { id: "c8", name: "แกงเลียงกุ้งสด", category: "curry" },
        { id: "c9", name: "แกงส้มผักรวม", category: "curry" },
        { id: "c10", name: "แกงป่าไก่", category: "curry" },
        { id: "c11", name: "แกงเห็ดรวม", category: "curry" },

        { id: "y1", name: "ยำวุ้นเส้นหมูสับ", category: "spicy" },
        { id: "y2", name: "ยำตะไคร้", category: "spicy" },
        { id: "y3", name: "ยำผลไม้รวม", category: "spicy" },
        { id: "y4", name: "ยำเห็ดหูหนูขาว", category: "spicy" },
        { id: "y5", name: "ยำผักกระเฉดกุ้งสด", category: "spicy" },
        { id: "y6", name: "ยำปลาทู", category: "spicy" },
        { id: "y7", name: "ยำไข่ต้ม", category: "spicy" },
        { id: "y8", name: "ยำปลาทูน่า", category: "spicy" },
        { id: "y9", name: "ยำมะม่วง", category: "spicy" },
        { id: "y10", name: "ส้มตำไทย", category: "spicy" },

        { id: "sm1", name: "ปลานึ่งมะนาว", category: "steam" },
        { id: "sm2", name: "ผักกาดขาวห่ออกไก่นึ่ง", category: "steam" },
        { id: "sm3", name: "ฟักทองนึ่ง", category: "steam" },
        { id: "sm4", name: "ปลานึ่งบ๊วย", category: "steam" },
        { id: "sm5", name: "ปลานึ่งซีอิ๊ว", category: "steam" },

        { id: "st1", name: "ไข่ตุ๋น", category: "stew" },
        { id: "st2", name: "ปลาตุ๋นสมุนไพรจีน", category: "stew" },
        { id: "st3", name: "ตุ๋นอกไก่ฟักเขียว", category: "stew" },
        { id: "st4", name: "ผักกาดขาวตุ๋นเห็ดหอม", category: "stew" },
        { id: "st5", name: "กะหล่ำปลีตุ๋นเห็ดหอม", category: "stew" },
        { id: "st6", name: "ผักกาดดองตุ๋นกระดูกหมู", category: "stew" },

        { id: "g1", name: "ปลาย่าง", category: "grill" },
        { id: "g2", name: "ปลาเผาเกลือ", category: "grill" },
        { id: "g3", name: "อกไก่ย่าง", category: "grill" },
        { id: "g4", name: "หมูเนื้อแดงย่าง", category: "grill" },
        { id: "g5", name: "เห็ดย่าง", category: "grill" },
        { id: "g6", name: "ข้าวโพดย่าง", category: "grill" },
        { id: "g7", name: "กระเจี๊ยบเขียวย่าง", category: "grill" }
    ];
    localStorage.setItem('bc_healthy_menu', JSON.stringify(HEALTHY_MENU_CATALOG));
}

initHealthyMenuCatalog();

// We will clean up the rest of the trailing lines next.







// Check if Mock Database exists or contains old department names, or is missing the ldl field
const rawMockDb = localStorage.getItem('bc_mock_employees');
let resetMockDb = false;
if (rawMockDb) {
    try {
        const parsed = JSON.parse(rawMockDb);
        if (parsed.some(e => e.department === "บัญชี" || e.department === "การตลาด" || (e.department === "IT" && e.name === "สมชาย" && !parsed.some(x => x.department === "HRD")) || !parsed.some(e => e.ldl !== undefined))) {
            resetMockDb = true;
        }
    } catch (e) {
        resetMockDb = true;
    }
} else {
    resetMockDb = true;
}

if (resetMockDb) {
    localStorage.setItem('bc_mock_employees', JSON.stringify(DEFAULT_MOCK_EMPLOYEES));
}

// -------------------------------------------------------------
// Core State Getter / Setter Helpers
// -------------------------------------------------------------
function normalizeEmployees(employees) {
    if (!Array.isArray(employees)) return [];
    return employees.map(emp => {
        let name = emp.name ? String(emp.name).trim() : "";
        let surname = emp.surname ? String(emp.surname).trim() : "";
        let department = emp.department ? String(emp.department).trim() : "";
        let ldl = (emp.ldl !== undefined && emp.ldl !== null && emp.ldl !== "" && emp.ldl !== "ไม่มีข้อมูล") ? parseFloat(emp.ldl) : null;
        if (isNaN(ldl)) ldl = null;
        
        // Self-heal: If department is empty/undefined, but surname has data (department shifted to surname)
        if (department === "" || department === "undefined" || !department) {
            if (surname !== "" && surname !== "undefined") {
                department = surname;
                surname = "";
            }
        }
        
        if (department === "undefined" || !department) {
            department = "ไม่ระบุ";
        }
        
        return {
            empId: emp.empId ? formatEmpId(emp.empId) : "",
            name: name,
            surname: surname,
            department: department,
            ldl: ldl
        };
    });
}

function getMockEmployees() {
    const raw = localStorage.getItem('bc_mock_employees');
    const data = raw ? JSON.parse(raw) : [];
    return normalizeEmployees(data);
}
function setMockEmployees(data) {
    const normalized = normalizeEmployees(data);
    localStorage.setItem('bc_mock_employees', JSON.stringify(normalized));
}

function getParticipants() {
    const raw = localStorage.getItem('bc_participants');
    const data = raw ? JSON.parse(raw) : [];
    return data.map(p => {
        let name = p.name ? String(p.name).trim() : "";
        let surname = p.surname ? String(p.surname).trim() : "";
        let department = p.department ? String(p.department).trim() : "";
        
        if (department === "" || department === "undefined" || !department) {
            if (surname !== "" && surname !== "undefined") {
                department = surname;
                surname = "";
            }
        }
        if (department === "undefined" || !department) {
            department = "ไม่ระบุ";
        }
        
        const deptMapping = {
            "บัญชี": "FIN",
            "การตลาด": "BSD1",
            "จัดซื้อ": "PUR",
            "คลังสินค้า": "TRF",
            "ผลิต": "OP1",
            "ขาย": "BSD2",
            "วิศวกรรม": "FAC",
            "HR": "HRD"
        };
        if (deptMapping[department]) {
            department = deptMapping[department];
        }
        
        return {
            ...p,
            empId: p.empId ? formatEmpId(p.empId) : "",
            name,
            surname,
            department
        };
    });
}
function setParticipants(data) {
    localStorage.setItem('bc_participants', JSON.stringify(data));
}

function getSubmissions() {
    return JSON.parse(localStorage.getItem('bc_submissions')) || [];
}
function setSubmissions(data) {
    localStorage.setItem('bc_submissions', JSON.stringify(data));
}

function getPrizesWon() {
    return JSON.parse(localStorage.getItem('bc_prizes_won')) || [];
}
function setPrizesWon(data) {
    localStorage.setItem('bc_prizes_won', JSON.stringify(data));
}

function getDrawAttempts() {
    return JSON.parse(localStorage.getItem('bc_draw_attempts')) || [];
}
function setDrawAttempts(data) {
    localStorage.setItem('bc_draw_attempts', JSON.stringify(data));
}

function saveSettings() {
    localStorage.setItem('bc_settings', JSON.stringify(appSettings));
}

// Format employee ID: trims whitespace, converts to uppercase, and auto-prepends "0" only if it's a 4-digit number not starting with "0"
function formatEmpId(val) {
    if (!val) return "";
    let clean = String(val).trim().toUpperCase();
    // Support auto-padding for 4-digit numbers (e.g. "1001" -> "01001")
    if (/^[1-9]\d{3}$/.test(clean)) {
        clean = "0" + clean;
    }
    return clean;
}

// Helper to calculate streak bonus points (+3 points for every 10 consecutive healthy days)
function getParticipantStreakBonus(empId) {
    const subs = getSubmissions().filter(s => s.empId === empId && s.status === 'approved');
    if (subs.length === 0) return 0;
    
    // Sort submissions by date ascending
    const sortedSubs = subs.sort((a, b) => a.date.localeCompare(b.date));
    
    let totalBonus = 0;
    let currentHealthyStreak = 0;
    let lastDate = null;
    
    for (let i = 0; i < sortedSubs.length; i++) {
        const sub = sortedSubs[i];
        const db = sub.dailyBehavior || {};
        
        // Gap checking: streak requires consecutive days
        if (lastDate !== null) {
            const d1 = new Date(lastDate);
            const d2 = new Date(sub.date);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 1) {
                currentHealthyStreak = 0; // Gap detected, reset streak
            }
        }
        
        // Check if this day was healthy (no alcohol, no sugar, no snacks)
        const alcoholAns = db.daily_alcohol !== undefined ? db.daily_alcohol : db.alcohol;
        const sugarAns = db.daily_sugar !== undefined ? db.daily_sugar : db.sugar;
        const snackAns = db.daily_snack !== undefined ? db.daily_snack : db.snack;
        
        const isHealthyDay = (alcoholAns === "ไม่ใช่") && (sugarAns === "ไม่ใช่") && (snackAns === "ไม่ใช่");
        
        if (isHealthyDay) {
            currentHealthyStreak++;
            if (currentHealthyStreak === 10) {
                totalBonus += 3;
                currentHealthyStreak = 0; // Reset streak count for the next cycle
            }
        } else {
            currentHealthyStreak = 0; // Broke the streak of healthy days
        }
        
        lastDate = sub.date;
    }
    
    return totalBonus;
}

// Helper to calculate score (approved submissions count + streak bonus)
function getParticipantScore(empId) {
    const subs = getSubmissions();
    const approvedCount = subs.filter(s => s.empId === empId && s.status === 'approved').length;
    const streakBonus = getParticipantStreakBonus(empId);
    return approvedCount + streakBonus;
}

// Check consecutive days (days without gap)
function checkConsecutiveDays(empId) {
    const subs = getSubmissions().filter(s => s.empId === empId && s.status === 'approved');
    if (subs.length === 0) return 0;
    
    // Sort unique dates ascending
    const dates = [...new Set(subs.map(s => s.date))].sort();
    if (dates.length === 0) return 0;
    
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i-1]);
        const d2 = new Date(dates[i]);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            currentConsecutive++;
        } else if (diffDays > 1) {
            if (currentConsecutive > maxConsecutive) {
                maxConsecutive = currentConsecutive;
            }
            currentConsecutive = 1;
        }
    }
    return Math.max(maxConsecutive, currentConsecutive);
}

// -------------------------------------------------------------
// Navigation & Theme
// -------------------------------------------------------------
function startApp() {
    initApp();
    setupNavigation();
    setupTheme();
    setupRegistrationPage();
    setupSubmissionPage();
    setupScoreboardPage();
    setupLuckyDrawPage();
    setupAdminPage();
    renderInitialSurvey();
    renderDailySurvey();
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
} else {
    startApp();
}

function initApp() {
    recalculateRemainingPrizes();
    checkCampaignStartStatus();
    console.log("60 Days Behavior Change App Initialized.");
}

function setupTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("bc_theme") || "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(currentTheme);

    themeBtn.addEventListener("click", () => {
        playSound('click');
        const activeTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = activeTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("bc_theme", newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector("#theme-toggle i");
    if (theme === "dark") {
        icon.className = "ri-sun-line";
    } else {
        icon.className = "ri-moon-line";
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const mobileToggle = document.getElementById("mobile-menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    // ── Sidebar nav items (desktop drawer) ──
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            playSound('click');
            const targetTab = item.getAttribute("data-tab");

            // Check authorization for admin page
            if (targetTab === "admin-section" && !sessionStorage.getItem("bc_admin_auth")) {
                showAdminPasswordModal();
                return;
            }

            switchTab(targetTab);
            closeSidebar();
        });
    });

    // ── Hamburger toggle ──
    mobileToggle.addEventListener("click", () => {
        toggleSidebar();
    });

    // ── Overlay tap closes sidebar ──
    if (overlay) {
        overlay.addEventListener("click", () => {
            closeSidebar();
        });
    }

    // ── Mobile Bottom Nav buttons ──
    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            playSound('click');
            const targetTab = btn.getAttribute("data-tab");
            if (targetTab === "admin-section" && !sessionStorage.getItem("bc_admin_auth")) {
                showAdminPasswordModal();
                return;
            }
            switchTab(targetTab);
        });
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const isOpen = sidebar.classList.contains("open");
    if (isOpen) {
        closeSidebar();
    } else {
        sidebar.classList.add("open");
        if (overlay) {
            overlay.classList.add("active");
        }
    }
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
}

function switchTab(targetTabId) {
    const navItems = document.querySelectorAll(".nav-item");
    const mobileNavBtns = document.querySelectorAll(".mobile-nav-btn");
    const sections = document.querySelectorAll(".page-section");

    // Update sidebar nav active state
    navItems.forEach(item => {
        item.classList.toggle("active", item.getAttribute("data-tab") === targetTabId);
    });

    // Update mobile bottom nav active state
    mobileNavBtns.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === targetTabId);
    });

    // Show/hide sections
    sections.forEach(sec => {
        sec.classList.toggle("active", sec.id === targetTabId);
    });

    // Scroll to top on tab change (mobile UX)
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.scrollTop = 0;

    // Trigger tab-specific refresh events
    if (targetTabId === "scoreboard-section") {
        renderScoreboard();
    } else if (targetTabId === "luckydraw-section") {
        renderLuckyDraw();
    } else if (targetTabId === "admin-section") {
        renderAdminDashboard();
    } else if (targetTabId === "submission-section") {
        checkCampaignStartStatus();
    }
}

// -------------------------------------------------------------
// Alert Utility
// -------------------------------------------------------------
function showAlert(message, type = "success") {
    const alertBox = document.getElementById("status-alert");
    alertBox.className = `status-alert ${type}`;
    alertBox.innerHTML = `
        <i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}" style="font-size:1.3rem;"></i>
        <div>${message}</div>
    `;
    alertBox.style.display = "flex";
    
    // Smooth scroll to alert
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
        alertBox.style.display = "none";
    }, 5000);
}

// -------------------------------------------------------------
// Image Compression Utility to prevent LocalStorage QuotaExceededError
// -------------------------------------------------------------
function compressImage(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            
            // Resize if too large (max 800px)
            const MAX_SIZE = 800;
            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height = Math.round((height * MAX_SIZE) / width);
                    width = MAX_SIZE;
                } else {
                    width = Math.round((width * MAX_SIZE) / height);
                    height = MAX_SIZE;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 jpeg with 0.7 quality
            const base64 = canvas.toDataURL("image/jpeg", 0.7);
            callback(base64);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// -------------------------------------------------------------
// Page 1: Registration Page Logic
// -------------------------------------------------------------
let regBase64Img = "";

window.toggleLdlGoal3_2 = function(isYes) {
    const group = document.getElementById("reg-ldltarget-2-group");
    const input = document.getElementById("reg-ldltarget-2");
    if (!group || !input) return;
    if (isYes) {
        group.style.display = "none";
        input.value = "";
        input.removeAttribute("required");
    } else {
        group.style.display = "flex";
        input.setAttribute("required", "required");
    }
};

function setupRegistrationPage() {
    const regEmpIdInput = document.getElementById("reg-emp-id");
    const regName = document.getElementById("reg-name");
    const regDept = document.getElementById("reg-dept");
    const regPhone = document.getElementById("reg-phone");
    const regLdl = document.getElementById("reg-ldl");
    const regUpload = document.getElementById("reg-proof-file");
    const regForm = document.getElementById("registration-form");
    
    // Auto-fill trigger on employee ID input
    regEmpIdInput.addEventListener("input", (e) => {
        let rawVal = e.target.value;
        let formatted = formatEmpId(rawVal);
        e.target.value = formatted;
        
        const regLdlHelper = document.getElementById("reg-ldl-helper");
        const regProofContainerGroup = document.getElementById("reg-proof-container-group");
        
        if (formatted.length >= 3) {
            const employees = getMockEmployees();
            const found = employees.find(emp => emp.empId === formatted);
            if (found) {
                regName.value = `${found.name} ${found.surname}`.trim();
                regDept.value = found.department;
                regName.disabled = true;
                regDept.disabled = true;
                regName.style.borderColor = "var(--success)";
                regDept.style.borderColor = "var(--success)";
                
                // LDL checking
                if (found.ldl !== undefined && found.ldl !== null && found.ldl >= 130) {
                    regLdl.value = found.ldl;
                    regLdl.readOnly = true;
                    regLdl.style.borderColor = "var(--success)";
                    
                    // Hide LDL input and label for PDPA compliance
                    regLdl.style.display = "none";
                    const ldlLabel = regLdl.closest(".form-group")?.querySelector("label[for='reg-ldl']");
                    if (ldlLabel) ldlLabel.style.display = "none";
                    
                    regLdlHelper.innerHTML = `<div style="display:flex; align-items:center; gap:6px; padding:8px 12px; background:rgba(34,197,94,0.1); color:#16a34a; border:1px solid #22c55e; border-radius:6px; font-weight:500;"><i class="ri-checkbox-circle-fill"></i> ท่านสามารถเข้าร่วมโครงการได้</div>`;
                    regLdlHelper.style.display = "block";
                    
                    if (regProofContainerGroup) regProofContainerGroup.style.display = "none";
                } else {
                    regLdl.value = "";
                    regLdl.readOnly = false;
                    regLdl.style.borderColor = "";
                    
                    // Show LDL input and label
                    regLdl.style.display = "block";
                    const ldlLabel = regLdl.closest(".form-group")?.querySelector("label[for='reg-ldl']");
                    if (ldlLabel) ldlLabel.style.display = "block";
                    
                    regLdlHelper.innerHTML = `<div style="display:flex; align-items:center; gap:6px; padding:8px 12px; background:rgba(245,158,11,0.1); color:#d97706; border:1px solid #f59e0b; border-radius:6px; font-weight:500;"><i class="ri-error-warning-fill"></i> ขอภาพผลตรวจล่าสุดที่ค่า LDL 130 ขึ้นไป</div>`;
                    regLdlHelper.style.display = "block";
                    
                    if (regProofContainerGroup) regProofContainerGroup.style.display = "block";
                }
            } else {
                regName.value = "";
                regDept.value = "";
                regName.disabled = false; // Allow manual entry if not in mock DB
                regDept.disabled = false; // Allow manual entry if not in mock DB
                regName.placeholder = "ไม่พบรายชื่อ (กรุณากรอกชื่อ-นามสกุลของคุณที่นี่)";
                regDept.placeholder = "กรุณากรอกแผนกของคุณที่นี่";
                regName.style.borderColor = "var(--warning)";
                regDept.style.borderColor = "var(--warning)";
                
                regLdl.value = "";
                regLdl.readOnly = false;
                regLdl.style.borderColor = "";
                
                // Show LDL input and label
                regLdl.style.display = "block";
                const ldlLabel = regLdl.closest(".form-group")?.querySelector("label[for='reg-ldl']");
                if (ldlLabel) ldlLabel.style.display = "block";
                
                regLdlHelper.innerHTML = `<div style="display:flex; align-items:center; gap:6px; padding:8px 12px; background:rgba(245,158,11,0.1); color:#d97706; border:1px solid #f59e0b; border-radius:6px; font-weight:500;"><i class="ri-error-warning-fill"></i> ขอภาพผลตรวจล่าสุดที่ค่า LDL 130 ขึ้นไป</div>`;
                regLdlHelper.style.display = "block";
                
                if (regProofContainerGroup) regProofContainerGroup.style.display = "block";
            }
        } else {
            regName.value = "";
            regDept.value = "";
            regName.disabled = true;
            regDept.disabled = true;
            regName.placeholder = "ชื่อจะแสดงขึ้นโดยอัตโนมัติเมื่อรหัสถูกต้อง";
            regDept.placeholder = "แผนกจะแสดงขึ้นโดยอัตโนมัติ";
            regName.style.borderColor = "";
            regDept.style.borderColor = "";
            
            regLdl.value = "";
            regLdl.readOnly = false;
            regLdl.style.borderColor = "";
            
            // Show LDL input and label
            regLdl.style.display = "block";
            const ldlLabel = regLdl.closest(".form-group")?.querySelector("label[for='reg-ldl']");
            if (ldlLabel) ldlLabel.style.display = "block";
            
            if (regLdlHelper) {
                regLdlHelper.innerHTML = "";
                regLdlHelper.style.display = "none";
            }
            if (regProofContainerGroup) regProofContainerGroup.style.display = "block";
        }
    });

    // Check internal phone validation (max 4 digits)
    regPhone.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").substring(0, 4);
    });

    // Handle File Upload and Preview
    const fileWrapper = regUpload.closest(".file-upload-wrapper");
    const fileInput = document.getElementById("reg-proof-file");
    const previewDiv = document.getElementById("reg-preview-container");
    const previewImg = document.getElementById("reg-preview-img");
    const removeBtn = document.getElementById("reg-preview-remove");

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, (compressedBase64) => {
                regBase64Img = compressedBase64;
                previewImg.src = regBase64Img;
                previewDiv.style.display = "block";
                fileWrapper.style.display = "none";
            });
        }
    });

    fileWrapper.addEventListener("dblclick", () => {
        regBase64Img = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        previewImg.src = regBase64Img;
        previewDiv.style.display = "block";
        fileWrapper.style.display = "none";
        console.log("Mock registration proof image uploaded via double click");
    });

    removeBtn.addEventListener("click", () => {
        playSound('click');
        regBase64Img = "";
        fileInput.value = "";
        previewDiv.style.display = "none";
        fileWrapper.style.display = "block";
    });

    // Form Submission
    regForm.addEventListener("submit", (e) => {
        e.preventDefault();
        playSound('click');
        
        if (!appSettings.isRegOpen) {
            showAlert("ขออภัย! ระบบได้ปิดการลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว", "error");
            return;
        }

        const empId = regEmpIdInput.value;
        const nameAndSurname = regName.value;
        const department = regDept.value;
        const phone = regPhone.value;
        const employeesForLdl = getMockEmployees();
        const foundEmpForLdl = employeesForLdl.find(emp => emp.empId === empId);
        
        let ldlInitial = parseFloat(regLdl.value);
        if (foundEmpForLdl && foundEmpForLdl.ldl !== null && foundEmpForLdl.ldl >= 130) {
            ldlInitial = foundEmpForLdl.ldl;
        }
        
        const shift = document.getElementById("reg-shift").value;
        const passcode = document.getElementById("reg-passcode").value;

        if (!empId || !nameAndSurname || isNaN(ldlInitial) || !phone || !shift || !passcode) {
            showAlert("กรุณากรอกข้อมูลส่วนตัวและรหัสผ่านให้ครบถ้วนก่อนส่งใบสมัคร", "error");
            return;
        }

        if (!/^\d{4,6}$/.test(passcode)) {
            showAlert("กรุณาตั้งรหัสผ่านเป็นตัวเลข 4 ถึง 6 หลักเท่านั้นค่ะ", "error");
            return;
        }

        if (ldlInitial < 130) {
            playSound('click');
            openLdlNormalModal();
            return;
        }

        // Get dynamic Initial Survey Answers
        const assessment = {};
        const initialQuestions = getInitialQuestions();
        let validationError = null;
        
        initialQuestions.forEach(q => {
            if (q.type === "boolean") {
                const checkedElement = document.querySelector(`input[name="reg-q-${q.id}"]:checked`);
                if (!checkedElement) {
                    validationError = `กรุณาตอบแบบประเมินแรกเข้าให้ครบถ้วนทุกข้อค่ะ`;
                }
                const checkedVal = checkedElement?.value;
                assessment[q.id] = checkedVal;
                if (q.originalKey) {
                    assessment[q.originalKey] = checkedVal;
                }
            } else if (q.type === "numeric") {
                const dependsOnVal = q.dependsOn ? assessment[q.dependsOn] : null;
                const isRequired = !q.dependsOn || (q.showIfValue && dependsOnVal === q.showIfValue);
                
                const inputVal = document.getElementById(`reg-q-${q.id}`)?.value || "";
                if (isRequired && !inputVal) {
                    validationError = `กรุณากรอกข้อมูลเป้าหมาย LDL เฉพาะส่วนบุคคล`;
                }
                const parsedVal = inputVal ? parseFloat(inputVal) : null;
                assessment[q.id] = parsedVal;
                if (q.originalKey) {
                    assessment[q.originalKey] = parsedVal;
                }
            }
        });
        
        if (validationError) {
            showAlert(validationError, "error");
            return;
        }

        const employees = getMockEmployees();
        const foundEmp = employees.find(emp => emp.empId === empId);
        const isProofRequired = !(foundEmp && foundEmp.ldl !== null && foundEmp.ldl >= 130);

        if (isProofRequired && !regBase64Img) {
            showAlert("กรุณาแนบภาพถ่ายผลตรวจสุขภาพ LDL ปี 2568 เพื่อใช้เป็นหลักฐานตั้งต้น", "error");
            return;
        }

        const participants = getParticipants();
        const isRegistered = participants.some(p => p.empId === empId);
        if (isRegistered) {
            showAlert(`รหัสพนักงาน ${empId} ได้ลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อยแล้ว`, "error");
            return;
        }

        // Build name components
        const names = nameAndSurname.trim().split(/\s+/);
        const name = names[0] || "";
        const surname = names.slice(1).join(" ") || "";

        const newParticipant = {
            empId,
            name,
            surname,
            department,
            phone,
            ldlInitial,
            ldlFinal: null, // to be updated at the end of the campaign
            shift,
            proofImage: regBase64Img,
            regDate: new Date().toISOString(),
            assessment,
            passcode
        };


        participants.push(newParticipant);
        setParticipants(participants);

        showAlert("ลงทะเบียนสมัครเข้าร่วมกิจกรรมสำเร็จ! ยินดีต้อนรับสู่ภารกิจเปลี่ยนนิสัย 60 วันค่ะ 🎉", "success");
        
        // Auto-fill employee ID in submission page and switch tab
        const subEmpIdInput = document.getElementById("sub-emp-id");
        if (subEmpIdInput) {
            subEmpIdInput.value = empId;
            subEmpIdInput.dispatchEvent(new Event('input'));
        }
        
        regForm.reset();
        const regPasscode = document.getElementById("reg-passcode");
        if (regPasscode) regPasscode.value = "";
        window.toggleLdlGoal3_2(true); // reset LDL target 3.2 input to hidden
        switchTab("submission-section");
        
        // Reset terms and PDPA checkboxes and disable submit button
        const termsCheck = document.getElementById('reg-terms-check');
        const pdpaCheck = document.getElementById('reg-pdpa-check');
        if (termsCheck) termsCheck.checked = false;
        if (pdpaCheck) pdpaCheck.checked = false;
        const submitBtn = document.getElementById('reg-submit-btn');
        if (submitBtn) submitBtn.disabled = true;

        regName.disabled = true;
        regDept.disabled = true;
        regName.placeholder = "ชื่อจะแสดงขึ้นโดยอัตโนมัติเมื่อรหัสถูกต้อง";
        regDept.placeholder = "แผนกจะแสดงขึ้นโดยอัตโนมัติ";
        regName.style.borderColor = "";
        regDept.style.borderColor = "";
        previewDiv.style.display = "none";
        fileWrapper.style.display = "block";
        regBase64Img = "";

        // Reset custom LDL elements
        const regLdlHelper = document.getElementById("reg-ldl-helper");
        const regProofContainerGroup = document.getElementById("reg-proof-container-group");
        if (regLdlHelper) {
            regLdlHelper.innerHTML = "";
            regLdlHelper.style.display = "none";
        }
        if (regProofContainerGroup) regProofContainerGroup.style.display = "block";
        regLdl.readOnly = false;
        regLdl.style.borderColor = "";
        
        // Show LDL input and label
        regLdl.style.display = "block";
        const ldlLabel = regLdl.closest(".form-group")?.querySelector("label[for='reg-ldl']");
        if (ldlLabel) ldlLabel.style.display = "block";
        
        // Sync to Sheets Mocking/Trigger
        syncToGoogleSheets('register', newParticipant);
    });

    // Check and show close state
    checkRegistrationState();
}

function checkRegistrationState() {
    const regForm = document.getElementById("registration-form");
    const closeNotice = document.getElementById("registration-closed-notice");
    if (!appSettings.isRegOpen) {
        regForm.style.display = "none";
        closeNotice.style.display = "block";
    } else {
        regForm.style.display = "block";
        closeNotice.style.display = "none";
    }
}

// -------------------------------------------------------------
// Page 2: Submission Page Logic
// -------------------------------------------------------------
let subBase64Img = "";

function renderInitialSurveySummary(p) {
    const container = document.getElementById("sub-initial-survey-summary");
    if (!container) return;
    
    if (!p.assessment) {
        container.innerHTML = `
            <div style="background: var(--warning-light); border: 1px solid var(--warning); border-radius: var(--rounded-md); padding: 12px 16px; margin-bottom: 20px;">
                <div style="font-size:0.85rem; color:var(--warning); font-weight:700; display:flex; align-items:center; gap:6px;">
                    <i class="ri-error-warning-line"></i> ไม่พบข้อมูลแบบประเมินสุขภาพแรกเข้าสำหรับพนักงานท่านนี้
                </div>
            </div>
        `;
        container.style.display = "block";
        return;
    }
    
    const a = p.assessment;
    
    // Format lifestyle answers
    const lifestyle = [];
    if (a.lifestyle1 === "ใช่") lifestyle.push("รับประทานยาลดไขมันต่อเนื่อง");
    if (a.lifestyle2 === "ใช่") lifestyle.push("รับประทานยาแต่ไม่ต่อเนื่อง");
    if (a.lifestyle3 === "ใช่") lifestyle.push("คุมอาหารเองไม่เคยทานยา");
    if (a.lifestyle4 === "ใช่") lifestyle.push("ออกกำลังกาย 3-5 วัน/สัปดาห์");
    if (a.lifestyle5 === "ใช่") lifestyle.push("ไม่ได้ทานยา/คุมอาหาร/ออกกำลังกาย");
    
    // Format goals
    const goals = [];
    if (a.goal1 === "ใช่") goals.push("ควบคุมอาหารเองก่อน");
    if (a.goal2 === "ใช่") goals.push("ทานยาลดไขมันตามสั่งต่อเนื่อง");
    if (a.goal3 === "ใช่") goals.push("ออกกำลังกายอย่างน้อย 3-5 วัน/สัปดาห์");
    if (a.goal4 === "ใช่") goals.push("ต้องการพบแพทย์เพื่อขอรับยา");
    
    // Format LDL Target
    let ldlTargetStr = "";
    if (a.ldlTarget1 === "ใช่") {
        ldlTargetStr = "ต้องการค่า LDL อยู่ในเกณฑ์ปกติ (< 130 mg/dL)";
    } else {
        ldlTargetStr = `เป้าหมาย LDL ที่กำหนดเอง: ${a.ldlTarget2 || "-"} mg/dL`;
    }
    
    container.innerHTML = `
        <div style="background: var(--primary-light); border: 2px solid var(--primary); border-radius: var(--rounded-md); padding: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm); animation: fadeIn 0.3s ease-in-out;">
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--primary-dark); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                <i class="ri-survey-line"></i> ข้อมูลประเมินแรกเข้าของคุณ (${p.empId})
            </h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:0.82rem; line-height:1.5; color:var(--text-main);">
                <div>
                    <strong>🌱 พฤติกรรมสุขภาพเดิม:</strong> 
                    <span style="color:var(--text-muted);">${lifestyle.length > 0 ? lifestyle.join(", ") : "ไม่ได้ระบุ"}</span>
                </div>
                <div>
                    <strong>🎯 เป้าหมายการปรับตัว:</strong> 
                    <span style="color:var(--text-muted);">${goals.length > 0 ? goals.join(", ") : "ไม่ได้ระบุ"}</span>
                </div>
                <div>
                    <strong>📊 เป้าหมาย LDL:</strong> 
                    <span style="color:var(--text-muted);">${ldlTargetStr}</span>
                </div>
            </div>
        </div>
    `;
    container.style.display = "block";
}

function setupSubmissionPage() {
    const subEmpIdInput = document.getElementById("sub-emp-id");
    const subName = document.getElementById("sub-name");
    const subDept = document.getElementById("sub-dept");
    const subForm = document.getElementById("submission-form");
    const subDateSelect = document.getElementById("sub-date");

    // Populate selectable submission dates (Today & Yesterday)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatDateString = (d) => {
        let month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const formatThaiDate = (d) => {
        const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
    };

    subDateSelect.innerHTML = `
        <option value="${formatDateString(today)}">วันนี้ (${formatThaiDate(today)})</option>
        <option value="${formatDateString(yesterday)}">ย้อนหลัง 1 วัน (${formatThaiDate(yesterday)})</option>
    `;

    // Auto-fill triggered by Employee ID
    subEmpIdInput.addEventListener("input", (e) => {
        let rawVal = e.target.value;
        let formatted = formatEmpId(rawVal);
        e.target.value = formatted;

        if (formatted.length >= 3) {
            const participants = getParticipants();
            const found = participants.find(p => p.empId === formatted);
            if (found) {
                subName.value = `${found.name} ${found.surname}`.trim();
                subDept.value = found.department;
                subName.style.borderColor = "var(--success)";
                subDept.style.borderColor = "var(--success)";
                
                // Show initial assessment summary!
                renderInitialSurveySummary(found);
                renderMedicationReminder(found);
                updateSubmissionDrawAlert(found.empId);
            } else {
                subName.value = "";
                subDept.value = "";
                subName.style.borderColor = "";
                subDept.style.borderColor = "";
                
                // Hide summary
                document.getElementById("sub-initial-survey-summary").style.display = "none";
                document.getElementById("sub-med-reminder-container").style.display = "none";
                const drawAlert = document.getElementById("sub-draw-alert-container");
                if (drawAlert) drawAlert.style.display = "none";
            }
        } else {
            subName.value = "";
            subDept.value = "";
            document.getElementById("sub-initial-survey-summary").style.display = "none";
            document.getElementById("sub-med-reminder-container").style.display = "none";
            const drawAlert = document.getElementById("sub-draw-alert-container");
            if (drawAlert) drawAlert.style.display = "none";
        }
    });


    // Picture upload preview
    const fileWrapper = document.getElementById("sub-file-wrapper");
    const fileInput = document.getElementById("sub-food-file");
    const previewDiv = document.getElementById("sub-preview-container");
    const previewImg = document.getElementById("sub-preview-img");
    const removeBtn = document.getElementById("sub-preview-remove");

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, (compressedBase64) => {
                subBase64Img = compressedBase64;
                previewImg.src = subBase64Img;
                previewDiv.style.display = "block";
                fileWrapper.style.display = "none";
            });
        }
    });

    fileWrapper.addEventListener("dblclick", () => {
        subBase64Img = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        previewImg.src = subBase64Img;
        previewDiv.style.display = "block";
        fileWrapper.style.display = "none";
        console.log("Mock daily meal image uploaded via double click");
    });

    removeBtn.addEventListener("click", () => {
        playSound('click');
        subBase64Img = "";
        fileInput.value = "";
        previewDiv.style.display = "none";
        fileWrapper.style.display = "block";
    });

    // Submission Form submit handler
    subForm.addEventListener("submit", (e) => {
        e.preventDefault();
        playSound('click');

        const empId = subEmpIdInput.value;
        const selectedDate = subDateSelect.value;
        const foodNameInput = document.getElementById("sub-food-name");
        const foodName = foodNameInput ? foodNameInput.value.trim() : "";

        const participants = getParticipants();
        const participant = participants.find(p => p.empId === empId);

        if (!empId || !subName.value || !participant) {
            showAlert("รหัสพนักงานนี้ยังไม่ได้ลงทะเบียนเข้าร่วมกิจกรรม กรุณาลงทะเบียนก่อนส่งผลประจำวันค่ะ", "error");
            return;
        }

        if (!foodName) {
            showAlert("กรุณาระบุชื่อเมนูอาหารของคุณ", "error");
            return;
        }

        if (!subBase64Img) {
            showAlert("กรุณาแนบภาพเมนูอาหารคู่กับใบหน้าเพื่อยืนยันตัวตน", "error");
            return;
        }

        const submissions = getSubmissions();
        
        // Prevent submitting the same date multiple times
        const alreadySubmitted = submissions.some(s => s.empId === empId && s.date === selectedDate && s.status !== 'rejected');
        if (alreadySubmitted) {
            showAlert(`พนักงานรหัส ${empId} ได้ส่งภาพเมนูอาหารสำหรับวันที่ ${selectedDate} ไปแล้วและอยู่ในระบบ`, "error");
            return;
        }

        // Get dynamic daily behavior values
        const dailyBehavior = {};
        const dailyQuestions = getDailyQuestions();
        let dailyValidationError = null;
        
        dailyQuestions.forEach(q => {
            if (q.type === "boolean") {
                const checkedElement = document.querySelector(`input[name="sub-q-${q.id}"]:checked`);
                if (!checkedElement) {
                    dailyValidationError = `กรุณาเลือกตอบแบบประเมินรายวัน "${q.text}" ให้ครบถ้วนค่ะ`;
                }
                const checkedVal = checkedElement?.value || "";
                dailyBehavior[q.id] = checkedVal;
                if (q.originalKey) {
                    dailyBehavior[q.originalKey] = checkedVal;
                }
            } else if (q.type === "numeric") {
                const inputVal = document.getElementById(`sub-q-${q.id}`)?.value || "";
                if (!inputVal) {
                    dailyValidationError = `กรุณากรอกคำตอบข้อ: ${q.text}`;
                }
                const parsedVal = inputVal ? parseFloat(inputVal) : null;
                dailyBehavior[q.id] = parsedVal;
                if (q.originalKey) {
                    dailyBehavior[q.originalKey] = parsedVal;
                }
            }
        });
        
        if (dailyValidationError) {
            showAlert(dailyValidationError, "error");
            return;
        }

        const newSubmission = {
            id: 'sub_' + Math.random().toString(36).substr(2, 9),
            empId,
            date: selectedDate,
            foodName,
            image: subBase64Img,
            status: 'pending',
            comments: '',
            submittedAt: new Date().toISOString(),
            dailyBehavior
        };

        submissions.push(newSubmission);
        setSubmissions(submissions);

        // Medication check for success message
        const takesMeds = participant && participant.assessment && 
            (participant.assessment.lifestyle1 === "ใช่" || 
             participant.assessment.lifestyle2 === "ใช่" || 
             participant.assessment.init_1_1 === "ใช่" || 
             participant.assessment.init_1_2 === "ใช่");
             
        let successMsg = "ส่งภาพเมนูอาหารเรียบร้อยแล้ว! แอดมินจะดำเนินการตรวจสอบภาพเพื่ออนุมัติคะแนนของคุณค่ะ 🥗";
        if (takesMeds) {
            successMsg += "<br/><strong style='color:#dc2626;'><i class='ri-capsule-line'></i> วันนี้ท่านได้ทานยาลดไขมันแล้วหรือยัง? อย่าลืมทานยาตามแพทย์สั่งนะคะ! 💊</strong>";
        }
        showAlert(successMsg, "success");
        
        subForm.reset();
        
        // Reset daily behavior questions dynamically (clear selections)
        dailyQuestions.forEach(q => {
            if (q.type === "boolean") {
                const yesRadio = document.getElementById(`sub-q-${q.id}-yes`);
                const noRadio = document.getElementById(`sub-q-${q.id}-no`);
                if (yesRadio) yesRadio.checked = false;
                if (noRadio) noRadio.checked = false;
            } else if (q.type === "numeric") {
                const numInput = document.getElementById(`sub-q-${q.id}`);
                if (numInput) numInput.value = "";
            }
        });

        // Hide survey summary and med reminder card
        document.getElementById("sub-initial-survey-summary").style.display = "none";
        document.getElementById("sub-med-reminder-container").style.display = "none";
        
        previewDiv.style.display = "none";
        fileWrapper.style.display = "block";
        subBase64Img = "";

        // Sync to Sheets
        syncToGoogleSheets('submit', newSubmission);
    });
}

// -------------------------------------------------------------
// Page 3: Scoreboard & Check History Page Logic
// -------------------------------------------------------------
function setupScoreboardPage() {
    const searchBtn = document.getElementById("chk-search-btn");
    const searchInput = document.getElementById("chk-emp-id");

    searchBtn.addEventListener("click", () => {
        playSound('click');
        searchUserHistory(searchInput.value);
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            playSound('click');
            searchUserHistory(searchInput.value);
        }
    });
}

function renderScoreboard() {
    const tbody = document.getElementById("scoreboard-table-body");
    const participants = getParticipants();
    
    if (participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">ยังไม่มีผู้สมัครลงทะเบียนเข้าร่วมกิจกรรม</td></tr>`;
        return;
    }

    // Process participants score & latest approved submission time
    const subs = getSubmissions();
    const rankedList = participants.map(p => {
        const userSubs = subs.filter(s => s.empId === p.empId && s.status === 'approved');
        const score = userSubs.length;
        
        // Find latest approved submission date time for sorting ties
        let latestTime = 0;
        if (userSubs.length > 0) {
            latestTime = Math.max(...userSubs.map(s => new Date(s.submittedAt).getTime()));
        }

        // Calculate LDL reduction percentage decrease
        let ldlReduction = 0;
        if (p.ldlInitial !== null && p.ldlInitial > 0 && p.ldlFinal !== null) {
            ldlReduction = ((p.ldlInitial - p.ldlFinal) / p.ldlInitial) * 100;
        }

        return {
            ...p,
            score,
            ldlReduction,
            latestTime
        };
    });

    // Sorting rule: highest score first, then earliest time of final submission (for tie breaker)
    rankedList.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // Tie breaker: whoever reached their score first (earlier latest approved submission time)
        if (a.latestTime && b.latestTime) {
            return a.latestTime - b.latestTime;
        }
        return a.empId.localeCompare(b.empId);
    });

    tbody.innerHTML = "";
    rankedList.forEach((p, idx) => {
        const rank = idx + 1;
        let rankBadge = `<span class="scoreboard-rank">${rank}</span>`;
        if (rank === 1) rankBadge = `<span class="scoreboard-rank rank-1"><i class="ri-medal-fill"></i></span>`;
        else if (rank === 2) rankBadge = `<span class="scoreboard-rank rank-2"><i class="ri-medal-fill"></i></span>`;
        else if (rank === 3) rankBadge = `<span class="scoreboard-rank rank-3"><i class="ri-medal-fill"></i></span>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${rankBadge}</td>
            <td><strong>${p.empId}</strong></td>
            <td>${`${p.name} ${p.surname}`.trim()}</td>
            <td><span class="badge badge-info">${p.department}</span></td>
            <td><span class="score-badge">${p.score} / 60</span></td>
            <td>
                <button class="btn btn-secondary" onclick="viewHistory('${p.empId}')" style="padding:6px 12px; font-size:0.85rem;">
                    <i class="ri-calendar-todo-line"></i> ประวัติ
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Render LDL Leaders Tab separately in scoreboard
    renderLdlLeaders(rankedList);
}

function renderLdlLeaders(rankedList) {
    const ldlBody = document.getElementById("ldl-leaders-body");
    
    // Check if LDL is announced OR if user is authenticated as admin
    const isAnnounced = appSettings.isLdlAnnounced === true;
    const isAdmin = sessionStorage.getItem("bc_admin_auth") === "true";
    
    if (!isAnnounced && !isAdmin) {
        ldlBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding: 30px 0;">
            <div style="margin-bottom:8px;"><i class="ri-lock-2-line" style="font-size:2rem; color:var(--warning);"></i></div>
            <strong>อยู่ระหว่างการประมวลผลผลงาน</strong><br/>
            ระบบจะเปิดแสดงผลการจัดอันดับผู้ชนะ LDL อย่างเป็นทางการหลังจากแอดมิน (HR) ประกาศผลรางวัลค่ะ
        </td></tr>`;
        return;
    }

    // Filter participants who have a final LDL result
    const ldlCompetitors = rankedList.filter(p => p.ldlFinal !== null);

    if (ldlCompetitors.length === 0) {
        ldlBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px 0;">ยังไม่มีข้อมูลผลตรวจไขมัน LDL ครั้งสุดท้าย (วัดผลสิ้นสุดโครงการ)</td></tr>`;
        return;
    }

    // Sort by largest reduction in LDL
    ldlCompetitors.sort((a, b) => b.ldlReduction - a.ldlReduction);

    ldlBody.innerHTML = "";
    ldlCompetitors.forEach((p, idx) => {
        const rank = idx + 1;
        let rankBadge = `<span class="scoreboard-rank" style="width:36px; height:36px; font-size:0.9rem;">${rank}</span>`;
        if (rank === 1) rankBadge = `<span class="scoreboard-rank rank-1" style="width:36px; height:36px; font-size:0.9rem;"><i class="ri-trophy-fill"></i></span>`;
        else if (rank === 2) rankBadge = `<span class="scoreboard-rank rank-2" style="width:36px; height:36px; font-size:0.9rem;"><i class="ri-trophy-fill"></i></span>`;
        else if (rank === 3) rankBadge = `<span class="scoreboard-rank rank-3" style="width:36px; height:36px; font-size:0.9rem;"><i class="ri-trophy-fill"></i></span>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${rankBadge}</td>
            <td><strong>${p.empId}</strong></td>
            <td>${`${p.name} ${p.surname}`.trim()}</td>
            <td>
                <div style="font-size:0.8rem; color:var(--text-muted)">
                    เดิม: *** ➔ ใหม่: ***
                </div>
            </td>
            <td>
                <strong style="color:var(--success)">ลดลง ${p.ldlReduction.toFixed(1)}%</strong>
            </td>
        `;
        ldlBody.appendChild(row);
    });
}

function searchUserHistory(empId) {
    if (!empId) {
        showAlert("กรุณากรอกรหัสพนักงานที่ต้องการสืบค้นประวัติ", "error");
        return;
    }
    const formatted = formatEmpId(empId);
    const participants = getParticipants();
    const found = participants.find(p => p.empId === formatted);
    if (!found) {
        showAlert(`ไม่พบรหัสพนักงาน ${formatted} ลงทะเบียนในกิจกรรมนี้`, "error");
        return;
    }

    const inputPasscode = document.getElementById("chk-passcode")?.value || "";
    if (found.passcode && found.passcode !== inputPasscode) {
        showAlert("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้งค่ะ", "error");
        return;
    }

    const chkPasscodeEl = document.getElementById("chk-passcode");
    if (chkPasscodeEl) chkPasscodeEl.value = "";

    viewHistory(formatted, inputPasscode);
}

function viewHistory(empId, inputPasscode = null) {
    const participants = getParticipants();
    const p = participants.find(part => part.empId === empId);
    if (!p) return;

    if (p.passcode) {
        if (inputPasscode === null) {
            const pw = prompt("กรุณากรอกรหัสผ่าน (ตัวเลข 4-6 หลัก) เพื่อเข้าดูประวัติการบันทึกพฤติกรรมสุขภาพของท่าน:");
            if (pw === null) return;
            if (p.passcode !== pw) {
                showAlert("รหัสผ่านไม่ถูกต้อง ไม่สามารถเข้าดูประวัติได้ค่ะ", "error");
                return;
            }
        } else if (p.passcode !== inputPasscode) {
            showAlert("รหัสผ่านไม่ถูกต้อง ไม่สามารถเข้าดูประวัติได้ค่ะ", "error");
            return;
        }
    }

    const modal = document.getElementById("history-modal");
    document.getElementById("hist-modal-title").innerText = `ประวัติกิจกรรม: ${`${p.name} ${p.surname}`.trim()} (${p.empId})`;
    
    // Check if they have active pending spins to display a prominent red flashing alert at the top
    const histAlertContainer = document.getElementById("hist-draw-alert-container");
    if (histAlertContainer) {
        const pendingRounds = getPendingDrawSpins(p.empId);
        if (pendingRounds.length > 0) {
            const sorted = [...pendingRounds].sort((a, b) => b.milestone - a.milestone);
            const highest = sorted[0];
            
            histAlertContainer.innerHTML = `
                <div class="card" style="background:rgba(239,68,68,0.1); border:2px dashed #ef4444; border-radius:var(--rounded-md); padding:12px 14px; display:flex; align-items:center; gap:12px; animation: vibrantPulse 1.5s infinite;">
                    <i class="ri-gift-fill" style="font-size:2rem; color:#ef4444; animation: shake 2s infinite;"></i>
                    <div style="text-align:left; flex:1;">
                        <h5 style="font-size:0.85rem; font-weight:800; color:#991b1b; margin:0;">🎉 คุณมีสิทธิ์หมุนวงล้อลุ้นรางวัลค้างอยู่!</h5>
                        <p style="font-size:0.75rem; color:#b91c1c; margin:2px 0 0 0; line-height:1.3;">
                            คุณมีสิทธิ์ร่วมสุ่มรางวัลเกณฑ์สะสมครบ <strong>${highest.milestone} คะแนน</strong> ที่ยังไม่ได้ใช้สปิน กรุณาปิดหน้านี้แล้วสลับไปที่แท็บ <strong>"4. วงล้อสุ่มของรางวัล"</strong> เพื่อหมุนลุ้นโชคได้เลยค่ะ!
                        </p>
                    </div>
                </div>
            `;
            histAlertContainer.style.display = "block";
        } else {
            histAlertContainer.style.display = "none";
        }
    }
    
    const statsContainer = document.getElementById("hist-stats");
    const score = getParticipantScore(p.empId);
    const consecutive = checkConsecutiveDays(p.empId);
    const streakBonus = getParticipantStreakBonus(p.empId);
    
    // Check if tomorrow has a scheduled draw round
    let drawAlertHtml = "";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateString(tomorrow);
    const wins = getPrizesWon();
    
    const tomorrowRound = appSettings.drawRounds.find(r => r.date === tomorrowStr);
    if (tomorrowRound) {
        const isEligible = score >= tomorrowRound.milestone;
        const alreadyWon = wins.some(w => w.roundId === tomorrowRound.id || (w.tier === tomorrowRound.milestone && !w.roundId));
        
        if (isEligible && !alreadyWon) {
            drawAlertHtml = `
                <div class="lucky-draw-alert" style="margin-top:12px; margin-bottom:0; background:rgba(245,158,11,0.08); border:1px solid #f59e0b; color:#d97706; padding:10px 12px; border-radius:6px; display:flex; align-items:center; gap:8px;">
                    <i class="ri-alarm-warning-fill" style="font-size:1.3rem;"></i>
                    <div style="font-size:0.75rem; text-align:left;">
                        <strong>พรุ่งนี้มีรอบจับรางวัล!</strong> คุณมีสิทธิ์ร่วมสุ่มรางวัลเกณฑ์ ${tomorrowRound.milestone} คะแนน เริ่มพรุ่งนี้เวลา ${tomorrowRound.time} น.
                    </div>
                </div>
            `;
        } else if (score === tomorrowRound.milestone - 1 && !alreadyWon) {
            drawAlertHtml = `
                <div class="lucky-draw-alert" style="margin-top:12px; margin-bottom:0; background:rgba(59,130,246,0.08); border:1px solid #3b82f6; color:#1d4ed8; padding:10px 12px; border-radius:6px; display:flex; align-items:center; gap:8px;">
                    <i class="ri-information-fill" style="font-size:1.3rem;"></i>
                    <div style="font-size:0.75rem; text-align:left;">
                        <strong>พรุ่งนี้มีจับรางวัล!</strong> เกณฑ์ ${tomorrowRound.milestone} คะแนน หากวันนี้คุณส่งผลงานและผ่านการอนุมัติ คุณจะมีสิทธิ์ลุ้นรับรางวัลทันที!
                    </div>
                </div>
            `;
        }
    }

    statsContainer.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
            <div class="card" style="padding:12px 6px; text-align:center; margin-bottom:0;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--primary);">${score}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">คะแนนรวม</div>
            </div>
            <div class="card" style="padding:12px 6px; text-align:center; margin-bottom:0;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--success);">+${streakBonus}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">โบนัส Streak</div>
            </div>
            <div class="card" style="padding:12px 6px; text-align:center; margin-bottom:0;">
                <div style="font-size:1.5rem; font-weight:800; color:var(--secondary);">${consecutive}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">ส่งต่อเนื่อง (วัน)</div>
            </div>
        </div>
        ${drawAlertHtml}
    `;

    // Render Initial Survey Summary
    const initSurveyContainer = document.getElementById("hist-initial-survey");
    if (initSurveyContainer) {
        if (p.assessment) {
            const a = p.assessment;
            const initialQuestions = getInitialQuestions();
            const groups = {
                lifestyle: [],
                goal: [],
                ldlTarget: []
            };
            
            initialQuestions.forEach(q => {
                const val = a[q.id] !== undefined ? a[q.id] : a[q.originalKey];
                if (val === undefined || val === null || val === "") return;
                
                if (q.type === "boolean" && val === "ใช่") {
                    groups[q.section || "lifestyle"].push(q.text.substring(4));
                } else if (q.type === "numeric") {
                    const dependsVal = q.dependsOn ? (a[q.dependsOn] !== undefined ? a[q.dependsOn] : a[q.dependsOnOriginalKey]) : null;
                    if (!q.dependsOn || (q.showIfValue && dependsVal === q.showIfValue)) {
                        groups[q.section || "lifestyle"].push(`${q.text.substring(4)}: ${val} mg/dL`);
                    }
                }
            });

            initSurveyContainer.innerHTML = `
                <div class="card" style="background: var(--primary-light); border-left: 5px solid var(--primary); padding: 14px 16px; margin-bottom: 0;">
                    <h5 style="font-weight: 800; font-size: 0.9rem; color: var(--primary-dark); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="ri-survey-line"></i> ผลการประเมินสุขภาพแรกเข้า
                    </h5>
                    <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-main); display: flex; flex-direction: column; gap: 6px;">
                        <div><strong>พฤติกรรมเดิม:</strong> ${groups.lifestyle.length > 0 ? groups.lifestyle.join(", ") : "ไม่ได้ระบุ"}</div>
                        <div><strong>เป้าหมายพฤติกรรม:</strong> ${groups.goal.length > 0 ? groups.goal.join(", ") : "ไม่ได้ระบุ"}</div>
                        <div><strong>เป้าหมาย LDL:</strong> ${groups.ldlTarget.length > 0 ? groups.ldlTarget.join(", ") : "ต้องการให้ระดับ LDL ปกติ (<130 mg/dL)"}</div>
                    </div>
                </div>
            `;
        } else {
            initSurveyContainer.innerHTML = `
                <div class="card" style="background: var(--light); border-left: 5px solid var(--border-color); padding: 12px 16px; margin-bottom: 0; color: var(--text-muted); font-size: 0.8rem;">
                    <i class="ri-information-line"></i> ไม่พบข้อมูลการประเมินแรกเข้าสำหรับพนักงานท่านนี้
                </div>
            `;
        }
    }

    const subs = getSubmissions().filter(s => s.empId === empId);

    // Render Behavior Accumulated Counters
    const dailyQuestions = getDailyQuestions();
    const counts = {};
    let totalAssessedDays = 0;

    subs.forEach(s => {
        if (s.dailyBehavior) {
            totalAssessedDays++;
            dailyQuestions.forEach(q => {
                const ans = s.dailyBehavior[q.id] !== undefined ? s.dailyBehavior[q.id] : s.dailyBehavior[q.originalKey];
                const isHealthy = (q.isNegative && ans === "ไม่ใช่") || (!q.isNegative && ans === "ใช่");
                if (isHealthy) {
                    counts[q.id] = (counts[q.id] || 0) + 1;
                }
            });
        }
    });

    const countersContainer = document.getElementById("hist-behavior-counters");
    if (countersContainer) {
        if (totalAssessedDays > 0) {
            let countersHtml = `
                <div class="card" style="padding: 14px 16px; margin-bottom: 0; border: 1px solid var(--border-color);">
                    <h5 style="font-weight: 800; font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="ri-pulse-line" style="color: var(--secondary);"></i> สรุปพฤติกรรมสุขภาพสะสม (บันทึกจริง)
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px;">
            `;
            
            dailyQuestions.forEach(q => {
                const hCount = counts[q.id] || 0;
                const text = q.text.replace("วันนี้ท่านได้", "").replace("วันนี้ท่าน", "").replace("หรือไม่?", "").replace("หรือไม่", "");
                let icon = "🎯";
                if (q.id === "daily_alcohol" || q.originalKey === "alcohol") icon = "🍷";
                else if (q.id === "daily_sugar" || q.originalKey === "sugar") icon = "🧋";
                else if (q.id === "daily_snack" || q.originalKey === "snack") icon = "🍩";
                else if (q.id === "daily_water" || q.originalKey === "water") icon = "💧";
                
                const color = q.isNegative ? "var(--success)" : "var(--primary-dark)";
                
                countersHtml += `
                    <div style="background: var(--light); padding: 8px 10px; border-radius: 8px; font-size: 0.75rem; display: flex; flex-direction: column; gap: 4px;">
                        <span>${icon} ${text}:</span>
                        <strong style="color:${color};">${hCount} / ${totalAssessedDays} วัน</strong>
                    </div>
                `;
            });
            
            let totalHealthyChoices = 0;
            dailyQuestions.forEach(q => {
                totalHealthyChoices += (counts[q.id] || 0);
            });
            const maxHealthyChoices = totalAssessedDays * dailyQuestions.length;
            const healthyScorePercent = maxHealthyChoices > 0 ? (totalHealthyChoices / maxHealthyChoices) * 100 : 0;
            
            let feedbackTitle = "";
            let feedbackDesc = "";
            let feedbackBg = "";
            let feedbackBorder = "";
            let feedbackTextColor = "";
            let feedbackIcon = "";
            
            if (healthyScorePercent >= 80) {
                feedbackTitle = "สุดยอดไปเลย! พฤติกรรมสุขภาพดีเยี่ยม 🌟";
                feedbackDesc = "ท่านดูแลตนเองได้อย่างมีวินัยสูงมากค่ะ การงดสิ่งกระตุ้นและการเติมน้ำเข้าร่างกายอย่างสม่ำเสมอจะช่วยส่งเสริมให้ระดับไขมัน LDL ลดลงได้อย่างชัดเจนแน่นอน รักษาระดับแบบนี้ไปจนครบ 60 วันนะคะ!";
                feedbackBg = "var(--success-light)";
                feedbackBorder = "var(--success)";
                feedbackTextColor = "#065f46";
                feedbackIcon = "ri-medal-fill";
            } else if (healthyScorePercent >= 50) {
                feedbackTitle = "ทำดีแล้ว! พยายามอีกนิดเพื่อเป้าหมายสุขภาพดี 🚲";
                feedbackDesc = "ท่านกำลังเดินทางในแนวทางที่ดีแล้วค่ะ เริ่มมีการควบคุมพฤติกรรมได้มากกว่าครึ่งหนึ่งแล้ว แนะนำให้ลดละเครื่องดื่มรสหวานหรือขนมจุบจิบเพิ่มขึ้นอีกนิด เพื่อผลตรวจไขมัน LDL รอบถัดไปที่ดีขึ้นอย่างเห็นได้ชัดค่ะ สู้ๆ นะคะ!";
                feedbackBg = "var(--info-light)";
                feedbackBorder = "var(--info)";
                feedbackTextColor = "#1d4ed8";
                feedbackIcon = "ri-emotion-happy-line";
            } else {
                feedbackTitle = "เป็นกำลังใจให้! มาปรับพฤติกรรมเพิ่มกันเถอะ ❤️";
                feedbackDesc = "เริ่มต้นใหม่อีกครั้งได้เสมอค่ะ! แนะนำให้ค่อยๆ ปรับลดละการดื่มเครื่องดื่มรสหวานและของจุบจิบลงทีละน้อย และหันมาดื่มน้ำเปล่าให้มากขึ้น หากท่านรับประทานยาลดไขมันอยู่ อย่าลืมทานอย่างต่อเนื่องตามแพทย์สั่งนะคะ ทุกวันคือโอกาสในการดูแลหัวใจของเราค่ะ";
                feedbackBg = "var(--warning-light)";
                feedbackBorder = "var(--warning)";
                feedbackTextColor = "#92400e";
                feedbackIcon = "ri-heart-add-line";
            }
            
            countersHtml += `
                    </div>
                    <div style="background:${feedbackBg}; border:1px solid ${feedbackBorder}; color:${feedbackTextColor}; padding:14px; border-radius:8px; font-size:0.78rem; line-height:1.5; margin-top:12px; text-align: left;">
                        <strong style="font-size:0.85rem; display:flex; align-items:center; gap:6px;">
                            <i class="${feedbackIcon}"></i> ${feedbackTitle}
                        </strong>
                        <div style="margin-top:6px;">${feedbackDesc}</div>
                    </div>
                </div>
            `;
            countersContainer.innerHTML = countersHtml;
        } else {
            countersContainer.innerHTML = `
                <div class="card" style="background: var(--light); border-left: 5px solid var(--border-color); padding: 12px 16px; margin-bottom: 0; color: var(--text-muted); font-size: 0.8rem;">
                    <i class="ri-pulse-line"></i> ยังไม่มีข้อมูลแบบประเมินสุขภาพประจำวันสะสม
                </div>
            `;
        }
    }

    // Render 10-day behavior blocks summary
    render10DayBehaviorBlocksSummary(empId);


    // Render 60-day calendar
    const calendarContainer = document.getElementById("hist-calendar");
    calendarContainer.innerHTML = "";

    // Generate day headers (Mon-Sun)
    const weekdays = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
    weekdays.forEach(day => {
        const header = document.createElement("div");
        header.className = "calendar-day-header";
        header.innerText = day;
        calendarContainer.appendChild(header);
    });

    // Render 60 Days Grid
    for (let dayNum = 1; dayNum <= 60; dayNum++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        
        // Find if user has a submission associated with day index (simulate based on date chronological sequence or mock index)
        // Here we map each day number to an index starting from the registration date or sequential submissions.
        // Let's match it to individual submission chronologically: the N-th submission is Day N.
        // To make it simple and visual, let's find the submission that matches day index
        // Or show chronological days: we can map the 60-day campaign calendar starting from a fixed start date (e.g. 2026-06-01)
        // Day 1 = June 1, Day 2 = June 2, ...
        // This is extremely realistic and intuitive!
        const campaignStartDate = new Date(appSettings.campaignStartDate || "2026-06-01");
        const targetDate = new Date(campaignStartDate);
        targetDate.setDate(campaignStartDate.getDate() + (dayNum - 1));
        const dateStr = formatDateString(targetDate);

        const sub = subs.find(s => s.date === dateStr);
        let statusClass = "not-started";
        let statusLabel = "";

        // Check if date is in the future
        const todayStr = formatDateString(new Date());
        const isFuture = dateStr > todayStr;

        if (sub) {
            if (sub.status === 'approved') statusClass = "approved";
            else if (sub.status === 'rejected') statusClass = "rejected";
            else statusClass = "pending";
        } else if (!isFuture) {
            statusClass = "missed";
        }

        dayDiv.className = `calendar-day ${statusClass}`;
        
        // Day Number
        const numSpan = document.createElement("span");
        numSpan.className = "calendar-day-num";
        numSpan.innerText = dayNum;
        dayDiv.appendChild(numSpan);

        // Status Dot
        if (statusClass !== 'not-started' && statusClass !== 'missed') {
            const dot = document.createElement("span");
            dot.className = "calendar-status-dot";
            dayDiv.appendChild(dot);
        }

        // Add interactive popover or click details
        if (sub) {
            dayDiv.setAttribute("title", `วันที่ส่ง: ${sub.date}\nสถานะ: ${sub.status.toUpperCase()}${sub.comments ? '\nเหตุผล: ' + sub.comments : ''}`);
            dayDiv.addEventListener("click", () => {
                showSubmissionDetailModal(sub);
            });
        }

        calendarContainer.appendChild(dayDiv);
    }

    // Render spin history in modal
    renderHistoryDrawResults(empId);

    modal.classList.add("active");
}

function renderHistoryDrawResults(empId) {
    const container = document.getElementById("hist-draw-results");
    if (!container) return;

    // 1. Get synced prizes (includes wins and new losses recorded after this update)
    const syncedSpins = getPrizesWon().filter(w => w.empId === empId);

    // 2. Get local attempts (may contain past losses from this browser that were never synced to Google Sheets)
    const localAttempts = getDrawAttempts().filter(a => a.empId === empId);

    // Combine them without duplicating rounds
    const combinedSpins = [];

    // Add synced spins first
    syncedSpins.forEach(s => {
        combinedSpins.push({
            tier: s.tier,
            prize: s.prize,
            wonAt: s.wonAt
        });
    });

    // Add local attempts for rounds that don't have a synced spin yet
    localAttempts.forEach(a => {
        const exists = combinedSpins.some(s => s.tier === a.tier);
        if (!exists) {
            combinedSpins.push({
                tier: a.tier,
                prize: a.won ? (a.prize || "ได้รับรางวัล") : "ไม่ได้รางวัล",
                wonAt: a.attemptedAt
            });
        }
    });

    if (combinedSpins.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 14px 16px; margin-bottom: 0; border: 1px solid var(--border-color);">
                <h5 style="font-weight: 800; font-size: 0.9rem; color: var(--text-main); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <i class="ri-gift-line" style="color: var(--secondary);"></i> ประวัติการหมุนวงล้อสุ่มรางวัล
                </h5>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; text-align: center; padding: 12px 0;">
                    ยังไม่มีประวัติการหมุนวงล้อในระบบ
                </div>
            </div>
        `;
        return;
    }

    const sortedSpins = [...combinedSpins].sort((a, b) => new Date(b.wonAt) - new Date(a.wonAt));

    let html = `
        <div class="card" style="padding: 14px 16px; margin-bottom: 0; border: 1px solid var(--border-color);">
            <h5 style="font-weight: 800; font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="ri-gift-line" style="color: var(--secondary);"></i> ประวัติการหมุนวงล้อสุ่มรางวัล
            </h5>
            <div class="table-responsive">
                <table class="premium-table" style="font-size:0.75rem; margin-bottom:0; text-align:left; width: 100%;">
                    <thead>
                        <tr>
                            <th>รอบรางวัล</th>
                            <th>ผลลัพธ์</th>
                            <th>วันเวลาที่หมุน</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    sortedSpins.forEach(s => {
        let resultHtml = "";
        if (s.prize === "ไม่ได้รางวัล") {
            resultHtml = `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-weight:700;">ไม่ได้รับรางวัล</span>`;
        } else {
            resultHtml = `<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #34d399; font-weight:700;">🏆 ได้รับ: ${s.prize}</span>`;
        }

        // Format Date
        let dateDisplay = "";
        try {
            const d = new Date(s.wonAt);
            const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            const day = d.getDate();
            const month = months[d.getMonth()];
            const year = d.getFullYear() + 543; // Thai Buddhist calendar
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            dateDisplay = `${day} ${month} ${year} ${hours}:${minutes} น.`;
        } catch(e) {
            dateDisplay = s.wonAt;
        }

        html += `
            <tr>
                <td style="font-weight:700;">เกณฑ์ ${s.tier} คะแนน</td>
                <td>${resultHtml}</td>
                <td style="color:var(--text-muted);">${dateDisplay}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function checkSubmissionUrgency(sub) {
    const empId = sub.empId;
    const score = getParticipantScore(empId);
    const wins = getPrizesWon();
    const attempts = getDrawAttempts();

    for (let round of appSettings.drawRounds) {
        const alreadyPlayed = attempts.some(a => a.empId === empId && (a.roundId === round.id || (a.tier === round.milestone && !a.roundId))) ||
                              wins.some(w => w.empId === empId && (w.roundId === round.id || (w.tier === round.milestone && !w.roundId)));

        if (!alreadyPlayed && round.remainingPrizes > 0 && score === round.milestone - 1) {
            return { isUrgent: true, round: round };
        }
    }
    return { isUrgent: false };
}

function recalculateRemainingPrizes() {
    const wins = getPrizesWon();
    
    if (appSettings && appSettings.drawRounds) {
        appSettings.drawRounds.forEach(round => {
            // Filter wins/spins for this specific round (excluding losses)
            const roundWins = wins.filter(w => 
                (w.roundId === round.id || (w.tier === round.milestone && !w.roundId)) && 
                w.prize && w.prize !== "ไม่ได้รางวัล"
            );
            
            if (round.prizes && round.prizes.length >= 3) {
                round.prizes.forEach(prize => {
                    const wonCount = roundWins.filter(w => w.prize === prize.name).length;
                    prize.remainingQty = Math.max(0, prize.maxQty - wonCount);
                });
                round.remainingPrizes = round.prizes.reduce((sum, p) => sum + p.remainingQty, 0);
            } else {
                const wonCount = roundWins.length;
                const max = round.maxPrizes || 3;
                round.remainingPrizes = Math.max(0, max - wonCount);
            }
        });
        saveSettings();
    }
}

function syncDrawAttemptsFromPrizesWon(prizesWon) {
    if (!Array.isArray(prizesWon)) return;
    const newAttempts = prizesWon.map(w => {
        let roundId = w.roundId;
        if (!roundId && appSettings && appSettings.drawRounds) {
            const foundRound = appSettings.drawRounds.find(r => r.milestone === w.tier);
            if (foundRound) roundId = foundRound.id;
        }
        return {
            id: w.id || ('attempt_' + Math.random().toString(36).substr(2, 9)),
            empId: w.empId,
            roundId: roundId || `round_${w.tier}`,
            tier: w.tier,
            won: w.prize !== "ไม่ได้รางวัล",
            prize: w.prize !== "ไม่ได้รางวัล" ? w.prize : null,
            attemptedAt: w.wonAt
        };
    });
    setDrawAttempts(newAttempts);
}

function get10DayBehaviorBlocks(empId = null) {
    const campaignStartDate = new Date(appSettings.campaignStartDate || "2026-06-01");
    const submissions = getSubmissions();
    const dailyQuestions = getDailyQuestions();
    
    // Filter submissions for this participant if empId is provided
    const filteredSubs = empId ? submissions.filter(s => s.empId === empId) : submissions;
    
    // Initialize 6 blocks (10 days each)
    const blocks = [];
    for (let b = 0; b < 6; b++) {
        blocks.push({
            blockNum: b + 1,
            startDay: b * 10 + 1,
            endDay: (b + 1) * 10,
            dates: [], // Date strings in this block
            submittedCount: 0,
            approvedCount: 0,
            behaviors: {} // Count of healthy days for each daily_question id
        });
        
        // Populate dates for this block
        for (let d = 0; d < 10; d++) {
            const dayOffset = b * 10 + d;
            const targetDate = new Date(campaignStartDate);
            targetDate.setDate(campaignStartDate.getDate() + dayOffset);
            blocks[b].dates.push(formatDateString(targetDate));
        }
        
        // Initialize behavior counts
        dailyQuestions.forEach(q => {
            blocks[b].behaviors[q.id] = 0;
        });
    }
    
    // Aggregate submissions into blocks
    filteredSubs.forEach(sub => {
        // Find which block this submission date belongs to
        const block = blocks.find(b => b.dates.includes(sub.date));
        if (block) {
            block.submittedCount++;
            if (sub.status === 'approved') {
                block.approvedCount++;
                // Count healthy behaviors if present
                if (sub.dailyBehavior) {
                    dailyQuestions.forEach(q => {
                        const ans = sub.dailyBehavior[q.id] !== undefined ? sub.dailyBehavior[q.id] : sub.dailyBehavior[q.originalKey];
                        const isHealthy = (q.isNegative && ans === "ไม่ใช่") || (!q.isNegative && ans === "ใช่");
                        if (isHealthy) {
                            block.behaviors[q.id]++;
                        }
                    });
                }
            }
        }
    });
    
    return blocks;
}

function render10DayBehaviorBlocksSummary(empId) {
    const container = document.getElementById("hist-10day-summary");
    if (!container) return;
    
    const blocksData = get10DayBehaviorBlocks(empId);
    
    let blockHtml = `
        <div class="card" style="padding: 14px 16px; margin-bottom: 0; border: 1px solid var(--border-color);">
            <h5 style="font-weight: 800; font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="ri-calendar-check-line" style="color: var(--primary);"></i> สรุปพฤติกรรมสุขภาพราย 10 วัน
            </h5>
            <div class="table-responsive">
                <table class="premium-table" style="font-size:0.75rem; margin-bottom:0; text-align:center;">
                    <thead>
                        <tr>
                            <th style="text-align:left;">ช่วงเวลา</th>
                            <th>🍷 งดเหล้า</th>
                            <th>🧋 งดน้ำหวาน</th>
                            <th>🍩 งดขนม</th>
                            <th>💧 ดื่มน้ำ</th>
                            <th>ส่งผล</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    blocksData.forEach(b => {
        const campaignStartDate = new Date(appSettings.campaignStartDate || "2026-06-01");
        const blockStartDate = new Date(campaignStartDate);
        blockStartDate.setDate(campaignStartDate.getDate() + (b.startDay - 1));
        const today = new Date();
        const isFutureBlock = blockStartDate > today;

        if (isFutureBlock) {
            blockHtml += `
                <tr>
                    <td style="font-weight:700; text-align:left; color:var(--text-muted);">ช่วงที่ ${b.blockNum} (วันที่ ${b.startDay}-${b.endDay})</td>
                    <td colspan="5" style="color:var(--text-muted); font-style:italic;">ยังไม่ถึงกำหนด</td>
                </tr>
            `;
        } else {
            blockHtml += `
                <tr>
                    <td style="font-weight:700; text-align:left; white-space:nowrap;">ช่วงที่ ${b.blockNum} (วันที่ ${b.startDay}-${b.endDay})</td>
                    <td style="color:${b.behaviors.daily_alcohol > 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight:700;">${b.behaviors.daily_alcohol} / ${b.approvedCount}</td>
                    <td style="color:${b.behaviors.daily_sugar > 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight:700;">${b.behaviors.daily_sugar} / ${b.approvedCount}</td>
                    <td style="color:${b.behaviors.daily_snack > 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight:700;">${b.behaviors.daily_snack} / ${b.approvedCount}</td>
                    <td style="color:${b.behaviors.daily_water > 0 ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:700;">${b.behaviors.daily_water} / ${b.approvedCount}</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${b.approvedCount} วัน</td>
                </tr>
            `;
        }
    });

    blockHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = blockHtml;
}

function renderAdmin10DayBehaviorOverview() {
    const container = document.getElementById("admin-10day-behavior-overview");
    if (!container) return;
    
    const blocksData = get10DayBehaviorBlocks(); // aggregated
    const dailyQuestions = getDailyQuestions();
    
    let html = `
        <h3 class="card-title"><i class="ri-calendar-check-line" style="color:var(--primary);"></i> สรุปผลการประเมินพฤติกรรมภาพรวมราย 10 วัน</h3>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">สถิติเปอร์เซ็นต์ความสำเร็จของพนักงานทุกคนในการงดแอลกอฮอล์ น้ำหวาน ขนม และดื่มน้ำตามกำหนด แบ่งตามรอบ 10 วัน</p>
        
        <div class="table-responsive">
            <table class="premium-table" style="font-size:0.8rem; text-align:center;">
                <thead>
                    <tr>
                        <th style="text-align:left;">ช่วงเวลา</th>
                        <th>รวมส่งอนุมัติ</th>
                        <th>🍷 งดเหล้า</th>
                        <th>🧋 งดน้ำหวาน</th>
                        <th>🍩 งดขนม</th>
                        <th>💧 ดื่มน้ำ 2L</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    blocksData.forEach(b => {
        const campaignStartDate = new Date(appSettings.campaignStartDate || "2026-06-01");
        const blockStartDate = new Date(campaignStartDate);
        blockStartDate.setDate(campaignStartDate.getDate() + (b.startDay - 1));
        const today = new Date();
        const isFutureBlock = blockStartDate > today;

        if (isFutureBlock) {
            html += `
                <tr>
                    <td style="font-weight:700; text-align:left; color:var(--text-muted);">ช่วงที่ ${b.blockNum} (วันที่ ${b.startDay}-${b.endDay})</td>
                    <td colspan="5" style="color:var(--text-muted); font-style:italic;">ยังไม่ถึงกำหนดช่วงเวลานี้</td>
                </tr>
            `;
        } else {
            const alcPercent = b.approvedCount > 0 ? Math.round((b.behaviors.daily_alcohol / b.approvedCount) * 100) : 0;
            const sugPercent = b.approvedCount > 0 ? Math.round((b.behaviors.daily_sugar / b.approvedCount) * 100) : 0;
            const snkPercent = b.approvedCount > 0 ? Math.round((b.behaviors.daily_snack / b.approvedCount) * 100) : 0;
            const watPercent = b.approvedCount > 0 ? Math.round((b.behaviors.daily_water / b.approvedCount) * 100) : 0;

            html += `
                <tr>
                    <td style="font-weight:700; text-align:left; white-space:nowrap;">ช่วงที่ ${b.blockNum} (วันที่ ${b.startDay}-${b.endDay})</td>
                    <td style="font-weight:700; color:var(--primary-dark);">${b.approvedCount} รายการ</td>
                    <td>
                        <strong style="color:var(--success);">${alcPercent}%</strong>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${b.behaviors.daily_alcohol} วัน</div>
                    </td>
                    <td>
                        <strong style="color:var(--success);">${sugPercent}%</strong>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${b.behaviors.daily_sugar} วัน</div>
                    </td>
                    <td>
                        <strong style="color:var(--success);">${snkPercent}%</strong>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${b.behaviors.daily_snack} วัน</div>
                    </td>
                    <td>
                        <strong style="color:var(--primary);">${watPercent}%</strong>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${b.behaviors.daily_water} วัน</div>
                    </td>
                </tr>
            `;
        }
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

function formatDateString(d) {
    let month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

function closeHistoryModal() {
    playSound('click');
    document.getElementById("history-modal").classList.remove("active");
}

function showSubmissionDetailModal(sub) {
    const detailModal = document.getElementById("sub-detail-modal");
    document.getElementById("sub-detail-date").innerText = `รายละเอียดประวัติการส่ง: ${sub.date}`;
    document.getElementById("sub-detail-img").src = sub.image;
    
    // Food Name
    const foodElem = document.getElementById("sub-detail-food-name");
    if (foodElem) {
        foodElem.innerText = sub.foodName || "-";
    }
    
    // Daily behaviors rendered dynamically
    const dailyQuestions = getDailyQuestions();
    const b = sub.dailyBehavior || {};
    
    let behaviorHtml = `
        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-bottom:4px; border-bottom:1px dashed var(--border-color); padding-bottom:4px;">
            <i class="ri-chat-check-line"></i> พฤติกรรมสุขภาพประจำวัน:
        </div>
    `;
    
    dailyQuestions.forEach(q => {
        const ans = b[q.id] !== undefined ? b[q.id] : b[q.originalKey];
        const displayAns = ans !== undefined ? ans : "-";
        
        let color = "var(--text-main)";
        if (ans !== undefined) {
            if (q.type === "boolean") {
                const isHealthy = (q.isNegative && ans === "ไม่ใช่") || (!q.isNegative && ans === "ใช่");
                color = isHealthy ? "var(--success)" : "var(--danger)";
            }
        }
        
        let icon = "🎯";
        if (q.id === "daily_alcohol" || q.originalKey === "alcohol") icon = "🍷";
        else if (q.id === "daily_sugar" || q.originalKey === "sugar") icon = "🧋";
        else if (q.id === "daily_snack" || q.originalKey === "snack") icon = "🍩";
        else if (q.id === "daily_water" || q.originalKey === "water") icon = "💧";
        
        const text = q.text.replace("วันนี้ท่านได้", "").replace("วันนี้ท่าน", "").replace("หรือไม่?", "").replace("หรือไม่", "");
        
        behaviorHtml += `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span>${icon} ${text}:</span>
                <span style="font-weight:700; color: ${color};">${displayAns}</span>
            </div>
        `;
    });
    
    const behaviorCard = document.getElementById("sub-detail-behavior-card");
    if (behaviorCard) {
        behaviorCard.innerHTML = behaviorHtml;
    }

    let statusBadge = "";
    if (sub.status === 'approved') statusBadge = '<span class="badge badge-approved"><i class="ri-checkbox-circle-line"></i> อนุมัติแล้ว</span>';
    else if (sub.status === 'rejected') statusBadge = '<span class="badge badge-rejected"><i class="ri-close-circle-line"></i> ไม่อนุมัติ</span>';
    else statusBadge = '<span class="badge badge-pending"><i class="ri-time-line"></i> รอแอดมินอนุมัติ</span>';

    document.getElementById("sub-detail-status").innerHTML = statusBadge;
    document.getElementById("sub-detail-comment").innerHTML = sub.comments 
        ? `<div style="background:var(--danger-light); color:#991b1b; padding:12px; border-radius:8px; font-size:0.85rem; border:1px solid rgba(239, 68, 68, 0.2);">
            <strong>หมายเหตุจากแอดมิน:</strong> ${sub.comments}
           </div>` 
        : "";

    detailModal.classList.add("active");
}

function closeSubDetailModal() {
    playSound('click');
    document.getElementById("sub-detail-modal").classList.remove("active");
}

// -------------------------------------------------------------
// Page 4: Lucky Draw / Wheel of Fortune Page Logic
// -------------------------------------------------------------
let wheelRotation = 0;
let isSpinning = false;
let activeDrawRound = null;

function getSegmentsForRound(round) {
    let currentPrizes = [
        { name: "กระเป๋าเป้สุขภาพ" },
        { name: "หมวกแก๊ปออกกำลังกาย" },
        { name: "แก้วน้ำเกลือแร่อย่างดี" }
    ];

    if (round && round.prizes && round.prizes.length >= 3) {
        currentPrizes = round.prizes;
    }

    return [
        { label: currentPrizes[0].name, color: "#10b981", isPrize: true, prizeIndex: 0 },
        { label: currentPrizes[1].name, color: "#f59e0b", isPrize: true, prizeIndex: 1 },
        { label: currentPrizes[2].name, color: "#3b82f6", isPrize: true, prizeIndex: 2 },
        { label: "เกือบได้รางวัล! สู้ต่อไป", color: "#64748b", isPrize: false, prizeIndex: -1 },
        { label: currentPrizes[0].name, color: "#10b981", isPrize: true, prizeIndex: 0 },
        { label: currentPrizes[1].name, color: "#f59e0b", isPrize: true, prizeIndex: 1 },
        { label: currentPrizes[2].name, color: "#3b82f6", isPrize: true, prizeIndex: 2 },
        { label: "ส่งกำลังใจให้สุขภาพดี", color: "#64748b", isPrize: false, prizeIndex: -1 }
    ];
}

function setupLuckyDrawPage() {
    const chkDrawBtn = document.getElementById("chk-draw-btn");
    const drawEmpId = document.getElementById("draw-emp-id");

    chkDrawBtn.addEventListener("click", () => {
        playSound('click');
        checkDrawEligibility(drawEmpId.value);
    });

    drawEmpId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            playSound('click');
            checkDrawEligibility(drawEmpId.value);
        }
    });

    drawEmpId.addEventListener("input", (e) => {
        e.target.value = formatEmpId(e.target.value);
    });

    drawCanvasWheel();
}

function drawCanvasWheel() {
    const canvas = document.getElementById("wheel-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const radius = center - 10;
    
    ctx.clearRect(0, 0, width, height);

    let targetRound = activeDrawRound;
    if (!targetRound && appSettings.drawRounds && appSettings.drawRounds.length > 0) {
        const openRound = appSettings.drawRounds.find(r => r.remainingPrizes > 0);
        targetRound = openRound || appSettings.drawRounds[0];
    }

    const currentSegments = getSegmentsForRound(targetRound);
    const anglePerSeg = (2 * Math.PI) / currentSegments.length;

    currentSegments.forEach((seg, i) => {
        const startAngle = i * anglePerSeg;
        const endAngle = startAngle + anglePerSeg;

        // Draw segment wedge
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Text inside segment
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(startAngle + anglePerSeg / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Inter, Sarabun";
        
        // Wrap/Truncate text
        ctx.fillText(seg.label, radius - 15, 4);
        ctx.restore();
    });
}

function checkDrawEligibility(empId) {
    if (!empId) {
        showAlert("กรุณากรอกรหัสพนักงานเพื่อตรวจสอบสิทธิ์หมุนกงล้อลุ้นรางวัล", "error");
        return;
    }
    const formatted = formatEmpId(empId);
    const participants = getParticipants();
    const p = participants.find(part => part.empId === formatted);

    if (!p) {
        showAlert(`ไม่พบรหัสพนักงาน ${formatted} ในระบบทะเบียนกิจกรรม`, "error");
        return;
    }

    const inputPasscode = document.getElementById("draw-passcode")?.value || "";
    if (p.passcode && p.passcode !== inputPasscode) {
        showAlert("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้งค่ะ", "error");
        return;
    }

    const drawPasscodeEl = document.getElementById("draw-passcode");
    if (drawPasscodeEl) drawPasscodeEl.value = "";

    const score = getParticipantScore(formatted);
    const wins = getPrizesWon();
    const attempts = getDrawAttempts();

    // Check tomorrow draw round warning
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateString(tomorrow);
    const tomorrowRound = appSettings.drawRounds.find(r => r.date === tomorrowStr);
    const banner = document.getElementById("draw-tomorrow-banner");
    
    if (tomorrowRound && banner) {
        const isEligible = score >= tomorrowRound.milestone;
        const alreadyPlayed = attempts.some(a => a.empId === formatted && (a.roundId === tomorrowRound.id || (a.tier === tomorrowRound.milestone && !a.roundId))) ||
                              wins.some(w => w.empId === formatted && (w.roundId === tomorrowRound.id || (w.tier === tomorrowRound.milestone && !w.roundId)));
        
        if (isEligible && !alreadyPlayed) {
            banner.innerHTML = `
                <div class="draw-alert-inner" style="background:rgba(245,158,11,0.08); border:2px dashed #f59e0b; padding:16px; border-radius:12px; color:#d97706; display:flex; align-items:center; gap:12px;">
                    <i class="ri-notification-3-fill" style="font-size:1.8rem; color:#f59e0b;"></i>
                    <div>
                        <h4 style="font-weight:700; margin-bottom:4px; font-size:0.95rem; color:#b45309;">แจ้งเตือน: มีสิทธิ์จับรางวัลใหญ่ในวันพรุ่งนี้!</h4>
                        <p style="font-size:0.8rem; margin:0; color:#b45309; line-height:1.4;">
                            คุณ <strong>${p.name}</strong> มีคะแนนสะสมครบเกณฑ์ ${tomorrowRound.milestone} คะแนนแล้ว! ระบบจะเปิดสปินสำหรับรอบนี้ในวันพรุ่งนี้ (${tomorrowRound.date} เวลา ${tomorrowRound.time} น.) ของรางวัลมีจำกัด 3 ชิ้นนะคะ!
                        </p>
                    </div>
                </div>
            `;
            banner.style.display = "block";
        } else {
            banner.style.display = "none";
        }
    } else if (banner) {
        banner.style.display = "none";
    }

    // Check draws that admin scheduled
    const now = new Date();
    let targetRound = null;
    
    // Sort draw rounds by milestone descending to offer the highest eligible draw first
    const sortedRounds = [...appSettings.drawRounds].sort((a, b) => b.milestone - a.milestone);
    
    for (let round of sortedRounds) {
        const roundStart = new Date(`${round.date}T${round.time}`);
        const isTimePassed = now >= roundStart;
        const isPointsReached = score >= round.milestone;
        const alreadyPlayed = attempts.some(a => a.empId === formatted && (a.roundId === round.id || (a.tier === round.milestone && !a.roundId))) ||
                              wins.some(w => w.empId === formatted && (w.roundId === round.id || (w.tier === round.milestone && !w.roundId)));
        
        if (isPointsReached && isTimePassed && !alreadyPlayed) {
            targetRound = round;
            break;
        }
    }

    if (!targetRound) {
        // Find reason for failure to provide a helpful message
        const scoreMilestones = [...new Set(appSettings.drawRounds.map(r => r.milestone))].sort((a,b) => a-b);
        const reachedMilestones = scoreMilestones.filter(m => score >= m);
        
        let msg = `พนักงาน ${p.name} ไม่มีสิทธิ์ในการสุ่มจับรางวัล ณ วันนี้\n`;
        
        if (reachedMilestones.length === 0) {
            const minMilestone = scoreMilestones[0] || 15;
            msg += `(คะแนนสะสมของคุณคือ ${score} คะแนน ซึ่งยังไม่ถึงเกณฑ์ขั้นต่ำ ${minMilestone} คะแนนในการสุ่มรางวัล)`;
        } else {
            const allPlayed = reachedMilestones.every(m => {
                const roundsForMilestone = appSettings.drawRounds.filter(r => r.milestone === m);
                return roundsForMilestone.every(r => 
                    attempts.some(a => a.empId === formatted && (a.roundId === r.id || (a.tier === m && !a.roundId))) ||
                    wins.some(w => w.empId === formatted && (w.roundId === r.id || (w.tier === m && !w.roundId)))
                );
            });
            
            if (allPlayed) {
                msg += `(คุณได้ใช้สิทธิ์สุ่มของรางวัลสำหรับเกณฑ์ที่ทำคะแนนถึงไปหมดแล้วในรอบนี้)`;
            } else {
                msg += `(ยังไม่ถึงวันและเวลาสุ่มรางวัลที่แอดมินกำหนดในระบบ หรือคะแนนของคุณยังไม่ถึงรอบสุ่มรางวัลที่กำลังเปิดอยู่)`;
            }
        }

        showAlert(msg, "error");
        return;
    }

    // Check if prizes are available for this specific round
    if (targetRound.remainingPrizes <= 0) {
        showAlert(`ขออภัย! ของรางวัลสำหรับรอบเกณฑ์ ${targetRound.milestone} คะแนน (วันที่ ${targetRound.date}) ได้แจกหมดเรียบร้อยแล้วค่ะ`, "error");
        return;
    }

    // Qualifies! Open active wheel overlay
    activeDrawRound = targetRound;
    drawCanvasWheel();
    showActiveWheelOverlay(p, targetRound);
}

function showActiveWheelOverlay(user, round) {
    const playArea = document.getElementById("wheel-play-area");
    const statusText = document.getElementById("wheel-status-text");
    const spinBtn = document.getElementById("spin-button");

    statusText.innerHTML = `
        <div style="font-size:1.1rem; font-weight:700; color:var(--primary);">ยินดีด้วยค่ะคุณ ${user.name}! 🎉</div>
        <div style="font-size:0.9rem; color:var(--text-muted); margin-top:4px;">
            คุณได้รับสิทธิ์ลุ้นของรางวัลสำหรับรอบเกณฑ์สะสมครบ <strong style="color:var(--secondary);">${round.milestone} คะแนน</strong> (ของรางวัลคงเหลือในรอบนี้: ${round.remainingPrizes} ชิ้น)
        </div>
    `;

    spinBtn.style.display = "inline-flex";
    spinBtn.disabled = false;
    spinBtn.onclick = () => {
        spinTheWheel(user, round);
    };

    playArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function spinTheWheel(user, round) {
    if (isSpinning) return;
    isSpinning = true;
    playSound('click');

    const spinBtn = document.getElementById("spin-button");
    spinBtn.disabled = true;

    const canvas = document.getElementById("wheel-canvas");
    
    const currentSegments = getSegmentsForRound(round);
    
    let winSegIndex = 3; // Default thank you
    
    // Check which prizes have quantity left in the round
    const availablePrizeIndices = [];
    if (round.prizes && round.prizes.length >= 3) {
        if (round.prizes[0].remainingQty > 0) availablePrizeIndices.push(0, 4);
        if (round.prizes[1].remainingQty > 0) availablePrizeIndices.push(1, 5);
        if (round.prizes[2].remainingQty > 0) availablePrizeIndices.push(2, 6);
    } else {
        availablePrizeIndices.push(0, 1, 2, 4, 5, 6);
    }
    
    if (round.remainingPrizes > 0 && availablePrizeIndices.length > 0 && Math.random() < 0.7) {
        winSegIndex = availablePrizeIndices[Math.floor(Math.random() * availablePrizeIndices.length)];
    } else {
        winSegIndex = Math.random() < 0.5 ? 3 : 7;
    }

    const anglePerSeg = 360 / currentSegments.length;
    // Align with the 12 o'clock pointer (270 degrees) instead of 3 o'clock (0 degrees)
    const stopAngle = (270 - (winSegIndex * anglePerSeg + anglePerSeg / 2) + 360) % 360;
    const totalRotation = 360 * 5 + stopAngle;

    let startTime = null;
    const duration = 5000; // 5 seconds spin

    function animateWheel(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const t = Math.min(progress / duration, 1);
        
        const rotation = easeOutCubic(t) * totalRotation;
        canvas.style.transform = `rotate(${rotation}deg)`;

        const currentSeg = Math.floor((rotation % 360) / anglePerSeg);
        if (window.lastSegSound !== currentSeg && progress < duration - 1000) {
            playSound('tick');
            window.lastSegSound = currentSeg;
        }

        if (progress < duration) {
            requestAnimationFrame(animateWheel);
        } else {
            isSpinning = false;
            triggerSpinResult(user, round, currentSegments[winSegIndex]);
        }
    }

    requestAnimationFrame(animateWheel);
}

function triggerSpinResult(user, round, segment) {
    const spinBtn = document.getElementById("spin-button");
    const statusText = document.getElementById("wheel-status-text");

    // บันทึกประวัติการหมุนวงล้อทันที (ไม่ว่าจะได้รางวัลหรือไม่ก็ตาม) เพื่อจำกัด 1 สิทธิ์ต่อคนต่อรอบการจับรางวัล
    const attempts = getDrawAttempts();
    attempts.push({
        id: 'attempt_' + Math.random().toString(36).substr(2, 9),
        empId: user.empId,
        roundId: round.id,
        tier: round.milestone,
        won: segment.isPrize,
        prize: segment.isPrize ? segment.label : null,
        attemptedAt: new Date().toISOString()
    });
    setDrawAttempts(attempts);

    if (segment.isPrize) {
        playSound('win');
        triggerConfetti();

        // Save to win logs
        const wins = getPrizesWon();
        const newWin = {
            id: 'win_' + Math.random().toString(36).substr(2, 9),
            empId: user.empId,
            name: `${user.name} ${user.surname}`,
            dept: user.department,
            tier: round.milestone,
            roundId: round.id,
            prize: segment.label,
            wonAt: new Date().toISOString()
        };
        wins.push(newWin);
        setPrizesWon(wins);
        syncToGoogleSheets('save_win', newWin);

        // Deduct prize from the specific round
        const rIdx = appSettings.drawRounds.findIndex(r => r.id === round.id);
        if (rIdx !== -1) {
            const targetRoundObj = appSettings.drawRounds[rIdx];
            if (targetRoundObj.prizes && targetRoundObj.prizes.length >= 3) {
                const pIdx = segment.prizeIndex;
                if (pIdx >= 0 && pIdx < targetRoundObj.prizes.length) {
                    targetRoundObj.prizes[pIdx].remainingQty = Math.max(0, targetRoundObj.prizes[pIdx].remainingQty - 1);
                }
                targetRoundObj.remainingPrizes = targetRoundObj.prizes.reduce((sum, p) => sum + p.remainingQty, 0);
            } else {
                targetRoundObj.remainingPrizes = Math.max(0, targetRoundObj.remainingPrizes - 1);
            }
            saveSettings();
        }

        // Success Alert overlay
        showAlert(`ยินดีด้วยอย่างยิ่ง! คุณหมุนวงล้อได้รับรางวัล [${segment.label}] เรียบร้อยแล้วค่ะ! 🎁`, "success");

        statusText.innerHTML = `
            <div style="font-size:1.2rem; font-weight:800; color:var(--success);">ยินดีด้วยกับชัยชนะ! 🎁</div>
            <div style="font-weight:700; margin-top:6px;">คุณได้รับ: ${segment.label}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">แคปหน้าจอหน้านี้ไว้เป็นหลักฐานรับรางวัลกับฝ่ายบุคคล (HR) นะคะ</div>
        `;
    } else {
        // Save to win logs as "ไม่ได้รางวัล"
        const wins = getPrizesWon();
        const newWin = {
            id: 'win_' + Math.random().toString(36).substr(2, 9),
            empId: user.empId,
            name: `${user.name} ${user.surname}`,
            dept: user.department,
            tier: round.milestone,
            roundId: round.id,
            prize: "ไม่ได้รางวัล",
            wonAt: new Date().toISOString()
        };
        wins.push(newWin);
        setPrizesWon(wins);
        syncToGoogleSheets('save_win', newWin);

        showAlert("เฉียดไปนิดเดียว! สู้ต่อไปนะคะ ส่งรูปภาพเมนูสุขภาพเพิ่มโอกาสวันถัดไปค่ะ 🥗", "error");
        statusText.innerHTML = `
            <div style="font-size:1.1rem; font-weight:700; color:var(--text-muted);">เสียใจด้วยนะคะ รอบนี้ยังไม่ได้ของรางวัล</div>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">สู้ต่อไป ส่งภาพควบคุมอาหารทุกวันให้สุขภาพดีขึ้นเป็นรางวัลที่แท้จริงค่ะ!</div>
        `;
    }

    spinBtn.style.display = "none";
    activeDrawRound = null;
    
    // Refresh stats if admin page is open in background
    if (sessionStorage.getItem("bc_admin_auth")) {
        renderAdminDashboard();
    }
}

// Simple Canvas Confetti Particle System
function triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const colors = ["#ffd700", "#10b981", "#3b82f6", "#ef4444", "#ec4899", "#f59e0b"];
    const particles = [];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h - h,
            r: Math.random() * 6 + 4,
            d: Math.random() * h,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
        });
    }

    let confettiActive = true;
    let frameCount = 0;

    function drawConfetti() {
        ctx.clearRect(0, 0, w, h);
        
        particles.forEach((p, idx) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle);
            p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

            ctx.beginPath();
            ctx.lineWidth = p.r / 2;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();

            // Reset particles that hit the bottom
            if (p.y > h) {
                particles[idx] = {
                    x: Math.random() * w,
                    y: -20,
                    r: p.r,
                    d: p.d,
                    color: p.color,
                    tilt: p.tilt,
                    tiltAngleIncremental: p.tiltAngleIncremental,
                    tiltAngle: p.tiltAngle
                };
            }
        });

        frameCount++;
        if (frameCount < 180) { // Limit confetti to 3 seconds
            requestAnimationFrame(drawConfetti);
        } else {
            ctx.clearRect(0, 0, w, h);
            canvas.style.display = "none";
        }
    }

    drawConfetti();
}

function renderLuckyDraw() {
    activeDrawRound = null;
    // Clear and redraw wheel
    drawCanvasWheel();
    document.getElementById("draw-emp-id").value = "";
    document.getElementById("wheel-play-area").style.display = "block";
    document.getElementById("wheel-status-text").innerText = "กรอกรหัสพนักงานด้านบน เพื่อเช็กสิทธิ์และหมุนกงล้อลุ้นของรางวัล";
    document.getElementById("spin-button").style.display = "none";
    
    const banner = document.getElementById("draw-tomorrow-banner");
    if (banner) banner.style.display = "none";

    // Render employee draw schedule table
    const scheduleTbody = document.getElementById("draw-schedule-tbody");
    if (scheduleTbody) {
        scheduleTbody.innerHTML = "";
        const now = new Date();
        
        // Sort rounds chronologically
        const sortedRounds = [...appSettings.drawRounds].sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        
        sortedRounds.forEach(round => {
            const roundStart = new Date(`${round.date}T${round.time}`);
            let statusBadge = "";
            
            // Check status of draw round
            if (round.remainingPrizes <= 0) {
                statusBadge = `<span class="badge badge-rejected" style="background:#fef2f2; color:#ef4444; border:1px solid #fca5a5; padding: 2px 6px;">ปิด (รางวัลหมด)</span>`;
            } else if (now >= roundStart) {
                statusBadge = `<span class="badge badge-approved" style="background:#ecfdf5; color:#10b981; border:1px solid #6ee7b7; padding: 2px 6px;">เปิดอยู่</span>`;
            } else {
                statusBadge = `<span class="badge badge-pending" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; padding: 2px 6px;">เร็วๆ นี้</span>`;
            }
            
            // Format date for Thai
            const d = new Date(round.date);
            const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            const formattedThaiDate = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${round.milestone} คะแนน</strong></td>
                <td>${formattedThaiDate} เวลา ${round.time} น.</td>
                <td><strong style="color:var(--secondary)">${round.remainingPrizes} / ${round.maxPrizes} ชิ้น</strong></td>
                <td>${statusBadge}</td>
            `;
            scheduleTbody.appendChild(tr);
        });
    }
    
    // Highlight list of recent prize winners
    const wins = getPrizesWon().filter(w => w.prize && w.prize !== "ไม่ได้รางวัล");
    const listBody = document.getElementById("recent-winners-list");
    
    if (listBody) {
        if (wins.length === 0) {
            listBody.innerHTML = `<li style="text-align:center; padding:12px; color:var(--text-muted); font-size:0.85rem;">ยังไม่มีผู้ได้รับรางวัลในรอบนี้</li>`;
            return;
        }

        // Sort recent first
        const sortedWins = [...wins].sort((a,b) => new Date(b.wonAt) - new Date(a.wonAt));
        listBody.innerHTML = "";
        sortedWins.slice(0, 10).forEach(w => {
            const li = document.createElement("li");
            li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding: 12px; border-bottom:1px solid var(--border-color); font-size:0.85rem;";
            li.innerHTML = `
                <div>
                    <strong>${w.name}</strong> (${w.dept}) <br/>
                    <span class="badge badge-info" style="font-size:0.7rem; padding: 2px 6px;">เกณฑ์ ${w.tier} คะแนน</span>
                </div>
                <div style="font-weight:700; color:var(--secondary)">
                    🏆 ${w.prize}
                </div>
            `;
            listBody.appendChild(li);
        });
    }
}

// -------------------------------------------------------------
// Page 5 & 6: Admin Login & Panel Controls
// -------------------------------------------------------------

function showAdminPasswordModal() {
    const modal = document.getElementById("admin-password-modal");
    document.getElementById("admin-pass-input").value = "";
    modal.classList.add("active");
}

function closeAdminPasswordModal() {
    playSound('click');
    document.getElementById("admin-password-modal").classList.remove("active");
}

function submitAdminPassword() {
    playSound('click');
    const pass = document.getElementById("admin-pass-input").value;
    if (pass === "hr1234") {
        sessionStorage.setItem("bc_admin_auth", "true");
        closeAdminPasswordModal();
        switchTab("admin-section");
        showAlert("ลงชื่อเข้าสู่ระบบแอดมินบุคคล (HR) สำเร็จแล้วค่ะ", "success");
    } else {
        showAlert("รหัสผ่านผิดพลาด! กรุณาลองใหม่อีกครั้ง", "error");
    }
}

function logoutAdmin() {
    playSound('click');
    sessionStorage.removeItem("bc_admin_auth");
    switchTab("registration-section");
    showAlert("ออกจากระบบแอดมินเรียบร้อยแล้ว", "success");
}

// Setup Admin Forms & Controls
function setupAdminPage() {
    // Update admin status badges and buttons
    updateAdminToggleButtons();

    // Filter Department Breakdown
    const filterDept = document.getElementById("adm-filter-dept");
    if (filterDept) {
        filterDept.addEventListener("change", () => {
            playSound('click');
            renderAdminDepartmentStats();
        });
    }

    // Populate Sync URL
    const savedUrl = localStorage.getItem('bc_sync_script_url') || "";
    const syncUrlInput = document.getElementById("adm-sync-url");
    if (syncUrlInput) {
        syncUrlInput.value = savedUrl;
    }
}

// Draw Rounds CRUD Logic
function toggleCustomScoreInput() {
    const select = document.getElementById("adm-add-round-score");
    const customInput = document.getElementById("adm-add-round-score-custom");
    if (select && customInput) {
        if (select.value === "custom") {
            customInput.style.display = "block";
            customInput.required = true;
        } else {
            customInput.style.display = "none";
            customInput.required = false;
        }
    }
}

function renderAdminDrawRounds() {
    const tbody = document.getElementById("admin-draw-rounds-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // Sort rounds chronologically
    const sortedRounds = [...appSettings.drawRounds].sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    if (sortedRounds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:10px;">ไม่มีรอบจับรางวัลที่ตั้งค่าไว้</td></tr>`;
        return;
    }

    sortedRounds.forEach(round => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${round.milestone} คะแนน</strong></td>
            <td>${round.date} ${round.time} น.</td>
            <td><strong>${round.remainingPrizes} / ${round.maxPrizes} ชิ้น</strong></td>
            <td>
                <button type="button" class="btn btn-secondary" onclick="editDrawRound('${round.id}')" style="padding:2px 6px; font-size:0.75rem; margin-right:4px;">
                    <i class="ri-edit-line"></i> แก้ไข
                </button>
                <button type="button" class="btn btn-danger" onclick="deleteDrawRound('${round.id}')" style="padding:2px 6px; font-size:0.75rem;">
                    <i class="ri-delete-bin-line"></i> ลบ
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editDrawRound(roundId) {
    playSound('click');
    const round = appSettings.drawRounds.find(r => r.id === roundId);
    if (!round) return;
    
    editingRoundId = roundId;
    
    // Update Form Title
    const formTitle = document.getElementById("adm-round-form-title");
    if (formTitle) {
        formTitle.innerHTML = `<i class="ri-edit-circle-line" style="color:var(--secondary);"></i> แก้ไขรอบจับรางวัล`;
    }
    
    // Populate Form Inputs
    const scoreSelect = document.getElementById("adm-add-round-score");
    const customScoreInput = document.getElementById("adm-add-round-score-custom");
    const dateInput = document.getElementById("adm-add-round-date");
    const timeInput = document.getElementById("adm-add-round-time");
    
    if (scoreSelect && customScoreInput) {
        const standardScores = ["15", "30", "45", "60"];
        if (standardScores.includes(String(round.milestone))) {
            scoreSelect.value = String(round.milestone);
            customScoreInput.style.display = "none";
            customScoreInput.required = false;
        } else {
            scoreSelect.value = "custom";
            customScoreInput.value = round.milestone;
            customScoreInput.style.display = "block";
            customScoreInput.required = true;
        }
    }
    
    if (dateInput) dateInput.value = round.date;
    if (timeInput) timeInput.value = round.time;

    // Populate dynamic prizes
    const p1 = round.prizes && round.prizes[0] ? round.prizes[0] : { name: "กระเป๋าเป้สุขภาพ", maxQty: 1 };
    const p2 = round.prizes && round.prizes[1] ? round.prizes[1] : { name: "หมวกแก๊ปออกกำลังกาย", maxQty: 3 };
    const p3 = round.prizes && round.prizes[2] ? round.prizes[2] : { name: "แก้วน้ำเกลือแร่อย่างดี", maxQty: 3 };

    const prize1Name = document.getElementById("adm-add-round-prize1-name");
    const prize1Qty = document.getElementById("adm-add-round-prize1-qty");
    const prize2Name = document.getElementById("adm-add-round-prize2-name");
    const prize2Qty = document.getElementById("adm-add-round-prize2-qty");
    const prize3Name = document.getElementById("adm-add-round-prize3-name");
    const prize3Qty = document.getElementById("adm-add-round-prize3-qty");

    if (prize1Name) prize1Name.value = p1.name;
    if (prize1Qty) prize1Qty.value = p1.maxQty;
    if (prize2Name) prize2Name.value = p2.name;
    if (prize2Qty) prize2Qty.value = p2.maxQty;
    if (prize3Name) prize3Name.value = p3.name;
    if (prize3Qty) prize3Qty.value = p3.maxQty;
    
    // Show cancel button and change submit button text
    const submitBtn = document.getElementById("adm-add-round-btn");
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="ri-save-line"></i> บันทึกการแก้ไข`;
    }
    
    const cancelBtn = document.getElementById("adm-cancel-edit-round-btn");
    if (cancelBtn) {
        cancelBtn.style.display = "inline-block";
    }
    
    // Scroll form into view
    const formContainer = document.getElementById("adm-round-form-title")?.parentElement;
    if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function cancelEditDrawRound() {
    playSound('click');
    editingRoundId = null;
    
    // Reset Form Title
    const formTitle = document.getElementById("adm-round-form-title");
    if (formTitle) {
        formTitle.innerHTML = `<i class="ri-add-circle-line" style="color:var(--primary);"></i> เพิ่มรอบจับรางวัลใหม่`;
    }
    
    // Clear inputs
    const scoreSelect = document.getElementById("adm-add-round-score");
    const customScoreInput = document.getElementById("adm-add-round-score-custom");
    const dateInput = document.getElementById("adm-add-round-date");
    const timeInput = document.getElementById("adm-add-round-time");
    
    if (scoreSelect) scoreSelect.value = "15";
    if (customScoreInput) {
        customScoreInput.value = "";
        customScoreInput.style.display = "none";
        customScoreInput.required = false;
    }
    if (dateInput) dateInput.value = "";
    if (timeInput) timeInput.value = "09:00";

    const prize1Name = document.getElementById("adm-add-round-prize1-name");
    const prize1Qty = document.getElementById("adm-add-round-prize1-qty");
    const prize2Name = document.getElementById("adm-add-round-prize2-name");
    const prize2Qty = document.getElementById("adm-add-round-prize2-qty");
    const prize3Name = document.getElementById("adm-add-round-prize3-name");
    const prize3Qty = document.getElementById("adm-add-round-prize3-qty");

    if (prize1Name) prize1Name.value = "กระเป๋าเป้สุขภาพ";
    if (prize1Qty) prize1Qty.value = "1";
    if (prize2Name) prize2Name.value = "หมวกแก๊ปออกกำลังกาย";
    if (prize2Qty) prize2Qty.value = "3";
    if (prize3Name) prize3Name.value = "แก้วน้ำเกลือแร่อย่างดี";
    if (prize3Qty) prize3Qty.value = "3";
    
    // Hide cancel button and reset submit button text
    const submitBtn = document.getElementById("adm-add-round-btn");
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="ri-add-line"></i> เพิ่มรอบจับรางวัล`;
    }
    
    const cancelBtn = document.getElementById("adm-cancel-edit-round-btn");
    if (cancelBtn) {
        cancelBtn.style.display = "none";
    }
}

function addNewDrawRound() {
    playSound('click');
    const scoreSelect = document.getElementById("adm-add-round-score");
    const customScoreInput = document.getElementById("adm-add-round-score-custom");
    const dateInput = document.getElementById("adm-add-round-date");
    const timeInput = document.getElementById("adm-add-round-time");

    let milestone = 15;
    if (scoreSelect.value === "custom") {
        milestone = parseInt(customScoreInput.value);
    } else {
        milestone = parseInt(scoreSelect.value);
    }

    const date = dateInput.value;
    const time = timeInput.value;

    const p1Name = document.getElementById("adm-add-round-prize1-name").value.trim();
    const p1Qty = parseInt(document.getElementById("adm-add-round-prize1-qty").value) || 0;
    const p2Name = document.getElementById("adm-add-round-prize2-name").value.trim();
    const p2Qty = parseInt(document.getElementById("adm-add-round-prize2-qty").value) || 0;
    const p3Name = document.getElementById("adm-add-round-prize3-name").value.trim();
    const p3Qty = parseInt(document.getElementById("adm-add-round-prize3-qty").value) || 0;

    if (isNaN(milestone) || milestone <= 0) {
        alert("กรุณาระบุเกณฑ์คะแนนให้ถูกต้อง");
        return;
    }
    if (!p1Name && !p2Name && !p3Name) {
        alert("กรุณาระบุชื่อของรางวัลอย่างน้อย 1 รายการ");
        return;
    }
    const totalMaxPrizes = p1Qty + p2Qty + p3Qty;
    if (totalMaxPrizes <= 0) {
        alert("กรุณาระบุจำนวนของรางวัลรวมอย่างน้อย 1 ชิ้น");
        return;
    }
    if (!date) {
        alert("กรุณาเลือกวันที่ต้องการจับรางวัล");
        return;
    }
    if (!time) {
        alert("กรุณาระบุเวลาที่เริ่มเปิดสปิน");
        return;
    }

    const newPrizes = [
        { name: p1Name || "ของรางวัลที่ 1", maxQty: p1Qty, remainingQty: p1Qty },
        { name: p2Name || "ของรางวัลที่ 2", maxQty: p2Qty, remainingQty: p2Qty },
        { name: p3Name || "ของรางวัลที่ 3", maxQty: p3Qty, remainingQty: p3Qty }
    ];

    if (editingRoundId !== null) {
        // Edit existing round
        const rIdx = appSettings.drawRounds.findIndex(r => r.id === editingRoundId);
        if (rIdx !== -1) {
            const round = appSettings.drawRounds[rIdx];
            const updatedPrizes = newPrizes.map((p, idx) => {
                const oldPrize = (round.prizes && round.prizes[idx]) ? round.prizes[idx] : { maxQty: 0, remainingQty: 0 };
                const used = Math.max(0, oldPrize.maxQty - oldPrize.remainingQty);
                return {
                    name: p.name,
                    maxQty: p.maxQty,
                    remainingQty: Math.max(0, p.maxQty - used)
                };
            });
            const newMax = updatedPrizes.reduce((sum, p) => sum + p.maxQty, 0);
            const newRem = updatedPrizes.reduce((sum, p) => sum + p.remainingQty, 0);
            
            appSettings.drawRounds[rIdx] = {
                ...round,
                milestone: milestone,
                date: date,
                time: time,
                prizes: updatedPrizes,
                maxPrizes: newMax,
                remainingPrizes: newRem
            };
            saveSettings();
            showAlert(`แก้ไขรอบสุ่มรางวัลสำเร็จแล้วค่ะ`, "success");
        }
        cancelEditDrawRound();
    } else {
        // Add round
        const newRound = {
            id: 'round_' + Math.random().toString(36).substr(2, 9),
            milestone: milestone,
            date: date,
            time: time,
            prizes: newPrizes,
            maxPrizes: totalMaxPrizes,
            remainingPrizes: totalMaxPrizes
        };

        appSettings.drawRounds.push(newRound);
        saveSettings();
        showAlert(`เพิ่มรอบสุ่มรางวัลเกณฑ์ ${milestone} คะแนน สำเร็จแล้วค่ะ`, "success");
        
        // Clear forms
        dateInput.value = "";
        customScoreInput.value = "";
        scoreSelect.value = "15";
        toggleCustomScoreInput();
        
        const prize1Name = document.getElementById("adm-add-round-prize1-name");
        const prize1Qty = document.getElementById("adm-add-round-prize1-qty");
        const prize2Name = document.getElementById("adm-add-round-prize2-name");
        const prize2Qty = document.getElementById("adm-add-round-prize2-qty");
        const prize3Name = document.getElementById("adm-add-round-prize3-name");
        const prize3Qty = document.getElementById("adm-add-round-prize3-qty");

        if (prize1Name) prize1Name.value = "กระเป๋าเป้สุขภาพ";
        if (prize1Qty) prize1Qty.value = "1";
        if (prize2Name) prize2Name.value = "หมวกแก๊ปออกกำลังกาย";
        if (prize2Qty) prize2Qty.value = "3";
        if (prize3Name) prize3Name.value = "แก้วน้ำเกลือแร่อย่างดี";
        if (prize3Qty) prize3Qty.value = "3";
    }
    
    // Refresh
    renderAdminDrawRounds();
    renderLuckyDraw();
    renderAdminDashboard();
}

function deleteDrawRound(roundId) {
    playSound('click');
    if (!confirm("คุณต้องการลบรอบจับรางวัลนี้ใช่หรือไม่? พนักงานที่คะแนนถึงเกณฑ์ในรอบนี้จะไม่สามารถลุ้นรางวัลของรอบนี้ได้อีก")) return;
    
    appSettings.drawRounds = appSettings.drawRounds.filter(r => r.id !== roundId);
    saveSettings();
    showAlert("ลบรอบจับรางวัลเรียบร้อยแล้วค่ะ", "success");
    
    // Refresh
    renderAdminDrawRounds();
    renderLuckyDraw();
    renderAdminDashboard();
}

function renderAdminDashboard() {
    if (!sessionStorage.getItem("bc_admin_auth")) return;

    const participants = getParticipants();
    const subs = getSubmissions();
    const wins = getPrizesWon();

    // 1. Calculations for upper summary cards
    const totalCount = participants.length;
    let consecutiveCount = 0;
    let incompleteCount = 0;

    participants.forEach(p => {
        const consecutiveMax = checkConsecutiveDays(p.empId);
        // User is consecutive 60 days if they actually sent continuously
        if (consecutiveMax >= 60) {
            consecutiveCount++;
        } else {
            incompleteCount++;
        }
    });

    const percentConsecutive = totalCount > 0 ? ((consecutiveCount / totalCount) * 100).toFixed(1) : 0;
    const percentIncomplete = totalCount > 0 ? ((incompleteCount / totalCount) * 100).toFixed(1) : 0;

    document.getElementById("adm-stat-total").innerText = totalCount;
    document.getElementById("adm-stat-consec").innerText = `${consecutiveCount} คน (${percentConsecutive}%)`;
    document.getElementById("adm-stat-incom").innerText = `${incompleteCount} คน (${percentIncomplete}%)`;
    const totalRemaining = appSettings.drawRounds.reduce((acc, r) => acc + r.remainingPrizes, 0);
    const totalMax = appSettings.drawRounds.reduce((acc, r) => acc + r.maxPrizes, 0);
    document.getElementById("adm-stat-prizes").innerText = `${totalRemaining} / ${totalMax} ชิ้น (ทุกรอบ)`;

    // 2. Render Pending Submissions list for approval
    renderAdminApprovalList();

    // 3. Render Department statistics
    renderAdminDepartmentStats();

    // 4. Render Pie Charts
    renderAdminPieCharts();

    // 5. Render Admin mock database manager
    renderAdminMockDbManager();
    
    // Render Admin Healthy Menu Catalog manager
    renderAdminMenuManagerList();

    // 6. Populate Google sheet script copy container
    populateGoogleSheetScriptCode();

    // 7. Render dynamic draw rounds table in settings
    renderAdminDrawRounds();

    // Render Dynamic Question Manager lists & Survey aggregates
    renderAdminSurveyOverview();
    renderAdmin10DayBehaviorOverview();
    renderSurveyManagerList();

    // Update admin status badges and buttons
    updateAdminToggleButtons();

    // Populate campaign start date settings field
    const dateInput = document.getElementById("adm-campaign-start-date");
    if (dateInput) {
        dateInput.value = appSettings.campaignStartDate || "2026-06-01";
    }
}


// ───────────────────────────────────────────────
//  CANVAS PIE CHART HELPERS
// ───────────────────────────────────────────────
function drawPieChart(canvasId, legendId, segments) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 8;

    ctx.clearRect(0, 0, W, H);

    const total = segments.reduce((s, seg) => s + seg.value, 0);

    if (total === 0) {
        // Draw empty circle placeholder
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e2e8f0';
        ctx.fill();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ยังไม่มีข้อมูล', cx, cy);

        // Clear legend
        const legEl = document.getElementById(legendId);
        if (legEl) legEl.innerHTML = '';
        return;
    }

    let startAngle = -Math.PI / 2;
    const isDark = document.body.classList.contains('dark-mode') || document.documentElement.getAttribute('data-theme') === 'dark';
    const shadowColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)';

    segments.forEach((seg, i) => {
        const slice = (seg.value / total) * Math.PI * 2;
        const endAngle = startAngle + slice;
        const mid = startAngle + slice / 2;

        // Shadow
        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.restore();

        // Percentage label inside slice
        if (seg.value / total > 0.07) {
            const lx = cx + (R * 0.62) * Math.cos(mid);
            const ly = cy + (R * 0.62) * Math.sin(mid);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(((seg.value / total) * 100).toFixed(0) + '%', lx, ly);
        }

        startAngle = endAngle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.42, 0, Math.PI * 2);
    const isDarkMode = document.body.classList.contains('dark-mode');
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fill();

    // Center total text
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1e293b';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 7);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
    ctx.fillText('รวม', cx, cy + 9);

    // Legend
    const legEl = document.getElementById(legendId);
    if (legEl) {
        legEl.innerHTML = segments.map(seg =>
            `<div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="width:10px;height:10px;border-radius:2px;background:${seg.color};display:inline-block;flex-shrink:0;"></span>
                <span style="color:var(--text-primary);">${seg.label}: <strong>${seg.value}</strong></span>
            </div>`
        ).join('');
    }
}

function renderAdminDepartmentStats() {
    const tbody = document.getElementById("adm-dept-table-body");
    if (!tbody) return;

    const participants = getParticipants();
    const filterDept = document.getElementById("adm-filter-dept");
    const selectedDept = filterDept ? filterDept.value : "all";

    // Group participants by department
    const deptData = {};
    participants.forEach(p => {
        const dept = p.department || "ไม่ระบุ";
        if (selectedDept !== "all" && dept !== selectedDept) {
            return;
        }
        if (!deptData[dept]) {
            deptData[dept] = {
                dept: dept,
                registered: 0,
                consecutive: 0,
                incomplete: 0,
                members: []
            };
        }
        
        deptData[dept].registered++;
        const maxConsec = checkConsecutiveDays(p.empId);
        if (maxConsec >= 60) {
            deptData[dept].consecutive++;
        } else {
            deptData[dept].incomplete++;
        }
        deptData[dept].members.push(`${p.name} (${p.empId})`);
    });

    tbody.innerHTML = "";
    const depts = Object.values(deptData);
    if (depts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">ไม่มีข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
        return;
    }

    // Sort departments alphabetically
    depts.sort((a, b) => a.dept.localeCompare(b.dept));

    depts.forEach(d => {
        const tr = document.createElement("tr");
        const membersList = d.members.join(", ");
        const membersDisplay = membersList.length > 25 ? `<span title="${membersList}">${membersList.substring(0, 22)}...</span>` : membersList;
        tr.innerHTML = `
            <td><strong>${d.dept}</strong></td>
            <td><span class="badge badge-info">${d.registered} คน</span></td>
            <td><span class="badge badge-success">${d.consecutive} คน</span></td>
            <td><span class="badge badge-warning">${d.incomplete} คน</span></td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color:var(--text-muted);">${membersDisplay}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminPieCharts() {
    const subs = getSubmissions();
    const participants = getParticipants();

    // ── Chart 1: Submission Status ──────────────────
    const approved = subs.filter(s => s.status === 'approved').length;
    const pending  = subs.filter(s => s.status === 'pending').length;
    const rejected = subs.filter(s => s.status === 'rejected').length;

    drawPieChart('pie-submission-status', 'pie-submission-legend', [
        { label: 'อนุมัติแล้ว',    value: approved, color: '#10b981' },
        { label: 'รอตรวจสอบ',      value: pending,  color: '#f59e0b' },
        { label: 'ปฏิเสธ',         value: rejected, color: '#ef4444' }
    ]);

    // ── Chart 2: Consecutive vs Incomplete ──────────
    let consecutiveCount = 0;
    let incompleteCount = 0;
    participants.forEach(p => {
        if (checkConsecutiveDays(p.empId) >= 60) consecutiveCount++;
        else incompleteCount++;
    });

    drawPieChart('pie-consecutive', 'pie-consecutive-legend', [
        { label: 'ครบ 60 วัน',     value: consecutiveCount, color: '#3b82f6' },
        { label: 'ยังไม่ครบ/ขาดส่ง', value: incompleteCount,  color: '#f97316' }
    ]);

    // ── Chart 3: By Department ──────────────────────
    const deptColors = [
        '#6366f1','#ec4899','#14b8a6','#f59e0b','#84cc16',
        '#06b6d4','#8b5cf6','#f43f5e','#22c55e','#0ea5e9'
    ];
    const deptMap = {};
    participants.forEach(p => {
        const d = p.department || 'ไม่ระบุ';
        deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const deptSegs = Object.entries(deptMap).map(([name, count], i) => ({
        label: name,
        value: count,
        color: deptColors[i % deptColors.length]
    }));

    drawPieChart('pie-department', 'pie-department-legend', deptSegs);
}

function checkIsHealthyDish(foodName) {
    if (!foodName) return { isHealthy: false, reason: "ไม่ได้ระบุชื่อเมนู" };
    const clean = foodName.trim().toLowerCase();
    
    // Negative keywords (not healthy / high fat / coconut milk)
    const negativeKeywords = ["กะทิ", "ผัด", "ทอด", "ชุบแป้ง", "น้ำมัน", "แกงเขียวหวาน", "แกงเผ็ด", "แกงคั่ว", "ข้าวขาหมู", "ข้าวมันไก่", "แกงกะหรี่", "มันไก่", "สามชั้น"];
    for (let kw of negativeKeywords) {
        if (clean.includes(kw)) {
            return { isHealthy: false, reason: `ตรวจพบวัตถุดิบ/ประเภทการปรุงที่มีไขมัน/กะทิสูง (${kw})` };
        }
    }
    
    // Match in catalog
    const foundInCatalog = HEALTHY_MENU_CATALOG.find(item => clean.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(clean));
    if (foundInCatalog) {
        return { isHealthy: true, reason: `ตรงกับเมนูแนะนำ: ${foundInCatalog.name}` };
    }
    
    // Positive keywords (healthy cooking methods: boil, steam, stew, salad)
    const positiveKeywords = ["ต้ม", "ตุ๋น", "นึ่ง", "สลัด", "ยำ", "แกงส้ม", "แกงจืด", "แกงเลียง", "จับฉ่าย", "ต้มยำน้ำใส"];
    for (let kw of positiveKeywords) {
        if (clean.includes(kw)) {
            return { isHealthy: true, reason: `ประเภทการปรุงเพื่อสุขภาพ (${kw})` };
        }
    }
    
    return { isHealthy: false, reason: "เมนูอาจไม่ตรงตามเกณฑ์ ต้ม ตุ๋น นึ่ง หรือสลัดน้ำใส" };
}

function switchApprovalQueueTab(tab) {
    playSound('click');
    currentApprovalQueueTab = tab;
    
    const btnPending = document.getElementById("btn-queue-pending");
    const btnApproved = document.getElementById("btn-queue-approved");
    const btnRejected = document.getElementById("btn-queue-rejected");
    
    const buttons = [
        { el: btnPending, name: "pending" },
        { el: btnApproved, name: "approved" },
        { el: btnRejected, name: "rejected" }
    ];
    
    buttons.forEach(b => {
        if (!b.el) return;
        if (b.name === tab) {
            b.el.className = "btn btn-sm btn-primary";
            b.el.style.background = "";
            b.el.style.color = "";
        } else {
            b.el.className = "btn btn-sm";
            b.el.style.background = "none";
            b.el.style.color = "var(--text-muted)";
        }
    });
    
    const queueDesc = document.getElementById("queue-desc");
    if (queueDesc) {
        if (tab === "pending") {
            queueDesc.innerText = "กรุณาตรวจสอบว่ามีภาพถ่ายอาหารคู่ใบหน้าของพนักงานจริง และไม่มีประวัติการคัดลอกรูปจากในเครือข่ายอินเทอร์เน็ต";
        } else if (tab === "approved") {
            queueDesc.innerText = "รายการที่ผ่านการอนุมัติแล้ว คุณสามารถตรวจสอบภาพซ้ำ และเลือก 'เปลี่ยนเป็นปฏิเสธ' หากพบข้อผิดพลาดภายหลัง";
        } else if (tab === "rejected") {
            queueDesc.innerText = "รายการที่ไม่ผ่านการอนุมัติ คุณสามารถตรวจสอบภาพซ้ำ และเลือก 'เปลี่ยนเป็นอนุมัติ' เพื่อคืนสิทธิ์/คะแนนแก่พนักงาน";
        }
    }
    
    renderAdminApprovalList();
}

let approvalViewMode = "cards"; // Default view mode

function setApprovalViewMode(mode) {
    playSound('click');
    approvalViewMode = mode;
    
    const btnCards = document.getElementById("btn-view-cards");
    const btnTable = document.getElementById("btn-view-table");
    const bulkBar = document.getElementById("bulk-actions-bar");
    
    if (mode === "cards") {
        if (btnCards) {
            btnCards.className = "btn btn-sm btn-primary";
            btnCards.style.background = "";
            btnCards.style.color = "";
        }
        if (btnTable) {
            btnTable.className = "btn btn-sm btn-secondary";
            btnTable.style.background = "none";
            btnTable.style.color = "var(--text-muted)";
            btnTable.style.borderColor = "var(--border-color)";
        }
        if (bulkBar) bulkBar.style.display = "none";
    } else {
        if (btnCards) {
            btnCards.className = "btn btn-sm btn-secondary";
            btnCards.style.background = "none";
            btnCards.style.color = "var(--text-muted)";
            btnCards.style.borderColor = "var(--border-color)";
        }
        if (btnTable) {
            btnTable.className = "btn btn-sm btn-primary";
            btnTable.style.background = "";
            btnTable.style.color = "";
        }
        if (bulkBar) {
            bulkBar.style.display = "flex";
        }
    }
    
    renderAdminApprovalList();
}

function toggleBulkSelectAll(master) {
    const checkboxes = document.querySelectorAll(".bulk-sub-check");
    checkboxes.forEach(cb => cb.checked = master.checked);
    updateBulkSelectCount();
}

function updateBulkSelectCount() {
    const checked = document.querySelectorAll(".bulk-sub-check:checked").length;
    const countEl = document.getElementById("bulk-select-count");
    if (countEl) {
        countEl.innerText = `เลือก ${checked} รายการ`;
    }
}

function bulkApproveSubmissions() {
    const checkedBoxes = document.querySelectorAll(".bulk-sub-check:checked");
    if (checkedBoxes.length === 0) {
        alert("กรุณาเลือกรายการที่ต้องการอนุมัติก่อนค่ะ");
        return;
    }
    
    if (!confirm(`คุณต้องการอนุมัติรายการที่เลือกทั้งหมดจำนวน ${checkedBoxes.length} รายการ ใช่หรือไม่?`)) {
        return;
    }
    
    playSound('win');
    const submissions = getSubmissions();
    let updatedCount = 0;
    
    checkedBoxes.forEach(cb => {
        const subId = cb.getAttribute("data-id");
        const commentInput = document.getElementById(`app-comment-${subId}`);
        const comments = commentInput ? commentInput.value.trim() : "";
        
        const idx = submissions.findIndex(s => s.id === subId);
        if (idx !== -1) {
            submissions[idx].status = 'approved';
            submissions[idx].comments = comments || "ภาพถ่ายถูกต้อง อนุมัติคะแนน";
            updatedCount++;
            
            // Sync to Sheets
            syncToGoogleSheets('update_status', {
                id: subId,
                status: 'approved',
                comments: submissions[idx].comments
            });
        }
    });
    
    if (updatedCount > 0) {
        setSubmissions(submissions);
        showAlert(`อนุมัติผลงานสำเร็จทั้งหมด ${updatedCount} รายการเรียบร้อยแล้วค่ะ 🎉`, "success");
        
        // Reset select all checkbox
        const selectAll = document.getElementById("bulk-select-all");
        if (selectAll) selectAll.checked = false;
        
        renderAdminDashboard();
        renderScoreboard();
    }
}

function bulkRejectSubmissions() {
    const checkedBoxes = document.querySelectorAll(".bulk-sub-check:checked");
    if (checkedBoxes.length === 0) {
        alert("กรุณาเลือกรายการที่ต้องการปฏิเสธก่อนค่ะ");
        return;
    }
    
    const reason = prompt(`กรุณาระบุเหตุผลการปฏิเสธสำหรับรายการที่เลือกทั้งหมด ${checkedBoxes.length} รายการ:`);
    if (reason === null) return;
    const cleanReason = reason.trim() || "ไม่ผ่านเกณฑ์การอนุมัติของแอดมิน";
    
    playSound('click');
    const submissions = getSubmissions();
    let updatedCount = 0;
    
    checkedBoxes.forEach(cb => {
        const subId = cb.getAttribute("data-id");
        const idx = submissions.findIndex(s => s.id === subId);
        if (idx !== -1) {
            submissions[idx].status = 'rejected';
            submissions[idx].comments = cleanReason;
            updatedCount++;
            
            // Sync to Sheets
            syncToGoogleSheets('update_status', {
                id: subId,
                status: 'rejected',
                comments: cleanReason
            });
        }
    });
    
    if (updatedCount > 0) {
        setSubmissions(submissions);
        showAlert(`ปฏิเสธผลงานสำเร็จทั้งหมด ${updatedCount} รายการเรียบร้อยแล้วค่ะ`, "success");
        
        // Reset select all checkbox
        const selectAll = document.getElementById("bulk-select-all");
        if (selectAll) selectAll.checked = false;
        
        renderAdminDashboard();
        renderScoreboard();
    }
}

function showDetailById(subId) {
    const submissions = getSubmissions();
    const sub = submissions.find(s => s.id === subId);
    if (sub) {
        showSubmissionDetailModal(sub);
    }
}

function approveSubmission(subId) {
    playSound('win');
    const commentInput = document.getElementById(`app-comment-${subId}`);
    const comments = commentInput ? commentInput.value.trim() : "";
    
    const submissions = getSubmissions();
    const idx = submissions.findIndex(s => s.id === subId);
    if (idx !== -1) {
        submissions[idx].status = 'approved';
        submissions[idx].comments = comments || "ภาพถ่ายถูกต้อง อนุมัติคะแนน";
        setSubmissions(submissions);
        
        // Sync to Sheets
        syncToGoogleSheets('update_status', {
            id: subId,
            status: 'approved',
            comments: submissions[idx].comments
        });
        
        showAlert("อนุมัติผลงานและอัปเดตแต้มพนักงานสำเร็จแล้วค่ะ 🥗", "success");
        renderAdminDashboard();
        renderScoreboard();
    }
}

function promptRejectSubmission(subId) {
    playSound('click');
    const commentInput = document.getElementById(`app-comment-${subId}`);
    let comments = commentInput ? commentInput.value.trim() : "";
    
    if (!comments || comments === "ภาพถ่ายถูกต้อง อนุมัติคะแนน") {
        comments = prompt("กรุณาระบุเหตุผลการปฏิเสธรูปภาพนี้ (เช่น ภาพถ่ายไม่ชัดเจน, ไม่ใช่เมนูสุขภาพ, หรือไม่มีใบหน้าคุณคู่กับอาหาร):");
        if (comments === null) return;
        if (!comments.trim()) {
            alert("จำเป็นต้องระบุเหตุผลการปฏิเสธค่ะ");
            return;
        }
        comments = comments.trim();
    }
    
    const submissions = getSubmissions();
    const idx = submissions.findIndex(s => s.id === subId);
    if (idx !== -1) {
        submissions[idx].status = 'rejected';
        submissions[idx].comments = comments;
        setSubmissions(submissions);
        
        // Sync to Sheets
        syncToGoogleSheets('update_status', {
            id: subId,
            status: 'rejected',
            comments: comments
        });
        
        showAlert("ปฏิเสธผลงานเรียบร้อยแล้วค่ะ", "success");
        renderAdminDashboard();
        renderScoreboard();
    }
}

function renderAdminApprovalList() {
    const subs = getSubmissions();
    const filteredSubs = subs.filter(s => s.status === currentApprovalQueueTab);
    
    // Sort urgent submissions (1 point away from a milestone) to the top of the queue
    filteredSubs.sort((a, b) => {
        const aUrgent = checkSubmissionUrgency(a).isUrgent;
        const bUrgent = checkSubmissionUrgency(b).isUrgent;
        
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        
        // Otherwise sort chronologically
        return new Date(a.submittedAt) - new Date(b.submittedAt);
    });
    const container = document.getElementById("adm-pending-list");
    const tableContainer = document.getElementById("adm-pending-table-container");
    const tableBody = document.getElementById("adm-pending-table-body");
    const participants = getParticipants();

    // Reset select count UI
    const countEl = document.getElementById("bulk-select-count");
    if (countEl) countEl.innerText = "เลือก 0 รายการ";
    const selectAll = document.getElementById("bulk-select-all");
    if (selectAll) selectAll.checked = false;

    if (filteredSubs.length === 0) {
        let emptyMsg = "ไม่มีการจัดส่งภาพผลลัพธ์ค้างการอนุมัติในระบบ ณ ขณะนี้";
        if (currentApprovalQueueTab === 'approved') {
            emptyMsg = "ยังไม่มีรายการที่ผ่านการอนุมัติ";
        } else if (currentApprovalQueueTab === 'rejected') {
            emptyMsg = "ยังไม่มีรายการที่ถูกปฏิเสธ";
        }
        
        const emptyHtml = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">
                <i class="ri-checkbox-circle-line" style="font-size:2.5rem; color:var(--primary); display:block; margin-bottom:8px;"></i>
                ${emptyMsg}
            </div>
        `;
        if (container) container.innerHTML = emptyHtml;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">${emptyMsg}</td></tr>`;
        return;
    }

    if (approvalViewMode === 'cards') {
        if (container) container.style.display = "grid";
        if (tableContainer) tableContainer.style.display = "none";
        
        container.innerHTML = "";
        filteredSubs.forEach(sub => {
            const p = participants.find(part => part.empId === sub.empId) || { name: "ไม่พบชื่อพนักงาน", surname: "", department: "ไม่ระบุ" };
            const foodEval = checkIsHealthyDish(sub.foodName);
            
            let badgeHtml = "";
            if (foodEval.isHealthy) {
                badgeHtml = `<span class="badge badge-approved" style="background:#ecfdf5; color:#10b981; border:1px solid #a7f3d0; font-size:0.75rem; padding: 4px 8px; margin-top:8px; display:inline-flex; align-items:center; gap:4px;"><i class="ri-checkbox-circle-line"></i> ชื่อเมนูผ่านเกณฑ์ (${foodEval.reason})</span>`;
            } else {
                badgeHtml = `<span class="badge badge-pending" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; font-size:0.75rem; padding: 4px 8px; margin-top:8px; display:inline-flex; align-items:center; gap:4px;"><i class="ri-error-warning-line"></i> ชื่อเมนูไม่ตรงเกณฑ์ (${foodEval.reason})</span>`;
            }

            let actionsHtml = "";
            let commentValue = sub.comments || "ภาพถ่ายถูกต้อง อนุมัติคะแนน";
            let commentFieldHtml = `
                <div class="form-group" style="margin: 12px 0 8px 0; width:100%;">
                    <label class="form-label" style="font-size:0.75rem; margin-bottom:4px;" for="app-comment-${sub.id}">หมายเหตุ / คำแนะนำจากแอดมิน</label>
                    <input type="text" id="app-comment-${sub.id}" class="form-control" style="font-size:0.8rem; padding:4px 8px; height: 32px;" value="${commentValue}">
                </div>
            `;

            if (currentApprovalQueueTab === 'pending') {
                actionsHtml = `
                    <button class="btn btn-primary" onclick="approveSubmission('${sub.id}')" style="flex:1;">
                        <i class="ri-check-line"></i> อนุมัติ
                    </button>
                    <button class="btn btn-danger" onclick="promptRejectSubmission('${sub.id}')">
                        <i class="ri-close-line"></i> ปฏิเสธ
                    </button>
                `;
            } else if (currentApprovalQueueTab === 'approved') {
                actionsHtml = `
                    <button class="btn btn-danger" onclick="promptRejectSubmission('${sub.id}')" style="flex:1;">
                        <i class="ri-close-line"></i> เปลี่ยนเป็นปฏิเสธ (ไม่อนุมัติ)
                    </button>
                `;
                if (sub.comments) {
                    commentFieldHtml = `
                        <div style="font-size:0.8rem; color:var(--text-muted); margin: 8px 0; background:var(--light); padding:8px; border-radius:6px; border:1px solid var(--border-color);">
                            <strong>หมายเหตุเดิม:</strong> ${sub.comments}
                        </div>
                        ${commentFieldHtml}
                    `;
                }
            } else if (currentApprovalQueueTab === 'rejected') {
                actionsHtml = `
                    <button class="btn btn-primary" onclick="approveSubmission('${sub.id}')" style="flex:1;">
                        <i class="ri-check-line"></i> เปลี่ยนเป็นอนุมัติ
                    </button>
                `;
                if (sub.comments) {
                    commentFieldHtml = `
                        <div style="font-size:0.8rem; color:var(--text-muted); margin: 8px 0; background:var(--light); padding:8px; border-radius:6px; border:1px solid var(--border-color);">
                            <strong>เหตุผลที่ปฏิเสธ:</strong> ${sub.comments}
                        </div>
                        ${commentFieldHtml}
                    `;
                }
            }

            const card = document.createElement("div");
            card.className = "card approval-card";
            
            // Check submission urgency and highlight card
            const urgentInfo = checkSubmissionUrgency(sub);
            let urgentBadgeHtml = "";
            if (urgentInfo.isUrgent) {
                urgentBadgeHtml = `
                    <div style="background:rgba(239,68,68,0.1); border:1px solid #fecaca; border-radius:6px; padding:6px 10px; color:#ef4444; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:6px; margin-top:8px; animation: vibrantPulse 1.5s infinite;">
                        <i class="ri-alarm-warning-fill" style="animation: shake 2s infinite;"></i>
                        <span>ด่วน! อนุมัติเพื่อสิทธิ์สปิน (เกณฑ์ ${urgentInfo.round.milestone} คะแนน)</span>
                    </div>
                `;
                card.style.border = "2px solid #ef4444";
                card.style.background = "#fff5f5";
            }

            const db = sub.dailyBehavior || { alcohol: "ไม่ใช่", sugar: "ไม่ใช่", snack: "ไม่ใช่", water: "ไม่ใช่" };
            const behaviorHtml = `
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px; background:var(--light); padding:8px; border-radius:6px; border:1px solid var(--border-color);">
                    <div>🍷 แอลกอฮอล์: <span style="font-weight:700; color:${db.alcohol === 'ไม่ใช่' ? 'var(--success)' : 'var(--danger)'};">${db.alcohol}</span></div>
                    <div>🧋 น้ำตาล: <span style="font-weight:700; color:${db.sugar === 'ไม่ใช่' ? 'var(--success)' : 'var(--danger)'};">${db.sugar}</span></div>
                    <div>🍩 กินจุบจิบ: <span style="font-weight:700; color:${db.snack === 'ไม่ใช่' ? 'var(--success)' : 'var(--danger)'};">${db.snack}</span></div>
                    <div>💧 น้ำ 2L: <span style="font-weight:700; color:${db.water === 'ใช่' ? 'var(--success)' : 'var(--danger)'};">${db.water}</span></div>
                </div>
            `;

            card.innerHTML = `
                <div class="approval-card-img">
                    <img src="${sub.image}" alt="Meal Evidence">
                    <span class="approval-card-tag">${sub.date}</span>
                </div>
                <div class="approval-card-body">
                    <div class="approval-user-info">
                        <span class="approval-user-name">${`${p.name} ${p.surname}`.trim()}</span>
                        <span class="approval-user-meta">แผนก: ${p.department} | รหัส: ${sub.empId}</span>
                    </div>
                    <div style="font-size:0.85rem; margin-top:8px; line-height:1.4;">
                        <strong>เมนู:</strong> ${sub.foodName || "ไม่ระบุเมนู"}
                    </div>
                    ${behaviorHtml}
                    ${badgeHtml}
                    ${urgentBadgeHtml}
                    ${commentFieldHtml}
                    <div class="approval-actions">
                        ${actionsHtml}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        if (container) container.style.display = "none";
        if (tableContainer) tableContainer.style.display = "block";
        
        if (tableBody) {
            tableBody.innerHTML = "";
            filteredSubs.forEach(sub => {
                const p = participants.find(part => part.empId === sub.empId) || { name: "ไม่พบชื่อพนักงาน", surname: "", department: "ไม่ระบุ" };
                const foodEval = checkIsHealthyDish(sub.foodName);
                
                let badgeHtml = "";
                if (foodEval.isHealthy) {
                    badgeHtml = `<span class="badge badge-approved" style="background:#ecfdf5; color:#10b981; border:1px solid #a7f3d0; font-size:0.7rem; padding: 2px 6px; display:inline-flex; align-items:center; gap:2px;"><i class="ri-checkbox-circle-line"></i> AI ชื่อเมนู: ผ่าน</span>`;
                } else {
                    badgeHtml = `<span class="badge badge-pending" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; font-size:0.7rem; padding: 2px 6px; display:inline-flex; align-items:center; gap:2px;"><i class="ri-error-warning-line"></i> AI ชื่อเมนู: ตรวจสอบ</span>`;
                }
                
                let actionsHtml = "";
                let commentValue = sub.comments || "ภาพถ่ายถูกต้อง อนุมัติคะแนน";
                
                if (currentApprovalQueueTab === 'pending') {
                    actionsHtml = `
                        <div style="display:flex; gap:4px; justify-content:center;">
                            <button class="btn btn-primary btn-sm" onclick="approveSubmission('${sub.id}')" style="padding:4px 8px; font-size:0.75rem;">อนุมัติ</button>
                            <button class="btn btn-danger btn-sm" onclick="promptRejectSubmission('${sub.id}')" style="padding:4px 8px; font-size:0.75rem;">ปฏิเสธ</button>
                        </div>
                    `;
                } else if (currentApprovalQueueTab === 'approved') {
                    actionsHtml = `
                        <button class="btn btn-danger btn-sm" onclick="promptRejectSubmission('${sub.id}')" style="padding:4px 8px; font-size:0.75rem; width:100%;">เปลี่ยนเป็นปฏิเสธ</button>
                    `;
                } else if (currentApprovalQueueTab === 'rejected') {
                    actionsHtml = `
                        <button class="btn btn-primary btn-sm" onclick="approveSubmission('${sub.id}')" style="padding:4px 8px; font-size:0.75rem; width:100%;">เปลี่ยนเป็นอนุมัติ</button>
                    `;
                }
                
                const tr = document.createElement("tr");
                const urgentInfo = checkSubmissionUrgency(sub);
                let urgentBadgeHtml = "";
                if (urgentInfo.isUrgent) {
                    urgentBadgeHtml = `
                        <div style="background:rgba(239,68,68,0.1); border:1px solid #fecaca; border-radius:4px; padding:3px 6px; color:#ef4444; font-size:0.65rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; margin-top:4px; animation: vibrantPulse 1.5s infinite;">
                            <i class="ri-alarm-warning-fill" style="animation: shake 2s infinite;"></i>
                            <span>ด่วน! อนุมัติเพื่อสิทธิ์สปิน (เกณฑ์ ${urgentInfo.round.milestone} คะแนน)</span>
                        </div>
                    `;
                    tr.style.background = "#fff5f5";
                    tr.style.borderLeft = "4px solid #ef4444";
                }
                
                tr.innerHTML = `
                    <td style="text-align:center; vertical-align:middle;">
                        <input type="checkbox" class="bulk-sub-check" data-id="${sub.id}" style="width:16px; height:16px; cursor:pointer;" onclick="updateBulkSelectCount()">
                    </td>
                    <td style="text-align:center; vertical-align:middle;">
                        <img src="${sub.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid var(--border-color);" onclick="showDetailById('${sub.id}')" title="คลิกเพื่อดูรูปขยาย">
                    </td>
                    <td style="vertical-align:middle;">
                        <div style="font-weight:700; color:var(--text-main);">${p.name} ${p.surname}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">รหัส: ${sub.empId} | แผนก: ${p.department}</div>
                    </td>
                    <td style="vertical-align:middle;">
                        <div style="font-weight:600; color:var(--text-main); font-size:0.75rem;">${sub.foodName || "ไม่ระบุเมนู"}</div>
                        <div style="margin-top:2px; display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                            ${badgeHtml}
                            ${urgentBadgeHtml}
                        </div>
                    </td>
                    <td style="vertical-align:middle;">
                        <input type="text" id="app-comment-${sub.id}" class="form-control" style="font-size:0.75rem; padding:4px 8px; height: 28px; min-width: 150px;" value="${commentValue}">
                    </td>
                    <td style="vertical-align:middle; text-align:center;">
                        ${actionsHtml}
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }
}

function renderAdminMockDbManager() {
    const listBody = document.getElementById("adm-mock-db-list");
    if (!listBody) return;
    listBody.innerHTML = "";
    const employees = getMockEmployees();
    employees.forEach(emp => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${emp.empId}</strong></td>
            <td>${`${emp.name} ${emp.surname}`.trim()}</td>
            <td><span class="badge badge-info">${emp.department}</span></td>
            <td>${emp.ldl !== undefined && emp.ldl !== null ? emp.ldl + ' mg/dL' : '-'}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteMockEmployee('${emp.empId}')" style="padding:4px 8px; font-size:0.75rem;">
                    <i class="ri-delete-bin-line"></i> ลบ
                </button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

function addNewMockEmployee() {
    playSound('click');
    const empId = document.getElementById("adm-add-emp-id").value;
    const name = document.getElementById("adm-add-name").value;
    const surname = document.getElementById("adm-add-surname").value;
    const dept = document.getElementById("adm-add-dept").value;
    const ldlVal = document.getElementById("adm-add-ldl").value;

    if (!empId || !name || !surname || !dept) {
        alert("กรุณากรอกข้อมูลจำลองพนักงานพนักงานให้ครบถ้วน");
        return;
    }
    const formatted = formatEmpId(empId);
    const ldl = ldlVal ? parseFloat(ldlVal) : null;

    const employees = getMockEmployees();
    if (employees.some(e => e.empId === formatted)) {
        alert(`รหัสพนักงาน ${formatted} ซ้ำกับในฐานข้อมูลหลักแล้ว`);
        return;
    }

    employees.push({ empId: formatted, name, surname, department: dept, ldl });
    setMockEmployees(employees);

    // Reset Inputs
    document.getElementById("adm-add-emp-id").value = "";
    document.getElementById("adm-add-name").value = "";
    document.getElementById("adm-add-surname").value = "";
    document.getElementById("adm-add-dept").value = "";
    document.getElementById("adm-add-ldl").value = "";

    showAlert("เพิ่มข้อมูลพนักงานจำลองเรียบร้อย ทดสอบ Auto-fill ในหน้าลงทะเบียนได้ทันทีค่ะ", "success");
    renderAdminMockDbManager();
}

function deleteMockEmployee(empId) {
    playSound('click');
    if (!confirm(`คุณต้องการลบข้อมูลพนักงานจำลองรหัส ${empId} หรือไม่?`)) return;
    const employees = getMockEmployees().filter(e => e.empId !== empId);
    setMockEmployees(employees);
    showAlert("ลบข้อมูลพนักงานจำลองเรียบร้อยแล้วค่ะ", "success");
    renderAdminMockDbManager();
}

function renderAdminMenuManagerList() {
    const listBody = document.getElementById("adm-menu-manager-list");
    if (!listBody) return;
    listBody.innerHTML = "";
    
    const filterCat = document.getElementById("adm-filter-menu-cat")?.value || "all";
    
    const items = HEALTHY_MENU_CATALOG.filter(item => filterCat === "all" || item.category === filterCat);
    
    const categoryNames = {
        "boil": "🍲 ต้ม",
        "curry": "🍛 แกง",
        "spicy": "🥗 ยำ/ส้มตำ",
        "steam": "🐟 นึ่ง",
        "stew": "🥣 ตุ๋น",
        "grill": "🔥 ย่าง"
    };

    items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="badge badge-info">${categoryNames[item.category] || item.category}</span></td>
            <td><strong>${item.name}</strong></td>
            <td style="text-align:center;">
                <button class="btn btn-danger" onclick="deleteHealthyMenu('${item.id}')" style="padding:4px 8px; font-size:0.75rem;">
                    <i class="ri-delete-bin-line"></i> ลบ
                </button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

function addNewHealthyMenu() {
    playSound('click');
    const nameInput = document.getElementById("adm-add-menu-name");
    const catInput = document.getElementById("adm-add-menu-cat");
    if (!nameInput || !catInput) return;

    const name = nameInput.value.trim();
    const category = catInput.value;

    if (!name || !category) {
        alert("กรุณากรอกชื่อเมนูอาหารแนะนำให้ครบถ้วนค่ะ");
        return;
    }

    if (HEALTHY_MENU_CATALOG.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        alert(`เมนู "${name}" มีอยู่ในระบบแนะนำอยู่แล้วค่ะ`);
        return;
    }

    const id = category.substring(0, 2) + new Date().getTime().toString().slice(-4) + Math.floor(Math.random() * 10);

    HEALTHY_MENU_CATALOG.push({ id, name, category });
    localStorage.setItem('bc_healthy_menu', JSON.stringify(HEALTHY_MENU_CATALOG));

    nameInput.value = "";

    showAlert(`เพิ่มเมนูอาหาร "${name}" ลงในรายการแนะนำเรียบร้อยแล้วค่ะ`, "success");
    renderAdminMenuManagerList();
}

function deleteHealthyMenu(id) {
    playSound('click');
    const item = HEALTHY_MENU_CATALOG.find(i => i.id === id);
    if (!item) return;

    if (!confirm(`คุณต้องการลบเมนูอาหาร "${item.name}" ออกจากรายการแนะนำหรือไม่?`)) return;

    HEALTHY_MENU_CATALOG = HEALTHY_MENU_CATALOG.filter(i => i.id !== id);
    localStorage.setItem('bc_healthy_menu', JSON.stringify(HEALTHY_MENU_CATALOG));

    showAlert(`ลบเมนูอาหาร "${item.name}" เรียบร้อยแล้วค่ะ`, "success");
    renderAdminMenuManagerList();
}

// -------------------------------------------------------------
// Google Sheet Live Sync & Apps Script
// -------------------------------------------------------------

function populateGoogleSheetScriptCode() {
    const codeBlock = document.getElementById("google-sheet-script-code");
    if (!codeBlock) return;

    const scriptCode = `/**
 * Google Apps Script สำหรับเชื่อมโยงกับระบบ 60 Days Behavior Change
 * นำโค้ดนี้ไปคัดลอกใส่ใน [เครื่องมือ > โปรแกรมแก้ไขสคริปต์] (Extensions > Apps Script) ของ Google Sheet
 * https://docs.google.com/spreadsheets/d/1CDz9odSBT9gW6EmGJpxSFseEMtp0y3Oe8ZGY86q6C3w/
 */

function safeIsoDate(val) {
  if (!val) return new Date().toISOString();
  try {
    var str = String(val).trim();
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    var cleaned = str.split("/").join(" ").split("-").join(" ").split(":").join(" ");
    var parts = [];
    var rawParts = cleaned.split(" ");
    for (var i = 0; i < rawParts.length; i++) {
      if (rawParts[i].trim() !== "") {
        parts.push(rawParts[i].trim());
      }
    }
    if (parts.length >= 3) {
      var year = 0;
      var month = parseInt(parts[1], 10) - 1;
      var day = 0;
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        day = parseInt(parts[2], 10);
      } else {
        year = parseInt(parts[2], 10);
        day = parseInt(parts[0], 10);
      }
      if (year > 2400) year -= 543;
      var hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
      var minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
      var second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
      var d2 = new Date(year, month, day, hour, minute, second);
      if (!isNaN(d2.getTime())) {
        return d2.toISOString();
      }
    }
  } catch (e) {}
  return new Date().toISOString();
}

function findHeaderIdx(headers, keywords) {
  for (var i = 0; i < keywords.length; i++) {
    var idx = headers.indexOf(keywords[i]);
    if (idx !== -1) return idx;
  }
  for (var i = 0; i < keywords.length; i++) {
    var kw = keywords[i].toLowerCase();
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).toLowerCase().indexOf(kw) !== -1) {
        return h;
      }
    }
  }
  return -1;
}

function updateScoresInSheet(doc) {
  var regSheet = doc.getSheetByName("Registration");
  var subSheet = doc.getSheetByName("Submissions");
  if (!regSheet) return;
  
  var defaultHeaders = [
    "รหัสพนักงาน", "รหัสผ่าน", "ชื่อ", "นามสกุล", "แผนก", "เบอร์ภายใน", "ค่า LDL ตั้งต้น", "กะทำงาน", "วันที่ลงทะเบียน", "ลิงก์รูปหลักฐาน",
    "ยาลดไขมันต่อเนื่อง", "ยาลดไขมันไม่ต่อเนื่อง", "คุมอาหารเองไม่เคยทานยา", "ออกกำลังกายสม่ำเสมอ", "ไม่ได้ปฏิบัติสิ่งใดเลย",
    "เป้าหมายคุมอาหารเอง", "เป้าหมายทานยาต่อเนื่อง", "เป้าหมายออกกำลังกายสม่ำเสมอ", "เป้าหมายต้องการรับยา",
    "เป้าหมาย LDL ปกติ (<130)", "เป้าหมาย LDL เฉพาะบุคคล", "ค่า LDL ล่าสุด"
  ];
  
  // เขียนหัวตารางหลัก 22 คอลัมน์แรกเพื่อป้องกันคอลัมน์เลื่อน
  for (var k = 0; k < defaultHeaders.length; k++) {
    regSheet.getRange(1, k + 1).setValue(defaultHeaders[k]);
  }
  
  var regData = regSheet.getDataRange().getValues();
  if (regData.length <= 1) return;
  
  var regHeaders = regData[0];
  var empIdIdx = 0; // "รหัสพนักงาน" อยู่คอลัมน์แรกเสมอ
  
  var scoreIdx = regHeaders.indexOf("คะแนนสะสม");
  if (scoreIdx === -1) scoreIdx = regHeaders.indexOf("Score");
  if (scoreIdx === -1) {
    regSheet.getRange(1, regHeaders.length + 1).setValue("คะแนนสะสม");
    scoreIdx = regHeaders.length;
    regHeaders.push("คะแนนสะสม");
  }
  
  var approvedSubs = {};
  if (subSheet) {
    var subData = subSheet.getDataRange().getValues();
    if (subData.length > 1) {
      var subHeaders = subData[0];
      var subEmpIdIdx = findHeaderIdx(subHeaders, ["รหัสพนักงาน", "EmpId", "Employee"]);
      var subDateIdx = findHeaderIdx(subHeaders, ["วันที่ระบุบันทึก", "Date", "LogDate"]);
      var subStatusIdx = findHeaderIdx(subHeaders, ["สถานะ", "Status", "State"]);
      
      if (subEmpIdIdx !== -1 && subDateIdx !== -1 && subStatusIdx !== -1) {
        for (var i = 1; i < subData.length; i++) {
          var empId = String(subData[i][subEmpIdIdx]).trim();
          var dateStr = String(subData[i][subDateIdx]).trim();
          var status = String(subData[i][subStatusIdx]).trim();
          
          if (status === "approved" || status === "สถานะอนุมัติ" || status === "อนุมัติ") {
            if (!approvedSubs[empId]) approvedSubs[empId] = [];
            approvedSubs[empId].push(dateStr);
          }
        }
      }
    }
  }
  
  for (var i = 1; i < regData.length; i++) {
    var empId = String(regData[i][empIdIdx]).trim();
    if (!empId) continue;
    
    var dates = approvedSubs[empId] || [];
    var uniqueDates = [];
    for (var j = 0; j < dates.length; j++) {
      if (uniqueDates.indexOf(dates[j]) === -1) {
        uniqueDates.push(dates[j]);
      }
    }
    
    uniqueDates.sort(function(a, b) {
      return new Date(a.replace(/-/g, "/")) - new Date(b.replace(/-/g, "/"));
    });
    
    var approvedCount = uniqueDates.length;
    var streakBonus = 0;
    if (uniqueDates.length > 0) {
      var currentStreak = 1;
      var lastDate = new Date(uniqueDates[0].replace(/-/g, "/"));
      
      for (var k = 1; k < uniqueDates.length; k++) {
        var currDate = new Date(uniqueDates[k].replace(/-/g, "/"));
        var diffTime = Math.abs(currDate - lastDate);
        var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          streakBonus += Math.floor(currentStreak / 10) * 3;
          currentStreak = 1;
        }
        lastDate = currDate;
      }
      streakBonus += Math.floor(currentStreak / 10) * 3;
    }
    
    var totalScore = approvedCount + streakBonus;
    regSheet.getRange(i + 1, scoreIdx + 1).setValue(totalScore);
  }
}

function doGet(e) {
  var action = e.parameter.action;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "get_employees") {
    // *คำแนะนำการใช้งาน: โปรดจัดรูปแบบคอลัมน์ A (รหัสพนักงาน) ของชีต "Name" นี้ให้เป็นรูปแบบ "ข้อความธรรมดา (Plain Text)" ใน Google Sheets เพื่อรักษาเลขศูนย์ข้างหน้า
    var sheet = doc.getSheetByName("Name");
    if (!sheet) {
      // สร้างแผ่นงานตัวอย่างพนักงานหากไม่มี
      sheet = doc.insertSheet("Name");
      sheet.appendRow(["รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก", "ค่า LDL"]);
      sheet.appendRow(["'01001", "สมชาย รักดี", "IT", 145.5]);
      sheet.appendRow(["'01002", "สมหญิง เรียนเก่ง", "HRD", 135.0]);
    }
    
    var data = sheet.getDataRange().getDisplayValues(); // ใช้ getDisplayValues เพื่อเลี่ยงเลขศูนย์หาย
    var employees = [];
    // คัดลอกพนักงานจากแผ่นงาน (เริ่มต้นที่แถวที่ 1 เพื่อข้ามหัวตาราง)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        var ldlVal = data[i][3] !== undefined ? String(data[i][3]).trim() : "";
        employees.push({
          empId: String(data[i][0]).trim(),
          name: String(data[i][1]).trim(),
          surname: "", // เก็บชื่อและนามสกุลไว้ในคอลัมน์เดียว
          department: String(data[i][2]).trim(), // คอลัมน์ C (index 2) คือ แผนก
          ldl: ldlVal
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(employees))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "get_all_data") {
    try {
      updateScoresInSheet(doc);
    } catch(err) {}
    
    var result = {
      mockEmployees: [],
      participants: [],
      submissions: []
    };
    
    // 1. Get Mock Employees from "Name"
    var nameSheet = doc.getSheetByName("Name");
    if (nameSheet) {
      var data = nameSheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) {
          var ldlVal = data[i][3] !== undefined ? String(data[i][3]).trim() : "";
          result.mockEmployees.push({
            empId: String(data[i][0]).trim(),
            name: String(data[i][1]).trim(),
            surname: "",
            department: String(data[i][2]).trim(),
            ldl: ldlVal
          });
        }
      }
    }
    
    // 2. Get Participants from "Registration"
    var regSheet = doc.getSheetByName("Registration");
    if (regSheet) {
      var data = regSheet.getDataRange().getDisplayValues();
      var headers = data[0];
      
      var empIdIdx = findHeaderIdx(headers, ["รหัสพนักงาน", "EmpId", "Employee"]);
      var passcodeIdx = findHeaderIdx(headers, ["รหัสผ่าน", "Passcode", "Password"]);
      var nameIdx = findHeaderIdx(headers, ["ชื่อ", "Name"]);
      var surnameIdx = findHeaderIdx(headers, ["นามสกุล", "Surname", "Lastname"]);
      var deptIdx = findHeaderIdx(headers, ["แผนก", "Department", "Dept"]);
      var phoneIdx = findHeaderIdx(headers, ["เบอร์ภายใน", "Phone", "Tel"]);
      var ldlInitIdx = findHeaderIdx(headers, ["ค่า LDL ตั้งต้น", "LDL Initial", "LDL_Init"]);
      var shiftIdx = findHeaderIdx(headers, ["กะทำงาน", "Shift", "กะ"]);
      var regDateIdx = findHeaderIdx(headers, ["วันที่ลงทะเบียน", "Date Registered", "RegDate", "Timestamp"]);
      var proofImgIdx = findHeaderIdx(headers, ["ลิงก์รูปหลักฐาน", "Proof Image", "ProofImage", "Image"]);
      var ldlFinalIdx = findHeaderIdx(headers, ["ค่า LDL ล่าสุด", "LDL Final", "LDL_Final"]);
      
      var lifestyle1Idx = findHeaderIdx(headers, ["ยาลดไขมันต่อเนื่อง", "lifestyle1", "init_1_1"]);
      var lifestyle2Idx = findHeaderIdx(headers, ["ยาลดไขมันไม่ต่อเนื่อง", "lifestyle2", "init_1_2"]);
      var lifestyle3Idx = findHeaderIdx(headers, ["คุมอาหารเองไม่เคยทานยา", "lifestyle3", "init_1_3"]);
      var lifestyle4Idx = findHeaderIdx(headers, ["ออกกำลังกายสม่ำเสมอ", "lifestyle4", "init_1_4"]);
      var lifestyle5Idx = findHeaderIdx(headers, ["ไม่ได้ปฏิบัติสิ่งใดเลย", "lifestyle5", "init_1_5"]);
      
      var goal1Idx = findHeaderIdx(headers, ["เป้าหมายคุมอาหารเอง", "goal1", "init_2_1"]);
      var goal2Idx = findHeaderIdx(headers, ["เป้าหมายทานยาต่อเนื่อง", "goal2", "init_2_2"]);
      var goal3Idx = findHeaderIdx(headers, ["เป้าหมายออกกำลังกายสม่ำเสมอ", "goal3", "init_2_3"]);
      var goal4Idx = findHeaderIdx(headers, ["เป้าหมายต้องการรับยา", "goal4", "init_2_4"]);
      
      var ldlTarget1Idx = findHeaderIdx(headers, ["เป้าหมาย LDL ปกติ", "ldlTarget1", "init_3_1"]);
      var ldlTarget2Idx = findHeaderIdx(headers, ["เป้าหมาย LDL เฉพาะบุคคล", "ldlTarget2", "init_3_2"]);

      for (var i = 1; i < data.length; i++) {
        if (data[i][empIdIdx !== -1 ? empIdIdx : 0]) {
          var empId = empIdIdx !== -1 ? String(data[i][empIdIdx]).trim() : "";
          var assessment = {
            lifestyle1: lifestyle1Idx !== -1 ? String(data[i][lifestyle1Idx]).trim() : "",
            lifestyle2: lifestyle2Idx !== -1 ? String(data[i][lifestyle2Idx]).trim() : "",
            lifestyle3: lifestyle3Idx !== -1 ? String(data[i][lifestyle3Idx]).trim() : "",
            lifestyle4: lifestyle4Idx !== -1 ? String(data[i][lifestyle4Idx]).trim() : "",
            lifestyle5: lifestyle5Idx !== -1 ? String(data[i][lifestyle5Idx]).trim() : "",
            goal1: goal1Idx !== -1 ? String(data[i][goal1Idx]).trim() : "",
            goal2: goal2Idx !== -1 ? String(data[i][goal2Idx]).trim() : "",
            goal3: goal3Idx !== -1 ? String(data[i][goal3Idx]).trim() : "",
            goal4: goal4Idx !== -1 ? String(data[i][goal4Idx]).trim() : "",
            ldlTarget1: ldlTarget1Idx !== -1 ? String(data[i][ldlTarget1Idx]).trim() : "",
            ldlTarget2: ldlTarget2Idx !== -1 ? parseFloat(data[i][ldlTarget2Idx]) || null : null,
            init_1_1: lifestyle1Idx !== -1 ? String(data[i][lifestyle1Idx]).trim() : "",
            init_1_2: lifestyle2Idx !== -1 ? String(data[i][lifestyle2Idx]).trim() : "",
            init_1_3: lifestyle3Idx !== -1 ? String(data[i][lifestyle3Idx]).trim() : "",
            init_1_4: lifestyle4Idx !== -1 ? String(data[i][lifestyle4Idx]).trim() : "",
            init_1_5: lifestyle5Idx !== -1 ? String(data[i][lifestyle5Idx]).trim() : "",
            init_2_1: goal1Idx !== -1 ? String(data[i][goal1Idx]).trim() : "",
            init_2_2: goal2Idx !== -1 ? String(data[i][goal2Idx]).trim() : "",
            init_2_3: goal3Idx !== -1 ? String(data[i][goal3Idx]).trim() : "",
            init_2_4: goal4Idx !== -1 ? String(data[i][goal4Idx]).trim() : "",
            init_3_1: ldlTarget1Idx !== -1 ? String(data[i][ldlTarget1Idx]).trim() : "",
            init_3_2: ldlTarget2Idx !== -1 ? parseFloat(data[i][ldlTarget2Idx]) || null : null
          };

          result.participants.push({
            empId: empId,
            name: nameIdx !== -1 ? String(data[i][nameIdx]).trim() : "",
            surname: surnameIdx !== -1 ? String(data[i][surnameIdx]).trim() : "",
            department: deptIdx !== -1 ? String(data[i][deptIdx]).trim() : "",
            phone: phoneIdx !== -1 ? String(data[i][phoneIdx]).trim() : "",
            ldlInitial: ldlInitIdx !== -1 ? parseFloat(data[i][ldlInitIdx]) || 0 : 0,
            shift: shiftIdx !== -1 ? String(data[i][shiftIdx]).trim() : "",
            regDate: (regDateIdx !== -1 && data[i][regDateIdx]) ? safeIsoDate(data[i][regDateIdx]) : new Date().toISOString(),
            proofImage: proofImgIdx !== -1 ? String(data[i][proofImgIdx]).trim() : "",
            ldlFinal: (ldlFinalIdx !== -1 && data[i][ldlFinalIdx]) ? parseFloat(data[i][ldlFinalIdx]) : null,
            assessment: assessment,
            passcode: passcodeIdx !== -1 ? String(data[i][passcodeIdx]).trim() : ""
          });
        }
      }
    }
    
    // 3. Get Submissions from "Submissions"
    var subSheet = doc.getSheetByName("Submissions");
    if (subSheet) {
      var data = subSheet.getDataRange().getDisplayValues();
      var headers = data[0];
      
      var subIdIdx = findHeaderIdx(headers, ["รหัสการจัดส่ง", "Timestamp", "SubmissionId", "Id"]);
      var subEmpIdIdx = findHeaderIdx(headers, ["รหัสพนักงาน", "EmpId", "Employee"]);
      var subDateIdx = findHeaderIdx(headers, ["วันที่ระบุบันทึก", "Date", "LogDate"]);
      var subFoodNameIdx = findHeaderIdx(headers, ["ชื่อเมนูอาหาร", "ชื่อเมนู", "Food", "Menu"]);
      var subAlcoholIdx = findHeaderIdx(headers, ["ดื่มแอลกอฮอล์", "แอลกอฮอล์", "alcohol"]);
      var subSugarIdx = findHeaderIdx(headers, ["ดื่มเครื่องดื่มรสหวาน", "น้ำตาล", "หวาน", "sugar"]);
      var subSnackIdx = findHeaderIdx(headers, ["ทานขนมจุบจิบ", "ขนม", "จุบจิบ", "ของว่าง", "snack"]);
      var subWaterIdx = findHeaderIdx(headers, ["ดื่มน้ำสะอาด", "น้ำสะอาด", "ลิตร", "water"]);
      var subStatusIdx = findHeaderIdx(headers, ["สถานะ", "Status", "State"]);
      var subCommentsIdx = findHeaderIdx(headers, ["หมายเหตุแอดมิน", "Remark", "Comment"]);
      var subTimeIdx = findHeaderIdx(headers, ["วันเวลาจัดส่งจริง", "Date approve", "ApprovedAt", "Timestamp"]);
      var subImgIdx = findHeaderIdx(headers, ["ลิงก์รูปอาหารเซลฟี่", "Image", "Proof", "Photo", "Url"]);

      for (var i = 1; i < data.length; i++) {
        if (data[i][subIdIdx !== -1 ? subIdIdx : 0]) {
          var dailyBehavior = {
            alcohol: subAlcoholIdx !== -1 ? String(data[i][subAlcoholIdx]).trim() : "",
            sugar: subSugarIdx !== -1 ? String(data[i][subSugarIdx]).trim() : "",
            snack: subSnackIdx !== -1 ? String(data[i][subSnackIdx]).trim() : "",
            water: subWaterIdx !== -1 ? String(data[i][subWaterIdx]).trim() : "",
            daily_alcohol: subAlcoholIdx !== -1 ? String(data[i][subAlcoholIdx]).trim() : "",
            daily_sugar: subSugarIdx !== -1 ? String(data[i][subSugarIdx]).trim() : "",
            daily_snack: subSnackIdx !== -1 ? String(data[i][subSnackIdx]).trim() : "",
            daily_water: subWaterIdx !== -1 ? String(data[i][subWaterIdx]).trim() : ""
          };

          result.submissions.push({
            id: subIdIdx !== -1 ? String(data[i][subIdIdx]).trim() : "",
            empId: subEmpIdIdx !== -1 ? String(data[i][subEmpIdIdx]).trim() : "",
            date: subDateIdx !== -1 ? String(data[i][subDateIdx]).trim() : "",
            foodName: subFoodNameIdx !== -1 ? String(data[i][subFoodNameIdx]).trim() : "",
            status: subStatusIdx !== -1 ? String(data[i][subStatusIdx]).trim() : "",
            comments: subCommentsIdx !== -1 ? String(data[i][subCommentsIdx]).trim() : "",
            submittedAt: (subTimeIdx !== -1 && data[i][subTimeIdx]) ? safeIsoDate(data[i][subTimeIdx]) : new Date().toISOString(),
            image: subImgIdx !== -1 ? String(data[i][subImgIdx]).trim() : "",
            dailyBehavior: dailyBehavior
          });
        }
      }
    }
    
    // 4. Get Prizes Won from "Prizes"
    result.prizesWon = [];
    var prizesSheet = doc.getSheetByName("Prizes");
    if (!prizesSheet) {
      prizesSheet = doc.insertSheet("Prizes");
      prizesSheet.appendRow([
        "รหัสการสุ่ม", "รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก", "เกณฑ์คะแนน", "ของรางวัลที่ได้รับ", "วันเวลาที่ได้รับ"
      ]);
      prizesSheet.getRange(1, 2).setNumberFormat("@");
    }
    if (prizesSheet) {
      var data = prizesSheet.getDataRange().getDisplayValues();
      if (data.length > 1) {
        var headers = data[0];
        var winIdIdx = findHeaderIdx(headers, ["รหัสการสุ่ม", "Id"]);
        var winEmpIdIdx = findHeaderIdx(headers, ["รหัสพนักงาน", "EmpId", "Employee"]);
        var winNameIdx = findHeaderIdx(headers, ["ชื่อ-นามสกุล", "Name"]);
        var winDeptIdx = findHeaderIdx(headers, ["แผนก", "Department", "Dept"]);
        var winTierIdx = findHeaderIdx(headers, ["เกณฑ์คะแนน", "Tier"]);
        var winPrizeIdx = findHeaderIdx(headers, ["ของรางวัลที่ได้รับ", "Prize"]);
        var winTimeIdx = findHeaderIdx(headers, ["วันเวลาที่ได้รับ", "WonAt", "Timestamp"]);
        
        for (var i = 1; i < data.length; i++) {
          if (data[i][winIdIdx !== -1 ? winIdIdx : 0]) {
            result.prizesWon.push({
              id: winIdIdx !== -1 ? String(data[i][winIdIdx]).trim() : "",
              empId: winEmpIdIdx !== -1 ? String(data[i][winEmpIdIdx]).trim() : "",
              name: winNameIdx !== -1 ? String(data[i][winNameIdx]).trim() : "",
              dept: winDeptIdx !== -1 ? String(data[i][winDeptIdx]).trim() : "",
              tier: winTierIdx !== -1 ? parseInt(data[i][winTierIdx]) || 0 : 0,
              prize: winPrizeIdx !== -1 ? String(data[i][winPrizeIdx]).trim() : "",
              wonAt: winTimeIdx !== -1 ? safeIsoDate(data[i][winTimeIdx]) : new Date().toISOString()
            });
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({"status": "active"}))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var json = JSON.parse(e.postData.contents);
    var action = json.action;
    var payload = json.data;
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "register") {
      // 1. แผ่นงานลงทะเบียน
      var sheet = doc.getSheetByName("Registration") || doc.insertSheet("Registration");
      
      var defaultHeaders = [
        "รหัสพนักงาน", "รหัสผ่าน", "ชื่อ", "นามสกุล", "แผนก", "เบอร์ภายใน", "ค่า LDL ตั้งต้น", "กะทำงาน", "วันที่ลงทะเบียน", "ลิงก์รูปหลักฐาน",
        "ยาลดไขมันต่อเนื่อง", "ยาลดไขมันไม่ต่อเนื่อง", "คุมอาหารเองไม่เคยทานยา", "ออกกำลังกายสม่ำเสมอ", "ไม่ได้ปฏิบัติสิ่งใดเลย",
        "เป้าหมายคุมอาหารเอง", "เป้าหมายทานยาต่อเนื่อง", "เป้าหมายออกกำลังกายสม่ำเสมอ", "เป้าหมายต้องการรับยา",
        "เป้าหมาย LDL ปกติ (<130)", "เป้าหมาย LDL เฉพาะบุคคล", "ค่า LDL ล่าสุด"
      ];
      
      // เขียนหัวตารางหลัก 22 คอลัมน์แรกเพื่อป้องกันคอลัมน์เลื่อน
      for (var k = 0; k < defaultHeaders.length; k++) {
        sheet.getRange(1, k + 1).setValue(defaultHeaders[k]);
      }
      
      // บันทึกรูปภาพลง Google Drive และดึง Url
      var imgUrl = saveFileToDrive(payload.proofImage, "LDL_" + payload.empId + "_" + new Date().getTime() + ".jpg");
      
      var a = payload.assessment || {};
      sheet.appendRow([
        "'" + payload.empId,
        payload.passcode || "",
        payload.name,
        payload.surname,
        payload.department,
        payload.phone,
        payload.ldlInitial,
        payload.shift,
        new Date(payload.regDate),
        imgUrl,
        a.lifestyle1 || a.init_1_1 || "",
        a.lifestyle2 || a.init_1_2 || "",
        a.lifestyle3 || a.init_1_3 || "",
        a.lifestyle4 || a.init_1_4 || "",
        a.lifestyle5 || a.init_1_5 || "",
        a.goal1 || a.init_2_1 || "",
        a.goal2 || a.init_2_2 || "",
        a.goal3 || a.init_2_3 || "",
        a.goal4 || a.init_2_4 || "",
        a.ldlTarget1 || a.init_3_1 || "",
        a.ldlTarget2 || a.init_3_2 || "",
        payload.ldlFinal || ""
      ]);
      sheet.getRange(sheet.getLastRow(), 1).setNumberFormat("@"); // กำหนดคอลัมน์ A (รหัสพนักงาน) เป็น Plain Text เพื่อรักษาเลข 0 นำหน้า
      sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("@"); // กำหนดคอลัมน์ B (รหัสผ่าน) เป็น Plain Text เพื่อรักษาเลข 0 นำหน้า
    }
    else if (action === "submit") {
      // 2. แผ่นงานจัดส่งผลประจำวัน
      var sheet = doc.getSheetByName("Submissions") || doc.insertSheet("Submissions");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "รหัสการจัดส่ง", "รหัสพนักงาน", "วันที่ระบุบันทึก", "ชื่อเมนูอาหาร", 
          "ดื่มแอลกอฮอล์", "ดื่มเครื่องดื่มรสหวาน", "ทานขนมจุบจิบ", "ดื่มน้ำสะอาด", 
          "สถานะ", "หมายเหตุแอดมิน", "วันเวลาจัดส่งจริง", "ลิงก์รูปอาหารเซลฟี่"
        ]);
      }
      
      // บันทึกรูปภาพลง Google Drive และดึง Url
      var imgUrl = saveFileToDrive(payload.image, "Meal_" + payload.empId + "_" + payload.date + ".jpg");
      
      var db = payload.dailyBehavior || {};
      sheet.appendRow([
        payload.id,
        "'" + payload.empId,
        payload.date,
        payload.foodName || "",
        db.alcohol || db.daily_alcohol || "",
        db.sugar || db.daily_sugar || "",
        db.snack || db.daily_snack || "",
        db.water || db.daily_water || "",
        payload.status,
        payload.comments,
        new Date(payload.submittedAt),
        imgUrl
      ]);
      sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("@"); // กำหนดคอลัมน์ B (รหัสพนักงาน) เป็น Plain Text เพื่อรักษาเลข 0 นำหน้า
    }
    else if (action === "update_status") {
      // 3. อัปเดตสถานะการส่ง (อนุมัติ/ปฏิเสธ)
      var sheet = doc.getSheetByName("Submissions");
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var statusColIndex = headers.indexOf("สถานะ");
        var commentsColIndex = headers.indexOf("หมายเหตุแอดมิน");
        
        if (statusColIndex === -1) statusColIndex = 8;
        if (commentsColIndex === -1) commentsColIndex = 9;

        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === payload.id) { // ค้นหารหัสจัดส่ง
            sheet.getRange(i + 1, statusColIndex + 1).setValue(payload.status); // เปลี่ยนสถานะ
            sheet.getRange(i + 1, commentsColIndex + 1).setValue(payload.comments); // เพิ่มคอมเมนต์
            break;
          }
        }
      }
    }
    else if (action === "update_ldl") {
      // 4. อัปเดตผลตรวจ LDL ครั้งสุดท้าย (ท้ายโครงการ)
      var sheet = doc.getSheetByName("Registration");
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var ldlColIndex = headers.indexOf("ค่า LDL ล่าสุด");
        if (ldlColIndex === -1) {
          ldlColIndex = headers.length;
          sheet.getRange(1, ldlColIndex + 1).setValue("ค่า LDL ล่าสุด");
        }
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === payload.empId) { // ค้นหาด้วยรหัสพนักงาน
            sheet.getRange(i + 1, ldlColIndex + 1).setValue(payload.ldlFinal);
            break;
          }
        }
      }
    }
    else if (action === "save_win") {
      var sheet = doc.getSheetByName("Prizes") || doc.insertSheet("Prizes");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "รหัสการสุ่ม", "รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก", "เกณฑ์คะแนน", "ของรางวัลที่ได้รับ", "วันเวลาที่ได้รับ"
        ]);
      }
      sheet.appendRow([
        payload.id,
        "'" + payload.empId,
        payload.name,
        payload.dept,
        payload.tier + " คะแนน",
        payload.prize,
        new Date(payload.wonAt)
      ]);
      sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("@"); // empId formatting
    }
    
    try {
      updateScoresInSheet(doc);
    } catch(err) {}
    
    return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (f) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "error": f.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ฟังก์ชันถอดรหัส Base64 และเซฟภาพลง Google Drive โฟลเดอร์ BehaviorChange_Photos
function saveFileToDrive(base64Data, filename) {
  try {
    if (!base64Data || base64Data.indexOf(",") === -1) return "";
    
    var splitData = base64Data.split(",");
    var contentType = splitData[0].match(/:(.*?);/)[1];
    var rawData = splitData[1];
    
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, contentType, filename);
    
    var folders = DriveApp.getFoldersByName("BehaviorChange_Photos");
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("BehaviorChange_Photos");
    }
    
    var file = folder.createFile(blob);
    // ตั้งค่าแชร์ให้ทุกคนเปิดลิงก์ดูรูปได้
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return "Error saving file: " + err.toString();
  }
}`;

    codeBlock.innerText = scriptCode;
}

// Sync function triggered when events happen.
// Since we are running pure client side, we can also trigger a REST API POST call if the user deployed
// the Web App URL in settings. If not deployed, we gracefully mock-log this network sync.
function syncToGoogleSheets(action, data) {
    console.log(`[Google Sheet Sync] Action: ${action}`, data);
    
    // Check if user has entered their custom Google Apps Script Web App URL
    const scriptUrl = localStorage.getItem('bc_sync_script_url');
    if (!scriptUrl) {
        console.log("[Google Sheet Sync] URL ไม่ได้ตั้งค่าในระบบ จะข้ามการเชื่อมต่อเครือข่ายภายนอก แต่บันทึกลงในบราวเซอร์ เรียบร้อยแล้ว");
        return;
    }

    // Attempt real CORS-safelisted post request to avoid preflight OPTIONS blocks
    fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            action: action,
            data: data
        })
    })
    .then(response => {
        console.log("[Google Sheet Sync] ส่งข้อมูลเชื่อมประสาน Google Sheet สำเร็จ!");
    })
    .catch(error => {
        console.error("[Google Sheet Sync] มีข้อผิดพลาดในการเชื่อมต่อ Google Sheet API:", error);
    });
}

function saveGoogleScriptUrl() {
    playSound('click');
    const url = document.getElementById("adm-sync-url").value;
    if (url) {
        localStorage.setItem('bc_sync_script_url', url);
        showAlert("บันทึกที่อยู่ URL ของ Google Web App สำเร็จแล้ว! ระบบจะเริ่มส่งข้อมูลซิงก์เรียลไทม์", "success");
    } else {
        localStorage.removeItem('bc_sync_script_url');
        showAlert("ยกเลิกการเชื่อมต่อเครือข่าย Google Sheet เรียบร้อยแล้ว (ระบบทำงานเฉพาะบนบราวเซอร์)", "success");
    }
}

function saveCampaignSettings() {
    playSound('click');
    const input = document.getElementById("adm-campaign-start-date");
    if (!input || !input.value) {
        alert("กรุณาระบุวันเริ่มกิจกรรมที่ถูกต้องค่ะ");
        return;
    }
    appSettings.campaignStartDate = input.value;
    saveSettings();
    showAlert(`บันทึกวันเริ่มกิจกรรมใหม่เป็นวันที่ ${input.value} เรียบร้อยแล้วค่ะ! ระบบจะคำนวณผลลัพธ์ใหม่ทันที`, "success");
    
    // Check start status immediately
    checkCampaignStartStatus();
    
    // Refresh UI
    renderAdminDashboard();
    renderScoreboard();
    renderLuckyDraw();
}

function checkCampaignStartStatus() {
    const startStr = appSettings.campaignStartDate || "2026-06-01";
    const startDate = new Date(`${startStr}T00:00:00`);
    const today = new Date();
    
    // Clear time parts for comparison (only compare dates)
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    
    const notStartedContainer = document.getElementById("sub-not-started-container");
    const subForm = document.getElementById("submission-form");
    const dateText = document.getElementById("sub-campaign-start-date-text");
    
    if (notStartedContainer && subForm) {
        if (todayZero < startZero) {
            // Campaign not started yet
            if (dateText) {
                const d = new Date(startStr);
                const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                const formattedThaiDate = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
                dateText.innerText = formattedThaiDate;
            }
            notStartedContainer.style.display = "block";
            subForm.style.display = "none";
        } else {
            // Campaign started
            notStartedContainer.style.display = "none";
            subForm.style.display = "block";
        }
    }
}

// Single Click Copy Clipboard Util
function copyCodeToClipboard() {
    playSound('click');
    const codeText = document.getElementById("google-sheet-script-code").innerText;
    navigator.clipboard.writeText(codeText).then(() => {
        alert("คัดลอกโค้ดสคริปต์ Google Apps Script ไปยัง Clipboard สำเร็จแล้วค่ะ!");
    });
}

// Fetch and sync employee roster from Google Sheet Tab "Name"
function syncEmployeeListFromGoogleSheet() {
    playSound('click');
    const scriptUrl = localStorage.getItem('bc_sync_script_url');
    if (!scriptUrl) {
        alert("กรุณาระบุ URL Google Web App ในช่องตั้งค่าเชื่อมโยง Google Sheets และกดบันทึกก่อนกดปุ่มดึงข้อมูลค่ะ");
        return;
    }

    const btn = document.getElementById("adm-sync-employees-btn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<i class="ri-refresh-line ri-spin"></i> กำลังดึงข้อมูลรายชื่อ...`;
    btn.disabled = true;

    fetch(`${scriptUrl}?action=get_employees`, {
        method: "GET",
        mode: "cors"
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("ข้อผิดพลาดจาก Google Sheet: " + data.error);
        } else if (Array.isArray(data)) {
            setMockEmployees(data);
            showAlert(`ซิงค์ข้อมูลรายชื่อพนักงานสำเร็จ! โหลดรายชื่อผู้มีสิทธิ์เข้าร่วมทั้งหมด ${data.length} คน เรียบร้อยแล้ว`, "success");
            renderAdminMockDbManager();
        } else {
            alert("รูปแบบข้อมูลที่ได้รับกลับไม่ถูกต้อง (ต้องเป็นโครงสร้าง Array พนักงาน)");
        }
    })
    .catch(error => {
        console.log("[Google Sheet DB Sync] Error: ", error);
        alert("ไม่สามารถดึงข้อมูลพนักงานได้: กรุณาตรวจสอบว่ามีแผ่นงานชีตชื่อ 'Name' และได้เผยแพร่ Deploy เว็บแอปเป็นแบบ 'Anyone' (ทุกคน) หรือยัง");
    })
    .finally(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
    });
}

function updateAdminToggleButtons() {
    const regBadge = document.getElementById("reg-status-badge");
    const regBtn = document.getElementById("admin-btn-reg-toggle");
    if (regBadge && regBtn) {
        if (appSettings.isRegOpen) {
            regBadge.textContent = "เปิดรับสมัคร";
            regBadge.style.background = "#22c55e";
            regBadge.style.color = "#ffffff";
            
            regBtn.textContent = "ปิดระบบรับสมัคร";
            regBtn.style.background = "#ef4444";
            regBtn.style.color = "#ffffff";
            regBtn.style.borderColor = "#ef4444";
        } else {
            regBadge.textContent = "ปิดรับสมัครแล้ว";
            regBadge.style.background = "#64748b";
            regBadge.style.color = "#ffffff";
            
            regBtn.textContent = "เปิดระบบรับสมัคร";
            regBtn.style.background = "#22c55e";
            regBtn.style.color = "#ffffff";
            regBtn.style.borderColor = "#22c55e";
        }
    }

    const ldlBadge = document.getElementById("ldl-status-badge");
    const ldlBtn = document.getElementById("admin-btn-ldl-toggle");
    if (ldlBadge && ldlBtn) {
        if (appSettings.isLdlAnnounced) {
            ldlBadge.textContent = "ประกาศผลแล้ว";
            ldlBadge.style.background = "#22c55e";
            ldlBadge.style.color = "#ffffff";
            
            ldlBtn.textContent = "ปิดระบบประกาศผล";
            ldlBtn.style.background = "#ef4444";
            ldlBtn.style.color = "#ffffff";
            ldlBtn.style.borderColor = "#ef4444";
        } else {
            ldlBadge.textContent = "ยังไม่ประกาศผล";
            ldlBadge.style.background = "#64748b";
            ldlBadge.style.color = "#ffffff";
            
            ldlBtn.textContent = "เปิดระบบประกาศผล";
            ldlBtn.style.background = "#22c55e";
            ldlBtn.style.color = "#ffffff";
            ldlBtn.style.borderColor = "#22c55e";
        }
    }
}

function toggleRegStatusClick() {
    playSound('click');
    appSettings.isRegOpen = !appSettings.isRegOpen;
    saveSettings();
    checkRegistrationState();
    updateAdminToggleButtons();
    showAlert(appSettings.isRegOpen ? "เปิดระบบลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อย" : "ปิดระบบลงทะเบียนเรียบร้อยแล้ว ป้องกันการสมัครล่าช้า", "success");
}

function toggleLdlAnnounceClick() {
    playSound('click');
    appSettings.isLdlAnnounced = !appSettings.isLdlAnnounced;
    saveSettings();
    updateAdminToggleButtons();
    showAlert(appSettings.isLdlAnnounced ? "ประกาศผลรางวัล LDL ท้ายโครงการให้พนักงานเห็นเรียบร้อย" : "ปิดประกาศผลรางวัลเรียบร้อย (พนักงานทั่วไปจะไม่เห็นตารางอันดับ)", "success");
    renderScoreboard();
}

function syncAllDataFromGoogleSheet() {
    playSound('click');
    const scriptUrl = localStorage.getItem('bc_sync_script_url');
    if (!scriptUrl) {
        alert("กรุณาระบุ URL Google Web App ในช่องตั้งค่าเชื่อมโยง Google Sheets และกดบันทึกก่อนกดปุ่มดึงข้อมูลค่ะ");
        return;
    }

    const btn = document.getElementById("adm-sync-sheet-all-btn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<i class="ri-refresh-line ri-spin"></i> กำลังซิงก์ข้อมูลจาก Google Sheet...`;
    btn.disabled = true;

    fetch(`${scriptUrl}?action=get_all_data`, {
        method: "GET",
        mode: "cors"
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("ข้อผิดพลาดจาก Google Sheet: " + data.error);
        } else if (data && data.mockEmployees && data.participants && data.submissions) {
            setMockEmployees(data.mockEmployees);
            setParticipants(data.participants);
            setSubmissions(data.submissions);
            if (data.prizesWon) {
                setPrizesWon(data.prizesWon);
                syncDrawAttemptsFromPrizesWon(data.prizesWon);
            }
            recalculateRemainingPrizes();
            
            showAlert("ซิงก์ข้อมูลสองทางจาก Google Sheet สำเร็จเรียบร้อย! ข้อมูลได้รับการอัปเดตตรงกันแล้วค่ะ", "success");
            
            // Refresh UI
            renderAdminDashboard();
            renderScoreboard();
            renderLuckyDraw();
        } else {
            alert("รูปแบบข้อมูลที่ได้รับกลับไม่ถูกต้อง (โครงสร้าง get_all_data ไม่ครบถ้วน)");
        }
    })
    .catch(error => {
        console.error("[Google Sheet All Data Sync] Error: ", error);
        alert("ไม่สามารถซิงก์ข้อมูลได้: กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต และตรวจสอบว่าได้ Deploy สคริปต์ Google Web App เป็นแบบ 'Anyone' (ทุกคน) เรียบร้อยแล้ว");
    })
    .finally(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
    });
}

// -------------------------------------------------------------
// LDL Normal Alert Modal Logic
// -------------------------------------------------------------
function openLdlNormalModal() {
    const modal = document.getElementById("ldl-normal-modal");
    if (modal) {
        modal.classList.add("active");
    }
}

function closeLdlNormalModal() {
    playSound('click');
    const modal = document.getElementById("ldl-normal-modal");
    if (modal) {
        modal.classList.remove("active");
    }
}

// -------------------------------------------------------------
// Healthy Menu Catalog Modal Logic
// -------------------------------------------------------------
function openHealthyMenuModal() {
    playSound('click');
    const modal = document.getElementById("healthy-menu-modal");
    if (modal) {
        modal.classList.add("active");
        // Default to boil tab
        switchMenuTab('boil');
    }
}

function closeHealthyMenuModal() {
    playSound('click');
    const modal = document.getElementById("healthy-menu-modal");
    if (modal) {
        modal.classList.remove("active");
    }
}

function switchMenuTab(category) {
    // Update active tab styles
    const tabs = ["boil", "curry", "spicy", "steam", "stew", "grill"];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (btn) {
            if (tab === category) {
                btn.classList.add("active");
                btn.style.background = "var(--primary)";
                btn.style.color = "#fff";
            } else {
                btn.classList.remove("active");
                btn.style.background = "var(--light)";
                btn.style.color = "var(--text-main)";
            }
        }
    });

    renderHealthyMenuGrid(category);
}

function renderHealthyMenuGrid(category) {
    const grid = document.getElementById("healthy-menu-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const items = HEALTHY_MENU_CATALOG.filter(item => item.category === category);
    
    items.forEach(item => {
        const card = document.createElement("div");
        card.style.cssText = "background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; padding:14px 18px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s; cursor:default; min-height: 60px;";
        
        // Premium micro-animation hover effect setup via JS
        card.onmouseenter = () => {
            card.style.transform = "translateY(-2px)";
            card.style.borderColor = "var(--primary)";
            card.style.boxShadow = "0 6px 12px rgba(16,185,129,0.08)";
        };
        card.onmouseleave = () => {
            card.style.transform = "translateY(0)";
            card.style.borderColor = "var(--border-color)";
            card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
        };

        let emoji = '🍲';
        if (category === 'boil') emoji = '🍲';
        else if (category === 'curry') emoji = '🍛';
        else if (category === 'spicy') emoji = '🥗';
        else if (category === 'steam') emoji = '🐟';
        else if (category === 'stew') emoji = '🥣';
        else if (category === 'grill') emoji = '🔥';

        card.innerHTML = `
            <div style="font-size:1.4rem; display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:var(--light); border-radius:8px; flex-shrink:0;">
                ${emoji}
            </div>
            <div style="flex:1; min-width:0;">
                <h5 style="font-size:0.85rem; font-weight:700; margin:0; color:var(--text-main); line-height:1.4; white-space:normal; word-break:break-word;" title="${item.name}">${item.name}</h5>
                <span style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; display:block;">เมนูสุขภาพแนะนำ</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Export Admin Report to Clipboard in CSV format (UTF-8 with BOM and Excel leading zero preservation)
function exportAdminReportToClipboard() {
    playSound('click');
    const participants = getParticipants();
    const subs = getSubmissions();
    const wins = getPrizesWon();

    if (participants.length === 0) {
        showAlert("ไม่มีข้อมูลผู้เข้าร่วมในระบบที่จะทำการคัดลอกรายงาน", "error");
        return;
    }

    // Header row (with BOM to support UTF-8 in Excel)
    let csvContent = "\uFEFF"; // Excel UTF-8 BOM
    csvContent += "รหัสพนักงาน,ชื่อ-นามสกุล,แผนก,เบอร์โทรศัพท์ภายใน,กะการทำงาน,ค่า LDL แรกเริ่ม (mg/dL),ค่า LDL ล่าสุด (mg/dL),เปอร์เซ็นต์การลดลงของ LDL,คะแนนสะสม (วัน),ของรางวัลที่ได้รับ\n";

    participants.forEach(p => {
        const score = subs.filter(s => s.empId === p.empId && s.status === 'approved').length;
        const userWins = wins.filter(w => w.empId === p.empId && w.prize !== "ไม่ได้รางวัล").map(w => w.prize).join(" | ");

        let ldlReductionPercent = 0;
        if (p.ldlInitial !== null && p.ldlInitial > 0 && p.ldlFinal !== null) {
            ldlReductionPercent = ((p.ldlInitial - p.ldlFinal) / p.ldlInitial) * 100;
        }

        const fullName = `${p.name} ${p.surname}`.trim();
        const finalLdlStr = p.ldlFinal !== null ? p.ldlFinal : "ยังไม่วัด";
        const percentStr = p.ldlFinal !== null ? ldlReductionPercent.toFixed(1) + "%" : "N/A";

        // Format to preserve leading zeroes in Excel
        const empIdExcel = `="${p.empId}"`;
        const phoneExcel = p.phone ? `="${p.phone}"` : "";

        const row = [
            empIdExcel,
            `"${fullName.replace(/"/g, '""')}"`,
            `"${p.department.replace(/"/g, '""')}"`,
            phoneExcel,
            `"${p.shift.replace(/"/g, '""')}"`,
            p.ldlInitial,
            finalLdlStr,
            percentStr,
            score,
            `"${userWins.replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    navigator.clipboard.writeText(csvContent)
        .then(() => {
            showAlert("คัดลอกรายงานสรุป (CSV สำหรับ Excel) ไปยังคลิปบอร์ดแล้ว คุณสามารถนำไปวางใน Excel ได้ทันที", "success");
        })
        .catch(err => {
            console.error("Failed to copy CSV: ", err);
            showAlert("เกิดข้อผิดพลาดในการคัดลอกข้อมูลสรุป", "error");
        });
}

// Bulk LDL Importer Logic & State Variables
let parsedBulkLdlData = [];

function openBulkLdlImportModal() {
    playSound('click');
    const modal = document.getElementById("bulk-ldl-import-modal");
    if (modal) {
        document.getElementById("bulk-ldl-paste-area").value = "";
        document.getElementById("bulk-ldl-preview-section").style.display = "none";
        document.getElementById("btn-bulk-ldl-preview").style.display = "inline-flex";
        document.getElementById("btn-bulk-ldl-submit").style.display = "none";
        parsedBulkLdlData = [];
        modal.classList.add("active");
    }
}

function closeBulkLdlImportModal() {
    playSound('click');
    const modal = document.getElementById("bulk-ldl-import-modal");
    if (modal) {
        modal.classList.remove("active");
    }
}

function previewBulkLdlData() {
    playSound('click');
    const text = document.getElementById("bulk-ldl-paste-area").value.trim();
    if (!text) {
        alert("กรุณาวางข้อมูลคอลัมน์จาก Excel ก่อนตรวจสอบข้อมูลค่ะ");
        return;
    }

    const lines = text.split(/\r?\n/);
    const tbody = document.getElementById("bulk-ldl-preview-tbody");
    tbody.innerHTML = "";
    parsedBulkLdlData = [];

    const participants = getParticipants();
    let validCount = 0;

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Split columns by whitespace (tabs/spaces) or commas
        const cols = line.trim().split(/[\s,]+/);
        const rawEmpId = cols[0] ? cols[0].trim() : "";
        const rawLdl = cols[1] ? cols[1].trim() : "";

        const empId = formatEmpId(rawEmpId);
        const ldlFinal = parseFloat(rawLdl);

        let statusText = "";
        let statusClass = "badge-pending"; // warning/yellow
        let name = "-";
        let department = "-";
        let ldlInitial = "-";
        let ldlDisplay = "-";
        let pctDisplay = "-";
        let isValid = false;

        const found = participants.find(p => p.empId === empId);

        if (!empId) {
            statusText = "รหัสไม่ถูกต้อง";
            statusClass = "badge-rejected";
        } else if (isNaN(ldlFinal) || ldlFinal < 0) {
            statusText = "ค่า LDL ไม่ถูกต้อง";
            statusClass = "badge-rejected";
            if (found) {
                name = `${found.name} ${found.surname}`.trim();
                department = found.department;
                ldlInitial = found.ldlInitial;
            }
        } else if (!found) {
            statusText = "ไม่พบรหัสผู้สมัครนี้";
            statusClass = "badge-rejected";
        } else {
            isValid = true;
            validCount++;
            name = `${found.name} ${found.surname}`.trim();
            department = found.department;
            ldlInitial = found.ldlInitial;
            ldlDisplay = `${ldlInitial} ➔ ${ldlFinal}`;
            
            const pct = ((ldlInitial - ldlFinal) / ldlInitial) * 100;
            pctDisplay = `${pct.toFixed(1)}%`;
            statusText = "พร้อมนำเข้า";
            statusClass = "badge-approved";
            
            parsedBulkLdlData.push({
                empId,
                ldlFinal,
                participant: found
            });
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${empId || rawEmpId || `แถวที่ ${index + 1}`}</strong></td>
            <td>${name}</td>
            <td><span class="${department !== '-' ? 'badge badge-info' : ''}">${department}</span></td>
            <td>${ldlDisplay !== '-' ? ldlDisplay : `เดิม: ${ldlInitial} | ใหม่: ${rawLdl}`}</td>
            <td><strong style="color:var(--success)">${pctDisplay}</strong></td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (lines.length > 0) {
        document.getElementById("bulk-ldl-preview-section").style.display = "block";
        document.getElementById("bulk-ldl-preview-count").innerText = `พบที่พร้อมนำเข้า ${validCount} รายการ`;
        
        if (validCount > 0) {
            const submitBtn = document.getElementById("btn-bulk-ldl-submit");
            submitBtn.style.display = "inline-flex";
            submitBtn.innerHTML = `<i class="ri-checkbox-circle-line"></i> ยืนยันบันทึกนำเข้ารวม ${validCount} คน`;
        } else {
            document.getElementById("btn-bulk-ldl-submit").style.display = "none";
        }
    }
}

function submitBulkLdlImport() {
    playSound('click');
    if (parsedBulkLdlData.length === 0) return;

    const participants = getParticipants();
    let updatedCount = 0;

    parsedBulkLdlData.forEach(item => {
        const idx = participants.findIndex(p => p.empId === item.empId);
        if (idx !== -1) {
            participants[idx].ldlFinal = item.ldlFinal;
            updatedCount++;
            // Sync each to Google Sheets
            syncToGoogleSheets('update_ldl', participants[idx]);
        }
    });

    if (updatedCount > 0) {
        setParticipants(participants);
        showAlert(`นำเข้าค่า LDL ล่าสุดของพนักงานสำเร็จรวม ${updatedCount} คน เรียบร้อยแล้วค่ะ`, "success");
        closeBulkLdlImportModal();
        renderAdminDashboard();
        renderScoreboard();
    }
}

// Bind to window for global event handlers in HTML
window.openBulkLdlImportModal = openBulkLdlImportModal;
window.closeBulkLdlImportModal = closeBulkLdlImportModal;
window.previewBulkLdlData = previewBulkLdlData;
window.submitBulkLdlImport = submitBulkLdlImport;
window.toggleRegStatusClick = toggleRegStatusClick;
window.toggleLdlAnnounceClick = toggleLdlAnnounceClick;
window.syncAllDataFromGoogleSheet = syncAllDataFromGoogleSheet;
window.closeLdlNormalModal = closeLdlNormalModal;

function validateRegistrationConsent() {
    const termsCheck = document.getElementById('reg-terms-check');
    const pdpaCheck = document.getElementById('reg-pdpa-check');
    const submitBtn = document.getElementById('reg-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !(termsCheck?.checked && pdpaCheck?.checked);
    }
}
window.validateRegistrationConsent = validateRegistrationConsent;

// Bind approval and admin functions
window.switchApprovalQueueTab = switchApprovalQueueTab;
window.setApprovalViewMode = setApprovalViewMode;
window.toggleBulkSelectAll = toggleBulkSelectAll;
window.updateBulkSelectCount = updateBulkSelectCount;
window.bulkApproveSubmissions = bulkApproveSubmissions;
window.bulkRejectSubmissions = bulkRejectSubmissions;
window.showDetailById = showDetailById;
window.approveSubmission = approveSubmission;
window.promptRejectSubmission = promptRejectSubmission;
window.addNewMockEmployee = addNewMockEmployee;
window.deleteMockEmployee = deleteMockEmployee;
window.addNewDrawRound = addNewDrawRound;
window.cancelEditDrawRound = cancelEditDrawRound;
window.saveGoogleScriptUrl = saveGoogleScriptUrl;
window.saveCampaignSettings = saveCampaignSettings;
window.checkCampaignStartStatus = checkCampaignStartStatus;
window.syncEmployeeListFromGoogleSheet = syncEmployeeListFromGoogleSheet;
window.copyCodeToClipboard = copyCodeToClipboard;
window.closeAdminPasswordModal = closeAdminPasswordModal;
window.submitAdminPassword = submitAdminPassword;
window.closeHistoryModal = closeHistoryModal;
window.closeSubDetailModal = closeSubDetailModal;
window.closeHealthyMenuModal = closeHealthyMenuModal;
window.switchMenuTab = switchMenuTab;
window.viewHistory = viewHistory;
window.editDrawRound = editDrawRound;
window.deleteDrawRound = deleteDrawRound;
window.renderAdminMenuManagerList = renderAdminMenuManagerList;
window.addNewHealthyMenu = addNewHealthyMenu;
window.deleteHealthyMenu = deleteHealthyMenu;

// Bind new dynamic survey handlers to window
window.switchSurveyManagerTab = switchSurveyManagerTab;
window.renderSurveyManagerList = renderSurveyManagerList;
window.editSurveyQuestion = editSurveyQuestion;
window.resetSurveyQuestionForm = resetSurveyQuestionForm;
window.deleteSurveyQuestion = deleteSurveyQuestion;
window.saveSurveyQuestion = saveSurveyQuestion;


// =============================================================
// Dynamic Survey & Question Manager System
// =============================================================

function renderInitialSurvey() {
    const container = document.getElementById("dynamic-initial-survey");
    if (!container) return;
    const questions = getInitialQuestions();
    
    // Group questions by section
    const sections = {
        lifestyle: { title: "1. พฤติกรรมและข้อมูลประวัติการรักษาเดิม", icon: "ri-health-book-line" },
        goal: { title: "2. เป้าหมายการปรับเปลี่ยนพฤติกรรมในโครงการนี้", icon: "ri-focus-3-line" },
        ldlTarget: { title: "3. เป้าหมายระดับไขมัน LDL ที่คุณคาดหวังเมื่อสิ้นสุดกิจกรรม", icon: "ri-bubble-chart-line" }
    };
    
    let html = "";
    
    for (const [secKey, secInfo] of Object.entries(sections)) {
        const secQuestions = questions.filter(q => q.section === secKey);
        if (secQuestions.length === 0) continue;
        
        html += `
            <div class="survey-card" style="margin-top: 16px; margin-bottom: 20px;">
                <div class="survey-card-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                    <i class="${secInfo.icon}"></i> ${secInfo.title}
                </div>
                <div class="survey-questions-list">
        `;
        
        secQuestions.forEach(q => {
            if (q.type === "boolean") {
                const yesId = `reg-q-${q.id}-yes`;
                const noId = `reg-q-${q.id}-no`;
                const name = `reg-q-${q.id}`;
                
                let changeTrigger = "";
                if (q.id === "init_3_1") {
                    changeTrigger = `onchange="handleInitialSurvey3_1Change(this.value)"`;
                }
                
                html += `
                    <div class="survey-question-item" id="item-${q.id}">
                        <div class="survey-question-text">${q.text}</div>
                        <div class="survey-options-group">
                            <label style="margin-bottom:0;">
                                <input type="radio" name="${name}" id="${yesId}" value="ใช่" class="survey-option-input" ${changeTrigger} required>
                                <span class="survey-option-btn btn-yes">ใช่</span>
                            </label>
                            <label style="margin-bottom:0;">
                                <input type="radio" name="${name}" id="${noId}" value="ไม่ใช่" class="survey-option-input" ${changeTrigger} required>
                                <span class="survey-option-btn btn-no">ไม่ใช่</span>
                            </label>
                        </div>
                    </div>
                `;
            } else if (q.type === "numeric") {
                const displayStyle = (q.dependsOn && q.showIfValue) ? "none" : "flex";
                
                html += `
                    <div class="survey-question-item" id="item-${q.id}" style="display: ${displayStyle}; flex-direction: column; align-items: flex-start; gap: 8px;">
                        <div class="survey-question-text" style="font-weight: 700;">${q.text}</div>
                        <input type="number" step="0.1" id="reg-q-${q.id}" class="form-control" placeholder="กรอกตัวเลขเป้าหมาย เช่น 100" style="max-width: 300px;">
                    </div>
                `;
            }
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

window.handleInitialSurvey3_1Change = function(value) {
    const item3_2 = document.getElementById("item-init_3_2");
    const input3_2 = document.getElementById("reg-q-init_3_2");
    if (!item3_2) return;
    if (value === "ไม่ใช่") {
        item3_2.style.display = "flex";
        if (input3_2) {
            input3_2.setAttribute("required", "required");
        }
    } else {
        item3_2.style.display = "none";
        if (input3_2) {
            input3_2.removeAttribute("required");
            input3_2.value = "";
        }
    }
};

function renderDailySurvey() {
    const container = document.getElementById("dynamic-daily-survey-questions");
    if (!container) return;
    const questions = getDailyQuestions();
    
    let html = "";
    questions.forEach(q => {
        if (q.type === "boolean") {
            const yesId = `sub-q-${q.id}-yes`;
            const noId = `sub-q-${q.id}-no`;
            const name = `sub-q-${q.id}`;
            html += `
                <div class="survey-question-item">
                    <div class="survey-question-text">${q.text}</div>
                    <div class="survey-options-group">
                        <label style="margin-bottom:0;">
                            <input type="radio" name="${name}" id="${yesId}" value="ใช่" class="survey-option-input">
                            <span class="survey-option-btn btn-yes">ใช่</span>
                        </label>
                        <label style="margin-bottom:0;">
                            <input type="radio" name="${name}" id="${noId}" value="ไม่ใช่" class="survey-option-input">
                            <span class="survey-option-btn btn-no">ไม่ใช่</span>
                        </label>
                    </div>
                </div>
            `;
        } else if (q.type === "numeric") {
            html += `
                <div class="survey-question-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <div class="survey-question-text" style="font-weight: 700;">${q.text}</div>
                    <input type="number" step="0.1" id="sub-q-${q.id}" class="form-control" placeholder="กรอกตัวเลขผลลัพธ์..." style="max-width: 300px;">
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function renderMedicationReminder(p) {
    const container = document.getElementById("sub-med-reminder-container");
    if (!container) return;
    
    const takesMeds = p.assessment && (p.assessment.lifestyle1 === "ใช่" || p.assessment.lifestyle2 === "ใช่" || p.assessment.init_1_1 === "ใช่" || p.assessment.init_1_2 === "ใช่");
    
    if (takesMeds) {
        container.innerHTML = `
            <div class="card" style="background: var(--danger-light); border: 2px solid var(--danger); border-radius: var(--rounded-md); padding: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm); animation: fadeIn 0.3s ease-in-out; display: flex; align-items: center; gap: 14px;">
                <i class="ri-capsule-line" style="font-size: 2.2rem; color: var(--danger); animation: shake 2s infinite;"></i>
                <div style="text-align: left;">
                    <h4 style="font-size:0.95rem; font-weight:800; color:#991b1b; margin:0;">🔔 วันนี้ท่านได้ทานยาลดไขมันแล้วหรือยังคะ?</h4>
                    <p style="font-size:0.75rem; color:#b91c1c; margin: 4px 0 0 0;">(การรับประทานยาลดไขมันตามที่แพทย์สั่งอย่างสม่ำเสมอ เป็นกุญแจสำคัญในการควบคุมระดับ LDL)</p>
                </div>
            </div>
        `;
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
}

function getPendingDrawSpins(empId) {
    const score = getParticipantScore(empId);
    const wins = getPrizesWon();
    const attempts = getDrawAttempts();
    const now = new Date();
    
    const pendingRounds = [];
    
    appSettings.drawRounds.forEach(round => {
        const roundStart = new Date(`${round.date}T${round.time}`);
        const isTimePassed = now >= roundStart;
        const isPointsReached = score >= round.milestone;
        const alreadyPlayed = attempts.some(a => a.empId === empId && (a.roundId === round.id || (a.tier === round.milestone && !a.roundId))) ||
                              wins.some(w => w.empId === empId && (w.roundId === round.id || (w.tier === round.milestone && !w.roundId)));
        
        if (isPointsReached && isTimePassed && !alreadyPlayed && round.remainingPrizes > 0) {
            pendingRounds.push(round);
        }
    });
    
    return pendingRounds;
}

function updateSubmissionDrawAlert(empId) {
    const container = document.getElementById("sub-draw-alert-container");
    if (!container) return;
    
    const pendingRounds = getPendingDrawSpins(empId);
    if (pendingRounds.length > 0) {
        const sorted = [...pendingRounds].sort((a, b) => b.milestone - a.milestone);
        const highest = sorted[0];
        
        container.innerHTML = `
            <div class="card" style="background:rgba(239,68,68,0.08); border:2px dashed #ef4444; border-radius:var(--rounded-md); padding:16px; margin-bottom:20px; box-shadow:var(--shadow-sm); animation:fadeIn 0.3s ease-in-out; display:flex; align-items:center; gap:14px;">
                <i class="ri-gift-fill" style="font-size:2.2rem; color:#ef4444; animation: vibrantPulse 2s infinite;"></i>
                <div style="text-align:left;">
                    <h4 style="font-size:0.95rem; font-weight:800; color:#991b1b; margin:0;">🎉 พิเศษ! คุณมีสิทธิ์หมุนวงล้อลุ้นรางวัล</h4>
                    <p style="font-size:0.75rem; color:#b91c1c; margin:4px 0 0 0;">
                        คุณมีสิทธิ์หมุนวงล้อลุ้นรางวัลสำหรับเกณฑ์สะสมครบ <strong>${highest.milestone} คะแนน</strong> ที่ยังไม่ได้ใช้ร่วมสนุก สามารถสลับไปที่แท็บ <strong>"4. วงล้อสุ่มของรางวัล"</strong> ทางด้านซ้ายเพื่อหมุนลุ้นรางวัลได้เลยค่ะ!
                    </p>
                </div>
            </div>
        `;
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
}

function renderAdminSurveyOverview() {
    const container = document.getElementById("admin-survey-overview-stats");
    if (!container) return;
    
    const participants = getParticipants();
    const total = participants.length;
    
    if (total === 0) {
        container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted);">ยังไม่มีข้อมูลผู้ลงทะเบียนเพื่อทำการประมวลผลสรุปภาพรวม</div>`;
        return;
    }
    
    const initialQuestions = getInitialQuestions();
    
    let html = `
        <table class="premium-table" style="font-size:0.85rem; width:100%;">
            <thead>
                <tr>
                    <th>คำถามประเมินแรกเข้า</th>
                    <th style="width:120px; text-align:center;">ตอบใช่ (คน)</th>
                    <th style="width:120px; text-align:center;">คิดเป็นร้อยละ</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    initialQuestions.forEach(q => {
        if (q.type === "boolean") {
            let yesCount = 0;
            participants.forEach(p => {
                if (p.assessment) {
                    const val = p.assessment[q.id] || p.assessment[q.originalKey];
                    if (val === "ใช่") {
                        yesCount++;
                    }
                }
            });
            
            const percent = ((yesCount / total) * 100).toFixed(1);
            
            html += `
                <tr>
                    <td><strong>${q.text}</strong></td>
                    <td style="text-align:center; font-weight:700;">${yesCount} / ${total}</td>
                    <td style="text-align:center;">
                        <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                            <span style="font-weight:700; color:var(--primary-dark);">${percent}%</span>
                            <div style="width:60px; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; flex-shrink:0;">
                                <div style="width:${percent}%; height:100%; background:var(--primary-gradient);"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        } else if (q.type === "numeric") {
            let sum = 0;
            let count = 0;
            participants.forEach(p => {
                if (p.assessment) {
                    const val = p.assessment[q.id] || p.assessment[q.originalKey];
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > 0) {
                        sum += num;
                        count++;
                    }
                }
            });
            
            const avg = count > 0 ? (sum / count).toFixed(1) : "-";
            
            html += `
                <tr>
                    <td><strong>${q.text} (ค่าเฉลี่ยเฉพาะผู้ที่กรอก)</strong></td>
                    <td style="text-align:center; font-weight:700;">${count} คน</td>
                    <td style="text-align:center; font-weight:700; color:var(--secondary);">${avg} mg/dL</td>
                </tr>
            `;
        }
    });
    
    html += `
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

let currentSurveyManagerTab = "initial";

function switchSurveyManagerTab(tab) {
    playSound('click');
    currentSurveyManagerTab = tab;
    
    const btnInit = document.getElementById("btn-survey-initial");
    const btnDaily = document.getElementById("btn-survey-daily");
    
    if (tab === "initial") {
        btnInit.classList.add("btn-primary");
        btnInit.style.background = "";
        btnInit.style.color = "";
        
        btnDaily.classList.remove("btn-primary");
        btnDaily.style.background = "none";
        btnDaily.style.color = "var(--text-muted)";
        
        document.getElementById("survey-q-section-group").style.display = "block";
        document.getElementById("survey-q-negative-group").style.display = "none";
    } else {
        btnDaily.classList.add("btn-primary");
        btnDaily.style.background = "";
        btnDaily.style.color = "";
        
        btnInit.classList.remove("btn-primary");
        btnInit.style.background = "none";
        btnInit.style.color = "var(--text-muted)";
        
        document.getElementById("survey-q-section-group").style.display = "none";
        document.getElementById("survey-q-negative-group").style.display = "flex";
    }
    
    resetSurveyQuestionForm();
    renderSurveyManagerList();
}

function renderSurveyManagerList() {
    const tbody = document.getElementById("survey-questions-list-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const questions = currentSurveyManagerTab === "initial" ? getInitialQuestions() : getDailyQuestions();
    
    if (questions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">ไม่มีรายการคำถาม</td></tr>`;
        return;
    }
    
    questions.forEach(q => {
        const tr = document.createElement("tr");
        
        const textTd = document.createElement("td");
        textTd.innerText = q.text;
        
        const typeTd = document.createElement("td");
        typeTd.innerText = q.type === "boolean" ? "ใช่/ไม่ใช่" : "ระบุตัวเลข";
        
        const actionTd = document.createElement("td");
        actionTd.style.textAlign = "center";
        actionTd.innerHTML = `
            <div style="display:flex; justify-content:center; gap:6px;">
                <button type="button" class="btn btn-sm btn-secondary" onclick="editSurveyQuestion('${q.id}')" style="padding:4px 8px; font-size:0.7rem;"><i class="ri-edit-line"></i></button>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteSurveyQuestion('${q.id}')" style="padding:4px 8px; font-size:0.7rem;"><i class="ri-delete-bin-line"></i></button>
            </div>
        `;
        
        tr.appendChild(textTd);
        tr.appendChild(typeTd);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
    });
}

function editSurveyQuestion(id) {
    playSound('click');
    const questions = currentSurveyManagerTab === "initial" ? getInitialQuestions() : getDailyQuestions();
    const q = questions.find(item => item.id === id);
    if (!q) return;
    
    document.getElementById("survey-q-edit-id").value = q.id;
    document.getElementById("survey-q-text").value = q.text;
    document.getElementById("survey-q-type").value = q.type;
    
    if (currentSurveyManagerTab === "initial") {
        document.getElementById("survey-q-section").value = q.section || "lifestyle";
    } else {
        document.getElementById("survey-q-negative").checked = !!q.isNegative;
    }
    
    document.getElementById("survey-form-title").innerHTML = `<i class="ri-edit-circle-line" style="color:var(--warning);"></i> แก้ไขคำถาม`;
    document.getElementById("btn-cancel-survey-q").style.display = "inline-block";
}

function resetSurveyQuestionForm() {
    document.getElementById("survey-q-edit-id").value = "";
    document.getElementById("survey-q-text").value = "";
    document.getElementById("survey-q-type").value = "boolean";
    document.getElementById("survey-q-section").value = "lifestyle";
    document.getElementById("survey-q-negative").checked = false;
    document.getElementById("survey-form-title").innerHTML = `<i class="ri-add-circle-line" style="color:var(--primary);"></i> เพิ่มคำถามใหม่`;
    document.getElementById("btn-cancel-survey-q").style.display = "none";
}

function deleteSurveyQuestion(id) {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบคำถามนี้? การลบคำถามอาจส่งผลต่อการตอบแบบสอบถามของผู้สมัครใหม่")) return;
    playSound('click');
    
    if (currentSurveyManagerTab === "initial") {
        const questions = getInitialQuestions();
        const filtered = questions.filter(q => q.id !== id);
        setInitialQuestions(filtered);
    } else {
        const questions = getDailyQuestions();
        const filtered = questions.filter(q => q.id !== id);
        setDailyQuestions(filtered);
    }
    
    renderSurveyManagerList();
    renderInitialSurvey();
    renderDailySurvey();
    if (sessionStorage.getItem("bc_admin_auth")) {
        renderAdminSurveyOverview();
    }
}

function saveSurveyQuestion() {
    playSound('click');
    const text = document.getElementById("survey-q-text").value.trim();
    const type = document.getElementById("survey-q-type").value;
    const editId = document.getElementById("survey-q-edit-id").value;
    
    if (!text) {
        alert("กรุณากรอกข้อความคำถาม");
        return;
    }
    
    if (currentSurveyManagerTab === "initial") {
        const section = document.getElementById("survey-q-section").value;
        let questions = getInitialQuestions();
        
        if (editId) {
            questions = questions.map(q => {
                if (q.id === editId) {
                    return { ...q, text, type, section };
                }
                return q;
            });
        } else {
            const newId = "init_custom_" + Date.now();
            questions.push({ id: newId, section, text, type });
        }
        setInitialQuestions(questions);
    } else {
        const isNegative = document.getElementById("survey-q-negative").checked;
        let questions = getDailyQuestions();
        
        if (editId) {
            questions = questions.map(q => {
                if (q.id === editId) {
                    return { ...q, text, type, isNegative };
                }
                return q;
            });
        } else {
            const newId = "daily_custom_" + Date.now();
            questions.push({ id: newId, text, type, isNegative });
        }
        setDailyQuestions(questions);
    }
    
    resetSurveyQuestionForm();
    renderSurveyManagerList();
    renderInitialSurvey();
    renderDailySurvey();
    if (sessionStorage.getItem("bc_admin_auth")) {
        renderAdminSurveyOverview();
    }
    showAlert("บันทึกคำถามแบบประเมินสำเร็จแล้วค่ะ", "success");
}




