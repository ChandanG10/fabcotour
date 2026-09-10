CREATE TABLE IF NOT EXISTS corporate_products (
 id CHAR(36) PRIMARY KEY,
 name VARCHAR(200) NOT NULL,
 slug VARCHAR(200) NOT NULL UNIQUE,
 category VARCHAR(120) NOT NULL,
 short_description VARCHAR(600) NOT NULL,
 description TEXT NOT NULL,
 main_image VARCHAR(2048) NOT NULL,
 additional_images JSON NOT NULL,
 included_items JSON NOT NULL,
 minimum_order_quantity INT UNSIGNED NOT NULL DEFAULT 1,
 starting_price DECIMAL(12,2) NULL,
 pricing_type ENUM('starting_from','request_quote','fixed_price') NOT NULL DEFAULT 'request_quote',
 customisation_available BOOLEAN NOT NULL DEFAULT FALSE,
 logo_printing_available BOOLEAN NOT NULL DEFAULT FALSE,
 employee_name_personalisation BOOLEAN NOT NULL DEFAULT FALSE,
 custom_packaging_available BOOLEAN NOT NULL DEFAULT FALSE,
 bulk_quantity_available BOOLEAN NOT NULL DEFAULT TRUE,
 delivery_information TEXT NOT NULL,
 is_featured BOOLEAN NOT NULL DEFAULT FALSE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 display_order INT UNSIGNED NOT NULL DEFAULT 0,
 deleted_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX corporate_listing (deleted_at, is_active, display_order),
 INDEX corporate_category (category)
);

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000001','Employee Welcome Kit','employee-welcome-kit','Employee gifting','A personalised onboarding kit designed to give new employees a memorable first-day experience.','A personalised onboarding kit designed to give new employees a memorable first-day experience.','/images/corporate/employee-welcome-kit.webp','[]','["Custom Corporate T-Shirt", "Insulated Bottle", "Notebook", "Pen", "Tote Bag / Backpack", "Welcome Card"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,0 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='employee-welcome-kit');

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000002','Executive Kit','executive-kit','Client gifting','A premium corporate gifting collection designed for executives, clients and business partners.','A premium corporate gifting collection designed for executives, clients and business partners.','/images/corporate/executive-kit.webp','[]','["Premium Diary", "Metal Pen", "Premium Tumbler", "Technology Accessory", "Personalised Card", "Premium Gift Box"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,1 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='executive-kit');

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000003','Work From Home Kit','work-from-home-kit','Employee gifting','A practical branded kit containing everyday essentials for remote and hybrid employees.','A practical branded kit containing everyday essentials for remote and hybrid employees.','/images/corporate/work-from-home-kit.webp','[]','["Custom Coffee Mug", "Mouse Pad", "Notebook", "Laptop Sleeve", "Bottle", "Branded Packaging"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,2 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='work-from-home-kit');

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000004','Event / Conference Kit','event-conference-kit','Events','Custom branded merchandise for conferences, exhibitions, corporate events and team gatherings.','Custom branded merchandise for conferences, exhibitions, corporate events and team gatherings.','/images/corporate/event-conference-kit.webp','[]','["Custom T-Shirt", "Tote Bag", "Notebook", "Pen", "ID Card Holder", "Event Branding Card"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,3 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='event-conference-kit');

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000005','Festive Corporate Box','festive-corporate-box','Festive gifting','A premium personalised gift box for festivals, celebrations, employee rewards and client appreciation.','A premium personalised gift box for festivals, celebrations, employee rewards and client appreciation.','/images/corporate/festive-corporate-box.webp','[]','["Custom Mug / Tumbler", "Scented Candle", "Premium Notebook", "Personalised Greeting Card", "Gift Box", "Decorative Packaging"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,4 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='festive-corporate-box');

INSERT INTO corporate_products (id,name,slug,category,short_description,description,main_image,additional_images,included_items,minimum_order_quantity,starting_price,pricing_type,customisation_available,logo_printing_available,employee_name_personalisation,custom_packaging_available,bulk_quantity_available,delivery_information,is_featured,is_active,display_order)
SELECT 'c0000000-0000-4000-8000-000000000006','Eco-Friendly Corporate Kit','eco-friendly-corporate-kit','Sustainable gifting','A sustainable corporate gifting solution created with reusable and environmentally responsible products.','A sustainable corporate gifting solution created with reusable and environmentally responsible products.','/images/corporate/eco-friendly-corporate-kit.webp','[]','["Cotton Tote Bag", "Bamboo / Reusable Bottle", "Recycled Notebook", "Bamboo Pen", "Eco-Friendly Packaging", "Personalised Thank You Card"]',1,NULL,'request_quote',1,1,1,1,1,'Delivery timing and packaging are confirmed with your custom quote.',1,1,5 WHERE NOT EXISTS (SELECT 1 FROM corporate_products WHERE slug='eco-friendly-corporate-kit');
