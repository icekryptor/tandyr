-- Opening a shift no longer requires geolocation: when the device can't get a
-- position, the employee picks the store by hand. Such shifts have no start
-- coordinates (NULL), which the admin shift page shows as "выбран вручную".
ALTER TABLE shifts ALTER COLUMN start_lat DROP NOT NULL;
ALTER TABLE shifts ALTER COLUMN start_lng DROP NOT NULL;
