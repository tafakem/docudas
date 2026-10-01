import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  queryAll,
  queryOne,
  execute,
  saveDatabase,
  logAudit,
  reserveNextNumber,
  releaseReservation,
  expireStaleReservations,
  formatDocNumber
} from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'sistema-documental-seguro-key-2026';
export const apiRouter = Router();

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    name: string;
    role: 'ADMINISTRADOR' | 'USUARIO';
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Por favor inicie sesión.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de Administrador.' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  const user = queryOne<{
    id: number;
    username: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'ADMINISTRADOR' | 'USUARIO';
    status: string;
    last_login_at: string;
  }>('SELECT * FROM users WHERE username = ?', [username.trim()]);

  if (!user || user.status !== 'ACTIVO') {
    return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const now = new Date().toISOString();
  execute('UPDATE users SET last_login_at = ? WHERE id = ?', [now, user.id]);

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 3600 * 1000,
    sameSite: 'lax'
  });

  logAudit({
    userId: user.id,
    userName: user.name,
    action: 'INICIO_SESION',
    entityType: 'USUARIO',
    entityId: user.id,
    reason: 'Inicio de sesión exitoso',
    ipAddress: req.ip
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: now
    }
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = queryOne<{
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    status: string;
    last_login_at: string;
    created_at: string;
  }>('SELECT id, username, name, email, role, status, last_login_at, created_at FROM users WHERE id = ?', [req.user!.id]);

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json({ user });
});

apiRouter.post('/auth/logout', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.clearCookie('token');
  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'CIERRE_SESION',
    entityType: 'USUARIO',
    entityId: req.user!.id,
    reason: 'Cierre de sesión de usuario',
    ipAddress: req.ip
  });
  return res.json({ success: true, message: 'Sesión cerrada correctamente.' });
});

apiRouter.put('/auth/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const user = queryOne<{ id: number; password_hash: string }>('SELECT id, password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const now = new Date().toISOString();

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Debe ingresar su contraseña actual para cambiarla.' });
    }
    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, user.id]);
  }

  if (name || email) {
    execute('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), updated_at = ? WHERE id = ?', [
      name || null,
      email || null,
      now,
      user.id
    ]);
  }

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'PERFIL_ACTUALIZADO',
    entityType: 'USUARIO',
    entityId: user.id,
    reason: newPassword ? 'Actualización de datos y cambio de contraseña' : 'Actualización de datos personales',
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Perfil actualizado correctamente.' });
});

// ==========================================
// 2. USER MANAGEMENT (ADMIN ONLY)
// ==========================================

apiRouter.get('/users', authMiddleware, requireAdmin, (req, res) => {
  const users = queryAll(
    'SELECT id, username, name, email, role, status, last_login_at, created_at, updated_at FROM users ORDER BY id ASC'
  );
  res.json({ users });
});

apiRouter.post('/users', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { username, name, email, password, role } = req.body;
  if (!username || !name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'El nombre de usuario o correo ya se encuentra registrado.' });
  }

  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);
  const result = execute(
    'INSERT INTO users (username, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [username.trim(), name.trim(), email.trim(), hash, role, 'ACTIVO', now, now]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USUARIO_CREADO',
    entityType: 'USUARIO',
    entityId: result.lastInsertRowid,
    reason: `Nuevo usuario creado: ${username} (${role})`,
    newValues: { username, name, email, role },
    ipAddress: req.ip
  });

  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.put('/users/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const targetId = parseInt(req.params.id);
  const { name, email, role, status, password } = req.body;

  const existing = queryOne<{ id: number; username: string; role: string; status: string }>(
    'SELECT * FROM users WHERE id = ?',
    [targetId]
  );
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const now = new Date().toISOString();

  if (password && password.trim()) {
    const hash = bcrypt.hashSync(password.trim(), 10);
    execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetId]);
  }

  execute(
    'UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = ? WHERE id = ?',
    [name, email, role, status, now, targetId]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USUARIO_MODIFICADO',
    entityType: 'USUARIO',
    entityId: targetId,
    reason: `Modificación de datos de usuario ${existing.username}`,
    oldValues: { role: existing.role, status: existing.status },
    newValues: { name, email, role, status },
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Usuario actualizado con éxito.' });
});

// ==========================================
// 3. RECIPIENTS (DESTINATARIOS)
// ==========================================

apiRouter.get('/recipients', authMiddleware, (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const sql = includeInactive
    ? 'SELECT * FROM recipients ORDER BY name ASC'
    : "SELECT * FROM recipients WHERE status = 'ACTIVO' ORDER BY name ASC";
  const recipients = queryAll(sql);
  res.json({ recipients });
});

apiRouter.post('/recipients', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { name, acronym, bossName, bossPosition } = req.body;
  if (!name || !bossName || !bossPosition) {
    return res.status(400).json({ error: 'Nombre de dependencia, jefe y cargo son obligatorios.' });
  }

  const now = new Date().toISOString();
  const result = execute(
    'INSERT INTO recipients (name, acronym, boss_name, boss_position, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name.trim(), (acronym || '').trim().toUpperCase(), bossName.trim(), bossPosition.trim(), 'ACTIVO', now, now]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'DESTINATARIO_CREADO',
    entityType: 'DESTINATARIO',
    entityId: result.lastInsertRowid,
    reason: `Nuevo destinatario creado: ${name}`,
    newValues: { name, acronym, bossName, bossPosition },
    ipAddress: req.ip
  });

  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.put('/recipients/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { name, acronym, bossName, bossPosition, status } = req.body;

  const existing = queryOne('SELECT * FROM recipients WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Destinatario no encontrado.' });

  const now = new Date().toISOString();
  execute(
    'UPDATE recipients SET name = ?, acronym = ?, boss_name = ?, boss_position = ?, status = ?, updated_at = ? WHERE id = ?',
    [name.trim(), (acronym || '').trim().toUpperCase(), bossName.trim(), bossPosition.trim(), status, now, id]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'DESTINATARIO_MODIFICADO',
    entityType: 'DESTINATARIO',
    entityId: id,
    reason: `Destinatario modificado: ${name}`,
    oldValues: existing,
    newValues: { name, acronym, bossName, bossPosition, status },
    ipAddress: req.ip
  });

  return res.json({ success: true });
});

apiRouter.patch('/recipients/:id/toggle', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne<{ id: number; name: string; status: string }>('SELECT id, name, status FROM recipients WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Destinatario no encontrado.' });

  const newStatus = existing.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  const now = new Date().toISOString();
  execute('UPDATE recipients SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: newStatus === 'INACTIVO' ? 'DESTINATARIO_DESACTIVADO' : 'DESTINATARIO_ACTIVADO',
    entityType: 'DESTINATARIO',
    entityId: id,
    reason: `Cambio de estado lógico a ${newStatus} (preservando trazabilidad histórica)`,
    oldValues: { status: existing.status },
    newValues: { status: newStatus },
    ipAddress: req.ip
  });

  return res.json({ success: true, status: newStatus });
});

// ==========================================
// 4. NUMBERING CONTROL & RESERVATIONS
// ==========================================

apiRouter.get('/numbering/overview', authMiddleware, (req, res) => {
  expireStaleReservations();
  const currentYear = new Date().getFullYear();
  const docTypes = ['MEMORANDUM', 'OFICIO', 'OFICIO_MULTIPLE'];

  const overview = docTypes.map(docType => {
    // Current sequence
    const seq = queryOne<{ last_number: number }>(
      'SELECT last_number FROM numbering_sequences WHERE doc_type = ? AND year = ?',
      [docType, currentYear]
    );
    const lastNumber = seq ? seq.last_number : 0;

    // Counts
    const usedCount = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM number_reservations WHERE doc_type = ? AND year = ? AND status = 'UTILIZADO'",
      [docType, currentYear]
    )?.count || 0;

    const reservedCount = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM number_reservations WHERE doc_type = ? AND year = ? AND status = 'RESERVADO'",
      [docType, currentYear]
    )?.count || 0;

    const releasedCount = queryOne<{ count: number }>(
      "SELECT count(*) as count FROM number_reservations WHERE doc_type = ? AND year = ? AND status IN ('LIBERADO', 'EXPIRADO')",
      [docType, currentYear]
    )?.count || 0;

    // Next number calculation (next available freed or lastNumber + 1)
    const nextFreed = queryOne<{ number: number }>(
      `SELECT nr.number FROM number_reservations nr 
       WHERE nr.doc_type = ? AND nr.year = ? AND nr.status IN ('LIBERADO', 'EXPIRADO')
       AND nr.number NOT IN (SELECT number FROM number_reservations WHERE doc_type = ? AND year = ? AND status IN ('UTILIZADO', 'RESERVADO'))
       ORDER BY nr.number ASC LIMIT 1`,
      [docType, currentYear, docType, currentYear]
    );

    const nextNumber = nextFreed ? nextFreed.number : lastNumber + 1;

    return {
      docType,
      year: currentYear,
      lastNumber,
      nextNumber,
      formattedNext: formatDocNumber(nextNumber, currentYear),
      usedCount,
      reservedCount,
      releasedCount
    };
  });

  return res.json({ currentYear, overview });
});

apiRouter.get('/numbering/reservations', authMiddleware, (req, res) => {
  expireStaleReservations();
  const { doc_type, status, year, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];

  if (doc_type) {
    conditions.push('doc_type = ?');
    params.push(doc_type);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (year) {
    conditions.push('year = ?');
    params.push(parseInt(year));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM number_reservations ${whereClause}`, params)?.count || 0;

  const items = queryAll(
    `SELECT * FROM number_reservations ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

apiRouter.post('/numbering/reserve', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { docType, year } = req.body;
  if (!docType) return res.status(400).json({ error: 'Tipo de documento obligatorio.' });

  const currentYear = year ? parseInt(year) : new Date().getFullYear();

  try {
    const reservation = reserveNextNumber(docType, currentYear, req.user!.id, req.user!.name, req.ip);
    return res.json({ success: true, reservation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al reservar número' });
  }
});

apiRouter.post('/numbering/release', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { reservationId, reason } = req.body;
  if (!reservationId) return res.status(400).json({ error: 'ID de reserva obligatorio.' });

  try {
    const result = releaseReservation(
      parseInt(reservationId),
      req.user!.id,
      req.user!.name,
      reason || 'Liberación voluntaria',
      req.ip
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. DOCUMENTS (CONTROL PRINCIPAL & REGISTRO)
// ==========================================

apiRouter.get('/documents', authMiddleware, (req, res) => {
  const {
    page = '1',
    limit = '25',
    doc_type,
    year,
    number,
    date_from,
    date_to,
    search,
    recipient_id,
    boss_name,
    user_id,
    status,
    lot_code,
    authorization_code
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 25));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];

  if (doc_type) {
    conditions.push('d.doc_type = ?');
    params.push(doc_type);
  }
  if (year) {
    conditions.push('d.year = ?');
    params.push(parseInt(year));
  }
  if (number) {
    conditions.push('d.number = ?');
    params.push(parseInt(number));
  }
  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
  }
  if (user_id) {
    conditions.push('d.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (lot_code) {
    conditions.push('d.lot_code LIKE ?');
    params.push(`%${lot_code.trim()}%`);
  }
  if (authorization_code) {
    conditions.push('d.authorization_code LIKE ?');
    params.push(`%${authorization_code.trim()}%`);
  }
  if (date_from) {
    conditions.push('d.date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('d.date <= ?');
    params.push(date_to);
  }
  if (search) {
    conditions.push('(d.subject LIKE ? OR d.description LIKE ? OR d.formatted_number LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }
  if (recipient_id) {
    conditions.push('EXISTS (SELECT 1 FROM document_recipients dr WHERE dr.document_id = d.id AND dr.recipient_id = ?)');
    params.push(parseInt(recipient_id));
  }
  if (boss_name) {
    conditions.push('EXISTS (SELECT 1 FROM document_recipients dr WHERE dr.document_id = d.id AND dr.boss_name LIKE ?)');
    params.push(`%${boss_name.trim()}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matches
  const total = queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT d.id) as count FROM documents d ${whereClause}`,
    params
  )?.count || 0;

  // Retrieve paginated records
  const documents = queryAll<any>(
    `SELECT d.*, 
       (SELECT group_concat(recipient_name, ' | ') FROM document_recipients WHERE document_id = d.id) as recipients_text,
       (SELECT group_concat(boss_name, ' | ') FROM document_recipients WHERE document_id = d.id) as bosses_text,
       (SELECT count(*) FROM document_recipients WHERE document_id = d.id) as recipient_count
     FROM documents d
     ${whereClause}
     ORDER BY d.year DESC, d.doc_type ASC, d.number DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  return res.json({
    items: documents,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

apiRouter.get('/documents/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const doc = queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

  const recipients = queryAll('SELECT * FROM document_recipients WHERE document_id = ? ORDER BY id ASC', [id]);
  const auditLogs = queryAll('SELECT * FROM audit_logs WHERE document_number = ? ORDER BY id DESC', [doc.formatted_number]);
  const lot = doc.lot_id ? queryOne('SELECT * FROM bulk_lots WHERE id = ?', [doc.lot_id]) : null;
  const authorization = doc.authorization_id ? queryOne('SELECT * FROM authorizations WHERE id = ?', [doc.authorization_id]) : null;

  return res.json({
    document: doc,
    recipients,
    auditLogs,
    lot,
    authorization
  });
});

apiRouter.post('/documents', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    reservationId,
    docType,
    year,
    date,
    subject,
    description,
    observations,
    recipientIds,
    status = 'REGISTRADO'
  } = req.body;

  if (!docType || !date || !subject || !recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({ error: 'Complete los campos obligatorios y seleccione al menos un destinatario.' });
  }

  // Validate recipients for OFICIO_MULTIPLE vs single doc
  if (docType !== 'OFICIO_MULTIPLE' && recipientIds.length > 1) {
    return res.status(400).json({ error: 'Solo el OFICIO MÚLTIPLE puede tener múltiples destinatarios en un solo registro.' });
  }

  const currentYear = year ? parseInt(year) : new Date().getFullYear();
  let activeReservation: any = null;

  // If a reservationId is passed, verify it
  if (reservationId) {
    activeReservation = queryOne(
      "SELECT * FROM number_reservations WHERE id = ? AND status = 'RESERVADO'",
      [parseInt(reservationId)]
    );
  }

  // If not reserved yet or reservation expired, reserve now automatically
  if (!activeReservation) {
    activeReservation = reserveNextNumber(docType, currentYear, req.user!.id, req.user!.name, req.ip);
    activeReservation.id = activeReservation.reservationId;
  }

  const number = activeReservation.number;
  const formattedNumber = activeReservation.formattedNumber || formatDocNumber(number, currentYear);
  const now = new Date().toISOString();

  // Ensure duplicate check (doc_type, year, number)
  const duplicate = queryOne('SELECT id FROM documents WHERE doc_type = ? AND year = ? AND number = ?', [
    docType,
    currentYear,
    number
  ]);
  if (duplicate) {
    return res.status(409).json({ error: `El número ${formattedNumber} ya fue utilizado en otro documento registrado.` });
  }

  try {
    // 1. Insert document
    const docResult = execute(
      `INSERT INTO documents 
        (doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, observations, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docType,
        currentYear,
        number,
        formattedNumber,
        date,
        subject.trim(),
        (description || '').trim(),
        status,
        req.user!.id,
        req.user!.name,
        (observations || '').trim() || null,
        now,
        now
      ]
    );

    const docId = docResult.lastInsertRowid;

    // 2. Insert document_recipients
    for (const rId of recipientIds) {
      const rec = queryOne<{ id: number; name: string; acronym: string; boss_name: string; boss_position: string }>(
        'SELECT id, name, acronym, boss_name, boss_position FROM recipients WHERE id = ?',
        [rId]
      );
      if (rec) {
        execute(
          `INSERT INTO document_recipients 
            (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [docId, rec.id, rec.name, rec.acronym, rec.boss_name, rec.boss_position, now]
        );
      }
    }

    // 3. Mark reservation as UTILIZADO
    execute(
      `UPDATE number_reservations SET status = 'UTILIZADO', document_id = ? WHERE id = ?`,
      [docId, activeReservation.id]
    );

    // 4. Log Audit
    logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'DOCUMENTO_CREADO',
      entityType: 'DOCUMENTO',
      entityId: docId,
      documentNumber: formattedNumber,
      docType,
      year: currentYear,
      reason: 'Registro formal de documento oficial',
      newValues: {
        docType,
        year: currentYear,
        number,
        formattedNumber,
        subject,
        recipientsCount: recipientIds.length
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      documentId: docId,
      formattedNumber,
      message: `Documento ${formattedNumber} registrado con éxito.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al guardar el documento.' });
  }
});

apiRouter.put('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const docId = parseInt(req.params.id);
  const { subject, description, observations, recipientIds, date } = req.body;

  const existing = queryOne<any>('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!existing) return res.status(404).json({ error: 'Documento no encontrado.' });

  const now = new Date().toISOString();

  // Fetch old recipients for audit log
  const oldRecs = queryAll('SELECT recipient_name FROM document_recipients WHERE document_id = ?', [docId]);
  const oldRecNames = oldRecs.map(r => r.recipient_name).join(', ');

  // Update recipients if recipientIds array is provided
  let newRecNames = oldRecNames;
  if (Array.isArray(recipientIds) && recipientIds.length > 0) {
    if (existing.doc_type !== 'OFICIO_MULTIPLE' && recipientIds.length > 1) {
      return res.status(400).json({ error: 'Solo el OFICIO MÚLTIPLE permite seleccionar múltiples destinatarios.' });
    }

    // Delete old recipients
    execute('DELETE FROM document_recipients WHERE document_id = ?', [docId]);

    // Insert updated recipients
    const insertedNames: string[] = [];
    for (const rId of recipientIds) {
      const rec = queryOne<{ id: number; name: string; acronym: string; boss_name: string; boss_position: string }>(
        'SELECT id, name, acronym, boss_name, boss_position FROM recipients WHERE id = ?',
        [rId]
      );
      if (rec) {
        execute(
          `INSERT INTO document_recipients 
            (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [docId, rec.id, rec.name, rec.acronym, rec.boss_name, rec.boss_position, now]
        );
        insertedNames.push(rec.name);
      }
    }
    newRecNames = insertedNames.join(', ');
  }

  // Update main document fields
  execute(
    'UPDATE documents SET subject = ?, description = ?, observations = ?, date = COALESCE(?, date), updated_at = ? WHERE id = ?',
    [subject ? subject.trim() : existing.subject, description !== undefined ? description.trim() : existing.description, observations !== undefined ? observations.trim() : existing.observations, date || null, now, docId]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'DOCUMENTO_MODIFICADO',
    entityType: 'DOCUMENTO',
    entityId: docId,
    documentNumber: existing.formatted_number,
    docType: existing.doc_type,
    year: existing.year,
    reason: 'Actualización de contenido y/o destinatario(s)',
    oldValues: { subject: existing.subject, description: existing.description, recipients: oldRecNames },
    newValues: { subject: subject || existing.subject, description, observations, recipients: newRecNames },
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Documento y destinatario(s) actualizados con éxito.' });
});

apiRouter.post('/documents/:id/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  const docId = parseInt(req.params.id);
  const { status, reason } = req.body;

  if (!status || !reason) {
    return res.status(400).json({ error: 'Debe indicar el nuevo estado y el motivo.' });
  }

  const existing = queryOne<{ id: number; formatted_number: string; doc_type: string; year: number; status: string }>(
    'SELECT id, formatted_number, doc_type, year, status FROM documents WHERE id = ?',
    [docId]
  );
  if (!existing) return res.status(404).json({ error: 'Documento no encontrado.' });

  const now = new Date().toISOString();
  execute('UPDATE documents SET status = ?, updated_at = ? WHERE id = ?', [status, now, docId]);

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: status === 'ANULADO' ? 'DOCUMENTO_ANULADO' : status === 'CANCELADO' ? 'DOCUMENTO_CANCELADO' : 'CAMBIO_ESTADO',
    entityType: 'DOCUMENTO',
    entityId: docId,
    documentNumber: existing.formatted_number,
    docType: existing.doc_type,
    year: existing.year,
    reason: reason.trim(),
    oldValues: { status: existing.status },
    newValues: { status },
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: `Estado del documento ${existing.formatted_number} actualizado a ${status}. La trazabilidad histórica se mantiene intacta.`
  });
});

// ==========================================
// 6. AUTHORIZATIONS (AUTORIZACIONES ADMINISTRATIVAS)
// ==========================================

apiRouter.get('/authorizations', authMiddleware, (req, res) => {
  const { status } = req.query as Record<string, string>;
  const whereClause = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const list = queryAll(`SELECT * FROM authorizations ${whereClause} ORDER BY id DESC`, params);
  res.json({ authorizations: list });
});

apiRouter.get('/authorizations/pending-count', authMiddleware, (req, res) => {
  const pendingList = queryAll<any>("SELECT * FROM authorizations WHERE status = 'PENDIENTE' ORDER BY id DESC");
  return res.json({
    pendingCount: pendingList.length,
    pendingList
  });
});

apiRouter.post('/authorizations/request', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { date, operationType, subject, description, authorizingArea, authorizingBoss, requestedQty } = req.body;
  if (!date || !operationType || !subject || !authorizingArea || !authorizingBoss || !requestedQty) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const qty = parseInt(requestedQty);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'La cantidad solicitada debe ser mayor a 0.' });
  }

  const currentYear = new Date().getFullYear();
  const countObj = queryOne<{ count: number }>("SELECT count(*) as count FROM authorizations WHERE code LIKE ?", [`SOL-${currentYear}-%`]);
  const nextNum = (countObj?.count || 0) + 1;
  const code = `SOL-${currentYear}-${nextNum.toString().padStart(4, '0')}`;

  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO authorizations 
      (code, date, operation_type, subject, description, authorizing_area, authorizing_boss, user_id, user_name, authorized_qty, used_qty, available_qty, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDIENTE', ?, ?)`,
    [
      code,
      date,
      operationType,
      subject.trim(),
      (description || '').trim(),
      authorizingArea.trim(),
      authorizingBoss.trim(),
      req.user!.id,
      req.user!.name,
      qty,
      qty,
      now,
      now
    ]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SOLICITUD_AUTORIZACION_CREADA',
    entityType: 'AUTORIZACION',
    entityId: result.lastInsertRowid,
    reason: `Solicitud de autorización masiva para ${qty} documentos enviada al Administrador`,
    newValues: { code, operationType, requestedQty: qty, authorizingArea },
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    code,
    message: `Solicitud de Autorización Masiva ${code} enviada al Administrador para su aprobación.`
  });
});

apiRouter.post('/authorizations/:id/approve', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { approvedQty } = req.body;

  const auth = queryOne<any>('SELECT * FROM authorizations WHERE id = ?', [id]);
  if (!auth) return res.status(404).json({ error: 'Autorización no encontrada.' });

  const finalQty = approvedQty ? parseInt(approvedQty) : auth.authorized_qty;
  const now = new Date().toISOString();

  execute(
    "UPDATE authorizations SET status = 'AUTORIZADA', authorized_qty = ?, available_qty = ?, updated_at = ? WHERE id = ?",
    [finalQty, finalQty, now, id]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SOLICITUD_AUTORIZACION_APROBADA',
    entityType: 'AUTORIZACION',
    entityId: id,
    reason: `Aprobación de solicitud masiva ${auth.code} por ${finalQty} documentos`,
    oldValues: { status: auth.status },
    newValues: { status: 'AUTORIZADA', authorized_qty: finalQty },
    ipAddress: req.ip
  });

  return res.json({ success: true, message: `Autorización ${auth.code} APROBADA exitosamente por ${finalQty} documentos.` });
});

apiRouter.post('/authorizations/:id/reject', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body;

  const auth = queryOne<any>('SELECT * FROM authorizations WHERE id = ?', [id]);
  if (!auth) return res.status(404).json({ error: 'Autorización no encontrada.' });

  const now = new Date().toISOString();
  execute("UPDATE authorizations SET status = 'CANCELADA', updated_at = ? WHERE id = ?", [now, id]);

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SOLICITUD_AUTORIZACION_RECHAZADA',
    entityType: 'AUTORIZACION',
    entityId: id,
    reason: reason || 'Rechazo de solicitud por el Administrador',
    oldValues: { status: auth.status },
    newValues: { status: 'CANCELADA' },
    ipAddress: req.ip
  });

  return res.json({ success: true, message: `Solicitud ${auth.code} rechazada/cancelada.` });
});

apiRouter.post('/authorizations', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { code, date, operationType, subject, description, authorizingArea, authorizingBoss, authorizedQty } = req.body;
  if (!code || !date || !operationType || !subject || !authorizingArea || !authorizingBoss || !authorizedQty) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const qty = parseInt(authorizedQty);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'La cantidad autorizada debe ser mayor a 0.' });
  }

  const existing = queryOne('SELECT id FROM authorizations WHERE code = ?', [code.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'El código de autorización ya existe.' });
  }

  const now = new Date().toISOString();
  const result = execute(
    `INSERT INTO authorizations 
      (code, date, operation_type, subject, description, authorizing_area, authorizing_boss, user_id, user_name, authorized_qty, used_qty, available_qty, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'AUTORIZADA', ?, ?)`,
    [
      code.trim().toUpperCase(),
      date,
      operationType,
      subject.trim(),
      (description || '').trim(),
      authorizingArea.trim(),
      authorizingBoss.trim(),
      req.user!.id,
      req.user!.name,
      qty,
      qty,
      now,
      now
    ]
  );

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'AUTORIZACION_CREADA',
    entityType: 'AUTORIZACION',
    entityId: result.lastInsertRowid,
    reason: `Nueva autorización administrativa: ${code} (${qty} documentos)`,
    newValues: { code, operationType, authorizedQty: qty, authorizingArea },
    ipAddress: req.ip
  });

  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.patch('/authorizations/:id/cancel', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const auth = queryOne<{ id: number; code: string; status: string }>('SELECT * FROM authorizations WHERE id = ?', [id]);
  if (!auth) return res.status(404).json({ error: 'Autorización no encontrada.' });

  const now = new Date().toISOString();
  execute("UPDATE authorizations SET status = 'CANCELADA', updated_at = ? WHERE id = ?", [now, id]);

  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'AUTORIZACION_CANCELADA',
    entityType: 'AUTORIZACION',
    entityId: id,
    reason: req.body.reason || 'Cancelación administrativa de autorización',
    oldValues: { status: auth.status },
    newValues: { status: 'CANCELADA' },
    ipAddress: req.ip
  });

  return res.json({ success: true, message: `Autorización ${auth.code} cancelada.` });
});

// ==========================================
// 7. BULK REGISTRATION (REGISTRO MASIVO DE MEMORÁNDUMS)
// ==========================================

apiRouter.post('/bulk/preview', authMiddleware, (req, res) => {
  const {
    authorizationId,
    mode, // 'SINGLE' | 'EQUAL_PER_RECIPIENT' | 'TOTAL_DISTRIBUTED'
    singleRecipientId,
    recipientsList, // [{ recipientId, qty }] or [recipientId, recipientId, ...]
    qtyPerRecipient,
    totalQty
  } = req.body;

  const currentYear = new Date().getFullYear();

  // Validate Authorization
  const auth = queryOne<{
    id: number;
    code: string;
    status: string;
    available_qty: number;
    operation_type: string;
    subject: string;
  }>('SELECT * FROM authorizations WHERE id = ?', [authorizationId]);

  if (!auth) return res.status(400).json({ error: 'Autorización no válida.' });
  if (auth.status !== 'AUTORIZADA') {
    return res.status(400).json({ error: `La autorización ${auth.code} se encuentra en estado ${auth.status} y no puede ser utilizada.` });
  }

  // Calculate planned items
  const distribution: { recipientId: number; qty: number }[] = [];

  if (mode === 'SINGLE') {
    const qty = parseInt(totalQty);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Indique una cantidad válida de documentos.' });
    if (!singleRecipientId) return res.status(400).json({ error: 'Seleccione un destinatario.' });
    distribution.push({ recipientId: parseInt(singleRecipientId), qty });
  } else if (mode === 'EQUAL_PER_RECIPIENT') {
    const perRec = parseInt(qtyPerRecipient);
    if (!perRec || perRec <= 0) return res.status(400).json({ error: 'Indique la cantidad por destinatario.' });
    if (!recipientsList || !Array.isArray(recipientsList) || recipientsList.length === 0) {
      return res.status(400).json({ error: 'Seleccione al menos un destinatario.' });
    }
    recipientsList.forEach((rid: any) => {
      distribution.push({ recipientId: parseInt(rid), qty: perRec });
    });
  } else if (mode === 'TOTAL_DISTRIBUTED') {
    if (!recipientsList || !Array.isArray(recipientsList) || recipientsList.length === 0) {
      return res.status(400).json({ error: 'Configure la distribución por destinatarios.' });
    }
    recipientsList.forEach((item: any) => {
      if (item.qty > 0) {
        distribution.push({ recipientId: parseInt(item.recipientId), qty: parseInt(item.qty) });
      }
    });
  }

  const grandTotal = distribution.reduce((acc, curr) => acc + curr.qty, 0);

  if (grandTotal === 0) {
    return res.status(400).json({ error: 'La cantidad total no puede ser cero.' });
  }

  if (grandTotal > auth.available_qty) {
    return res.status(400).json({
      error: `La cantidad solicitada (${grandTotal}) supera la cantidad autorizada disponible (${auth.available_qty}).`
    });
  }

  // Calculate prospective sequential numbers for preview
  const seq = queryOne<{ last_number: number }>(
    "SELECT last_number FROM numbering_sequences WHERE doc_type = 'MEMORANDUM' AND year = ?",
    [currentYear]
  );
  const startNum = (seq ? seq.last_number : 0) + 1;
  const plannedNumbers: string[] = [];

  for (let i = 0; i < grandTotal; i++) {
    plannedNumbers.push(formatDocNumber(startNum + i, currentYear));
  }

  // Attach recipient information
  const recipientMap = new Map<number, any>();
  const allRecIds = distribution.map(d => d.recipientId);
  const recData = queryAll(`SELECT * FROM recipients WHERE id IN (${allRecIds.join(',')})`);
  recData.forEach(r => recipientMap.set(r.id, r));

  const previewItems: any[] = [];
  let numIndex = 0;
  for (const dist of distribution) {
    const rec = recipientMap.get(dist.recipientId);
    for (let k = 0; k < dist.qty; k++) {
      previewItems.push({
        plannedNumber: plannedNumbers[numIndex],
        recipientId: dist.recipientId,
        recipientName: rec ? rec.name : 'Desconocido',
        bossName: rec ? rec.boss_name : '',
        bossPosition: rec ? rec.boss_position : ''
      });
      numIndex++;
    }
  }

  return res.json({
    valid: true,
    authorization: auth,
    grandTotal,
    startNumber: plannedNumbers[0],
    endNumber: plannedNumbers[plannedNumbers.length - 1],
    previewItems
  });
});

apiRouter.post('/bulk/generate', authMiddleware, (req: AuthenticatedRequest, res) => {
  const {
    authorizationId,
    mode,
    singleRecipientId,
    recipientsList,
    qtyPerRecipient,
    totalQty,
    subject,
    description,
    variableRows // Optional Excel/CSV array [{ dni, beneficiary, amount, concept }]
  } = req.body;

  if (!authorizationId || !subject) {
    return res.status(400).json({ error: 'Autorización y asunto son obligatorios.' });
  }

  const currentYear = new Date().getFullYear();
  const now = new Date().toISOString();

  // Validate Authorization
  const auth = queryOne<{
    id: number;
    code: string;
    status: string;
    available_qty: number;
    used_qty: number;
    operation_type: string;
  }>('SELECT * FROM authorizations WHERE id = ?', [authorizationId]);

  if (!auth || auth.status !== 'AUTORIZADA') {
    return res.status(400).json({ error: 'La autorización no está disponible o no se encuentra AUTORIZADA.' });
  }

  // Build items distribution
  const distribution: { recipientId: number; qty: number; variableData?: any }[] = [];

  if (mode === 'SINGLE') {
    const qty = parseInt(totalQty);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Cantidad inválida.' });
    if (!singleRecipientId) return res.status(400).json({ error: 'Destinatario obligatorio.' });
    
    // If variable rows provided (e.g. from Excel), distribute individually
    if (variableRows && Array.isArray(variableRows) && variableRows.length > 0) {
      for (const row of variableRows) {
        distribution.push({ recipientId: parseInt(singleRecipientId), qty: 1, variableData: row });
      }
    } else {
      for (let i = 0; i < qty; i++) {
        distribution.push({ recipientId: parseInt(singleRecipientId), qty: 1 });
      }
    }
  } else if (mode === 'EQUAL_PER_RECIPIENT') {
    const perRec = parseInt(qtyPerRecipient);
    recipientsList.forEach((rid: any) => {
      for (let i = 0; i < perRec; i++) {
        distribution.push({ recipientId: parseInt(rid), qty: 1 });
      }
    });
  } else if (mode === 'TOTAL_DISTRIBUTED') {
    recipientsList.forEach((item: any) => {
      const q = parseInt(item.qty);
      for (let i = 0; i < q; i++) {
        distribution.push({ recipientId: parseInt(item.recipientId), qty: 1 });
      }
    });
  }

  const grandTotal = distribution.length;
  if (grandTotal === 0) return res.status(400).json({ error: 'Cantidad total no puede ser cero.' });

  if (grandTotal > auth.available_qty) {
    return res.status(400).json({
      error: `La cantidad solicitada (${grandTotal}) supera la cantidad disponible autorizada (${auth.available_qty}).`
    });
  }

  // Pre-load recipient details
  const uniqueRecIds = Array.from(new Set(distribution.map(d => d.recipientId)));
  const recRows = queryAll(`SELECT * FROM recipients WHERE id IN (${uniqueRecIds.join(',')})`);
  const recMap = new Map<number, any>();
  recRows.forEach(r => recMap.set(r.id, r));

  const recipientsSummary = recRows.map(r => r.name).join(', ');

  // Sequence Lock & Increment
  const seq = queryOne<{ last_number: number }>(
    "SELECT last_number FROM numbering_sequences WHERE doc_type = 'MEMORANDUM' AND year = ?",
    [currentYear]
  );
  const startNum = (seq ? seq.last_number : 0) + 1;
  const newLastNum = startNum + grandTotal - 1;

  if (seq) {
    execute(
      "UPDATE numbering_sequences SET last_number = ?, updated_at = ? WHERE doc_type = 'MEMORANDUM' AND year = ?",
      [newLastNum, now, currentYear]
    );
  } else {
    execute(
      "INSERT INTO numbering_sequences (doc_type, year, last_number, updated_at) VALUES ('MEMORANDUM', ?, ?, ?)",
      [currentYear, newLastNum, now]
    );
  }

  // Generate Lot Code
  const lotCount = queryOne<{ count: number }>('SELECT count(*) as count FROM bulk_lots')?.count || 0;
  const lotCode = `LOTE-MEM-${currentYear}-${(lotCount + 1).toString().padStart(4, '0')}`;

  // 1. Insert Bulk Lot
  const lotResult = execute(
    `INSERT INTO bulk_lots 
      (code, date, user_id, user_name, operation_type, authorization_id, authorization_code, quantity, subject, description, recipients_summary, distribution_mode, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADO', ?)`,
    [
      lotCode,
      now.split('T')[0],
      req.user!.id,
      req.user!.name,
      auth.operation_type,
      auth.id,
      auth.code,
      grandTotal,
      subject.trim(),
      (description || '').trim(),
      recipientsSummary,
      mode,
      now
    ]
  );
  const lotId = lotResult.lastInsertRowid;

  // 2. Insert documents and document_recipients and reservations
  const generatedNumbers: string[] = [];
  for (let i = 0; i < grandTotal; i++) {
    const num = startNum + i;
    const formatted = formatDocNumber(num, currentYear);
    generatedNumbers.push(formatted);

    const dist = distribution[i];
    const rec = recMap.get(dist.recipientId);

    // Document insertion
    const docRes = execute(
      `INSERT INTO documents 
        (doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, observations, lot_id, lot_code, authorization_id, authorization_code, variable_data, created_at, updated_at)
       VALUES ('MEMORANDUM', ?, ?, ?, ?, ?, ?, 'REGISTRADO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentYear,
        num,
        formatted,
        now.split('T')[0],
        subject.trim(),
        (description || '').trim(),
        req.user!.id,
        req.user!.name,
        `Generado masivamente bajo Lote ${lotCode}`,
        lotId,
        lotCode,
        auth.id,
        auth.code,
        dist.variableData ? JSON.stringify(dist.variableData) : null,
        now,
        now
      ]
    );

    const docId = docRes.lastInsertRowid;

    // Recipient link
    if (rec) {
      execute(
        `INSERT INTO document_recipients 
          (document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [docId, rec.id, rec.name, rec.acronym, rec.boss_name, rec.boss_position, now]
      );
    }

    // Reservation link as UTILIZADO
    execute(
      `INSERT INTO number_reservations 
        (doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, document_id, created_at)
       VALUES ('MEMORANDUM', ?, ?, ?, ?, ?, 'UTILIZADO', ?, ?, ?, ?)`,
      [currentYear, num, formatted, req.user!.id, req.user!.name, now, now, docId, now]
    );
  }

  // 3. Update Authorization counters
  const newUsedQty = auth.used_qty + grandTotal;
  const newAvailQty = auth.available_qty - grandTotal;
  const newAuthStatus = newAvailQty === 0 ? 'UTILIZADA' : 'AUTORIZADA';

  execute(
    'UPDATE authorizations SET used_qty = ?, available_qty = ?, status = ?, updated_at = ? WHERE id = ?',
    [newUsedQty, newAvailQty, newAuthStatus, now, auth.id]
  );

  // 4. Audit Log
  logAudit({
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'LOTE_GENERADO_MASIVO',
    entityType: 'LOTE',
    entityId: lotId,
    documentNumber: `${generatedNumbers[0]} ... ${generatedNumbers[generatedNumbers.length - 1]}`,
    docType: 'MEMORANDUM',
    year: currentYear,
    lotCode,
    reason: `Generación masiva de ${grandTotal} memorándums bajo autorización ${auth.code}`,
    newValues: {
      lotCode,
      quantity: grandTotal,
      startNumber: generatedNumbers[0],
      endNumber: generatedNumbers[generatedNumbers.length - 1],
      authorizationCode: auth.code
    },
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    lotId,
    lotCode,
    quantity: grandTotal,
    startNumber: generatedNumbers[0],
    endNumber: generatedNumbers[generatedNumbers.length - 1],
    message: `Lote ${lotCode} procesado exitosamente. Se generaron ${grandTotal} memorándums individuales del ${generatedNumbers[0]} al ${generatedNumbers[generatedNumbers.length - 1]}.`
  });
});

apiRouter.get('/bulk/lots', authMiddleware, (req, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const total = queryOne<{ count: number }>('SELECT count(*) as count FROM bulk_lots')?.count || 0;
  const lots = queryAll('SELECT * FROM bulk_lots ORDER BY id DESC LIMIT ? OFFSET ?', [limitNum, offset]);

  return res.json({
    items: lots,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

apiRouter.get('/bulk/lots/:id', authMiddleware, (req, res) => {
  const lotId = parseInt(req.params.id);
  const lot = queryOne('SELECT * FROM bulk_lots WHERE id = ?', [lotId]);
  if (!lot) return res.status(404).json({ error: 'Lote no encontrado.' });

  const documents = queryAll(
    `SELECT d.*, 
       (SELECT recipient_name FROM document_recipients WHERE document_id = d.id LIMIT 1) as recipient_name,
       (SELECT boss_name FROM document_recipients WHERE document_id = d.id LIMIT 1) as boss_name
     FROM documents d 
     WHERE d.lot_id = ? 
     ORDER BY d.number ASC`,
    [lotId]
  );

  return res.json({ lot, documents });
});

// ==========================================
// 8. DASHBOARD STATISTICS
// ==========================================

apiRouter.get('/dashboard/stats', authMiddleware, (req, res) => {
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Overall totals
  const totalDocuments = queryOne<{ count: number }>('SELECT count(*) as count FROM documents')?.count || 0;
  const totalMemorandums = queryOne<{ count: number }>("SELECT count(*) as count FROM documents WHERE doc_type = 'MEMORANDUM'")?.count || 0;
  const totalOficios = queryOne<{ count: number }>("SELECT count(*) as count FROM documents WHERE doc_type = 'OFICIO'")?.count || 0;
  const totalOficiosMultiples = queryOne<{ count: number }>("SELECT count(*) as count FROM documents WHERE doc_type = 'OFICIO_MULTIPLE'")?.count || 0;

  // Period totals
  const registeredToday = queryOne<{ count: number }>('SELECT count(*) as count FROM documents WHERE date = ?', [todayStr])?.count || 0;
  const registeredThisMonth = queryOne<{ count: number }>('SELECT count(*) as count FROM documents WHERE date LIKE ?', [`${thisMonthStr}%`])?.count || 0;
  const registeredThisYear = queryOne<{ count: number }>('SELECT count(*) as count FROM documents WHERE year = ?', [currentYear])?.count || 0;

  // By Status
  const byStatus = queryAll<{ status: string; count: number }>(
    'SELECT status, count(*) as count FROM documents GROUP BY status ORDER BY count DESC'
  );

  // By User
  const byUser = queryAll<{ user_name: string; count: number }>(
    'SELECT user_name, count(*) as count FROM documents GROUP BY user_name ORDER BY count DESC LIMIT 8'
  );

  // By Recipient
  const byRecipient = queryAll<{ recipient_name: string; count: number }>(
    'SELECT recipient_name, count(*) as count FROM document_recipients GROUP BY recipient_name ORDER BY count DESC LIMIT 8'
  );

  // Lots count
  const totalLots = queryOne<{ count: number }>('SELECT count(*) as count FROM bulk_lots')?.count || 0;

  // Numbering Pool summary
  const reservedCount = queryOne<{ count: number }>("SELECT count(*) as count FROM number_reservations WHERE status = 'RESERVADO'")?.count || 0;
  const usedCount = queryOne<{ count: number }>("SELECT count(*) as count FROM number_reservations WHERE status = 'UTILIZADO'")?.count || 0;
  const releasedCount = queryOne<{ count: number }>("SELECT count(*) as count FROM number_reservations WHERE status IN ('LIBERADO', 'EXPIRADO')")?.count || 0;

  return res.json({
    currentYear,
    todayStr,
    totalDocuments,
    totalMemorandums,
    totalOficios,
    totalOficiosMultiples,
    registeredToday,
    registeredThisMonth,
    registeredThisYear,
    totalLots,
    byStatus,
    byUser,
    byRecipient,
    numberingSummary: {
      reservedCount,
      usedCount,
      releasedCount
    }
  });
});

// ==========================================
// 9. AUDIT LOGS
// ==========================================

apiRouter.get('/audit', authMiddleware, (req, res) => {
  const {
    page = '1',
    limit = '30',
    action,
    entity_type,
    user_name,
    search,
    date_from,
    date_to
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(10, parseInt(limit) || 30));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];

  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (entity_type) {
    conditions.push('entity_type = ?');
    params.push(entity_type);
  }
  if (user_name) {
    conditions.push('user_name LIKE ?');
    params.push(`%${user_name.trim()}%`);
  }
  if (search) {
    conditions.push('(document_number LIKE ? OR reason LIKE ? OR lot_code LIKE ?)');
    const t = `%${search.trim()}%`;
    params.push(t, t, t);
  }
  if (date_from) {
    conditions.push('created_at >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('created_at <= ?');
    params.push(date_to + 'T23:59:59');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = queryOne<{ count: number }>(`SELECT count(*) as count FROM audit_logs ${whereClause}`, params)?.count || 0;
  const items = queryAll(`SELECT * FROM audit_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, [
    ...params,
    limitNum,
    offset
  ]);

  return res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

// ==========================================
// 10. EXPORT ROUTE (STREAMED/CONTROLLED CSV)
// ==========================================

apiRouter.get('/export/documents', authMiddleware, (req, res) => {
  const { doc_type, year, status, date_from, date_to } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];

  if (doc_type) {
    conditions.push('d.doc_type = ?');
    params.push(doc_type);
  }
  if (year) {
    conditions.push('d.year = ?');
    params.push(parseInt(year));
  }
  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
  }
  if (date_from) {
    conditions.push('d.date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('d.date <= ?');
    params.push(date_to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Limit export to max 5000 rows to ensure safety and speed
  const docs = queryAll<any>(
    `SELECT d.formatted_number, d.doc_type, d.year, d.date, d.subject, d.status, d.user_name,
       (SELECT group_concat(recipient_name, '; ') FROM document_recipients WHERE document_id = d.id) as destinatarios,
       (SELECT group_concat(boss_name, '; ') FROM document_recipients WHERE document_id = d.id) as responsables,
       d.lot_code, d.authorization_code, d.created_at
     FROM documents d
     ${whereClause}
     ORDER BY d.year DESC, d.doc_type ASC, d.number DESC
     LIMIT 5000`,
    params
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reporte_documentos_${new Date().toISOString().split('T')[0]}.csv"`);

  // UTF-8 BOM so Excel opens it with proper characters (ñ, á, etc.)
  res.write('\uFEFF');
  res.write('Numero,Tipo,Ano,Fecha,Asunto,Estado,Usuario,Destinatarios,Responsables,Lote,Autorizacion,Fecha_Registro\r\n');

  for (const d of docs) {
    const escapeCsv = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
    const line = [
      escapeCsv(d.formatted_number),
      escapeCsv(d.doc_type),
      escapeCsv(d.year),
      escapeCsv(d.date),
      escapeCsv(d.subject),
      escapeCsv(d.status),
      escapeCsv(d.user_name),
      escapeCsv(d.destinatarios),
      escapeCsv(d.responsables),
      escapeCsv(d.lot_code),
      escapeCsv(d.authorization_code),
      escapeCsv(d.created_at)
    ].join(',');
    res.write(line + '\r\n');
  }

  res.end();
});

// ==========================================
// 11. BACKUP & RESTORE ROUTES (RESPALDO AUTOMÁTICO Y MANUAL)
// ==========================================

apiRouter.get('/backup/export', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const backupData = {
      schema_version: '1.0',
      timestamp: new Date().toISOString(),
      exported_by: req.user?.name || 'Sistema',
      users: queryAll('SELECT id, username, name, email, role, status, created_at, updated_at FROM users'),
      document_types: queryAll('SELECT * FROM document_types'),
      numbering_sequences: queryAll('SELECT * FROM numbering_sequences'),
      number_reservations: queryAll('SELECT * FROM number_reservations'),
      recipients: queryAll('SELECT * FROM recipients'),
      authorizations: queryAll('SELECT * FROM authorizations'),
      bulk_lots: queryAll('SELECT * FROM bulk_lots'),
      documents: queryAll('SELECT * FROM documents'),
      document_recipients: queryAll('SELECT * FROM document_recipients'),
      audit_logs: queryAll('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500')
    };

    logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'RESPALDO_EXPORTADO_MANUAL',
      entityType: 'SISTEMA',
      reason: 'Generación y descarga manual de copia de respaldo completa de la base de datos',
      ipAddress: req.ip
    });

    const filename = `respaldo_sistema_documental_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al generar respaldo: ' + err.message });
  }
});

apiRouter.post('/backup/import', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object' || !data.documents || !data.numbering_sequences) {
    return res.status(400).json({ error: 'El archivo de respaldo no tiene una estructura válida o se encuentra dañado.' });
  }

  try {
    const now = new Date().toISOString();

    // Clear existing data safely
    execute('DELETE FROM document_recipients');
    execute('DELETE FROM documents');
    execute('DELETE FROM bulk_lots');
    execute('DELETE FROM number_reservations');
    execute('DELETE FROM numbering_sequences');
    execute('DELETE FROM authorizations');
    execute('DELETE FROM recipients');

    // Restore Recipients
    if (Array.isArray(data.recipients)) {
      for (const r of data.recipients) {
        execute(
          'INSERT INTO recipients (id, name, acronym, boss_name, boss_position, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.name, r.acronym || '', r.boss_name, r.boss_position, r.status || 'ACTIVO', r.created_at || now, r.updated_at || now]
        );
      }
    }

    // Restore Authorizations
    if (Array.isArray(data.authorizations)) {
      for (const a of data.authorizations) {
        execute(
          `INSERT INTO authorizations (id, code, date, operation_type, subject, description, authorizing_area, authorizing_boss, user_id, user_name, authorized_qty, used_qty, available_qty, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.code, a.date, a.operation_type, a.subject, a.description || '', a.authorizing_area, a.authorizing_boss, a.user_id, a.user_name, a.authorized_qty, a.used_qty, a.available_qty, a.status, a.created_at || now, a.updated_at || now]
        );
      }
    }

    // Restore Numbering Sequences
    if (Array.isArray(data.numbering_sequences)) {
      for (const s of data.numbering_sequences) {
        execute(
          'INSERT INTO numbering_sequences (id, doc_type, year, last_number, updated_at) VALUES (?, ?, ?, ?, ?)',
          [s.id, s.doc_type, s.year, s.last_number, s.updated_at || now]
        );
      }
    }

    // Restore Number Reservations
    if (Array.isArray(data.number_reservations)) {
      for (const nr of data.number_reservations) {
        execute(
          `INSERT INTO number_reservations (id, doc_type, year, number, formatted_number, user_id, user_name, status, reserved_at, expires_at, released_at, released_by_user_id, released_by_user_name, release_reason, document_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nr.id, nr.doc_type, nr.year, nr.number, nr.formatted_number, nr.user_id, nr.user_name, nr.status, nr.reserved_at, nr.expires_at, nr.released_at || null, nr.released_by_user_id || null, nr.released_by_user_name || null, nr.release_reason || null, nr.document_id || null, nr.created_at || now]
        );
      }
    }

    // Restore Bulk Lots
    if (Array.isArray(data.bulk_lots)) {
      for (const l of data.bulk_lots) {
        execute(
          `INSERT INTO bulk_lots (id, code, date, user_id, user_name, operation_type, authorization_id, authorization_code, quantity, subject, description, recipients_summary, distribution_mode, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [l.id, l.code, l.date, l.user_id, l.user_name, l.operation_type, l.authorization_id || null, l.authorization_code || null, l.quantity, l.subject, l.description || '', l.recipients_summary || '', l.distribution_mode || 'SINGLE', l.status || 'COMPLETADO', l.created_at || now]
        );
      }
    }

    // Restore Documents
    if (Array.isArray(data.documents)) {
      for (const d of data.documents) {
        execute(
          `INSERT INTO documents (id, doc_type, year, number, formatted_number, date, subject, description, status, user_id, user_name, observations, lot_id, lot_code, authorization_id, authorization_code, variable_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [d.id, d.doc_type, d.year, d.number, d.formatted_number, d.date, d.subject, d.description || '', d.status, d.user_id, d.user_name, d.observations || null, d.lot_id || null, d.lot_code || null, d.authorization_id || null, d.authorization_code || null, d.variable_data || null, d.created_at || now, d.updated_at || now]
        );
      }
    }

    // Restore Document Recipients
    if (Array.isArray(data.document_recipients)) {
      for (const dr of data.document_recipients) {
        execute(
          `INSERT INTO document_recipients (id, document_id, recipient_id, recipient_name, recipient_acronym, boss_name, boss_position, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [dr.id, dr.document_id, dr.recipient_id, dr.recipient_name, dr.recipient_acronym || '', dr.boss_name, dr.boss_position, dr.created_at || now]
        );
      }
    }

    saveDatabase();

    logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      action: 'RESPALDO_RESTAURADO',
      entityType: 'SISTEMA',
      reason: `Restauración completa de base de datos desde respaldo exportado el ${data.timestamp || 'anterioridad'}`,
      newValues: {
        documentsRestored: data.documents?.length || 0,
        recipientsRestored: data.recipients?.length || 0,
        authorizationsRestored: data.authorizations?.length || 0
      },
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Restauración exitosa. Se restauraron ${data.documents?.length || 0} documentos, ${data.recipients?.length || 0} destinatarios y sus secuencias oficiales.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error durante la restauración: ' + err.message });
  }
});

