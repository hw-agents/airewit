const express = require('express');
const crypto = require('crypto');
const { Parser } = require('json2csv');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize Israeli phone to E.164: 05X-XXXXXXX or 05XXXXXXXXX → +972XXXXXXXXX */
function normalizeIsraeliPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}

/** Generate a cryptographically secure RSVP token (128 bits = 32 hex chars) */
function generateRsvpToken() {
  return crypto.randomBytes(16).toString('hex'); // 128 bits
}

/** Build wa.me deep-link for WhatsApp RSVP */
function buildWhatsAppLink(phone, eventTitle, rsvpUrl) {
  if (!phone) return null;
  const normalized = normalizeIsraeliPhone(phone);
  const phoneDigits = normalized.replace('+', '');
  const message = encodeURIComponent(
    `הוזמנת לאירוע "${eventTitle}". לאישור הגעה: ${rsvpUrl}`
  );
  return `https://wa.me/${phoneDigits}?text=${message}`;
}

/** Verify organizer owns the event */
async function verifyEventOwner(eventId, organizerId) {
  const result = await pool.query(
    'SELECT id, title, venue_capacity FROM events WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL',
    [eventId, organizerId]
  );
  return result.rows[0] || null;
}

/** Return capacity warning if confirmed RSVPs ≥ 90% of venue_capacity */
async function getCapacityWarning(eventId, venueCapacity) {
  if (!venueCapacity) return null;
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM guests WHERE event_id = $1 AND rsvp_status = 'confirmed'`,
    [eventId]
  );
  const confirmed = parseInt(rows[0].count, 10);
  const pct = confirmed / venueCapacity;
  if (pct >= 0.9) {
    return {
      type: 'capacity_warning',
      message: `אזהרה: ${confirmed} מתוך ${venueCapacity} מקומות מאושרים (${Math.round(pct * 100)}%)`,
      confirmed,
      capacity: venueCapacity,
      percent: Math.round(pct * 100),
    };
  }
  return null;
}

// ─── POST /api/events/:eventId/guests — Add guest ────────────────────────────

router.post('/events/:eventId/guests', authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const organizerId = req.user.id;

  if (req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'Only organizers can add guests' });
  }

  const event = await verifyEventOwner(eventId, organizerId).catch(() => null);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    name_hebrew,
    name_transliteration,
    email,
    phone,
    relationship_group,
    dietary_preference,
    dietary_notes,
    accessibility_needs,
    table_number,
    seat_number,
    plus_one_of,
    plus_one_allowance,
  } = req.body;

  if (!name_hebrew || name_hebrew.trim().length === 0) {
    return res.status(400).json({ error: 'שם בעברית הוא שדה חובה' });
  }

  const validDietary = ['none', 'vegetarian', 'vegan', 'kosher_regular', 'kosher_mehadrin'];
  const validRelationship = ['family_bride', 'family_groom', 'friends', 'work', 'community', 'other'];

  if (dietary_preference && !validDietary.includes(dietary_preference)) {
    return res.status(400).json({ error: 'סוג תזונה לא תקין' });
  }
  if (relationship_group && !validRelationship.includes(relationship_group)) {
    return res.status(400).json({ error: 'קבוצת יחסים לא תקינה' });
  }

  const normalizedPhone = normalizeIsraeliPhone(phone);

  try {
    // Insert guest
    const guestResult = await pool.query(
      `INSERT INTO guests (
        event_id, name_hebrew, name_transliteration, email, phone,
        relationship_group, dietary_preference, dietary_notes,
        accessibility_needs, table_number, seat_number,
        plus_one_of, plus_one_allowance, source, privacy_accepted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'registered', NOW())
      RETURNING *`,
      [
        eventId,
        name_hebrew.trim(),
        name_transliteration?.trim() || null,
        email?.toLowerCase() || null,
        normalizedPhone,
        relationship_group || null,
        dietary_preference || 'none',
        dietary_notes || null,
        accessibility_needs || null,
        table_number || null,
        seat_number || null,
        plus_one_of || null,
        plus_one_allowance || 0,
      ]
    );
    const guest = guestResult.rows[0];

    // Generate invitation + WhatsApp link
    const token = generateRsvpToken();
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const rsvpUrl = `${baseUrl}/rsvp/${token}`;
    const whatsappLink = buildWhatsAppLink(normalizedPhone, event.title, rsvpUrl);

    await pool.query(
      `INSERT INTO invitations (event_id, guest_id, token, channel, whatsapp_link)
       VALUES ($1, $2, $3, 'whatsapp', $4)`,
      [eventId, guest.id, token, whatsappLink]
    );

    // Capacity warning check
    const warning = await getCapacityWarning(eventId, event.venue_capacity);

    return res.status(201).json({
      guest,
      rsvp_url: rsvpUrl,
      whatsapp_link: whatsappLink,
      ...(warning && { warning }),
    });
  } catch (err) {
    console.error('Add guest error:', err.message);
    return res.status(500).json({ error: 'Failed to add guest' });
  }
});

// ─── GET /api/events/:eventId/guests — List guests ───────────────────────────

router.get('/events/:eventId/guests', authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const organizerId = req.user.id;

  const event = await verifyEventOwner(eventId, organizerId).catch(() => null);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { status, search, page = 1, limit = 100 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ['g.event_id = $1'];
  const params = [eventId];
  let paramIdx = 2;

  if (status && ['pending', 'confirmed', 'declined'].includes(status)) {
    conditions.push(`g.rsvp_status = $${paramIdx++}`);
    params.push(status);
  }

  if (search) {
    // pg_trgm fuzzy search on Hebrew name
    conditions.push(`(g.name_hebrew % $${paramIdx} OR g.name_transliteration ILIKE $${paramIdx + 1})`);
    params.push(search, `%${search}%`);
    paramIdx += 2;
  }

  const where = conditions.join(' AND ');

  try {
    const [guestsResult, countResult, summaryResult] = await Promise.all([
      pool.query(
        `SELECT g.*, i.token, i.whatsapp_link, i.sent_at, i.opened_at
         FROM guests g
         LEFT JOIN invitations i ON i.guest_id = g.id
         WHERE ${where}
         ORDER BY g.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM guests g WHERE ${where}`, params),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE rsvp_status = 'pending')   AS pending,
           COUNT(*) FILTER (WHERE rsvp_status = 'confirmed') AS confirmed,
           COUNT(*) FILTER (WHERE rsvp_status = 'declined')  AS declined,
           COUNT(*)                                           AS total
         FROM guests WHERE event_id = $1`,
        [eventId]
      ),
    ]);

    const warning = await getCapacityWarning(eventId, event.venue_capacity);

    return res.json({
      guests: guestsResult.rows,
      summary: summaryResult.rows[0],
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      ...(warning && { warning }),
    });
  } catch (err) {
    console.error('List guests error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

// ─── GET /api/events/:eventId/guests/export — CSV export ─────────────────────

router.get('/events/:eventId/guests/export', authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const organizerId = req.user.id;

  const event = await verifyEventOwner(eventId, organizerId).catch(() => null);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  try {
    const { rows } = await pool.query(
      `SELECT
         g.name_hebrew, g.name_transliteration, g.email, g.phone,
         g.rsvp_status, g.table_number, g.seat_number,
         g.relationship_group, g.dietary_preference, g.dietary_notes,
         g.accessibility_needs, g.plus_one_allowance,
         g.created_at,
         i.whatsapp_link, i.sent_at AS invitation_sent_at, i.opened_at AS invitation_opened_at
       FROM guests g
       LEFT JOIN invitations i ON i.guest_id = g.id
       WHERE g.event_id = $1
       ORDER BY g.name_hebrew`,
      [eventId]
    );

    const fields = [
      { label: 'שם בעברית', value: 'name_hebrew' },
      { label: 'תעתיק', value: 'name_transliteration' },
      { label: 'אימייל', value: 'email' },
      { label: 'טלפון', value: 'phone' },
      { label: 'סטטוס RSVP', value: 'rsvp_status' },
      { label: 'מספר שולחן', value: 'table_number' },
      { label: 'מספר מושב', value: 'seat_number' },
      { label: 'קבוצת יחסים', value: 'relationship_group' },
      { label: 'העדפה תזונתית', value: 'dietary_preference' },
      { label: 'הערות תזונה', value: 'dietary_notes' },
      { label: 'צרכי נגישות', value: 'accessibility_needs' },
      { label: 'מלווים מורשים', value: 'plus_one_allowance' },
      { label: 'קישור WhatsApp', value: 'whatsapp_link' },
      { label: 'הוזמנות נשלחה', value: 'invitation_sent_at' },
      { label: 'הוזמנות נפתחה', value: 'invitation_opened_at' },
      { label: 'תאריך הוספה', value: 'created_at' },
    ];

    const parser = new Parser({ fields, withBOM: true }); // BOM for Excel Hebrew support
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guests-${eventId}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err.message);
    return res.status(500).json({ error: 'CSV export failed' });
  }
});

// ─── PUT /api/guests/:guestId — Update guest ─────────────────────────────────

router.put('/guests/:guestId', authMiddleware, async (req, res) => {
  const { guestId } = req.params;
  const organizerId = req.user.id;

  // Verify organizer owns the event this guest belongs to
  const ownerCheck = await pool.query(
    `SELECT g.id FROM guests g
     JOIN events e ON e.id = g.event_id
     WHERE g.id = $1 AND e.organizer_id = $2 AND e.deleted_at IS NULL`,
    [guestId, organizerId]
  ).catch(() => ({ rows: [] }));

  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const {
    name_hebrew, name_transliteration, email, phone,
    rsvp_status, table_number, seat_number,
    relationship_group, dietary_preference, dietary_notes,
    accessibility_needs, plus_one_allowance,
  } = req.body;

  const validRsvp = ['pending', 'confirmed', 'declined'];
  const validDietary = ['none', 'vegetarian', 'vegan', 'kosher_regular', 'kosher_mehadrin'];

  if (rsvp_status && !validRsvp.includes(rsvp_status)) {
    return res.status(400).json({ error: 'סטטוס RSVP לא תקין' });
  }
  if (dietary_preference && !validDietary.includes(dietary_preference)) {
    return res.status(400).json({ error: 'סוג תזונה לא תקין' });
  }

  try {
    const result = await pool.query(
      `UPDATE guests SET
         name_hebrew          = COALESCE($1, name_hebrew),
         name_transliteration = COALESCE($2, name_transliteration),
         email                = COALESCE($3, email),
         phone                = COALESCE($4, phone),
         rsvp_status          = COALESCE($5::rsvp_status, rsvp_status),
         table_number         = COALESCE($6, table_number),
         seat_number          = COALESCE($7, seat_number),
         relationship_group   = COALESCE($8::relationship_group, relationship_group),
         dietary_preference   = COALESCE($9::dietary_preference, dietary_preference),
         dietary_notes        = COALESCE($10, dietary_notes),
         accessibility_needs  = COALESCE($11, accessibility_needs),
         plus_one_allowance   = COALESCE($12, plus_one_allowance),
         updated_at           = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name_hebrew?.trim() || null,
        name_transliteration?.trim() || null,
        email?.toLowerCase() || null,
        phone ? normalizeIsraeliPhone(phone) : null,
        rsvp_status || null,
        table_number || null,
        seat_number || null,
        relationship_group || null,
        dietary_preference || null,
        dietary_notes || null,
        accessibility_needs || null,
        plus_one_allowance != null ? parseInt(plus_one_allowance) : null,
        guestId,
      ]
    );

    // Check capacity after update
    const eventRow = await pool.query(
      'SELECT venue_capacity, id FROM events WHERE id = (SELECT event_id FROM guests WHERE id = $1)',
      [guestId]
    );
    const warning = eventRow.rows[0]
      ? await getCapacityWarning(eventRow.rows[0].id, eventRow.rows[0].venue_capacity)
      : null;

    return res.json({
      guest: result.rows[0],
      ...(warning && { warning }),
    });
  } catch (err) {
    console.error('Update guest error:', err.message);
    return res.status(500).json({ error: 'Failed to update guest' });
  }
});

// ─── DELETE /api/guests/:guestId — Hard delete (Israeli Privacy Law) ─────────

router.delete('/guests/:guestId', authMiddleware, async (req, res) => {
  const { guestId } = req.params;
  const organizerId = req.user.id;

  const ownerCheck = await pool.query(
    `SELECT g.id FROM guests g
     JOIN events e ON e.id = g.event_id
     WHERE g.id = $1 AND e.organizer_id = $2 AND e.deleted_at IS NULL`,
    [guestId, organizerId]
  ).catch(() => ({ rows: [] }));

  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  try {
    // Hard delete per Israeli Privacy Law 2023 (no deleted_at on guests table)
    await pool.query('DELETE FROM guests WHERE id = $1', [guestId]);
    return res.json({ message: 'Guest deleted successfully' });
  } catch (err) {
    console.error('Delete guest error:', err.message);
    return res.status(500).json({ error: 'Failed to delete guest' });
  }
});

module.exports = router;
