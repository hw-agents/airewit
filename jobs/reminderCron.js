/**
 * RSVP Reminder Cron Job
 *
 * Runs daily at 09:00 Asia/Jerusalem.
 * Finds events at 7-day and 2-day thresholds with pending guests.
 * Updates invitations.whatsapp_link with a fresh wa.me reminder deep-link.
 * Organizer clicks the link manually (no auto-send in MVP).
 */

const cron = require('node-cron');
const pool = require('../db/pool');

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

function buildReminderWhatsAppLink(phone, eventTitle, rsvpUrl, daysUntilEvent) {
  if (!phone) return null;
  const phoneDigits = phone.replace('+', '');
  const urgency = daysUntilEvent <= 2 ? 'עוד 2 ימים' : 'עוד שבוע';
  const message = encodeURIComponent(
    `תזכורת: ${urgency} לאירוע "${eventTitle}". אנא אשר/י הגעה: ${rsvpUrl}`
  );
  return `https://wa.me/${phoneDigits}?text=${message}`;
}

async function generateReminders() {
  console.log('[ReminderCron] Running RSVP reminder generation…');

  try {
    // Find pending guests whose event is 7 or 2 days from now (±12h window for daily run)
    const { rows } = await pool.query(`
      SELECT
        g.id          AS guest_id,
        g.name_hebrew,
        g.phone,
        e.id          AS event_id,
        e.title,
        e.event_date,
        i.token,
        EXTRACT(DAY FROM (e.event_date::date - CURRENT_DATE)) AS days_until
      FROM guests g
      JOIN events e ON e.id = g.event_id
      JOIN invitations i ON i.guest_id = g.id
      WHERE g.rsvp_status = 'pending'
        AND e.deleted_at IS NULL
        AND e.event_date > NOW()
        AND EXTRACT(DAY FROM (e.event_date::date - CURRENT_DATE)) IN (7, 2)
    `);

    if (rows.length === 0) {
      console.log('[ReminderCron] No pending reminders due today.');
      return;
    }

    for (const row of rows) {
      const rsvpUrl = `${BASE_URL}/rsvp/${row.token}`;
      const whatsappLink = buildReminderWhatsAppLink(
        row.phone, row.title, rsvpUrl, parseInt(row.days_until)
      );

      if (whatsappLink) {
        await pool.query(
          'UPDATE invitations SET whatsapp_link = $1 WHERE token = $2',
          [whatsappLink, row.token]
        );
      }
    }

    console.log(`[ReminderCron] Updated ${rows.length} pending reminder links.`);
  } catch (err) {
    console.error('[ReminderCron] Error:', err.message);
  }
}

function startReminderCron() {
  // 09:00 every day, Asia/Jerusalem timezone
  cron.schedule('0 9 * * *', generateReminders, {
    timezone: 'Asia/Jerusalem',
  });
  console.log('[ReminderCron] Scheduled: daily at 09:00 Asia/Jerusalem');
}

module.exports = { startReminderCron, generateReminders };
