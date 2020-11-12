BEGIN;

TRUNCATE
  movingday_users
  RESTART IDENTITY CASCADE;

INSERT INTO movingday_users (user_name, full_name, password, moving_date, notes)
VALUES
  (
    'demo',
    'Demo User',
    '$2a$12$aIOKQoUYBOsZZxJ1Py2CmumTKiNNaIDc4R6rQ6/3Ja1hAPvarnzH6',
    '2020-12-31',
    'These are some notes for the demo user.  Lots and lots of notes.  Look at all the notes!'
  );

COMMIT;