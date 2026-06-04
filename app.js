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
    { empId: "01001", name: "สมชาย", surname: "รักดี", department: "IT" },
    { empId: "01002", name: "สมหญิง", surname: "เรียนเก่ง", department: "HR" },
    { empId: "01003", name: "วันชัย", surname: "มีสุข", department: "บัญชี" },
    { empId: "01004", name: "สุรชัย", surname: "ใฝ่รู้", department: "การตลาด" },
    { empId: "01005", name: "นารี", surname: "อ่อนหวาน", department: "จัดซื้อ" },
    { empId: "01006", name: "ประสิทธิ์", surname: "อดทน", department: "คลังสินค้า" },
    { empId: "01007", name: "เกศรา", surname: "รุ่งเรือง", department: "ผลิต" },
    { empId: "01008", name: "ชลิตา", surname: "น่ารัก", department: "ขาย" },
    { empId: "01009", name: "พีระพัฒน์", surname: "ก้าวหน้า", department: "วิศวกรรม" },
    { empId: "01010", name: "อภิสิทธิ์", surname: "ว่องไว", department: "คลังสินค้า" }
];

// Load settings or set defaults
let appSettings = JSON.parse(localStorage.getItem('bc_settings')) || {
    isRegOpen: true,
    drawDate_15: "2026-06-10",
    drawDate_30: "2026-06-25",
    drawDate_45: "2026-07-10",
    drawDate_60: "2026-07-25",
    maxPrizesPerDraw: 3,
    remainingPrizes: 3,
    syncSheetUrl: "https://docs.google.com/spreadsheets/d/1CDz9odSBT9gW6EmGJpxSFseEMtp0y3Oe8ZGY86q6C3w/edit?gid=0#gid=0"
};

// Check if Mock Database exists
if (!localStorage.getItem('bc_mock_employees')) {
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
            empId: emp.empId ? String(emp.empId).trim() : "",
            name: name,
            surname: surname,
            department: department
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
        return {
            ...p,
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

function saveSettings() {
    localStorage.setItem('bc_settings', JSON.stringify(appSettings));
}

// Format employee ID with leading zeroes (e.g. 123 -> "0123" or similar)
function formatEmpId(val) {
    if (!val) return "";
    let clean = val.replace(/\D/g, "");
    if (clean.length > 0 && !clean.startsWith("0")) {
        clean = "0" + clean;
    }
    return clean;
}

// Helper to calculate score (approved submissions count)
function getParticipantScore(empId) {
    const subs = getSubmissions();
    return subs.filter(s => s.empId === empId && s.status === 'approved').length;
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
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupNavigation();
    setupTheme();
    setupRegistrationPage();
    setupSubmissionPage();
    setupScoreboardPage();
    setupLuckyDrawPage();
    setupAdminPage();
});

function initApp() {
    // Inject custom meta values if needed
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
// Page 1: Registration Page Logic
// -------------------------------------------------------------
let regBase64Img = "";

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
            } else {
                regName.value = "";
                regDept.value = "";
                regName.disabled = true;
                regDept.disabled = true;
                regName.placeholder = "ไม่พบรายชื่อในระบบ (กรุณาลงทะเบียนผ่าน Google Sheet)";
                regDept.placeholder = "กรุณาติดต่อ HR";
                regName.style.borderColor = "var(--danger)";
                regDept.style.borderColor = "var(--danger)";
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
            const reader = new FileReader();
            reader.onload = (event) => {
                regBase64Img = event.target.result;
                previewImg.src = regBase64Img;
                previewDiv.style.display = "block";
                fileWrapper.style.display = "none";
            };
            reader.readAsDataURL(file);
        }
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
        const ldlInitial = parseFloat(regLdl.value);
        const shift = document.getElementById("reg-shift").value;

        if (!empId || !nameAndSurname || !ldlInitial || !phone || !shift) {
            showAlert("กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนส่งใบสมัคร", "error");
            return;
        }

        if (!regBase64Img) {
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
            regDate: new Date().toISOString()
        };

        participants.push(newParticipant);
        setParticipants(participants);

        showAlert("ลงทะเบียนสมัครเข้าร่วมกิจกรรมสำเร็จ! ยินดีต้อนรับสู่ภารกิจเปลี่ยนนิสัย 60 วันค่ะ 🎉", "success");
        regForm.reset();
        regName.disabled = true;
        regDept.disabled = true;
        regName.placeholder = "ชื่อจะแสดงขึ้นโดยอัตโนมัติเมื่อรหัสถูกต้อง";
        regDept.placeholder = "แผนกจะแสดงขึ้นโดยอัตโนมัติ";
        regName.style.borderColor = "";
        regDept.style.borderColor = "";
        previewDiv.style.display = "none";
        fileWrapper.style.display = "block";
        regBase64Img = "";
        
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
            } else {
                subName.value = "";
                subDept.value = "";
                subName.style.borderColor = "";
                subDept.style.borderColor = "";
            }
        } else {
            subName.value = "";
            subDept.value = "";
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
            const reader = new FileReader();
            reader.onload = (event) => {
                subBase64Img = event.target.result;
                previewImg.src = subBase64Img;
                previewDiv.style.display = "block";
                fileWrapper.style.display = "none";
            };
            reader.readAsDataURL(file);
        }
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

        if (!empId || !subName.value) {
            showAlert("กรุณากรอกรหัสพนักงานที่ลงทะเบียนร่วมกิจกรรมแล้ว", "error");
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

        const newSubmission = {
            id: 'sub_' + Math.random().toString(36).substr(2, 9),
            empId,
            date: selectedDate,
            image: subBase64Img,
            status: 'pending',
            comments: '',
            submittedAt: new Date().toISOString()
        };

        submissions.push(newSubmission);
        setSubmissions(submissions);

        showAlert("ส่งภาพเมนูอาหารเรียบร้อยแล้ว! แอดมินจะดำเนินการตรวจสอบภาพเพื่ออนุมัติคะแนนของคุณค่ะ 🥗", "success");
        
        subForm.reset();
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

        // Calculate LDL reduction
        let ldlReduction = 0;
        if (p.ldlInitial !== null && p.ldlFinal !== null) {
            ldlReduction = p.ldlInitial - p.ldlFinal;
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
                    เดิม: ${p.ldlInitial} ➔ ใหม่: ${p.ldlFinal}
                </div>
            </td>
            <td>
                <strong style="color:var(--success)">ลดลง ${p.ldlReduction.toFixed(1)} mg/dL</strong>
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
    viewHistory(formatted);
}

function viewHistory(empId) {
    const participants = getParticipants();
    const p = participants.find(part => part.empId === empId);
    if (!p) return;

    const modal = document.getElementById("history-modal");
    document.getElementById("hist-modal-title").innerText = `ประวัติกิจกรรม: ${`${p.name} ${p.surname}`.trim()} (${p.empId})`;
    
    const statsContainer = document.getElementById("hist-stats");
    const score = getParticipantScore(p.empId);
    const consecutive = checkConsecutiveDays(p.empId);
    
    // Check if the user qualifies for the upcoming lucky draw
    let drawAlertHtml = "";
    const nextMilestones = [15, 30, 45, 60];
    const nextTarget = nextMilestones.find(m => score === m - 1);
    if (nextTarget) {
        drawAlertHtml = `
            <div class="lucky-draw-alert" style="margin-top:12px; margin-bottom:0;">
                <i class="ri-alarm-warning-line" style="font-size:1.3rem;"></i>
                <div>ท่านมีสิทธิหมุนกงล้อลุ้นรางวัลในวันพรุ่งนี้หากส่งภาพเมนูอาหารครบ ${nextTarget} คะแนน!</div>
            </div>
        `;
    }

    statsContainer.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="card" style="padding:16px; text-align:center; margin-bottom:0;">
                <div style="font-size:1.8rem; font-weight:800; color:var(--primary);">${score}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">คะแนนสะสม (วัน)</div>
            </div>
            <div class="card" style="padding:16px; text-align:center; margin-bottom:0;">
                <div style="font-size:1.8rem; font-weight:800; color:var(--secondary);">${consecutive}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">ส่งติดต่อกันสูงสุด (วัน)</div>
            </div>
        </div>
        ${drawAlertHtml}
    `;

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

    const subs = getSubmissions().filter(s => s.empId === empId);

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
        const campaignStartDate = new Date("2026-06-01");
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

    modal.classList.add("active");
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
const segments = [
    { label: "กระเป๋าเป้สุขภาพ", color: "#10b981", isPrize: true, prizeIndex: 0 },
    { label: "หมวกแก๊ปออกกำลังกาย", color: "#f59e0b", isPrize: true, prizeIndex: 1 },
    { label: "แก้วน้ำเกลือแร่อย่างดี", color: "#3b82f6", isPrize: true, prizeIndex: 2 },
    { label: "เกือบได้รางวัล! สู้ต่อไป", color: "#64748b", isPrize: false, prizeIndex: -1 },
    { label: "กระเป๋าเป้สุขภาพ", color: "#10b981", isPrize: true, prizeIndex: 0 },
    { label: "หมวกแก๊ปออกกำลังกาย", color: "#f59e0b", isPrize: true, prizeIndex: 1 },
    { label: "แก้วน้ำเกลือแร่อย่างดี", color: "#3b82f6", isPrize: true, prizeIndex: 2 },
    { label: "ส่งกำลังใจให้สุขภาพดี", color: "#64748b", isPrize: false, prizeIndex: -1 }
];

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

    const anglePerSeg = (2 * Math.PI) / segments.length;

    segments.forEach((seg, i) => {
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

    const score = getParticipantScore(formatted);
    const wins = getPrizesWon();

    // Determine current milestone reached
    // Milestones: 15, 30, 45, 60
    const scoreMilestones = [15, 30, 45, 60];
    const reachedMilestones = scoreMilestones.filter(m => score >= m);

    if (reachedMilestones.length === 0) {
        showAlert(`พนักงาน ${p.name} ${p.surname} ปัจจุบันมีคะแนนสะสม ${score} คะแนน (ยังไม่ถึงเกณฑ์ขั้นต่ำ 15 คะแนนในการลุ้นรางวัล)`, "error");
        return;
    }

    // Check draws that admin scheduled
    const todayStr = formatDateString(new Date());
    
    // Find eligible draws that are available and on/after scheduled date
    // Check if user has already won in each milestone they reached
    let eligibleMilestone = null;

    for (let milestone of reachedMilestones) {
        // Check draw date scheduled by admin
        const scheduledDate = appSettings[`drawDate_${milestone}`];
        if (todayStr < scheduledDate) {
            // Reached milestone score but date hasn't arrived
            continue;
        }

        // Check if user already drew a prize for this specific milestone
        const alreadyWon = wins.some(w => w.empId === formatted && w.tier === milestone);
        if (!alreadyWon) {
            eligibleMilestone = milestone;
            break; // Stop at first eligible
        }
    }

    if (!eligibleMilestone) {
        // Provide contextual error message
        const nextMilestone = scoreMilestones.find(m => score < m);
        let msg = `พนักงาน ${p.name} ไม่มีสิทธิ์ในการสุ่มจับรางวัล ณ วันนี้\n`;
        
        // Explain why
        const drewAll = reachedMilestones.every(m => wins.some(w => w.empId === formatted && w.tier === m));
        if (drewAll) {
            msg += `(คุณได้ใช้สิทธิ์สุ่มของรางวัลสำหรับทุกเกณฑ์ที่ทำคะแนนถึงไปหมดแล้ว)`;
        } else {
            msg += `(ยังไม่ถึงวันสุ่มรางวัลที่แอดมินกำหนดในระบบ หรือ คะแนนของคุณยังไม่ผ่านช่วงจับรางวัล)`;
        }

        showAlert(msg, "error");
        return;
    }

    // Check if prizes are available
    if (appSettings.remainingPrizes <= 0) {
        showAlert(`ขออภัย! ของรางวัลสำหรับการจับรางวัล ณ ขณะนี้ ได้แจกจนหมดครบ 3 ชิ้นแล้ว ปุ่มสปินถูกระงับชั่วคราว`, "error");
        return;
    }

    // Qualifies! Open active wheel overlay
    showActiveWheelOverlay(p, eligibleMilestone);
}

function showActiveWheelOverlay(user, milestone) {
    const playArea = document.getElementById("wheel-play-area");
    const statusText = document.getElementById("wheel-status-text");
    const spinBtn = document.getElementById("spin-button");

    statusText.innerHTML = `
        <div style="font-size:1.1rem; font-weight:700; color:var(--primary);">ยินดีด้วยค่ะคุณ ${user.name}! 🎉</div>
        <div style="font-size:0.9rem; color:var(--text-muted); margin-top:4px;">
            คุณได้รับสิทธิ์ลุ้นของรางวัลสำหรับเกณฑ์สะสมครบ <strong style="color:var(--secondary);">${milestone} คะแนน</strong>
        </div>
    `;

    spinBtn.style.display = "inline-flex";
    spinBtn.onclick = () => {
        spinTheWheel(user, milestone);
    };

    playArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function spinTheWheel(user, milestone) {
    if (isSpinning) return;
    isSpinning = true;
    playSound('click');

    const spinBtn = document.getElementById("spin-button");
    spinBtn.disabled = true;

    const canvas = document.getElementById("wheel-canvas");
    let currentRotation = 0;
    
    // Choose winning index
    // To ensure fair play but guarantee they don't get the same prize if finished or limit prizes,
    // let's choose a winning segment:
    // If we want them to win a prize (indices 0, 1, 2) or thank you (index 3).
    // Let's do a weighted random: 70% chance to win an available prize, 30% chance of "try again".
    let winSegIndex = 3; // Default thank you
    
    if (appSettings.remainingPrizes > 0 && Math.random() < 0.7) {
        // Choose among available prizes
        const activePrizeIndices = [0, 1, 2, 4, 5, 6];
        winSegIndex = activePrizeIndices[Math.floor(Math.random() * activePrizeIndices.length)];
    }

    const anglePerSeg = 360 / segments.length;
    // Calculate exact degrees to center of winning segment
    const stopAngle = 360 - (winSegIndex * anglePerSeg + anglePerSeg / 2);
    // Add multiple spins for visual thrill
    const totalRotation = 360 * 5 + stopAngle;

    let startTime = null;
    const duration = 5000; // 5 seconds spin

    function animateWheel(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        
        // Easing function: Cubic Out
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const t = Math.min(progress / duration, 1);
        
        const rotation = easeOutCubic(t) * totalRotation;
        canvas.style.transform = `rotate(${rotation}deg)`;

        // Sound effect on segment pass
        const currentSeg = Math.floor((rotation % 360) / anglePerSeg);
        if (window.lastSegSound !== currentSeg && progress < duration - 1000) {
            playSound('tick');
            window.lastSegSound = currentSeg;
        }

        if (progress < duration) {
            requestAnimationFrame(animateWheel);
        } else {
            // Spin Finished!
            isSpinning = false;
            triggerSpinResult(user, milestone, segments[winSegIndex]);
        }
    }

    requestAnimationFrame(animateWheel);
}

function triggerSpinResult(user, milestone, segment) {
    const spinBtn = document.getElementById("spin-button");
    const statusText = document.getElementById("wheel-status-text");

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
            tier: milestone,
            prize: segment.label,
            wonAt: new Date().toISOString()
        };
        wins.push(newWin);
        setPrizesWon(wins);

        // Deduct prize
        appSettings.remainingPrizes = Math.max(0, appSettings.remainingPrizes - 1);
        saveSettings();

        // Success Alert overlay
        showAlert(`ยินดีด้วยอย่างยิ่ง! คุณหมุนวงล้อได้รับรางวัล [${segment.label}] เรียบร้อยแล้วค่ะ! 🎁`, "success");

        statusText.innerHTML = `
            <div style="font-size:1.2rem; font-weight:800; color:var(--success);">ยินดีด้วยกับชัยชนะ! 🎁</div>
            <div style="font-weight:700; margin-top:6px;">คุณได้รับ: ${segment.label}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">แคปหน้าจอหน้านี้ไว้เป็นหลักฐานรับรางวัลกับฝ่ายบุคคล (HR) นะคะ</div>
        `;
    } else {
        showAlert("เฉียดไปนิดเดียว! สู้ต่อไปนะคะ ส่งรูปภาพเมนูสุขภาพเพิ่มโอกาสวันถัดไปค่ะ 🥗", "error");
        statusText.innerHTML = `
            <div style="font-size:1.1rem; font-weight:700; color:var(--text-muted);">เสียใจด้วยนะคะ รอบนี้ยังไม่ได้ของรางวัล</div>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">สู้ต่อไป ส่งภาพควบคุมอาหารทุกวันให้สุขภาพดีขึ้นเป็นรางวัลที่แท้จริงค่ะ!</div>
        `;
    }

    spinBtn.style.display = "none";
    
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
    // Clear and redraw wheel
    drawCanvasWheel();
    document.getElementById("draw-emp-id").value = "";
    document.getElementById("wheel-play-area").style.display = "block";
    document.getElementById("wheel-status-text").innerText = "กรอกรหัสพนักงานด้านบน เพื่อเช็กสิทธิ์และหมุนกงล้อลุ้นของรางวัล";
    document.getElementById("spin-button").style.display = "none";
    
    // Highlight list of recent prize winners
    const wins = getPrizesWon();
    const listBody = document.getElementById("recent-winners-list");
    
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
    // Save Admin Settings Toggles
    const openRegToggle = document.getElementById("admin-toggle-reg");
    openRegToggle.checked = appSettings.isRegOpen;

    openRegToggle.addEventListener("change", (e) => {
        playSound('click');
        appSettings.isRegOpen = e.target.checked;
        saveSettings();
        checkRegistrationState();
        showAlert(appSettings.isRegOpen ? "เปิดระบบลงทะเบียนเข้าร่วมกิจกรรมเรียบร้อย" : "ปิดระบบลงทะเบียนเรียบร้อยแล้ว ป้องกันการสมัครล่าช้า", "success");
    });

    // Save Draw settings
    const saveDrawBtn = document.getElementById("admin-save-draw-btn");
    saveDrawBtn.addEventListener("click", () => {
        playSound('click');
        appSettings.drawDate_15 = document.getElementById("adm-date-15").value;
        appSettings.drawDate_30 = document.getElementById("adm-date-30").value;
        appSettings.drawDate_45 = document.getElementById("adm-date-45").value;
        appSettings.drawDate_60 = document.getElementById("adm-date-60").value;
        
        const countInput = document.getElementById("adm-prizes-count").value;
        appSettings.maxPrizesPerDraw = parseInt(countInput);
        appSettings.remainingPrizes = parseInt(countInput);
        
        saveSettings();
        showAlert("บันทึกการตั้งค่ากำหนดการจับรางวัลและจำนวนของรางวัลเรียบร้อย", "success");
        renderAdminDashboard();
    });

    // Populate Draw settings values
    document.getElementById("adm-date-15").value = appSettings.drawDate_15;
    document.getElementById("adm-date-30").value = appSettings.drawDate_30;
    document.getElementById("adm-date-45").value = appSettings.drawDate_45;
    document.getElementById("adm-date-60").value = appSettings.drawDate_60;
    document.getElementById("adm-prizes-count").value = appSettings.maxPrizesPerDraw;

    // Filter Department Breakdown
    const filterDept = document.getElementById("adm-filter-dept");
    filterDept.addEventListener("change", () => {
        playSound('click');
    });

    // Populate Sync URL
    const savedUrl = localStorage.getItem('bc_sync_script_url') || "";
    const syncUrlInput = document.getElementById("adm-sync-url");
    if (syncUrlInput) {
        syncUrlInput.value = savedUrl;
    }
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
    document.getElementById("adm-stat-prizes").innerText = `${appSettings.remainingPrizes} / ${appSettings.maxPrizesPerDraw} รางวัล`;

    // 2. Render Pending Submissions list for approval
    renderAdminApprovalList();

    // 3. Render Department statistics
    renderAdminDepartmentStats();

    // 4. Render Pie Charts
    renderAdminPieCharts();

    // 5. Render Admin mock database manager
    renderAdminMockDbManager();

    // 6. Populate Google sheet script copy container
    populateGoogleSheetScriptCode();
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

function renderAdminApprovalList() {
    const subs = getSubmissions();
    const pendingSubs = subs.filter(s => s.status === 'pending').sort((a,b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    const container = document.getElementById("adm-pending-list");
    const participants = getParticipants();

    if (pendingSubs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">
                <i class="ri-checkbox-circle-line" style="font-size:2.5rem; color:var(--primary); display:block; margin-bottom:8px;"></i>
                ไม่มีการจัดส่งภาพผลลัพธ์ค้างการอนุมัติในระบบ ณ ขณะนี้
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    pendingSubs.forEach(sub => {
        const p = participants.find(part => part.empId === sub.empId) || { name: "ไม่พบชื่อพนักงาน", surname: "", department: "ไม่ระบุ" };

        const card = document.createElement("div");
        card.className = "card approval-card";
        card.innerHTML = `
            <div class="approval-card-img">
                <img src="${sub.image}" alt="Meal Evidence">
                <span class="approval-card-tag">${sub.date}</span>
            </div>
            <div class="approval-card-body">
                <div class="approval-user-info">
                    <span class="approval-user-name">${`${p.name} ${p.surname}`.trim()}</span>
                    <span class="approval-user-meta">รหัส: <strong>${sub.empId}</strong> | แผนก: ${p.department}</span>
                    <span class="approval-user-meta">จัดส่งเมื่อ: ${new Date(sub.submittedAt).toLocaleString('th-TH')}</span>
                </div>
                <div class="approval-actions">
                    <button class="btn btn-primary" onclick="approveSubmission('${sub.id}')">
                        <i class="ri-check-line"></i> อนุมัติ
                    </button>
                    <button class="btn btn-danger" onclick="promptRejectSubmission('${sub.id}')">
                        <i class="ri-close-line"></i> ปฏิเสธ
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function approveSubmission(subId) {
    playSound('click');
    const subs = getSubmissions();
    const idx = subs.findIndex(s => s.id === subId);
    if (idx !== -1) {
        subs[idx].status = 'approved';
        subs[idx].comments = 'ภาพถ่ายถูกต้อง อนุมัติคะแนน';
        setSubmissions(subs);
        showAlert("อนุมัติผลงานและมอบคะแนนเรียบร้อยแล้วค่ะ", "success");
        renderAdminDashboard();
        
        // Sheets Sync trigger
        syncToGoogleSheets('update_status', subs[idx]);
    }
}

let activeRejectSubId = "";
function promptRejectSubmission(subId) {
    playSound('click');
    activeRejectSubId = subId;
    const modal = document.getElementById("reject-modal");
    document.getElementById("reject-comment-input").value = "";
    modal.classList.add("active");
}

function submitRejectSubmission() {
    playSound('click');
    const comment = document.getElementById("reject-comment-input").value;
    if (!comment) {
        alert("กรุณาระบุหมายเหตุหรือข้อบกพร่องที่ต้องการแจ้งพนักงาน");
        return;
    }

    const subs = getSubmissions();
    const idx = subs.findIndex(s => s.id === activeRejectSubId);
    if (idx !== -1) {
        subs[idx].status = 'rejected';
        subs[idx].comments = comment;
        setSubmissions(subs);
        
        document.getElementById("reject-modal").classList.remove("active");
        showAlert("บันทึกการปฏิเสธรูปภาพและแจ้งเตือนพนักงานเรียบร้อย", "success");
        renderAdminDashboard();
        
        // Sheets Sync trigger
        syncToGoogleSheets('update_status', subs[idx]);
    }
}

function closeRejectModal() {
    playSound('click');
    document.getElementById("reject-modal").classList.remove("active");
}

function renderAdminDepartmentStats() {
    const participants = getParticipants();
    const subs = getSubmissions();
    const tbody = document.getElementById("adm-dept-table-body");
    const selectedDept = document.getElementById("adm-filter-dept").value;

    // Aggregate by Department
    const deptStatsMap = {};

    participants.forEach(p => {
        if (selectedDept !== "all" && p.department !== selectedDept) return;

        if (!deptStatsMap[p.department]) {
            deptStatsMap[p.department] = {
                dept: p.department,
                members: 0,
                consecutive: 0,
                incomplete: 0
            };
        }

        const stat = deptStatsMap[p.department];
        stat.members++;
        
        const consecMax = checkConsecutiveDays(p.empId);
        if (consecMax >= 60) {
            stat.consecutive++;
        } else {
            stat.incomplete++;
        }
    });

    const list = Object.values(deptStatsMap);

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">ไม่มีข้อมูลสำหรับแผนกดังกล่าว</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    list.forEach(stat => {
        const percentCon = ((stat.consecutive / stat.members) * 100).toFixed(1);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${stat.dept}</strong></td>
            <td>${stat.members} คน</td>
            <td><span class="badge badge-approved">${stat.consecutive} คน (${percentCon}%)</span></td>
            <td><span class="badge badge-pending">${stat.incomplete} คน</span></td>
            <td>
                <button class="btn btn-secondary" onclick="viewDepartmentParticipants('${stat.dept}')" style="padding:4px 8px; font-size:0.8rem;">
                    ดูพนักงานทั้งหมด
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function viewDepartmentParticipants(dept) {
    playSound('click');
    const participants = getParticipants();
    const filtered = participants.filter(p => p.department === dept);
    
    let html = `<div style="max-height:400px; overflow-y:auto;"><table class="premium-table">
        <thead>
            <tr>
                <th>รหัส</th>
                <th>ชื่อ-สกุล</th>
                <th>คะแนนสะสม</th>
                <th>LDL (เริ่ม ➔ ล่าสุด)</th>
                <th>จัดการ</th>
            </tr>
        </thead>
        <tbody>`;
        
    filtered.forEach(p => {
        const score = getParticipantScore(p.empId);
        html += `
            <tr>
                <td><strong>${p.empId}</strong></td>
                <td>${p.name} ${p.surname}</td>
                <td><span class="score-badge">${score} / 60</span></td>
                <td>${p.ldlInitial} ➔ ${p.ldlFinal !== null ? p.ldlFinal : 'ยังไม่วัด'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="promptLdlUpdate('${p.empId}')" style="padding:4px 8px; font-size:0.8rem;">
                        อัปเดต LDL ท้ายโครงการ
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;

    const modal = document.getElementById("generic-modal");
    document.getElementById("generic-modal-title").innerText = `รายชื่อสมาชิก แผนก: ${dept}`;
    document.getElementById("generic-modal-body").innerHTML = html;
    modal.classList.add("active");
}

let activeLdlEmpId = "";
function promptLdlUpdate(empId) {
    playSound('click');
    activeLdlEmpId = empId;
    const participants = getParticipants();
    const p = participants.find(part => part.empId === empId);
    if (!p) return;

    document.getElementById("generic-modal").classList.remove("active");

    const modal = document.getElementById("ldl-update-modal");
    document.getElementById("ldl-update-emp-name").innerText = `${p.name} ${p.surname} (รหัสพนักงาน ${p.empId})`;
    document.getElementById("ldl-initial-display").innerText = p.ldlInitial;
    document.getElementById("ldl-final-input").value = p.ldlFinal !== null ? p.ldlFinal : "";
    modal.classList.add("active");
}

function submitLdlUpdate() {
    playSound('click');
    const finalLdl = parseFloat(document.getElementById("ldl-final-input").value);
    if (isNaN(finalLdl) || finalLdl < 0) {
        alert("กรุณาระบุค่า LDL ครั้งสุดท้ายให้ถูกต้อง");
        return;
    }

    const participants = getParticipants();
    const idx = participants.findIndex(p => p.empId === activeLdlEmpId);
    if (idx !== -1) {
        participants[idx].ldlFinal = finalLdl;
        setParticipants(participants);
        
        document.getElementById("ldl-update-modal").classList.remove("active");
        showAlert(`อัปเดตผลตรวจ LDL ครั้งสุดท้ายของพนักงาน ${activeLdlEmpId} เรียบร้อยแล้วค่ะ`, "success");
        renderAdminDashboard();
        
        // Sync to Sheets
        syncToGoogleSheets('update_ldl', participants[idx]);
    }
}

function closeLdlUpdateModal() {
    playSound('click');
    document.getElementById("ldl-update-modal").classList.remove("active");
}

function closeGenericModal() {
    playSound('click');
    document.getElementById("generic-modal").classList.remove("active");
}

// Render and manage Mock Employee Database
function renderAdminMockDbManager() {
    const listBody = document.getElementById("adm-mock-db-list");
    const employees = getMockEmployees();

    listBody.innerHTML = "";
    employees.forEach(emp => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${emp.empId}</strong></td>
            <td>${`${emp.name} ${emp.surname}`.trim()}</td>
            <td><span class="badge badge-info">${emp.department}</span></td>
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

    if (!empId || !name || !surname || !dept) {
        alert("กรุณากรอกข้อมูลจำลองพนักงานพนักงานให้ครบถ้วน");
        return;
    }
    const formatted = formatEmpId(empId);

    const employees = getMockEmployees();
    if (employees.some(e => e.empId === formatted)) {
        alert(`รหัสพนักงาน ${formatted} ซ้ำกับในฐานข้อมูลหลักแล้ว`);
        return;
    }

    employees.push({ empId: formatted, name, surname, department: dept });
    setMockEmployees(employees);

    // Reset Inputs
    document.getElementById("adm-add-emp-id").value = "";
    document.getElementById("adm-add-name").value = "";
    document.getElementById("adm-add-surname").value = "";
    document.getElementById("adm-add-dept").value = "";

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

function doGet(e) {
  var action = e.parameter.action;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "get_employees") {
    var sheet = doc.getSheetByName("Name");
    if (!sheet) {
      // สร้างแผ่นงานตัวอย่างพนักงานหากไม่มี
      sheet = doc.insertSheet("Name");
      sheet.appendRow(["รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก"]);
      sheet.appendRow(["'01001", "สมชาย รักดี", "IT"]);
      sheet.appendRow(["'01002", "สมหญิง เรียนเก่ง", "HR"]);
    }
    
    var data = sheet.getDataRange().getDisplayValues(); // ใช้ getDisplayValues เพื่อเลี่ยงเลขศูนย์หาย
    var employees = [];
    // คัดลอกพนักงานจากแผ่นงาน (เริ่มต้นที่แถวที่ 1 เพื่อข้ามหัวตาราง)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        employees.push({
          empId: String(data[i][0]).trim(),
          name: String(data[i][1]).trim(),
          surname: "", // เก็บชื่อและนามสกุลไว้ในคอลัมน์เดียว
          department: String(data[i][2]).trim() // คอลัมน์ C (index 2) คือ แผนก
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(employees))
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
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["รหัสพนักงาน", "ชื่อ", "นามสกุล", "แผนก", "เบอร์ภายใน", "ค่า LDL ตั้งต้น", "กะทำงาน", "วันที่ลงทะเบียน", "ลิงก์รูปหลักฐาน"]);
      }
      
      // บันทึกรูปภาพลง Google Drive และดึง Url
      var imgUrl = saveFileToDrive(payload.proofImage, "LDL_" + payload.empId + "_" + new Date().getTime() + ".jpg");
      
      sheet.appendRow([
        "'" + payload.empId,
        payload.name,
        payload.surname,
        payload.department,
        payload.phone,
        payload.ldlInitial,
        payload.shift,
        new Date(payload.regDate),
        imgUrl
      ]);
    }
    else if (action === "submit") {
      // 2. แผ่นงานจัดส่งผลประจำวัน
      var sheet = doc.getSheetByName("Submissions") || doc.insertSheet("Submissions");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["รหัสการจัดส่ง", "รหัสพนักงาน", "วันที่ระบุบันทึก", "สถานะ", "หมายเหตุแอดมิน", "วันเวลาจัดส่งจริง", "ลิงก์รูปอาหารเซลฟี่"]);
      }
      
      // บันทึกรูปภาพลง Google Drive และดึง Url
      var imgUrl = saveFileToDrive(payload.image, "Meal_" + payload.empId + "_" + payload.date + ".jpg");
      
      sheet.appendRow([
        payload.id,
        "'" + payload.empId,
        payload.date,
        payload.status,
        payload.comments,
        new Date(payload.submittedAt),
        imgUrl
      ]);
    }
    else if (action === "update_status") {
      // 3. อัปเดตสถานะการส่ง (อนุมัติ/ปฏิเสธ)
      var sheet = doc.getSheetByName("Submissions");
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === payload.id) { // ค้นหารหัสจัดส่ง
            sheet.getRange(i + 1, 4).setValue(payload.status); // เปลี่ยนสถานะ
            sheet.getRange(i + 1, 5).setValue(payload.comments); // เพิ่มคอมเมนต์
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
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === payload.empId) { // ค้นหาด้วยรหัสพนักงาน
            // เพิ่มหัวข้อ LDL ล่าสุดหากไม่มี
            if (data[0].length < 9) {
              sheet.getRange(1, 9).setValue("ค่า LDL ล่าสุด");
            }
            sheet.getRange(i + 1, 9).setValue(payload.ldlFinal);
            break;
          }
        }
      }
    }
    
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
