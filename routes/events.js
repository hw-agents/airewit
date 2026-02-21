const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All event routes require auth — middleware applied in server.js before this router

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUS = ['draft', 'published', 'cancelled', 'completed'];
const VALID_KASHRUT = ['none', 'regular', 'mehadrin', 'chalav_yisrael'];
const VALID_LANGUAGE = ['hebrew', 'arabic', 'english'];

/** Return enriched event row: adds RSVP counts + confirmed vendor count */
async function enrichEvent(eventId) {
  const { rows } = await pool.query(
    `SELECT
       e.*,
       COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'confirmed') AS rsvp_confirmed,
       COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'pending')   AS rsvp_pending,
       COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'declined')  AS rsvp_declined,
       COUNT(DISTINCT g.id)                                             AS rsvp_total,
       COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed')      AS vendors_confirmed
     FROM events e
     LEFT JOIN guests g  ON g.event_id = e.id
     LEFT JOIN bookings b ON b.event_id = e.id AND b.deleted_at IS NULL
     WHERE e.id = $1 AND e.deleted_at IS NULL
     GROUP BY e.id`,
    [eventId]
  );
  return rows[0] || null;
}

// ─── POST /api/events — Create event ─────────────────────────────────────────

router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'רק מארגנים יכולים ליצור אירועים' });
  }

  const {
    title, event_date, venue_name, venue_address, description,
    max_guests, venue_capacity, max_plus_ones_buffer,
    kashrut_level, noise_curfew_time, language_pref, budget,
    retention_policy_days,
    compliance_dismissed,
  } = req.body;

  // Validation
  if (!title || title.trim().length === 0) return res.status(400).json({ error: 'שם האירוע הוא שדה חובה' });
  if (!event_date) return res.status(400).json({ error: 'תאריך האירוע הוא שדה חובה' });
  if (!venue_name || venue_name.trim().length === 0) return res.status(400).json({ error: 'שם המקום הוא שדה חובה' });

  // Date cannot be in the past (compare in Asia/Jerusalem)
  const eventDateObj = new Date(event_date);
  if (isNaN(eventDateObj.getTime())) return res.status(400).json({ error: 'תאריך לא תקין' });
  if (eventDateObj < new Date()) return res.status(400).json({ error: 'לא ניתן ליצור אירוע בתאריך עבר' });

  if (kashrut_level && !VALID_KASHRUT.includes(kashrut_level)) return res.status(400).json({ error: 'רמת כשרות לא תקינה' });
  if (language_pref && !VALID_LANGUAGE.includes(language_pref)) return res.status(400).json({ error: 'שפה לא תקינה' });

  try {
    const result = await pool.query(
      `INSERT INTO events (
         organizer_id, title, event_date, venue_name, venue_address, description,
         max_guests, venue_capacity, max_plus_ones_buffer,
         kashrut_level, noise_curfew_time, language_pref, budget,
         retention_policy_days, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft')
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        event_date,
        venue_name.trim(),
        venue_address?.trim() || null,
        description?.trim() || null,
        max_guests || null,
        venue_capacity || null,
        max_plus_ones_buffer ?? 30,
        kashrut_level || 'none',
        noise_curfew_time || '23:00',
        language_pref || 'hebrew',
        budget || null,
        retention_policy_days ?? 365,
      ]
    );

    const event = result.rows[0];

    // Store compliance dismissal if provided at creation time
    if (compliance_dismissed && event.max_guests >= 100) {
      await pool.query(
        'UPDATE events SET compliance_dismissed = true WHERE id = $1',
        [event.id]
      ).catch(() => {}); // compliance_dismissed column added via migration — ignore if not yet present
    }

    // Check if compliance checklist should be shown
    const showComplianceChecklist = (max_guests || 0) >= 100 && !compliance_dismissed;

    return res.status(201).json({
      event,
      ...(showComplianceChecklist && { compliance_checklist: true }),
    });
  } catch (err) {
    console.error('Create event error:', err.message);
    return res.status(500).json({ error: 'יצירת האירוע נכשלה' });
  }
});

// ─── GET /api/events — List organizer events ──────────────────────────────────

router.get('/', authMiddleware, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ['e.organizer_id = $1', 'e.deleted_at IS NULL'];
  const params = [req.user.id];
  let paramIdx = 2;

  if (status && VALID_STATUS.includes(status)) {
    conditions.push(`e.status = $${paramIdx++}::event_status`);
    params.push(status);
  }

  const where = conditions.join(' AND ');

  try {
    const [eventsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           e.*,
           COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'confirmed') AS rsvp_confirmed,
           COUNT(DISTINCT g.id) FILTER (WHERE g.rsvp_status = 'pending')   AS rsvp_pending,
           COUNT(DISTINCT g.id)                                             AS rsvp_total,
           COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed')      AS vendors_confirmed
         FROM events e
         LEFT JOIN guests g  ON g.event_id = e.id
         LEFT JOIN bookings b ON b.event_id = e.id AND b.deleted_at IS NULL
         WHERE ${where}
         GROUP BY e.id
         ORDER BY e.event_date ASC NULLS LAST
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM events e WHERE ${where}`, params),
    ]);

    return res.json({
      events: eventsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('List events error:', err.message);
    return res.status(500).json({ error: 'טעינת האירועים נכשלה' });
  }
});

// ─── GET /api/events/:id — Get single event ───────────────────────────────────

router.get('/:id', authMiddleware, async (req, res) => {
  const event = await enrichEvent(req.params.id).catch(() => null);
  if (!event) return res.status(404).json({ error: 'האירוע לא נמצא' });
  if (event.organizer_id !== req.user.id) return res.status(403).json({ error: 'אין גישה לאירוע זה' });
  return res.json({ event });
});

// ─── PUT /api/events/:id — Update event ──────────────────────────────────────

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  // Ownership check
  const ownerCheck = await pool.query(
    'SELECT id, status FROM events WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL',
    [id, req.user.id]
  ).catch(() => ({ rows: [] }));

  if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'האירוע לא נמצא' });

  const currentStatus = ownerCheck.rows[0].status;
  if (currentStatus === 'cancelled') return res.status(400).json({ error: 'לא ניתן לערוך אירוע שבוטל' });

  const {
    title, event_date, venue_name, venue_address, description,
    max_guests, venue_capacity, max_plus_ones_buffer,
    kashrut_level, noise_curfew_time, language_pref, budget,
    status, compliance_dismissed,
  } = req.body;

  // Validate status transition
  if (status) {
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'סטטוס לא תקין' });
    const allowedTransitions = {
      draft: ['published', 'cancelled'],
      published: ['cancelled', 'completed'],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ error: `לא ניתן לשנות מ-${currentStatus} ל-${status}` });
    }
  }

  // Date validation if provided
  if (event_date) {
    const d = new Date(event_date);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'תאריך לא תקין' });
    if (d < new Date() && status !== 'cancelled' && status !== 'completed') {
      return res.status(400).json({ error: 'לא ניתן לקבוע תאריך בעבר' });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE events SET
         title                = COALESCE($1, title),
         event_date           = COALESCE($2, event_date),
         venue_name           = COALESCE($3, venue_name),
         venue_address        = COALESCE($4, venue_address),
         description          = COALESCE($5, description),
         max_guests           = COALESCE($6, max_guests),
         venue_capacity       = COALESCE($7, venue_capacity),
         max_plus_ones_buffer = COALESCE($8, max_plus_ones_buffer),
         kashrut_level        = COALESCE($9::kashrut_level, kashrut_level),
         noise_curfew_time    = COALESCE($10, noise_curfew_time),
         language_pref        = COALESCE($11::event_language, language_pref),
         budget               = COALESCE($12, budget),
         status               = COALESCE($13::event_status, status),
         updated_at           = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        title?.trim() || null,
        event_date || null,
        venue_name?.trim() || null,
        venue_address?.trim() || null,
        description?.trim() || null,
        max_guests || null,
        venue_capacity || null,
        max_plus_ones_buffer != null ? parseInt(max_plus_ones_buffer) : null,
        kashrut_level || null,
        noise_curfew_time || null,
        language_pref || null,
        budget || null,
        status || null,
        id,
      ]
    );

    const updatedEvent = await enrichEvent(id);

    // Compliance checklist: show if guest count crosses 100 and not dismissed
    const effectiveMaxGuests = updatedEvent.max_guests || 0;
    const showCompliance = effectiveMaxGuests >= 100 && !compliance_dismissed && !updatedEvent.compliance_dismissed;

    return res.json({
      event: updatedEvent,
      ...(showCompliance && { compliance_checklist: true }),
    });
  } catch (err) {
    console.error('Update event error:', err.message);
    return res.status(500).json({ error: 'עדכון האירוע נכשל' });
  }
});

// ─── DELETE /api/events/:id — Soft delete (cancelled = soft-delete for organizer) ──

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  const ownerCheck = await pool.query(
    'SELECT id FROM events WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL',
    [id, req.user.id]
  ).catch(() => ({ rows: [] }));

  if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'האירוע לא נמצא' });

  try {
    await pool.query(
      'UPDATE events SET deleted_at = NOW(), status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', id]
    );
    return res.status(204).send();
  } catch (err) {
    console.error('Delete event error:', err.message);
    return res.status(500).json({ error: 'מחיקת האירוע נכשלה' });
  }
});

module.exports = router;
