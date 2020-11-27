BEGIN;

TRUNCATE
  movingday_users,
  movingday_contacts,
  movingday_lists,
  movingday_boxes
  RESTART IDENTITY CASCADE;

INSERT INTO movingday_users (
  user_name,
  full_name,
  password,
  moving_date,
  notes
) VALUES
  (
    'demo',
    'Demo User',
    '$2a$12$aIOKQoUYBOsZZxJ1Py2CmumTKiNNaIDc4R6rQ6/3Ja1hAPvarnzH6',
    '2020-12-31',
    'These are some notes for the demo user.'
  ),
  (
    'demo2',
    'Demo User 2',
    '$2a$12$bkhy7dxC0W2QJfLE.hQ.bOuX81z.hNQma1yQtOm04ivBZDLIs2zN.',
    '2021-07-04',
    'This user only exists to make sure that we can only retrieve items associated with the logged-in user'
  );

INSERT INTO movingday_contacts (
  contact_name,
  contact_phone,
  contact_email,
  contact_notes,
  user_id
) VALUES
  (
    'Steve (Mover)',
    '123-456-7890',
    'steve@steve.com',
    'Here are some notes about Steve, like he will be here on Friday at 9am',
    1
  ),
  (
    'Jim (Cleaner)',
    '987-654-3210',
    'jim@jim.com',
    'Some notes about Jim',
    2
  );

INSERT INTO movingday_lists (
  list_name,
  list_items,
  user_id
) VALUES
  (
    'Matt''s To-Do',
    '{ "Pack video games": true, "Buy tape": false, "Call movers": true }'::json,
    1
  ),
  (
    'Mel''s To-Do',
    '{ "Play with Leko": false, "Find tape gun": false, "Make coffee": true }'::json,
    2
  );

INSERT INTO movingday_boxes (
  box_name,
  coming_from,
  going_to,
  getting_there,
  color_code,
  box_notes,
  inventory,
  user_id
) VALUES
  (
    'Kitchen Box 1',
    'Kitchen',
    'Garage',
    'Moving Truck',
    'Red',
    'Fragile',
    ARRAY[
      'Plates',
      'Bowls'
    ],
    1
  ),
  (
    'Kitchen Box 2',
    'Kitchen',
    'Kitchen',
    'Matt''s Car',
    'Green',
    null,
    ARRAY[
      'Silverware'
    ],
    1
  ),
  (
    'Living Room Box 1',
    'Living Room',
    'Storage Unit',
    'Moving Truck',
    'Blue',
    null,
    ARRAY[
      'Games',
      'Books'
    ],
    1
  ),
  (
    'Kitchen Box 1',
    'Kitchen',
    'Kitchen',
    'Moving Truck',
    'Orange',
    'Fragile',
    ARRAY[
      'Bowls',
      'Silverware'
    ],
    2
  ),
  (
    'Storage Box 1',
    'Storage Unit',
    'Storage Unit',
    'Moving Truck',
    'Purple',
    null,
    ARRAY[
      'Clothes'
    ],
    2
  );

COMMIT;