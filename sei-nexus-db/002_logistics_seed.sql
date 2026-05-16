-- =============================================================================
-- Logistics Sample Database — SEI Nexus Test Data
-- Target: local PostgreSQL  (psql -d <your_logistics_db> -f 002_logistics_seed.sql)
-- =============================================================================

-- ── Customers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_customer (
    customer_id     SERIAL          PRIMARY KEY,
    customer_code   VARCHAR(20)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    region          VARCHAR(64),
    country         VARCHAR(64),
    credit_limit    NUMERIC(12,2),
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
);

-- ── Suppliers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_supplier (
    supplier_id     SERIAL          PRIMARY KEY,
    supplier_code   VARCHAR(20)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    country         VARCHAR(64),
    lead_time_days  INT,
    rating          NUMERIC(3,1),   -- 1.0–5.0
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
);

-- ── Warehouses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_warehouse (
    warehouse_id    SERIAL          PRIMARY KEY,
    warehouse_code  VARCHAR(20)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    city            VARCHAR(128),
    country         VARCHAR(64),
    capacity_sqft   INT
);

-- ── Products ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_product (
    product_id      SERIAL          PRIMARY KEY,
    sku             VARCHAR(40)     NOT NULL UNIQUE,
    name            VARCHAR(255)    NOT NULL,
    category        VARCHAR(64),
    unit_cost       NUMERIC(10,2),
    unit_weight_kg  NUMERIC(6,2),
    reorder_point   INT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
);

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_inventory (
    inventory_id    SERIAL          PRIMARY KEY,
    warehouse_id    INT             NOT NULL REFERENCES lgs_warehouse(warehouse_id),
    product_id      INT             NOT NULL REFERENCES lgs_product(product_id),
    qty_on_hand     INT             NOT NULL DEFAULT 0,
    qty_reserved    INT             NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMP,
    UNIQUE (warehouse_id, product_id)
);

-- ── Purchase Orders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_purchase_order (
    po_id           SERIAL          PRIMARY KEY,
    po_number       VARCHAR(30)     NOT NULL UNIQUE,
    supplier_id     INT             NOT NULL REFERENCES lgs_supplier(supplier_id),
    warehouse_id    INT             NOT NULL REFERENCES lgs_warehouse(warehouse_id),
    status          VARCHAR(30)     NOT NULL DEFAULT 'OPEN',
    ordered_at      TIMESTAMP       NOT NULL,
    expected_at     DATE,
    received_at     TIMESTAMP,
    total_amount    NUMERIC(14,2)
);

CREATE TABLE IF NOT EXISTS lgs_purchase_order_line (
    line_id         SERIAL          PRIMARY KEY,
    po_id           INT             NOT NULL REFERENCES lgs_purchase_order(po_id),
    product_id      INT             NOT NULL REFERENCES lgs_product(product_id),
    qty_ordered     INT             NOT NULL,
    qty_received    INT             NOT NULL DEFAULT 0,
    unit_price      NUMERIC(10,2)
);

-- ── Shipments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_shipment (
    shipment_id     SERIAL          PRIMARY KEY,
    shipment_ref    VARCHAR(30)     NOT NULL UNIQUE,
    customer_id     INT             NOT NULL REFERENCES lgs_customer(customer_id),
    warehouse_id    INT             NOT NULL REFERENCES lgs_warehouse(warehouse_id),
    carrier         VARCHAR(64),
    status          VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
    priority        VARCHAR(20)     NOT NULL DEFAULT 'STANDARD',
    shipped_at      TIMESTAMP,
    promised_at     DATE,
    delivered_at    TIMESTAMP,
    total_weight_kg NUMERIC(8,2),
    total_value     NUMERIC(14,2)
);

CREATE TABLE IF NOT EXISTS lgs_shipment_line (
    line_id         SERIAL          PRIMARY KEY,
    shipment_id     INT             NOT NULL REFERENCES lgs_shipment(shipment_id),
    product_id      INT             NOT NULL REFERENCES lgs_product(product_id),
    qty_shipped     INT             NOT NULL,
    unit_price      NUMERIC(10,2)
);

-- ── Delivery Events (tracking) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lgs_delivery_event (
    event_id        SERIAL          PRIMARY KEY,
    shipment_id     INT             NOT NULL REFERENCES lgs_shipment(shipment_id),
    event_type      VARCHAR(40)     NOT NULL,  -- PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION
    location        VARCHAR(128),
    notes           TEXT,
    occurred_at     TIMESTAMP       NOT NULL
);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ── Customers ─────────────────────────────────────────────────────────────────
INSERT INTO lgs_customer (customer_code, name, region, country, credit_limit, status) VALUES
('CUST-001', 'Meridian Retail Group',     'North America', 'USA',        500000.00, 'ACTIVE'),
('CUST-002', 'Alpine Distribution GmbH',  'Europe',        'Germany',    320000.00, 'ACTIVE'),
('CUST-003', 'Pacific Wholesale Co.',     'Asia Pacific',  'Australia',  180000.00, 'ACTIVE'),
('CUST-004', 'Summit Industrial Ltd.',    'North America', 'Canada',     275000.00, 'ACTIVE'),
('CUST-005', 'Iberia Trade & Logistics',  'Europe',        'Spain',      210000.00, 'ACTIVE'),
('CUST-006', 'Gulf Procurement LLC',      'Middle East',   'UAE',        450000.00, 'ACTIVE'),
('CUST-007', 'Nordic Supply Chain AB',    'Europe',        'Sweden',     195000.00, 'ACTIVE'),
('CUST-008', 'Coastal Freight Partners',  'North America', 'USA',        380000.00, 'ACTIVE'),
('CUST-009', 'Delta Commerce Pte Ltd.',   'Asia Pacific',  'Singapore',  290000.00, 'ACTIVE'),
('CUST-010', 'Andes Export Corporation',  'Latin America', 'Chile',      120000.00, 'ACTIVE')
ON CONFLICT (customer_code) DO NOTHING;

-- ── Suppliers ─────────────────────────────────────────────────────────────────
INSERT INTO lgs_supplier (supplier_code, name, country, lead_time_days, rating, status) VALUES
('SUPP-001', 'FastParts Manufacturing',   'China',         14, 4.5, 'ACTIVE'),  -- reliable
('SUPP-002', 'EuroComponents AG',         'Germany',       21, 4.8, 'ACTIVE'),  -- premium
('SUPP-003', 'QuickShip Industries',      'Mexico',        7,  3.2, 'ACTIVE'),  -- poor performer
('SUPP-004', 'Pacific Raw Materials',     'Vietnam',       18, 4.1, 'ACTIVE'),
('SUPP-005', 'AlliedTech Supplies',       'India',         12, 3.8, 'ACTIVE'),
('SUPP-006', 'Nordics Precision Parts',   'Finland',       25, 4.9, 'ACTIVE')   -- best quality
ON CONFLICT (supplier_code) DO NOTHING;

-- ── Warehouses ────────────────────────────────────────────────────────────────
INSERT INTO lgs_warehouse (warehouse_code, name, city, country, capacity_sqft) VALUES
('WH-EAST',  'East Coast DC',      'Newark',      'USA',       180000),
('WH-WEST',  'West Coast DC',      'Los Angeles', 'USA',       220000),
('WH-EURO',  'European Hub',       'Rotterdam',   'Netherlands',150000),
('WH-APAC',  'APAC Distribution',  'Singapore',   'Singapore',  90000)
ON CONFLICT (warehouse_code) DO NOTHING;

-- ── Products ──────────────────────────────────────────────────────────────────
INSERT INTO lgs_product (sku, name, category, unit_cost, unit_weight_kg, reorder_point, status) VALUES
('SKU-A001', 'Industrial Pump Model X',      'Machinery',    2450.00, 18.5,  20, 'ACTIVE'),
('SKU-A002', 'Hydraulic Valve Set',          'Components',    185.00,  1.2, 100, 'ACTIVE'),
('SKU-A003', 'Control Panel Unit v3',        'Electronics',  1200.00,  4.8,  30, 'ACTIVE'),
('SKU-A004', 'Steel Coupling 50mm',          'Hardware',       42.00,  0.6, 500, 'ACTIVE'),
('SKU-A005', 'Conveyor Belt 10m',            'Machinery',     680.00, 22.0,  15, 'ACTIVE'),
('SKU-B001', 'Safety Sensor Array',          'Electronics',   390.00,  0.9,  80, 'ACTIVE'),
('SKU-B002', 'Pressure Gauge Kit',           'Components',     95.00,  0.4, 200, 'ACTIVE'),
('SKU-B003', 'Industrial Filter Cartridge',  'Consumables',    28.00,  0.3, 800, 'ACTIVE'),
('SKU-B004', 'Load Cell 500kg',              'Electronics',   560.00,  2.1,  50, 'ACTIVE'),
('SKU-C001', 'Forklift Battery Pack',        'Machinery',    3200.00, 85.0,   8, 'ACTIVE'),
('SKU-C002', 'Pallet Jack 2T',               'Machinery',    1850.00, 72.0,  10, 'ACTIVE'),
('SKU-C003', 'Stretch Film Roll (case)',     'Consumables',    18.00,  6.0, 1000,'ACTIVE')
ON CONFLICT (sku) DO NOTHING;

-- ── Inventory  (some below reorder point — anomaly triggers) ──────────────────
INSERT INTO lgs_inventory (warehouse_id, product_id, qty_on_hand, qty_reserved, last_counted_at)
SELECT w.warehouse_id, p.product_id, v.qty_on_hand, v.qty_reserved, NOW() - (v.days_ago || ' days')::interval
FROM (VALUES
    ('WH-EAST', 'SKU-A001',  45,  12, 3),
    ('WH-EAST', 'SKU-A002', 320,  80, 2),
    ('WH-EAST', 'SKU-A003',  18,   5, 1),  -- below reorder point (30)
    ('WH-EAST', 'SKU-A004', 620, 150, 1),
    ('WH-EAST', 'SKU-A005',   8,   3, 5),  -- below reorder point (15)
    ('WH-EAST', 'SKU-B001',  95,  20, 2),
    ('WH-EAST', 'SKU-B003', 450, 100, 4),  -- below reorder point (800)
    ('WH-EAST', 'SKU-C001',   5,   2, 7),  -- below reorder point (8)
    ('WH-WEST', 'SKU-A001',  62,  10, 2),
    ('WH-WEST', 'SKU-A002', 410,  90, 1),
    ('WH-WEST', 'SKU-A003',  55,  15, 3),
    ('WH-WEST', 'SKU-A005',  22,   4, 2),
    ('WH-WEST', 'SKU-B001',  70,  18, 1),
    ('WH-WEST', 'SKU-B002', 310,  60, 3),
    ('WH-WEST', 'SKU-C001',  12,   3, 4),
    ('WH-WEST', 'SKU-C002',  18,   5, 2),
    ('WH-EURO', 'SKU-A001',  30,   8, 2),
    ('WH-EURO', 'SKU-A002', 180,  40, 3),
    ('WH-EURO', 'SKU-A003',  42,  12, 1),
    ('WH-EURO', 'SKU-B002', 195,  55, 2),
    ('WH-EURO', 'SKU-B003', 720,  80, 1),  -- slightly below reorder (800)
    ('WH-EURO', 'SKU-C003', 850, 200, 4),
    ('WH-APAC', 'SKU-A001',  15,   4, 3),
    ('WH-APAC', 'SKU-A002',  90,  30, 2),
    ('WH-APAC', 'SKU-B001',  35,  10, 1),
    ('WH-APAC', 'SKU-B004',  28,   8, 3),
    ('WH-APAC', 'SKU-C001',   3,   1, 6)   -- critically low
) AS v(wh_code, sku, qty_on_hand, qty_reserved, days_ago)
JOIN lgs_warehouse w ON w.warehouse_code = v.wh_code
JOIN lgs_product   p ON p.sku            = v.sku
ON CONFLICT (warehouse_id, product_id) DO NOTHING;

-- ── Purchase Orders ───────────────────────────────────────────────────────────
INSERT INTO lgs_purchase_order (po_number, supplier_id, warehouse_id, status, ordered_at, expected_at, received_at, total_amount)
SELECT v.po_number, s.supplier_id, w.warehouse_id, v.status,
       NOW() - (v.ordered_days_ago || ' days')::interval,
       (NOW() - (v.ordered_days_ago || ' days')::interval + (v.lead_days || ' days')::interval)::date,
       CASE WHEN v.received_days_ago IS NOT NULL
            THEN NOW() - (v.received_days_ago || ' days')::interval END,
       v.total_amount
FROM (VALUES
    ('PO-2024-0101', 'SUPP-001', 'WH-EAST', 'RECEIVED',   45, 14,  30, 18650.00),
    ('PO-2024-0102', 'SUPP-002', 'WH-EURO', 'RECEIVED',   40, 21,  18, 34200.00),
    ('PO-2024-0103', 'SUPP-003', 'WH-WEST', 'OVERDUE',    35,  7, NULL, 6400.00),  -- QuickShip late again
    ('PO-2024-0104', 'SUPP-004', 'WH-APAC', 'RECEIVED',   30, 18,  10, 12800.00),
    ('PO-2024-0105', 'SUPP-003', 'WH-EAST', 'OVERDUE',    28,  7, NULL, 4200.00),  -- QuickShip late again
    ('PO-2024-0106', 'SUPP-001', 'WH-WEST', 'RECEIVED',   25, 14,   8, 22100.00),
    ('PO-2024-0107', 'SUPP-005', 'WH-EURO', 'IN_TRANSIT', 20, 12, NULL, 9750.00),
    ('PO-2024-0108', 'SUPP-006', 'WH-EAST', 'IN_TRANSIT', 18, 25, NULL, 47000.00),
    ('PO-2024-0109', 'SUPP-002', 'WH-WEST', 'RECEIVED',   15, 21,   2, 28500.00),
    ('PO-2024-0110', 'SUPP-003', 'WH-APAC', 'OVERDUE',    14,  7, NULL, 3100.00),  -- QuickShip 3rd overdue
    ('PO-2024-0111', 'SUPP-001', 'WH-EURO', 'OPEN',       10, 14, NULL, 15600.00),
    ('PO-2024-0112', 'SUPP-004', 'WH-EAST', 'OPEN',        7, 18, NULL, 11200.00),
    ('PO-2024-0113', 'SUPP-005', 'WH-WEST', 'OPEN',        3, 12, NULL,  8900.00),
    ('PO-2024-0114', 'SUPP-006', 'WH-APAC', 'OPEN',        2, 25, NULL, 38400.00)
) AS v(po_number, supp_code, wh_code, status, ordered_days_ago, lead_days, received_days_ago, total_amount)
JOIN lgs_supplier  s ON s.supplier_code = v.supp_code
JOIN lgs_warehouse w ON w.warehouse_code = v.wh_code
ON CONFLICT (po_number) DO NOTHING;

-- ── PO Lines ──────────────────────────────────────────────────────────────────
INSERT INTO lgs_purchase_order_line (po_id, product_id, qty_ordered, qty_received, unit_price)
SELECT po.po_id, p.product_id, v.qty_ordered, v.qty_received, v.unit_price
FROM (VALUES
    ('PO-2024-0101', 'SKU-A001', 5,  5,  2450.00),
    ('PO-2024-0101', 'SKU-A002', 50, 50,  185.00),
    ('PO-2024-0102', 'SKU-A003', 20, 20, 1200.00),
    ('PO-2024-0102', 'SKU-B004', 15, 15,  560.00),
    ('PO-2024-0103', 'SKU-B003',200,  0,   28.00),  -- overdue, 0 received
    ('PO-2024-0103', 'SKU-A004',100,  0,   42.00),
    ('PO-2024-0104', 'SKU-A001',  4,  4, 2450.00),
    ('PO-2024-0104', 'SKU-B001', 30, 30,  390.00),
    ('PO-2024-0105', 'SKU-B002', 80,  0,   95.00),  -- overdue
    ('PO-2024-0105', 'SKU-C003',200,  0,   18.00),
    ('PO-2024-0106', 'SKU-A001',  8,  8, 2450.00),
    ('PO-2024-0107', 'SKU-A003', 10,  0, 1200.00),
    ('PO-2024-0108', 'SKU-C001',  8,  0, 3200.00),
    ('PO-2024-0108', 'SKU-C002',  8,  0, 1850.00),
    ('PO-2024-0109', 'SKU-A003', 15, 15, 1200.00),
    ('PO-2024-0110', 'SKU-B003',100,  0,   28.00),  -- overdue
    ('PO-2024-0111', 'SKU-A002',100,  0,  185.00),
    ('PO-2024-0112', 'SKU-B001', 40,  0,  390.00),
    ('PO-2024-0113', 'SKU-A004',200,  0,   42.00),
    ('PO-2024-0114', 'SKU-C001',  6,  0, 3200.00)
) AS v(po_number, sku, qty_ordered, qty_received, unit_price)
JOIN lgs_purchase_order po ON po.po_number  = v.po_number
JOIN lgs_product         p ON p.sku         = v.sku;

-- ── Shipments ─────────────────────────────────────────────────────────────────
INSERT INTO lgs_shipment (shipment_ref, customer_id, warehouse_id, carrier, status, priority, shipped_at, promised_at, delivered_at, total_weight_kg, total_value)
SELECT v.ref, c.customer_id, w.warehouse_id, v.carrier, v.status, v.priority,
       CASE WHEN v.shipped_days_ago IS NOT NULL THEN NOW() - (v.shipped_days_ago || ' days')::interval END,
       (NOW() + (v.promised_days_from_now || ' days')::interval)::date,
       CASE WHEN v.delivered_days_ago IS NOT NULL THEN NOW() - (v.delivered_days_ago || ' days')::interval END,
       v.weight_kg, v.value
FROM (VALUES
    ('SHP-2024-001', 'CUST-001', 'WH-EAST', 'FedEx Freight',   'DELIVERED', 'STANDARD',  18, -3, 92.0,  15400.00),
    ('SHP-2024-002', 'CUST-002', 'WH-EURO', 'DHL Express',     'DELIVERED', 'EXPRESS',   15, -2, 38.5,  24800.00),
    ('SHP-2024-003', 'CUST-003', 'WH-APAC', 'Maersk',          'DELIVERED', 'STANDARD',  22, -5, 215.0, 31200.00),
    ('SHP-2024-004', 'CUST-004', 'WH-EAST', 'UPS Freight',     'DELIVERED', 'STANDARD',  20, -4, 74.0,  18600.00),
    ('SHP-2024-005', 'CUST-005', 'WH-EURO', 'DHL Express',     'DELAYED',   'EXPRESS',   14,  0, 12.0,   9400.00),  -- promised today, still not delivered
    ('SHP-2024-006', 'CUST-006', 'WH-APAC', 'Emirates SkyCargo','DELIVERED','STANDARD',  16, -1, 340.0, 58000.00),
    ('SHP-2024-007', 'CUST-007', 'WH-EURO', 'DB Schenker',     'DELAYED',   'STANDARD',  12, -2, 28.0,  12300.00),  -- overdue by 2 days
    ('SHP-2024-008', 'CUST-008', 'WH-WEST', 'FedEx Freight',   'IN_TRANSIT','STANDARD',   8,  3, 118.0, 22100.00),
    ('SHP-2024-009', 'CUST-001', 'WH-WEST', 'UPS Freight',     'IN_TRANSIT','STANDARD',   6,  4, 87.0,  19800.00),
    ('SHP-2024-010', 'CUST-009', 'WH-APAC', 'Maersk',          'IN_TRANSIT','ECONOMY',    5,  8, 480.0, 43500.00),
    ('SHP-2024-011', 'CUST-002', 'WH-EURO', 'DHL Express',     'DELAYED',   'EXPRESS',   10, -3, 22.0,  16700.00),  -- 3 days overdue
    ('SHP-2024-012', 'CUST-010', 'WH-WEST', 'FedEx Freight',   'SHIPPED',   'STANDARD',   3,  5, 55.0,   8900.00),
    ('SHP-2024-013', 'CUST-004', 'WH-EAST', 'UPS Freight',     'SHIPPED',   'EXPRESS',    2,  2, 19.0,  11200.00),
    ('SHP-2024-014', 'CUST-003', 'WH-APAC', 'Singapore Post',  'PENDING',   'STANDARD',  NULL, 6, NULL, 14600.00),
    ('SHP-2024-015', 'CUST-006', 'WH-EAST', 'Emirates SkyCargo','PENDING',  'EXPRESS',   NULL, 4, NULL, 37800.00),
    ('SHP-2024-016', 'CUST-008', 'WH-WEST', 'FedEx Freight',   'DELIVERED', 'STANDARD',  30, -8, 63.0,  10200.00),
    ('SHP-2024-017', 'CUST-001', 'WH-EAST', 'UPS Freight',     'DELIVERED', 'STANDARD',  28, -6, 145.0, 29400.00),
    ('SHP-2024-018', 'CUST-005', 'WH-EURO', 'DB Schenker',     'DELAYED',   'STANDARD',  25, -8, 34.0,  17200.00),  -- 8 days overdue!
    ('SHP-2024-019', 'CUST-007', 'WH-EURO', 'DHL Express',     'DELIVERED', 'EXPRESS',   20, -4, 9.0,    5600.00),
    ('SHP-2024-020', 'CUST-009', 'WH-APAC', 'Maersk',          'DELIVERED', 'STANDARD',  35, -5, 390.0, 51000.00)
) AS v(ref, cust_code, wh_code, carrier, status, priority, shipped_days_ago, promised_days_from_now, delivered_days_ago, weight_kg, value)
JOIN lgs_customer  c ON c.customer_code  = v.cust_code
JOIN lgs_warehouse w ON w.warehouse_code = v.wh_code
ON CONFLICT (shipment_ref) DO NOTHING;

-- ── Shipment Lines ────────────────────────────────────────────────────────────
INSERT INTO lgs_shipment_line (shipment_id, product_id, qty_shipped, unit_price)
SELECT sh.shipment_id, p.product_id, v.qty, v.price
FROM (VALUES
    ('SHP-2024-001', 'SKU-A001', 3, 2450.00), ('SHP-2024-001', 'SKU-A002',20,  185.00),
    ('SHP-2024-002', 'SKU-A003', 8, 1200.00), ('SHP-2024-002', 'SKU-B004',10,  560.00),
    ('SHP-2024-003', 'SKU-C001', 4, 3200.00), ('SHP-2024-003', 'SKU-C002', 4, 1850.00),
    ('SHP-2024-004', 'SKU-A001', 2, 2450.00), ('SHP-2024-004', 'SKU-B001',20,  390.00),
    ('SHP-2024-005', 'SKU-A003', 5, 1200.00), ('SHP-2024-005', 'SKU-B002',30,   95.00),
    ('SHP-2024-006', 'SKU-A001',10, 2450.00), ('SHP-2024-006', 'SKU-A005', 5,  680.00),
    ('SHP-2024-007', 'SKU-B001',15, 390.00),  ('SHP-2024-007', 'SKU-B002',40,   95.00),
    ('SHP-2024-008', 'SKU-A001', 4, 2450.00), ('SHP-2024-008', 'SKU-A004',80,   42.00),
    ('SHP-2024-009', 'SKU-A002',50,  185.00), ('SHP-2024-009', 'SKU-B003',200,   28.00),
    ('SHP-2024-010', 'SKU-C001', 6, 3200.00), ('SHP-2024-010', 'SKU-C003',500,   18.00),
    ('SHP-2024-011', 'SKU-A003',10, 1200.00), ('SHP-2024-011', 'SKU-B004', 8,  560.00),
    ('SHP-2024-012', 'SKU-A005', 6,  680.00), ('SHP-2024-012', 'SKU-B002',20,   95.00),
    ('SHP-2024-013', 'SKU-A003', 5, 1200.00), ('SHP-2024-013', 'SKU-B001',10,  390.00),
    ('SHP-2024-014', 'SKU-A002',40,  185.00), ('SHP-2024-014', 'SKU-B003',300,   28.00),
    ('SHP-2024-015', 'SKU-C001', 6, 3200.00), ('SHP-2024-015', 'SKU-A005', 8,  680.00),
    ('SHP-2024-016', 'SKU-A004',200,  42.00), ('SHP-2024-016', 'SKU-B002',20,   95.00),
    ('SHP-2024-017', 'SKU-A001', 6, 2450.00), ('SHP-2024-017', 'SKU-A002',60,  185.00),
    ('SHP-2024-018', 'SKU-A003', 8, 1200.00), ('SHP-2024-018', 'SKU-B004',12,  560.00),
    ('SHP-2024-019', 'SKU-B001',10,  390.00), ('SHP-2024-019', 'SKU-B002',20,   95.00),
    ('SHP-2024-020', 'SKU-C001', 8, 3200.00), ('SHP-2024-020', 'SKU-C002', 5, 1850.00)
) AS v(ref, sku, qty, price)
JOIN lgs_shipment sh ON sh.shipment_ref = v.ref
JOIN lgs_product   p ON p.sku           = v.sku;

-- ── Delivery Events ───────────────────────────────────────────────────────────
INSERT INTO lgs_delivery_event (shipment_id, event_type, location, notes, occurred_at)
SELECT sh.shipment_id, v.event_type, v.location, v.notes,
       NOW() - (v.hours_ago || ' hours')::interval
FROM (VALUES
    -- SHP-001 delivered cleanly
    ('SHP-2024-001','PICKED_UP',        'Newark, NJ',       NULL,                                  432),
    ('SHP-2024-001','IN_TRANSIT',       'Philadelphia, PA', NULL,                                  420),
    ('SHP-2024-001','OUT_FOR_DELIVERY', 'Boston, MA',       NULL,                                   75),
    ('SHP-2024-001','DELIVERED',        'Boston, MA',       'Signed by J. Mills',                   72),
    -- SHP-005 delayed — exception raised
    ('SHP-2024-005','PICKED_UP',        'Rotterdam, NL',    NULL,                                  340),
    ('SHP-2024-005','IN_TRANSIT',       'Frankfurt, DE',    NULL,                                  316),
    ('SHP-2024-005','EXCEPTION',        'Madrid, ES',       'Customs hold — documentation missing', 72),
    -- SHP-007 delayed
    ('SHP-2024-007','PICKED_UP',        'Rotterdam, NL',    NULL,                                  295),
    ('SHP-2024-007','IN_TRANSIT',       'Hamburg, DE',      NULL,                                  270),
    ('SHP-2024-007','EXCEPTION',        'Stockholm, SE',    'Incorrect address — rerouting',        96),
    -- SHP-011 delayed 3 days
    ('SHP-2024-011','PICKED_UP',        'Rotterdam, NL',    NULL,                                  244),
    ('SHP-2024-011','IN_TRANSIT',       'Brussels, BE',     NULL,                                  220),
    ('SHP-2024-011','EXCEPTION',        'Berlin, DE',       'Damaged packaging — held for inspection',80),
    -- SHP-018 worst delay — 8 days
    ('SHP-2024-018','PICKED_UP',        'Rotterdam, NL',    NULL,                                  610),
    ('SHP-2024-018','IN_TRANSIT',       'Lyon, FR',         NULL,                                  585),
    ('SHP-2024-018','EXCEPTION',        'Barcelona, ES',    'Carrier lost tracking — escalated',   400),
    ('SHP-2024-018','EXCEPTION',        'Madrid, ES',       'Second attempt failed — re-routing',  200),
    -- SHP-008 in transit, clean
    ('SHP-2024-008','PICKED_UP',        'Los Angeles, CA',  NULL,                                  195),
    ('SHP-2024-008','IN_TRANSIT',       'Phoenix, AZ',      NULL,                                  170),
    -- SHP-010 in transit, large sea freight
    ('SHP-2024-010','PICKED_UP',        'Singapore',        NULL,                                  122),
    ('SHP-2024-010','IN_TRANSIT',       'Port Klang, MY',   'On vessel MSC Allegra',               100)
) AS v(ref, event_type, location, notes, hours_ago)
JOIN lgs_shipment sh ON sh.shipment_ref = v.ref;

-- =============================================================================
-- Quick sanity check
-- =============================================================================
DO $$
DECLARE
    v_customers   INT; v_products   INT; v_inventory  INT;
    v_pos         INT; v_shipments  INT; v_delayed    INT;
    v_low_stock   INT;
BEGIN
    SELECT COUNT(*) INTO v_customers  FROM lgs_customer;
    SELECT COUNT(*) INTO v_products   FROM lgs_product;
    SELECT COUNT(*) INTO v_inventory  FROM lgs_inventory;
    SELECT COUNT(*) INTO v_pos        FROM lgs_purchase_order;
    SELECT COUNT(*) INTO v_shipments  FROM lgs_shipment;
    SELECT COUNT(*) INTO v_delayed    FROM lgs_shipment  WHERE status = 'DELAYED';
    SELECT COUNT(*) INTO v_low_stock  FROM lgs_inventory i
        JOIN lgs_product p ON p.product_id = i.product_id
        WHERE i.qty_on_hand < p.reorder_point;

    RAISE NOTICE '=== Logistics seed complete ===';
    RAISE NOTICE 'Customers:    %', v_customers;
    RAISE NOTICE 'Products:     %', v_products;
    RAISE NOTICE 'Inventory rows: %', v_inventory;
    RAISE NOTICE 'Purchase orders: %', v_pos;
    RAISE NOTICE 'Shipments:    %  (% DELAYED)', v_shipments, v_delayed;
    RAISE NOTICE 'Low-stock items: %  <-- anomalies for Nexus to detect', v_low_stock;
END $$;
