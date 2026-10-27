ALTER TABLE users
  ADD COLUMN google_subject VARCHAR(255) NULL AFTER last_login_at,
  ADD COLUMN google_email_verified_at DATETIME NULL AFTER google_subject,
  ADD UNIQUE KEY uq_users_google_subject (google_subject);
