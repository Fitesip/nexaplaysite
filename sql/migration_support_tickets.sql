-- Support ticket system: replaces the single continuous per-user support chat
-- with discrete tickets (subject + full text + optional media attachments)
-- that staff can close. Existing conversations are NOT lost — every user who
-- already has messages gets one legacy ticket created for them below, and all
-- their old messages are attached to it.
use nexa;

-- 1. Tickets: one row per "обращение". `subject` is the short freeform question
--    the user types when opening the ticket; the full description is stored as
--    that ticket's first support_messages row (see below).
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject VARCHAR(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  status ENUM('open', 'closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  closed_by INT NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_support_tickets_user (user_id, created_at),
  CONSTRAINT support_tickets_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT support_tickets_closed_by_fk FOREIGN KEY (closed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Backfill: give every user who already has support_messages a single
--    "legacy" ticket, spanning their first to last message, marked closed
--    (we don't know if it was ever resolved, but there's no live conversation
--    to keep open either — a fresh reply from them will naturally start a new
--    ticket going forward).
INSERT INTO support_tickets (user_id, subject, status, created_at, closed_at)
SELECT sm.user_id,
       'Обращение (перенесено из старого чата)',
       'closed',
       MIN(sm.created_at),
       MAX(sm.created_at)
FROM support_messages sm
WHERE NOT EXISTS (SELECT 1 FROM support_tickets st WHERE st.user_id = sm.user_id)
GROUP BY sm.user_id;

-- 3. Point every existing message at its (new legacy, or future) ticket.
ALTER TABLE support_messages
  ADD COLUMN ticket_id INT NULL AFTER user_id;

UPDATE support_messages sm
JOIN support_tickets st ON st.user_id = sm.user_id
SET sm.ticket_id = st.id
WHERE sm.ticket_id IS NULL;

ALTER TABLE support_messages
  MODIFY COLUMN ticket_id INT NOT NULL,
  ADD CONSTRAINT support_messages_ticket_fk FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
  ADD KEY idx_support_messages_ticket (ticket_id, created_at);

-- 4. Media attachments, always tied to a message (in practice only ever the
--    first message of a ticket, since attaching files is only offered at
--    ticket-creation time — but nothing stops a future feature from allowing
--    them elsewhere too, so it's keyed generically by message rather than ticket).
CREATE TABLE IF NOT EXISTS support_attachments (
  id INT NOT NULL AUTO_INCREMENT,
  message_id INT NOT NULL,
  file_url VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  file_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  mime_type VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  size_bytes INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_attachments_message (message_id),
  CONSTRAINT support_attachments_message_fk FOREIGN KEY (message_id) REFERENCES support_messages (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
