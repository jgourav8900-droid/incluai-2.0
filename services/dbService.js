// NOTE: This project uses a simple JSON file as a prototype database. Production should use MongoDB Atlas (see docs/database_strategy.md).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.INCLUAI_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, passwordHash) {
  if (typeof passwordHash !== 'string') return { valid: false, needsUpgrade: false };
  if (passwordHash.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = passwordHash.split('$');
    if (!saltHex || !hashHex || !/^[a-f\d]+$/i.test(saltHex) || !/^[a-f\d]+$/i.test(hashHex)) {
      return { valid: false, needsUpgrade: false };
    }
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return {
      valid: expected.length === actual.length && crypto.timingSafeEqual(expected, actual),
      needsUpgrade: false
    };
  }

  const legacyHash = crypto.pbkdf2Sync(password, 'incluai_default_salt_2026', 1000, 64, 'sha512');
  const storedHash = Buffer.from(passwordHash, 'hex');
  return {
    valid: storedHash.length === legacyHash.length && crypto.timingSafeEqual(storedHash, legacyHash),
    needsUpgrade: true
  };
}

// Factory: returns a fresh copy every time so callers never share mutable state
function makeDefaultDB() {
  return {
    users: process.env.NODE_ENV === 'production' ? [] : [
      {
        id: 'usr_emp_1042',
        companyId: 'COMP001',
        employeeId: 'EMP1042',
        name: 'Maya Patel',
        email: 'emp@comp001.internal',
        passwordHash: hashPassword('password123'),
        role: 'Employee',
        department: 'Engineering',
        avatar: 'MP',
        createdAt: '2026-01-15T08:00:00.000Z'
      },
      {
        id: 'usr_hr_2011',
        companyId: 'COMP001',
        employeeId: 'HR2011',
        name: 'Sarah Connor',
        email: 'hr@comp001.internal',
        passwordHash: hashPassword('password123'),
        role: 'HR_Admin',
        department: 'Human Resources',
        avatar: 'SC',
        createdAt: '2026-01-10T08:00:00.000Z'
      },
      {
        id: 'usr_adm_9001',
        companyId: 'COMP001',
        employeeId: 'ADM9001',
        name: 'David Vance',
        email: 'admin@comp001.internal',
        passwordHash: hashPassword('password123'),
        role: 'Organization_Admin',
        department: 'Executive',
        avatar: 'DV',
        createdAt: '2026-01-01T08:00:00.000Z'
      }
    ],

    documents: [
      {
        id: 'doc_leave_2026',
        companyId: 'COMP001',
        title: 'Annual Leave Policy 2026',
        category: 'HR_POLICIES',
        section: 'Section 4.2 — Paid Time Off Entitlements',
        content: 'Full-time employees receive 24 paid leaves (PTO) per calendar year, accruing at 2.0 days per month. Short leaves (1-2 days) require 24 hours advance notification. Extended leaves of 3 or more consecutive business days must be requested 5 days in advance and require departmental manager signoff. Sick leaves up to 3 days require self-certification; longer leaves require medical documentation.',
        tags: ['leave', 'pto', 'vacation', 'sick leave', 'paid time off'],
        updatedAt: '2026-01-05T10:00:00.000Z'
      },
      {
        id: 'doc_wfh_2026',
        companyId: 'COMP001',
        title: 'Hybrid Remote Work Policy 2026',
        category: 'OPERATIONS',
        section: 'Section 2.1 — Flexible Working Guidelines',
        content: 'INCLUAI operates on an approved hybrid structure. Core synchronous collaboration hours are 10:00 AM to 4:00 PM local time. Full-time team members may work remotely up to 3 business days per week upon coordination with their team lead. An annual ergonomic home-office stipend of $500 is claimable via the HR Benefits portal under the Accessibility Benefit.',
        tags: ['wfh', 'remote', 'flexible hours', 'hybrid', 'home office'],
        updatedAt: '2026-01-08T10:00:00.000Z'
      },
      {
        id: 'doc_parental_2026',
        companyId: 'COMP001',
        title: 'Parental & Family Care Leave Policy 2026',
        category: 'HR_POLICIES',
        section: 'Section 5.1 — Parental Support Standards',
        content: 'All eligible employees are entitled to 16 weeks of fully paid parental leave following the birth, adoption, or foster placement of a child. Additional flexible part-time return schedules can be requested through HR with departmental manager coordination. Lactation suites and family care assistance are provided at all company premises.',
        tags: ['parental', 'maternity', 'paternity', 'child', 'family care', 'leave'],
        updatedAt: '2026-01-10T10:00:00.000Z'
      },
      {
        id: 'doc_inclusion_charter',
        companyId: 'COMP001',
        title: 'Workplace Inclusion & Safe Reporting Charter',
        category: 'INCLUSION_AND_ETHICS',
        section: 'Section 1.0 — Confidentiality & Anti-Retaliation',
        content: "Our organization guarantees zero tolerance for discrimination, harassment, or accessibility impediments. Employees may submit reports anonymously. When 'Anonymous' is selected, the server eliminates the user's ID, employee number, IP address, and session tokens from the stored incident log. The report is assigned a tracking hash and routed exclusively to designated HR Ethics personnel for resolution.",
        tags: ['inclusion', 'accessibility', 'reporting', 'anonymous', 'ethics', 'anti-retaliation'],
        updatedAt: '2026-01-12T10:00:00.000Z'
      }
    ],

    reports: [
      {
        id: 'REP-2026-0418',
        companyId: 'COMP001',
        title: 'Screen reader incompatibility on benefits portal',
        category: 'Accessibility Barrier',
        description: 'Screen reader incompatibility on HR benefits claim portal. Missing ARIA labels on the expense submission modal buttons.',
        department: 'Intranet & Document Portal',
        isAnonymous: true,
        submitterId: null,
        submitterName: 'Anonymous Employee',
        status: 'Under Review',
        assignedTo: 'Sarah Connor (HR)',
        internalNotes: [
          { author: 'Sarah Connor', note: 'Notified frontend engineering team to add ARIA accessibility attributes.', timestamp: '2026-10-22T10:00:00.000Z' }
        ],
        createdAt: '2026-10-21T09:30:00.000Z'
      },
      {
        id: 'REP-2026-0392',
        companyId: 'COMP001',
        title: 'Wheelchair ramp and standing desk for Room B',
        category: 'Inclusion Suggestion',
        description: 'Ergonomic standing desk & wheelchair accessible ramp needed for Conference Room B.',
        department: 'Facilities & Real Estate',
        isAnonymous: false,
        submitterId: 'usr_emp_1042',
        submitterName: 'Maya Patel',
        status: 'Resolved',
        assignedTo: 'Facilities Management',
        internalNotes: [
          { author: 'Facilities Management', note: 'Contractor installed non-slip ramp and height-adjustable table.', timestamp: '2026-10-18T14:00:00.000Z' }
        ],
        createdAt: '2026-10-15T14:15:00.000Z'
      },
      {
        id: 'REP-2026-0504',
        companyId: 'COMP001',
        title: 'Meeting transcripts required for weekly sprint syncs',
        category: 'Accessibility Barrier',
        description: 'Hearing impaired team members request automatic live captioning and transcripts enabled by default for all sprint engineering reviews.',
        department: 'Engineering',
        isAnonymous: true,
        submitterId: null,
        submitterName: 'Anonymous Employee',
        status: 'Action Required',
        assignedTo: 'Sarah Connor (HR)',
        internalNotes: [
          { author: 'Sarah Connor', note: 'Enabling automated live captions across corporate Zoom/Meet accounts.', timestamp: '2026-10-24T11:00:00.000Z' }
        ],
        createdAt: '2026-10-23T16:00:00.000Z'
      }
    ],

    tasks: [
      {
        id: 'tsk_101',
        companyId: 'COMP001',
        userId: 'usr_emp_1042',
        creatorName: 'Sarah Connor',
        title: 'Complete Q4 Workplace Accessibility Self-Assessment',
        description: 'Review personal workstation and digital tooling accessibility requirements.',
        priority: 'High',
        deadline: '2026-10-30',
        status: 'In Progress',
        assignedTo: 'Maya Patel',
        createdAt: '2026-10-20T10:00:00.000Z'
      },
      {
        id: 'tsk_102',
        companyId: 'COMP001',
        userId: 'usr_emp_1042',
        creatorName: 'Maya Patel',
        title: 'Review Annual Leave Entitlement with AI Copilot',
        description: 'Plan Q4 team leave coverage.',
        priority: 'Medium',
        deadline: '2026-10-28',
        status: 'Completed',
        assignedTo: 'Maya Patel',
        createdAt: '2026-10-22T11:00:00.000Z'
      },
      {
        id: 'tsk_103',
        companyId: 'COMP001',
        userId: 'usr_hr_2011',
        creatorName: 'David Vance',
        title: 'Review pending Accessibility Barrier Reports (Q4)',
        description: 'Ensure all open accessibility accommodation requests are resolved within SLA.',
        priority: 'Urgent',
        deadline: '2026-10-31',
        status: 'Pending',
        assignedTo: 'Sarah Connor (HR)',
        createdAt: '2026-10-24T09:00:00.000Z'
      }
    ],

    notifications: [
      {
        id: 'notif_001',
        companyId: 'COMP001',
        userId: 'usr_emp_1042',
        title: 'Report Status Updated',
        message: 'Your accommodation report for Conference Room B was marked as Resolved.',
        type: 'report',
        read: false,
        timestamp: '2026-10-24T12:00:00.000Z'
      },
      {
        id: 'notif_002',
        companyId: 'COMP001',
        userId: 'usr_emp_1042',
        title: 'Task Assigned',
        message: "Sarah Connor assigned you 'Complete Q4 Workplace Accessibility Self-Assessment'.",
        type: 'task',
        read: false,
        timestamp: '2026-10-20T10:05:00.000Z'
      },
      {
        id: 'notif_003',
        companyId: 'COMP001',
        userId: 'usr_hr_2011',
        title: 'New Inclusion Concern Logged',
        message: 'A new confidential accessibility report (REP-2026-0504) was submitted.',
        type: 'report',
        read: false,
        timestamp: '2026-10-23T16:05:00.000Z'
      }
    ],

    messages: [
      {
        id: 'msg_201',
        companyId: 'COMP001',
        fromUserId: 'usr_hr_2011',
        fromName: 'Sarah Connor (HR)',
        toUserId: 'usr_emp_1042',
        text: 'Hi Maya, please let me know if you need any assistance regarding the upcoming holiday PTO schedule or accessibility accommodations.',
        timestamp: '2026-10-24T16:20:00.000Z',
        read: true
      }
    ],

    auditLogs: [
      {
        id: 'aud_001',
        companyId: 'COMP001',
        action: 'SYSTEM_INITIALIZE',
        actorId: 'SYSTEM',
        details: 'INCLUAI 2.0 Kernel initialized with multi-tenant encryption.',
        timestamp: '2026-10-25T00:00:00.000Z'
      }
    ],

    // each entry: { id, userId, companyId, messages: [{ role, content, timestamp }] }
    conversations: []
  };
}

// Create or repair the database file
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(makeDefaultDB(), null, 2), 'utf-8');
} else {
  try {
    const current = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const defaults = makeDefaultDB();
    let changed = false;

    // Ensure every collection exists
    for (const key of Object.keys(defaults)) {
      if (!Array.isArray(current[key])) {
        current[key] = defaults[key];
        changed = true;
      }
    }

    // Ensure the seeded policy documents exist (matched by id)
    for (const doc of defaults.documents) {
      if (!current.documents.some(d => d.id === doc.id)) {
        current.documents.push(doc);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('[DB] Seed check failed:', e.message);
  }
}

class DatabaseService {
  constructor() {
    this.filePath = DB_FILE;
  }

  read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch (err) {
      console.error('[DB] Read error:', err.message);
      // Preserve the unreadable file so no data is lost, then restore defaults
      if (fs.existsSync(this.filePath)) {
        const backup = `${this.filePath}.corrupt-${Date.now()}.json`;
        try { fs.copyFileSync(this.filePath, backup); } catch (e) { }
      }
      const fresh = makeDefaultDB();
      this.write(fresh);
      return fresh;
    }
  }

  write(data) {
    const json = JSON.stringify(data, null, 2);
    const tempFile = `${this.filePath}.tmp`;
    try {
      // Atomic write: write to temp file, then rename over the real file
      fs.writeFileSync(tempFile, json, 'utf-8');
      fs.renameSync(tempFile, this.filePath);
    } catch (err) {
      // Windows / OneDrive can lock files; fall back to a direct write
      try {
        fs.writeFileSync(this.filePath, json, 'utf-8');
      } catch (retryErr) {
        console.error('[DB Write Error]', retryErr.message);
      }
    }
  }

  find(collection, filterFn = () => true) {
    const db = this.read();
    return (db[collection] || []).filter(filterFn);
  }

  findOne(collection, filterFn) {
    const db = this.read();
    return (db[collection] || []).find(filterFn) || null;
  }

  insert(collection, item) {
    const db = this.read();
    if (!db[collection]) db[collection] = [];
    db[collection].push(item);
    this.write(db);
    return item;
  }

  update(collection, filterFn, updateFn) {
    const db = this.read();
    let updated = null;
    db[collection] = (db[collection] || []).map(item => {
      if (filterFn(item)) {
        updated = updateFn(item);
        return updated;
      }
      return item;
    });
    this.write(db);
    return updated;
  }

  logAudit(companyId, actorId, action, details) {
    return this.insert('auditLogs', {
      id: `aud_${crypto.randomUUID()}`,
      companyId,
      actorId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new DatabaseService();
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;