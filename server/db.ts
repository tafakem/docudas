import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let db: Database;
const DB_FILE = path.resolve('data/documentos.sqlite');

function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite DB to disk:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    initSchema(db);
    seedInitialData(db);
    saveToDisk();
  }

  // Periodic persistence and expiration checks every 30 seconds
  const timer = setInterval(() => {
    try {
      expireStaleReservations();
      saveToDisk();
    } catch (err) {
      console.error('Background DB maintenance error:', err);
    }
  }, 30000);
  if (timer.unref) timer.unref();

  return db;
}

function initSchema(database: Database) {
  database.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMINISTRADOR', 'USUARIO')),
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'INACTIVO')),
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS numbering_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(doc_type, year)
    );

    CREATE TABLE IF NOT EXISTS number_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      number INTEGER NOT NULL,
      formatted_number TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('RESERVADO', 'UTILIZADO', 'LIBERADO', 'EXPIRADO')),
      reserved_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      released_at TEXT,
      released_by_user_id INTEGER,
      released_by_user_name TEXT,
      release_reason TEXT,
      document_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      acronym TEXT NOT NULL,
      boss_name TEXT NOT NULL,
      boss_position TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'INACTIVO')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      authorizing_area TEXT NOT NULL,
      authorizing_boss TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      authorized_qty INTEGER NOT NULL,
      used_qty INTEGER NOT NULL DEFAULT 0,
      available_qty INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AUTORIZADA' CHECK(status IN ('PENDIENTE', 'AUTORIZADA', 'UTILIZADA', 'CANCELADA')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bulk_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      authorization_id INTEGER,
      authorization_code TEXT,
      quantity INTEGER NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      recipients_summary TEXT NOT NULL,
      distribution_mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETADO',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      number INTEGER NOT NULL,
      formatted_number TEXT NOT NULL,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'REGISTRADO' CHECK(status IN ('BORRADOR', 'REGISTRADO', 'ENVIADO', 'RECIBIDO', 'ATENDIDO', 'OBSERVADO', 'ANULADO', 'CANCELADO')),
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      observations TEXT,
      lot_id INTEGER,
      lot_code TEXT,
      authorization_id INTEGER,
      authorization_code TEXT,
      variable_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(doc_type, year, number)
    );

    CREATE TABLE IF NOT EXISTS document_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_acronym TEXT NOT NULL,
      boss_name TEXT NOT NULL,
      boss_position TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY(recipient_id) REFERENCES recipients(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      document_number TEXT,
      doc_type TEXT,
      year INTEGER,
      lot_code TEXT,
      old_values TEXT,
      new_values TEXT,
      reason TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- Optimized database indexes
    CREATE INDEX IF NOT EXISTS idx_documents_type_year ON documents(doc_type, year, number);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_lot ON documents(lot_id);
    CREATE INDEX IF NOT EXISTS idx_documents_auth ON documents(authorization_id);
    CREATE INDEX IF NOT EXISTS idx_doc_recipients_doc ON document_recipients(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_recipients_rec ON document_recipients(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON number_reservations(status, doc_type, year);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
  `);
}

function seedInitialData(database: Database) {
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  // 1. Initial Users (admin123 / operador123)
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const userPass = bcrypt.hashSync('operador123', salt);

  database.run(`
    INSERT INTO users (username, name, email, password_hash, role, status, created_at, updated_at)
    VALUES 
      ('admin', 'Administrador General', 'admin@oficina.gob', '${adminPass}', 'ADMINISTRADOR', 'ACTIVO', '${now}', '${now}'),
      ('operador', 'Lic. Carlos Méndez (Operador)', 'cmendez@oficina.gob', '${userPass}', 'USUARIO', 'ACTIVO', '${now}', '${now}'),
      ('asistente', 'Bach. Andrea Torres (Trámite)', 'atorres@oficina.gob', '${userPass}', 'USUARIO', 'ACTIVO', '${now}', '${now}');
  `);

  // 2. Document Types
  database.run(`
    INSERT INTO document_types (code, name, description, status, created_at)
    VALUES
      ('MEMORANDUM', 'MEMORÁNDUM', 'Comunicación interna oficial y ejecutiva', 'ACTIVO', '${now}'),
      ('OFICIO', 'OFICIO', 'Comunicación oficial externa o interinstitucional', 'ACTIVO', '${now}'),
      ('OFICIO_MULTIPLE', 'OFICIO MÚLTIPLE', 'Comunicación con único número dirigido a múltiples dependencias', 'ACTIVO', '${now}');
  `);

  // 3. Numbering Sequences
  database.run(`
    INSERT INTO numbering_sequences (doc_type, year, last_number, updated_at)
    VALUES
      ('MEMORANDUM', ${currentYear}, 12, '${now}'),
      ('OFICIO', ${currentYear}, 8, '${now}'),
      ('OFICIO_MULTIPLE', ${currentYear}, 4, '${now}');
  `);

  // 4. Official Recipients (Áreas / Direcciones)
  database.run(`
    INSERT INTO recipients (name, acronym, boss_name, boss_position, status, created_at, updated_at)
    VALUES
      ('Dirección General de Administración', 'DGA', 'Mg. Roberto Salazar Campos', 'Director General', 'ACTIVO', '${now}', '${now}'),
      ('Oficina de Recursos Humanos', 'ORH', 'Lic. María Elena Ramos', 'Jefa de Recursos Humanos', 'ACTIVO', '${now}', '${now}'),
      ('Oficina de Logística y Abastecimiento', 'OLA', 'Ing. Fernando Castro Vela', 'Jefe de Abastecimiento', 'ACTIVO', '${now}', '${now}'),
      ('Oficina de Planeamiento y Presupuesto', 'OPP', 'Econ. Javier Paredes Díaz', 'Director de Planeamiento', 'ACTIVO', '${now}', '${now}'),
      ('Oficina de Asesoría Jurídica', 'OAJ', 'Abog. Carmen Lucía Morales', 'Jefa de Asesoría Jurídica', 'ACTIVO', '${now}', '${now}'),
      ('Oficina de Tecnologías de la Información', 'OTI', 'Ing. David Benavides Ríos', 'Jefe de Sistemas e Informática', 'ACTIVO', '${now}', '${now}'),
      ('Unidad de Tesorería y Contabilidad', 'UTC', 'C.P.C. Sofía Vargas Nuñez', 'Jefa de Tesorería', 'ACTIVO', '${now}', '${now}');
  `);

  // 5. Authorizations
  database.run(`
    INSERT INTO authorizations (code, date, operation_type, subject, description, authorizing_area, authorizing_boss, user_id, user_name, authorized_qty, used_qty, available_qty, status, created_at, updated_at)
    VALUES
      ('AUT-${currentYear}-0001', '${now.split('T')[0]}', 'PAGOS', 'Autorización de emisión de memorándums para pago de servicios de terceros', 'Aprobado según Resolución Directoral N° 045-2026 para devengados y pagos.', 'Dirección General de Administración', 'Mg. Roberto Salazar Campos', 1, 'Administrador General', 100, 15, 85, 'AUTORIZADA', '${now}', '${now}'),
      ('AUT-${currentYear}-0002', '${now.split('T')[0]}', 'NOTIFICACIONES', 'Campaña anual de actualización de legajos y declaraciones juradas', 'Requerimiento de actualización de información contractual de personal.', 'Oficina de Recursos Humanos', 'Lic. María Elena Ramos', 1, 'Administrador General', 50, 0, 50, 'AUTORIZADA', '${now}', '${now}');
  `);

  // 6. Initial Seed Documents & Document Recipients
  const pad = (n: number) => n.toString().padStart(4, '0');
  
  // Create some registered documents
  for (let i = 1; i <= 12; i++) {
    const formatted = `${pad(i)}-${currentYear}`;
    const dateStr = new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0];
    const status = i === 5 ? 'ANULADO' : i === 10 ? 'ATENDIDO' : 'REGISTRADO';
    
    database.run(`
      INSERT INTO documents (doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, observations, created_at, updated_at)
      VALUES ('MEMORANDUM', ${currentYear}, ${i}, '${formatted}', '${dateStr}', 'Memorándum de coordinación N° ${i}', 'Remisión de informe administrativo y programación de actividades operativas.', '${status}', 1, 'Administrador General', '${i === 5 ? 'Anulado por error en especificación técnica según acta' : ''}', '${now}', '${now}');
    `);
    
    // Recipient
    const recId = ((i - 1) % 6) + 1;
    database.run(`
      INSERT INTO document_recipients (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
      SELECT ${i}, id, name, acronym, boss_name, boss_position, '${now}' FROM recipients WHERE id = ${recId};
    `);

    // Track in reservations as UTILIZADO
    database.run(`
      INSERT INTO number_reservations (doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, document_id, created_at)
      VALUES ('MEMORANDUM', ${currentYear}, ${i}, '${formatted}', 1, 'Administrador General', 'UTILIZADO', '${now}', '${now}', ${i}, '${now}');
    `);
  }

  // Initial Oficios
  for (let i = 1; i <= 8; i++) {
    const formatted = `${pad(i)}-${currentYear}`;
    const dateStr = new Date(Date.now() - (9 - i) * 86400000).toISOString().split('T')[0];
    const docId = 12 + i;
    
    database.run(`
      INSERT INTO documents (doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, created_at, updated_at)
      VALUES ('OFICIO', ${currentYear}, ${i}, '${formatted}', '${dateStr}', 'Oficio de respuesta institucional N° ${i}', 'Atención a solicitud externa y remisión de actuados.', 'REGISTRADO', 2, 'Lic. Carlos Méndez (Operador)', '${now}', '${now}');
    `);
    
    const recId = ((i % 5) + 1);
    database.run(`
      INSERT INTO document_recipients (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
      SELECT ${docId}, id, name, acronym, boss_name, boss_position, '${now}' FROM recipients WHERE id = ${recId};
    `);

    database.run(`
      INSERT INTO number_reservations (doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, document_id, created_at)
      VALUES ('OFICIO', ${currentYear}, ${i}, '${formatted}', 2, 'Lic. Carlos Méndez (Operador)', 'UTILIZADO', '${now}', '${now}', ${docId}, '${now}');
    `);
  }

  // Initial Oficio Múltiple (Demonstrating 1 number with MULTIPLE recipients)
  for (let i = 1; i <= 4; i++) {
    const formatted = `${pad(i)}-${currentYear}`;
    const dateStr = new Date(Date.now() - (5 - i) * 86400000).toISOString().split('T')[0];
    const docId = 20 + i;
    
    database.run(`
      INSERT INTO documents (doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, created_at, updated_at)
      VALUES ('OFICIO_MULTIPLE', ${currentYear}, ${i}, '${formatted}', '${dateStr}', 'Convocatoria a reunión de coordinación institucional', 'Se convoca a todas las direcciones a la sesión extraordinaria de evaluación de metas trimestrales.', 'REGISTRADO', 1, 'Administrador General', '${now}', '${now}');
    `);
    
    // Multiple recipients for this single doc
    database.run(`
      INSERT INTO document_recipients (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
      SELECT ${docId}, id, name, acronym, boss_name, boss_position, '${now}' FROM recipients WHERE id IN (1, 2, 3, 4);
    `);

    database.run(`
      INSERT INTO number_reservations (doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, document_id, created_at)
      VALUES ('OFICIO_MULTIPLE', ${currentYear}, ${i}, '${formatted}', 1, 'Administrador General', 'UTILIZADO', '${now}', '${now}', ${docId}, '${now}');
    `);
  }

  // Audit Logs seed
  database.run(`
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, document_number, doc_type, year, new_values, created_at)
    VALUES
      (1, 'Administrador General', 'SISTEMA_INICIALIZADO', 'SISTEMA', NULL, NULL, ${currentYear}, '{"evento":"Inicialización de módulos y secuencias"}', '${now}'),
      (1, 'Administrador General', 'DOCUMENTO_CREADO', 'DOCUMENTO', '0001-${currentYear}', 'MEMORANDUM', ${currentYear}, '{"tipo":"MEMORANDUM","numero":"0001-${currentYear}"}', '${now}');
  `);
}

// Helper query wrappers
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const info = queryOne<{ changes: number; id: number }>(`SELECT changes() as changes, last_insert_rowid() as id`);
  saveToDisk();
  return { changes: info?.changes || 0, lastInsertRowid: info?.id || 0 };
}

export function saveDatabase() {
  saveToDisk();
}

export function logAudit(data: {
  userId?: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  documentNumber?: string;
  docType?: string;
  year?: number;
  lotCode?: string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  ipAddress?: string;
}) {
  const now = new Date().toISOString();
  execute(
    `INSERT INTO audit_logs 
      (user_id, user_name, action, entity_type, entity_id, document_number, doc_type, year, lot_code, old_values, new_values, reason, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId || null,
      data.userName,
      data.action,
      data.entityType,
      data.entityId || null,
      data.documentNumber || null,
      data.docType || null,
      data.year || null,
      data.lotCode || null,
      data.oldValues ? JSON.stringify(data.oldValues) : null,
      data.newValues ? JSON.stringify(data.newValues) : null,
      data.reason || null,
      data.ipAddress || null,
      now
    ]
  );
}

export function expireStaleReservations(): number {
  if (!db) return 0;
  const now = new Date().toISOString();
  const stale = queryAll<{
    id: number;
    doc_type: string;
    year: number;
    number: number;
    formatted_number: string;
    user_name: string;
    user_id: number;
  }>(
    `SELECT id, doc_type, year, number, formatted_number, user_name, user_id 
     FROM number_reservations 
     WHERE status = 'RESERVADO' AND expires_at < ?`,
    [now]
  );

  if (stale.length === 0) return 0;

  for (const item of stale) {
    execute(
      `UPDATE number_reservations 
       SET status = 'EXPIRADO', released_at = ?, release_reason = 'Expiración automática por inactividad' 
       WHERE id = ?`,
      [now, item.id]
    );

    logAudit({
      userId: item.user_id,
      userName: 'SISTEMA_TIMER',
      action: 'RESERVA_EXPIRADA',
      entityType: 'NUMERACION',
      entityId: item.id,
      documentNumber: item.formatted_number,
      docType: item.doc_type,
      year: item.year,
      reason: `La reserva del número ${item.formatted_number} expiró automáticamente tras el tiempo límite. El número vuelve a estar disponible.`,
      newValues: { status: 'EXPIRADO', number: item.number }
    });
  }

  saveToDisk();
  return stale.length;
}

const RESERVATION_MINUTES = 25;

export function formatDocNumber(num: number, year: number): string {
  return `${num.toString().padStart(4, '0')}-${year}`;
}

export function reserveNextNumber(docType: string, year: number, userId: number, userName: string, clientIp?: string) {
  expireStaleReservations();

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000).toISOString();

  // First, check if there is an active reservation already held by this user for this doc_type and year that hasn't expired
  const activeUserReservation = queryOne<{
    id: number;
    number: number;
    formatted_number: string;
    expires_at: string;
  }>(
    `SELECT id, number, formatted_number, expires_at 
     FROM number_reservations 
     WHERE doc_type = ? AND year = ? AND user_id = ? AND status = 'RESERVADO' AND expires_at > ?
     ORDER BY id DESC LIMIT 1`,
    [docType, year, userId, nowIso]
  );

  if (activeUserReservation) {
    return {
      reservationId: activeUserReservation.id,
      docType,
      year,
      number: activeUserReservation.number,
      formattedNumber: activeUserReservation.formatted_number,
      expiresAt: activeUserReservation.expires_at,
      isReusedActive: true
    };
  }

  // Check if there is an available freed number (LIBERADO or EXPIRADO) that was never UTILIZADO
  // and is smaller than the current sequence last_number
  const freedNumber = queryOne<{ number: number }>(
    `SELECT nr.number 
     FROM number_reservations nr
     WHERE nr.doc_type = ? AND nr.year = ? 
       AND (nr.status = 'LIBERADO' OR nr.status = 'EXPIRADO')
       AND nr.number NOT IN (
         SELECT number FROM number_reservations 
         WHERE doc_type = ? AND year = ? AND (status = 'UTILIZADO' OR (status = 'RESERVADO' AND expires_at > ?))
       )
     ORDER BY nr.number ASC LIMIT 1`,
    [docType, year, docType, year, nowIso]
  );

  let chosenNumber: number;

  if (freedNumber) {
    chosenNumber = freedNumber.number;
  } else {
    // Acquire sequence lock and increment
    const seq = queryOne<{ last_number: number }>(
      `SELECT last_number FROM numbering_sequences WHERE doc_type = ? AND year = ?`,
      [docType, year]
    );

    const currentSeq = seq ? seq.last_number : 0;
    chosenNumber = currentSeq + 1;

    if (seq) {
      execute(
        `UPDATE numbering_sequences SET last_number = ?, updated_at = ? WHERE doc_type = ? AND year = ?`,
        [chosenNumber, nowIso, docType, year]
      );
    } else {
      execute(
        `INSERT INTO numbering_sequences (doc_type, year, last_number, updated_at) VALUES (?, ?, ?, ?)`,
        [docType, year, chosenNumber, nowIso]
      );
    }
  }

  const formattedNumber = formatDocNumber(chosenNumber, year);

  // Insert reservation record
  const result = execute(
    `INSERT INTO number_reservations 
      (doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'RESERVADO', ?, ?, ?)`,
    [docType, year, chosenNumber, formattedNumber, userId, userName, nowIso, expiresAt, nowIso]
  );

  logAudit({
    userId,
    userName,
    action: 'NUMERO_RESERVADO',
    entityType: 'NUMERACION',
    entityId: result.lastInsertRowid,
    documentNumber: formattedNumber,
    docType,
    year,
    reason: `Reserva temporal de número por ${RESERVATION_MINUTES} minutos`,
    newValues: { number: chosenNumber, formattedNumber, expiresAt },
    ipAddress: clientIp
  });

  return {
    reservationId: result.lastInsertRowid,
    docType,
    year,
    number: chosenNumber,
    formattedNumber,
    expiresAt,
    isReusedActive: false
  };
}

export function releaseReservation(
  reservationId: number,
  userId: number,
  userName: string,
  reason: string,
  clientIp?: string
) {
  const res = queryOne<{
    id: number;
    doc_type: string;
    year: number;
    number: number;
    formatted_number: string;
    status: string;
  }>(`SELECT * FROM number_reservations WHERE id = ?`, [reservationId]);

  if (!res) throw new Error('Reserva no encontrada');
  if (res.status === 'UTILIZADO') throw new Error('Un número ya utilizado no puede ser liberado');
  if (res.status === 'LIBERADO') return { success: true, message: 'El número ya estaba liberado' };

  const now = new Date().toISOString();

  execute(
    `UPDATE number_reservations 
     SET status = 'LIBERADO', released_at = ?, released_by_user_id = ?, released_by_user_name = ?, release_reason = ? 
     WHERE id = ?`,
    [now, userId, userName, reason, reservationId]
  );

  logAudit({
    userId,
    userName,
    action: 'NUMERO_LIBERADO',
    entityType: 'NUMERACION',
    entityId: reservationId,
    documentNumber: res.formatted_number,
    docType: res.doc_type,
    year: res.year,
    reason: reason || 'Liberación voluntaria del número reservado',
    oldValues: { status: res.status },
    newValues: { status: 'LIBERADO', releasedAt: now },
    ipAddress: clientIp
  });

  return {
    success: true,
    formattedNumber: res.formatted_number,
    message: `Número ${res.formatted_number} liberado con éxito. Ahora se encuentra DISPONIBLE para otros usuarios.`
  };
}
