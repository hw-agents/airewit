const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// ─── GET /api/rsvp/:token — Public RSVP page data (no auth) ─────────────────

router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         i.token, i.opened_at,
         g.id AS guest_id, g.name_hebrew, g.name_transliteration,
         g.rsvp_status, g.dietary_preference, g.dietary_notes,
         e.id AS event_id, e.title, e.event_date, e.venue_name, e.venue_address,
         e.kashrut_level, e.language_pref
       FROM invitations i
       JOIN guests g ON g.id = i.guest_id
       JOIN events e ON e.id = i.event_id
       WHERE i.token = $1
         AND e.deleted_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'קישור ההזמנה לא נמצא' });
    }

    const row = result.rows[0];

    // Mark as opened (first visit) — idempotent, only set once
    if (!row.opened_at) {
      await pool.query(
        'UPDATE invitations SET opened_at = NOW() WHERE token = $1',
        [token]
      );
    }

    return res.json({
      guest: {
        id: row.guest_id,
        name_hebrew: row.name_hebrew,
        name_transliteration: row.name_transliteration,
        rsvp_status: row.rsvp_status,
        dietary_preference: row.dietary_preference,
        dietary_notes: row.dietary_notes,
      },
      event: {
        id: row.event_id,
        title: row.title,
        event_date: row.event_date,
        venue_name: row.venue_name,
        venue_address: row.venue_address,
        kashrut_level: row.kashrut_level,
        language_pref: row.language_pref,
      },
    });
  } catch (err) {
    console.error('RSVP get error:', err.message);
    return res.status(500).json({ error: 'שגיאה בטעינת ההזמנה' });
  }
});

// ─── POST /api/rsvp/:token — Submit RSVP (idempotent, no auth) ───────────────

router.post('/:token', async (req, res) => {
  const { token } = req.params;
  const { rsvp_status, dietary_preference, dietary_notes } = req.body;

  const validRsvp = ['confirmed', 'declined'];
  if (!rsvp_status || !validRsvp.includes(rsvp_status)) {
    return res.status(400).json({ error: 'נא לבחור אישור או דחייה' });
  }

  const validDietary = ['none', 'vegetarian', 'vegan', 'kosher_regular', 'kosher_mehadrin'];
  if (dietary_preference && !validDietary.includes(dietary_preference)) {
    return res.status(400).json({ error: 'סוג תזונה לא תקין' });
  }

  try {
    const invResult = await pool.query(
      `SELECT i.guest_id, e.deleted_at
       FROM invitations i
       JOIN guests g ON g.id = i.guest_id
       JOIN events e ON e.id = g.event_id
       WHERE i.token = $1`,
      [token]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'קישור ההזמנה לא נמצא' });
    }

    if (invResult.rows[0].deleted_at) {
      return res.status(410).json({ error: 'האירוע בוטל' });
    }

    const guestId = invResult.rows[0].guest_id;

    // Idempotent upsert — safe to call multiple times for the same guest
    const updatedFields = [rsvp_status, guestId];
    const dietaryUpdate = dietary_preference
      ? `, dietary_preference = $3::dietary_preference${dietary_notes !== undefined ? ', dietary_notes = $4' : ''}`
      : dietary_notes !== undefined
        ? ', dietary_notes = $3'
        : '';

    let query;
    let params;

    if (dietary_preference && dietary_notes !== undefined) {
      query = `UPDATE guests SET rsvp_status = $1::rsvp_status${dietaryUpdate}, updated_at = NOW() WHERE id = $2 RETURNING rsvp_status, dietary_preference, dietary_notes`;
      params = [rsvp_status, guestId, dietary_preference, dietary_notes];
    } else if (dietary_preference) {
      query = `UPDATE guests SET rsvp_status = $1::rsvp_status${dietaryUpdate}, updated_at = NOW() WHERE id = $2 RETURNING rsvp_status, dietary_preference, dietary_notes`;
      params = [rsvp_status, guestId, dietary_preference];
    } else if (dietary_notes !== undefined) {
      query = `UPDATE guests SET rsvp_status = $1::rsvp_status, dietary_notes = $3, updated_at = NOW() WHERE id = $2 RETURNING rsvp_status, dietary_preference, dietary_notes`;
      params = [rsvp_status, guestId, dietary_notes];
    } else {
      query = `UPDATE guests SET rsvp_status = $1::rsvp_status, updated_at = NOW() WHERE id = $2 RETURNING rsvp_status, dietary_preference, dietary_notes`;
      params = [rsvp_status, guestId];
    }

    const result = await pool.query(query, params);

    return res.json({
      message: rsvp_status === 'confirmed' ? 'תודה! הגעתך אושרה.' : 'תודה! עדכנו את מצבך.',
      guest: result.rows[0],
    });
  } catch (err) {
    console.error('RSVP submit error:', err.message);
    return res.status(500).json({ error: 'שגיאה בעדכון ה-RSVP' });
  }
});

module.exports = router;
