ALTER TABLE site_settings
  MODIFY site_name VARCHAR(160) NOT NULL DEFAULT 'Fabpodd';

UPDATE site_settings
SET site_name = 'Fabpodd'
WHERE site_name = CONCAT('FAB ', 'COUTURE');

UPDATE homepage_content
SET hero = JSON_SET(hero, '$.badge', 'DESIGNED BY YOU • MADE BY Fabpodd')
WHERE JSON_UNQUOTE(JSON_EXTRACT(hero, '$.badge')) = CONCAT('DESIGNED BY YOU • MADE BY FAB ', 'COUTURE');
