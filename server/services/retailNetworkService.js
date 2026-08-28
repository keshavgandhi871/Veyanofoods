/**
 * server/services/retailNetworkService.js — Enterprise Retail Network & Stock Ledger Engine
 * Complete offline distribution management: Retailer 360, Product-Level Stock Ledger,
 * Double-Entry Credit Ledger, Quarantined Returns, Reorder Forecasting, and CSV Exports.
 */

const { logAuditEvent } = require('./auditLogger');
const { recordInventoryMovement } = require('./inventoryService');

// ── In-Memory Persistence Layer with Full Schema Integrity ────────────────────
let RETAILERS = [];
let RETAILER_INVENTORY = [];
let INVENTORY_MOVEMENTS = [];
let SUPPLY_ORDERS = [];
let FINANCIAL_LEDGER = [];
let RETURNS = [];
let FOLLOWUPS = [];
let NOTES = [];
let DOCUMENTS = [];

// Product pricing reference
const PRODUCT_CATALOG = {
  'PLAIN-200': { sku: 'PLAIN-200', name: 'Classic Plain Roasted Makhana', price: 399, mrp: 399, costPrice: 180 },
  'SALTED-200': { sku: 'SALTED-200', name: 'Lightly Salted Roasted Makhana', price: 399, mrp: 399, costPrice: 190 },
  'PERIPERI-200': { sku: 'PERIPERI-200', name: 'Fiery Peri-Peri Roasted Makhana', price: 399, mrp: 399, costPrice: 200 },
  'COMBO-600': { sku: 'COMBO-600', name: 'The Trio Discovery Combo (600g)', price: 999, mrp: 1197, costPrice: 520 }
};

// ── Seed Initial Live Retail Network Dataset ──────────────────────────────────
function seedInitialRetailNetwork() {
  if (RETAILERS.length > 0) return;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Retailers
  RETAILERS = [
    {
      id: 'RET-2026-001',
      retailer_code: 'RET-001',
      name: "Nature's Soul Gourmet",
      contact_person: 'Raghav Mehra',
      phone: '9811234567',
      whatsapp: '9811234567',
      email: 'orders@naturessoul.in',
      gstin: '07AAACN1234A1Z5',
      retailer_type: 'Gourmet Store',
      channel_type: 'RETAILER',
      address: 'Shop 12-14, Main Market, Block Q, Defence Colony',
      area: 'Defence Colony',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
      landmark: 'Near Flying Cup Cafe',
      gps_coordinates: '28.5729, 77.2315',
      status: 'ACTIVE',
      assigned_salesperson: 'Keshav Gandhi',
      payment_terms: '15_DAYS',
      credit_limit: 30000,
      current_outstanding: 9576,
      reorder_frequency_days: 14,
      preferred_contact_method: 'WHATSAPP',
      notes: 'Premium organic customer base. Best seller is Peri-Peri & Combo.',
      last_order_date: new Date(now - 10 * dayMs).toISOString(),
      expected_next_order_date: new Date(now + 4 * dayMs).toISOString(),
      created_at: new Date(now - 60 * dayMs).toISOString(),
      updated_at: new Date(now - 10 * dayMs).toISOString(),
      deleted_at: null,
      deleted_by: null
    },
    {
      id: 'RET-2026-002',
      retailer_code: 'RET-002',
      name: 'Modern Superstore — Vasant Vihar',
      contact_person: 'Siddharth Varma',
      phone: '9871122334',
      whatsapp: '9871122334',
      email: 'purchase@modernbazaar.net',
      gstin: '07AABCM5678B1Z2',
      retailer_type: 'Supermarket',
      channel_type: 'RETAILER',
      address: 'Basement & Ground Floor, Basant Lok Community Centre',
      area: 'Vasant Vihar',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110057',
      landmark: 'Opposite PVR Priya',
      gps_coordinates: '28.5562, 77.1584',
      status: 'ACTIVE',
      assigned_salesperson: 'Keshav Gandhi',
      payment_terms: '30_DAYS',
      credit_limit: 50000,
      current_outstanding: 18354,
      reorder_frequency_days: 12,
      preferred_contact_method: 'WHATSAPP',
      notes: 'High footfall. Demands weekly stock check and prompt delivery.',
      last_order_date: new Date(now - 14 * dayMs).toISOString(),
      expected_next_order_date: new Date(now - 2 * dayMs).toISOString(),
      created_at: new Date(now - 90 * dayMs).toISOString(),
      updated_at: new Date(now - 14 * dayMs).toISOString(),
      deleted_at: null,
      deleted_by: null
    },
    {
      id: 'RET-2026-003',
      retailer_code: 'RET-003',
      name: 'Le Marche Artisanal Market',
      contact_person: 'Pooja Anand',
      phone: '9899011223',
      whatsapp: '9899011223',
      email: 'inventory@lemarche.co.in',
      gstin: '06AABCL9012C1Z8',
      retailer_type: 'Gourmet Store',
      channel_type: 'RETAILER',
      address: 'South Point Mall, Golf Course Road, DLF Phase 5',
      area: 'Golf Course Road',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      landmark: 'South Point Mall LG-04',
      gps_coordinates: '28.4485, 77.0988',
      status: 'ACTIVE',
      assigned_salesperson: 'Operations Lead',
      payment_terms: '15_DAYS',
      credit_limit: 40000,
      current_outstanding: 0,
      reorder_frequency_days: 10,
      preferred_contact_method: 'PHONE',
      notes: 'Punctual with payments. High demand for Plain and Himalayan Salted.',
      last_order_date: new Date(now - 6 * dayMs).toISOString(),
      expected_next_order_date: new Date(now + 4 * dayMs).toISOString(),
      created_at: new Date(now - 45 * dayMs).toISOString(),
      updated_at: new Date(now - 6 * dayMs).toISOString(),
      deleted_at: null,
      deleted_by: null
    },
    {
      id: 'RET-2026-004',
      retailer_code: 'RET-004',
      name: 'PureBites Wellness Hub',
      contact_person: 'Amitabh Sen',
      phone: '9810998877',
      whatsapp: '9810998877',
      email: 'amitabh@purebites.in',
      gstin: '09AAECP3456D1Z9',
      retailer_type: 'Organic Store',
      channel_type: 'RETAILER',
      address: 'C-Block Market, Sector 18',
      area: 'Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      landmark: 'Near Metro Gate 2',
      gps_coordinates: '28.5708, 77.3271',
      status: 'ACTIVE',
      assigned_salesperson: 'Sales Lead',
      payment_terms: '7_DAYS',
      credit_limit: 15000,
      current_outstanding: 11970,
      reorder_frequency_days: 20,
      preferred_contact_method: 'WHATSAPP',
      notes: 'Follow-up strictly needed for payment overdues.',
      last_order_date: new Date(now - 22 * dayMs).toISOString(),
      expected_next_order_date: new Date(now - 2 * dayMs).toISOString(),
      created_at: new Date(now - 30 * dayMs).toISOString(),
      updated_at: new Date(now - 22 * dayMs).toISOString(),
      deleted_at: null,
      deleted_by: null
    },
    {
      id: 'RET-2026-005',
      retailer_code: 'RET-005',
      name: 'FitFuel Crossfit Cafe & Kiosk',
      contact_person: 'Karan Malhotra',
      phone: '9910223344',
      whatsapp: '9910223344',
      email: 'karan@fitfuelkiosk.com',
      gstin: '',
      retailer_type: 'Gym/Fitness',
      channel_type: 'RETAILER',
      address: 'Inner Circle, F-Block, Connaught Place',
      area: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      landmark: 'Inside FitZone Arena',
      gps_coordinates: '28.6315, 77.2167',
      status: 'ACTIVE',
      assigned_salesperson: 'Keshav Gandhi',
      payment_terms: 'IMMEDIATE',
      credit_limit: 10000,
      current_outstanding: 0,
      reorder_frequency_days: 15,
      preferred_contact_method: 'WHATSAPP',
      notes: 'High protein snacking awareness. Plain & Salted move fast.',
      last_order_date: new Date(now - 8 * dayMs).toISOString(),
      expected_next_order_date: new Date(now + 7 * dayMs).toISOString(),
      created_at: new Date(now - 20 * dayMs).toISOString(),
      updated_at: new Date(now - 8 * dayMs).toISOString(),
      deleted_at: null,
      deleted_by: null
    }
  ];

  // 2. Retailer Stock Inventory
  RETAILER_INVENTORY = [
    // RET-001 (Nature's Soul)
    { id: 'RINV-1', retailer_id: 'RET-2026-001', sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', current_stock: 12, total_supplied: 40, total_sold: 28, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 10 * dayMs).toISOString(), last_reconciled_at: new Date(now - 10 * dayMs).toISOString() },
    { id: 'RINV-2', retailer_id: 'RET-2026-001', sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', current_stock: 14, total_supplied: 40, total_sold: 25, total_returned: 1, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 10 * dayMs).toISOString(), last_reconciled_at: new Date(now - 10 * dayMs).toISOString() },
    { id: 'RINV-3', retailer_id: 'RET-2026-001', sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', current_stock: 8, total_supplied: 35, total_sold: 26, total_returned: 0, total_damaged: 1, total_sample: 0, last_supplied_at: new Date(now - 10 * dayMs).toISOString(), last_reconciled_at: new Date(now - 10 * dayMs).toISOString() },
    { id: 'RINV-4', retailer_id: 'RET-2026-001', sku: 'COMBO-600', product_name: 'The Trio Discovery Combo (600g)', current_stock: 5, total_supplied: 15, total_sold: 10, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 10 * dayMs).toISOString(), last_reconciled_at: new Date(now - 10 * dayMs).toISOString() },

    // RET-002 (Modern Superstore)
    { id: 'RINV-5', retailer_id: 'RET-2026-002', sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', current_stock: 18, total_supplied: 60, total_sold: 42, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 14 * dayMs).toISOString(), last_reconciled_at: new Date(now - 14 * dayMs).toISOString() },
    { id: 'RINV-6', retailer_id: 'RET-2026-002', sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', current_stock: 15, total_supplied: 60, total_sold: 45, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 14 * dayMs).toISOString(), last_reconciled_at: new Date(now - 14 * dayMs).toISOString() },
    { id: 'RINV-7', retailer_id: 'RET-2026-002', sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', current_stock: 22, total_supplied: 60, total_sold: 38, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 14 * dayMs).toISOString(), last_reconciled_at: new Date(now - 14 * dayMs).toISOString() },
    { id: 'RINV-8', retailer_id: 'RET-2026-002', sku: 'COMBO-600', product_name: 'The Trio Discovery Combo (600g)', current_stock: 6, total_supplied: 20, total_sold: 14, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 14 * dayMs).toISOString(), last_reconciled_at: new Date(now - 14 * dayMs).toISOString() },

    // RET-003 (Le Marche)
    { id: 'RINV-9', retailer_id: 'RET-2026-003', sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', current_stock: 24, total_supplied: 50, total_sold: 26, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 6 * dayMs).toISOString(), last_reconciled_at: new Date(now - 6 * dayMs).toISOString() },
    { id: 'RINV-10', retailer_id: 'RET-2026-003', sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', current_stock: 20, total_supplied: 50, total_sold: 30, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 6 * dayMs).toISOString(), last_reconciled_at: new Date(now - 6 * dayMs).toISOString() },
    { id: 'RINV-11', retailer_id: 'RET-2026-003', sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', current_stock: 16, total_supplied: 40, total_sold: 24, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 6 * dayMs).toISOString(), last_reconciled_at: new Date(now - 6 * dayMs).toISOString() },
    { id: 'RINV-12', retailer_id: 'RET-2026-003', sku: 'COMBO-600', product_name: 'The Trio Discovery Combo (600g)', current_stock: 8, total_supplied: 15, total_sold: 7, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 6 * dayMs).toISOString(), last_reconciled_at: new Date(now - 6 * dayMs).toISOString() },

    // RET-004 (PureBites)
    { id: 'RINV-13', retailer_id: 'RET-2026-004', sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', current_stock: 4, total_supplied: 20, total_sold: 16, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 22 * dayMs).toISOString(), last_reconciled_at: new Date(now - 22 * dayMs).toISOString() },
    { id: 'RINV-14', retailer_id: 'RET-2026-004', sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', current_stock: 5, total_supplied: 20, total_sold: 15, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 22 * dayMs).toISOString(), last_reconciled_at: new Date(now - 22 * dayMs).toISOString() },
    { id: 'RINV-15', retailer_id: 'RET-2026-004', sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', current_stock: 3, total_supplied: 20, total_sold: 17, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 22 * dayMs).toISOString(), last_reconciled_at: new Date(now - 22 * dayMs).toISOString() },

    // RET-005 (FitFuel Kiosk)
    { id: 'RINV-16', retailer_id: 'RET-2026-005', sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', current_stock: 10, total_supplied: 25, total_sold: 15, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 8 * dayMs).toISOString(), last_reconciled_at: new Date(now - 8 * dayMs).toISOString() },
    { id: 'RINV-17', retailer_id: 'RET-2026-005', sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', current_stock: 8, total_supplied: 20, total_sold: 12, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 8 * dayMs).toISOString(), last_reconciled_at: new Date(now - 8 * dayMs).toISOString() },
    { id: 'RINV-18', retailer_id: 'RET-2026-005', sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', current_stock: 6, total_supplied: 15, total_sold: 9, total_returned: 0, total_damaged: 0, total_sample: 0, last_supplied_at: new Date(now - 8 * dayMs).toISOString(), last_reconciled_at: new Date(now - 8 * dayMs).toISOString() }
  ];

  // 3. Supply Orders
  SUPPLY_ORDERS = [
    {
      id: 'RSO-2026-001',
      order_number: 'RSO-001',
      retailer_id: 'RET-2026-001',
      retailer_name: "Nature's Soul Gourmet",
      order_date: new Date(now - 10 * dayMs).toISOString(),
      total_units: 24,
      subtotal_amount: 9576,
      discount_amount: 0,
      total_amount: 9576,
      payment_status: 'CREDIT_PENDING',
      payment_terms: '15_DAYS',
      due_date: new Date(now + 5 * dayMs).toISOString(),
      amount_paid: 0,
      amount_outstanding: 9576,
      items: [
        { sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', quantity: 8, unit_price: 399, total_price: 3192 },
        { sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', quantity: 8, unit_price: 399, total_price: 3192 },
        { sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', quantity: 8, unit_price: 399, total_price: 3192 }
      ],
      notes: 'Standard bimonthly replenishment batch.',
      created_by: 'Keshav Gandhi',
      created_at: new Date(now - 10 * dayMs).toISOString()
    },
    {
      id: 'RSO-2026-002',
      order_number: 'RSO-002',
      retailer_id: 'RET-2026-002',
      retailer_name: 'Modern Superstore — Vasant Vihar',
      order_date: new Date(now - 14 * dayMs).toISOString(),
      total_units: 46,
      subtotal_amount: 18354,
      discount_amount: 0,
      total_amount: 18354,
      payment_status: 'CREDIT_PENDING',
      payment_terms: '30_DAYS',
      due_date: new Date(now + 16 * dayMs).toISOString(),
      amount_paid: 0,
      amount_outstanding: 18354,
      items: [
        { sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', quantity: 15, unit_price: 399, total_price: 5985 },
        { sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', quantity: 15, unit_price: 399, total_price: 5985 },
        { sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', quantity: 16, unit_price: 399, total_price: 6384 }
      ],
      notes: 'Supermarket aisle restocking.',
      created_by: 'Keshav Gandhi',
      created_at: new Date(now - 14 * dayMs).toISOString()
    },
    {
      id: 'RSO-2026-003',
      order_number: 'RSO-003',
      retailer_id: 'RET-2026-003',
      retailer_name: 'Le Marche Artisanal Market',
      order_date: new Date(now - 6 * dayMs).toISOString(),
      total_units: 35,
      subtotal_amount: 13965,
      discount_amount: 0,
      total_amount: 13965,
      payment_status: 'PAID',
      payment_terms: '15_DAYS',
      due_date: new Date(now + 9 * dayMs).toISOString(),
      amount_paid: 13965,
      amount_outstanding: 0,
      items: [
        { sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', quantity: 15, unit_price: 399, total_price: 5985 },
        { sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 },
        { sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 }
      ],
      notes: 'Paid via IMPS transfer on delivery confirmation.',
      created_by: 'Operations Lead',
      created_at: new Date(now - 6 * dayMs).toISOString()
    },
    {
      id: 'RSO-2026-004',
      order_number: 'RSO-004',
      retailer_id: 'RET-2026-004',
      retailer_name: 'PureBites Wellness Hub',
      order_date: new Date(now - 22 * dayMs).toISOString(),
      total_units: 30,
      subtotal_amount: 11970,
      discount_amount: 0,
      total_amount: 11970,
      payment_status: 'OVERDUE',
      payment_terms: '7_DAYS',
      due_date: new Date(now - 15 * dayMs).toISOString(),
      amount_paid: 0,
      amount_outstanding: 11970,
      items: [
        { sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 },
        { sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 },
        { sku: 'PERIPERI-200', product_name: 'Fiery Peri-Peri Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 }
      ],
      notes: 'Payment overdue by 15 days.',
      created_by: 'Sales Lead',
      created_at: new Date(now - 22 * dayMs).toISOString()
    },
    {
      id: 'RSO-2026-005',
      order_number: 'RSO-005',
      retailer_id: 'RET-2026-005',
      retailer_name: 'FitFuel Crossfit Cafe & Kiosk',
      order_date: new Date(now - 8 * dayMs).toISOString(),
      total_units: 20,
      subtotal_amount: 7980,
      discount_amount: 0,
      total_amount: 7980,
      payment_status: 'PAID',
      payment_terms: 'IMMEDIATE',
      due_date: new Date(now - 8 * dayMs).toISOString(),
      amount_paid: 7980,
      amount_outstanding: 0,
      items: [
        { sku: 'PLAIN-200', product_name: 'Classic Plain Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 },
        { sku: 'SALTED-200', product_name: 'Lightly Salted Roasted Makhana', quantity: 10, unit_price: 399, total_price: 3990 }
      ],
      notes: 'Paid immediately via UPI scanner on drop-off.',
      created_by: 'Keshav Gandhi',
      created_at: new Date(now - 8 * dayMs).toISOString()
    }
  ];

  // 4. Financial Ledger (Double Entry Log)
  FINANCIAL_LEDGER = [
    {
      id: 'RFL-1',
      retailer_id: 'RET-2026-001',
      retailer_name: "Nature's Soul Gourmet",
      transaction_type: 'INVOICE',
      reference_id: 'RSO-2026-001',
      debit_amount: 9576,
      credit_amount: 0,
      running_balance: 9576,
      payment_method: null,
      payment_ref: null,
      recorded_by: 'Keshav Gandhi',
      notes: 'Supply order RSO-001 invoice',
      created_at: new Date(now - 10 * dayMs).toISOString()
    },
    {
      id: 'RFL-2',
      retailer_id: 'RET-2026-002',
      retailer_name: 'Modern Superstore — Vasant Vihar',
      transaction_type: 'INVOICE',
      reference_id: 'RSO-2026-002',
      debit_amount: 18354,
      credit_amount: 0,
      running_balance: 18354,
      payment_method: null,
      payment_ref: null,
      recorded_by: 'Keshav Gandhi',
      notes: 'Supply order RSO-002 invoice',
      created_at: new Date(now - 14 * dayMs).toISOString()
    },
    {
      id: 'RFL-3',
      retailer_id: 'RET-2026-003',
      retailer_name: 'Le Marche Artisanal Market',
      transaction_type: 'INVOICE',
      reference_id: 'RSO-2026-003',
      debit_amount: 13965,
      credit_amount: 0,
      running_balance: 13965,
      payment_method: null,
      payment_ref: null,
      recorded_by: 'Operations Lead',
      notes: 'Supply order RSO-003 invoice',
      created_at: new Date(now - 6 * dayMs).toISOString()
    },
    {
      id: 'RFL-4',
      retailer_id: 'RET-2026-003',
      retailer_name: 'Le Marche Artisanal Market',
      transaction_type: 'PAYMENT',
      reference_id: 'PAY-2026-0801',
      debit_amount: 0,
      credit_amount: 13965,
      running_balance: 0,
      payment_method: 'BANK_TRANSFER',
      payment_ref: 'HDFC-IMPS-893049102',
      recorded_by: 'Finance Operator',
      notes: 'Full invoice settlement for RSO-003',
      created_at: new Date(now - 5 * dayMs).toISOString()
    },
    {
      id: 'RFL-5',
      retailer_id: 'RET-2026-004',
      retailer_name: 'PureBites Wellness Hub',
      transaction_type: 'INVOICE',
      reference_id: 'RSO-2026-004',
      debit_amount: 11970,
      credit_amount: 0,
      running_balance: 11970,
      payment_method: null,
      payment_ref: null,
      recorded_by: 'Sales Lead',
      notes: 'Supply order RSO-004 invoice (Overdue)',
      created_at: new Date(now - 22 * dayMs).toISOString()
    },
    {
      id: 'RFL-6',
      retailer_id: 'RET-2026-005',
      retailer_name: 'FitFuel Crossfit Cafe & Kiosk',
      transaction_type: 'INVOICE',
      reference_id: 'RSO-2026-005',
      debit_amount: 7980,
      credit_amount: 0,
      running_balance: 7980,
      payment_method: null,
      payment_ref: null,
      recorded_by: 'Keshav Gandhi',
      notes: 'Supply order RSO-005 invoice',
      created_at: new Date(now - 8 * dayMs).toISOString()
    },
    {
      id: 'RFL-7',
      retailer_id: 'RET-2026-005',
      retailer_name: 'FitFuel Crossfit Cafe & Kiosk',
      transaction_type: 'PAYMENT',
      reference_id: 'PAY-2026-0802',
      debit_amount: 0,
      credit_amount: 7980,
      running_balance: 0,
      payment_method: 'UPI',
      payment_ref: 'UPI-ICICI-920194827',
      recorded_by: 'Keshav Gandhi',
      notes: 'Immediate payment at drop-off',
      created_at: new Date(now - 8 * dayMs).toISOString()
    }
  ];

  // 5. Inventory Movements
  INVENTORY_MOVEMENTS = [
    {
      id: 'RIM-1',
      retailer_id: 'RET-2026-001',
      sku: 'PLAIN-200',
      movement_type: 'SUPPLIED',
      quantity_delta: 8,
      before_quantity: 4,
      after_quantity: 12,
      unit_price: 399,
      reference_id: 'RSO-2026-001',
      reason: 'Bi-weekly replenishment supply',
      actor_name: 'Keshav Gandhi',
      actor_role: 'OWNER',
      notes: 'Delivery completed successfully',
      created_at: new Date(now - 10 * dayMs).toISOString()
    },
    {
      id: 'RIM-2',
      retailer_id: 'RET-2026-001',
      sku: 'SALTED-200',
      movement_type: 'RETURNED',
      quantity_delta: -1,
      before_quantity: 15,
      after_quantity: 14,
      unit_price: 399,
      reference_id: 'RET-RET-001',
      reason: 'Outer seal dented during shelf display',
      actor_name: 'Operations Lead',
      actor_role: 'OPERATIONS',
      notes: 'Quarantined at central depot',
      created_at: new Date(now - 3 * dayMs).toISOString()
    },
    {
      id: 'RIM-3',
      retailer_id: 'RET-2026-001',
      sku: 'PERIPERI-200',
      movement_type: 'DAMAGED',
      quantity_delta: -1,
      before_quantity: 9,
      after_quantity: 8,
      unit_price: 399,
      reference_id: 'RECON-2026-01',
      reason: 'Jar crushed by store customer',
      actor_name: 'Raghav Mehra (Store Rep)',
      actor_role: 'OPERATIONS',
      notes: 'Reported during weekly check',
      created_at: new Date(now - 2 * dayMs).toISOString()
    },
    {
      id: 'RIM-4',
      retailer_id: 'RET-2026-002',
      sku: 'PLAIN-200',
      movement_type: 'SUPPLIED',
      quantity_delta: 15,
      before_quantity: 3,
      after_quantity: 18,
      unit_price: 399,
      reference_id: 'RSO-2026-002',
      reason: 'Aisle stock replenishment',
      actor_name: 'Keshav Gandhi',
      actor_role: 'OWNER',
      notes: 'Placed on premium center rack',
      created_at: new Date(now - 14 * dayMs).toISOString()
    }
  ];

  // 6. Returns & Quarantine Log
  RETURNS = [
    {
      id: 'RET-RET-001',
      return_number: 'RRN-001',
      retailer_id: 'RET-2026-001',
      retailer_name: "Nature's Soul Gourmet",
      return_date: new Date(now - 3 * dayMs).toISOString(),
      sku: 'SALTED-200',
      product_name: 'Lightly Salted Roasted Makhana',
      quantity: 1,
      unit_value: 399,
      total_credit_value: 399,
      reason: 'DAMAGED',
      condition: 'DAMAGED_CARTON',
      batch_no: 'B2608-01',
      status: 'QUARANTINED',
      received_by: 'Operations Lead',
      notes: 'Outer plastic seal tampered on customer display rack.',
      created_at: new Date(now - 3 * dayMs).toISOString()
    }
  ];

  // 7. Follow-ups
  FOLLOWUPS = [
    {
      id: 'FOL-1',
      retailer_id: 'RET-2026-004',
      retailer_name: 'PureBites Wellness Hub',
      due_date: new Date(now).toISOString(),
      reason: 'Payment follow-up',
      assigned_person: 'Sales Lead',
      status: 'PENDING',
      notes: 'Invoice RSO-004 is 15 days overdue. Call Amitabh Sen regarding payment release.',
      completed_at: null,
      created_at: new Date(now - 2 * dayMs).toISOString()
    },
    {
      id: 'FOL-2',
      retailer_id: 'RET-2026-002',
      retailer_name: 'Modern Superstore — Vasant Vihar',
      due_date: new Date(now + 1 * dayMs).toISOString(),
      reason: 'Call for reorder',
      assigned_person: 'Keshav Gandhi',
      status: 'PENDING',
      notes: 'Estimated reorder window due. Check if peri-peri stock is below 15 jars.',
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString()
    },
    {
      id: 'FOL-3',
      retailer_id: 'RET-2026-005',
      retailer_name: 'FitFuel Crossfit Cafe & Kiosk',
      due_date: new Date(now + 5 * dayMs).toISOString(),
      reason: 'New SKU introduction',
      assigned_person: 'Keshav Gandhi',
      status: 'PENDING',
      notes: 'Introduce upcoming Trail Sampler & Combo 3-pack for crossfit athletes.',
      completed_at: null,
      created_at: new Date(now - 3 * dayMs).toISOString()
    }
  ];

  // 8. Notes
  NOTES = [
    {
      id: 'NOTE-1',
      retailer_id: 'RET-2026-001',
      author_name: 'Keshav Gandhi',
      author_role: 'OWNER',
      content: 'Store manager Raghav prefers communication via WhatsApp between 10am - 12pm. Best selling item is Fiery Peri-Peri.',
      is_sensitive: false,
      created_at: new Date(now - 15 * dayMs).toISOString()
    },
    {
      id: 'NOTE-2',
      retailer_id: 'RET-2026-002',
      author_name: 'Operations Lead',
      author_role: 'OPERATIONS',
      content: 'Loading dock access available strictly between 8am and 11am on weekdays.',
      is_sensitive: false,
      created_at: new Date(now - 20 * dayMs).toISOString()
    }
  ];
}

// Auto-seed on require
seedInitialRetailNetwork();

// ── Helper: Calculate Dynamic Retailer Health & Stats ──────────────────────────
function calculateRetailerStats(retailer) {
  const inventory = RETAILER_INVENTORY.filter(i => i.retailer_id === retailer.id);
  const supplyOrders = SUPPLY_ORDERS.filter(o => o.retailer_id === retailer.id);
  const returns = RETURNS.filter(r => r.retailer_id === retailer.id);

  let totalUnitsSupplied = 0;
  let currentStockUnits = 0;
  let currentStockValue = 0;
  let totalSoldUnits = 0;

  inventory.forEach(item => {
    const prod = PRODUCT_CATALOG[item.sku] || { price: 399 };
    totalUnitsSupplied += (item.total_supplied || 0);
    currentStockUnits += (item.current_stock || 0);
    currentStockValue += ((item.current_stock || 0) * prod.price);
    totalSoldUnits += (item.total_sold || 0);
  });

  const totalOrders = supplyOrders.length;
  const totalSuppliedValue = supplyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalAmountPaid = FINANCIAL_LEDGER
    .filter(l => l.retailer_id === retailer.id && (l.transaction_type === 'PAYMENT' || l.entry_type === 'PAYMENT'))
    .reduce((sum, l) => sum + (l.credit_amount || l.credit || 0), 0);
  const totalReturnsValue = returns.reduce((sum, r) => sum + (r.total_credit_value || 0), 0);

  // Health Score Determination (Green, Yellow, Red with explicit reasoning)
  let healthScore = 'GREEN';
  let healthReasons = [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const hasOverduePayment = supplyOrders.some(o => {
    if (o.payment_status === 'PAID') return false;
    if (o.due_date && new Date(o.due_date).getTime() < now) return true;
    return false;
  });

  const daysSinceLastOrder = retailer.last_order_date ? Math.floor((now - new Date(retailer.last_order_date).getTime()) / dayMs) : 999;
  const isReorderOverdue = retailer.reorder_frequency_days ? daysSinceLastOrder > (retailer.reorder_frequency_days + 3) : false;

  if (hasOverduePayment || (retailer.credit_limit && retailer.current_outstanding > retailer.credit_limit)) {
    healthScore = 'RED';
    if (hasOverduePayment) healthReasons.push('Payment overdue beyond credit terms');
    if (retailer.current_outstanding > retailer.credit_limit) healthReasons.push('Credit limit exceeded');
  } else if (isReorderOverdue || currentStockUnits <= 10) {
    healthScore = 'YELLOW';
    if (isReorderOverdue) healthReasons.push(`Reorder delayed (${daysSinceLastOrder} days since last order)`);
    if (currentStockUnits <= 10) healthReasons.push('Low inventory at retail store');
  } else {
    healthScore = 'GREEN';
    healthReasons.push('Healthy regular orders & payments within terms');
  }

  // Estimated next reorder
  let expectedReorderDate = retailer.expected_next_order_date;
  if (!expectedReorderDate && retailer.last_order_date && retailer.reorder_frequency_days) {
    expectedReorderDate = new Date(new Date(retailer.last_order_date).getTime() + retailer.reorder_frequency_days * dayMs).toISOString();
  }

  const isReorderDue = expectedReorderDate ? (new Date(expectedReorderDate).getTime() <= (now + 2 * dayMs)) : false;

  return {
    totalOrders,
    totalUnitsSupplied,
    currentStockUnits,
    currentStockValue,
    totalSoldUnits,
    totalSuppliedValue,
    totalAmountPaid,
    totalReturnsValue,
    outstandingCredit: retailer.current_outstanding || 0,
    availableCredit: Math.max(0, (retailer.credit_limit || 0) - (retailer.current_outstanding || 0)),
    healthScore,
    healthReasons,
    isReorderDue,
    expectedReorderDate,
    daysSinceLastOrder
  };
}

// ── 1. Get Dashboard Dynamic KPIs ─────────────────────────────────────────────
function getRetailDashboardKPIs() {
  const activeRetailers = RETAILERS.filter(r => !r.deleted_at);
  const totalRetailers = activeRetailers.length;
  const activeCount = activeRetailers.filter(r => r.status === 'ACTIVE').length;

  let retailersWithStock = 0;
  let retailersLowStock = 0;
  let retailersReorderDue = 0;
  let totalStockUnits = 0;
  let totalStockValue = 0;
  let totalCreditOutstanding = 0;

  activeRetailers.forEach(r => {
    const stats = calculateRetailerStats(r);
    if (stats.currentStockUnits > 0) retailersWithStock++;
    if (stats.currentStockUnits > 0 && stats.currentStockUnits <= 15) retailersLowStock++;
    if (stats.isReorderDue) retailersReorderDue++;
    totalStockUnits += stats.currentStockUnits;
    totalStockValue += stats.currentStockValue;
    totalCreditOutstanding += (r.current_outstanding || 0);
  });

  const totalAmountReceived = FINANCIAL_LEDGER
    .filter(l => l.transaction_type === 'PAYMENT')
    .reduce((sum, l) => sum + (l.credit_amount || 0), 0);

  const totalReturnsUnits = RETURNS.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalReturnsValue = RETURNS.reduce((sum, r) => sum + (r.total_credit_value || 0), 0);

  const totalGoodsSuppliedValue = SUPPLY_ORDERS.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalGoodsSuppliedUnits = SUPPLY_ORDERS.reduce((sum, o) => sum + (o.total_units || 0), 0);

  // Accurately defined Capital Tied Up:
  // Capital Tied Up = Outstanding Credit + Value of Current Stock Held by Retailers
  const capitalTiedUp = totalCreditOutstanding + totalStockValue;

  return {
    totalRetailers,
    activeRetailers: activeCount,
    retailersWithStock,
    retailersLowStock,
    retailersReorderDue,
    totalStockUnits,
    totalStockValue,
    totalCreditOutstanding,
    totalAmountReceived,
    totalReturnsUnits,
    totalReturnsValue,
    totalReturnsCount: RETURNS.length,
    totalGoodsSuppliedValue,
    totalGoodsSuppliedUnits,
    capitalTiedUp,

    // Snake case aliases
    total_retailers: totalRetailers,
    active_retailers: activeCount,
    retailers_with_stock: retailersWithStock,
    low_stock_retailers: retailersLowStock,
    reorder_due_retailers: retailersReorderDue,
    total_stock_units: totalStockUnits,
    total_stock_value: totalStockValue,
    total_credit_outstanding: totalCreditOutstanding,
    total_amount_received: totalAmountReceived,
    total_returns_units: totalReturnsUnits,
    total_returns_value: totalReturnsValue,
    total_returns_count: RETURNS.length,
    total_capital_tied_up: capitalTiedUp
  };
}

// ── 2. Retailer Directory with Search, Filter & Sort ──────────────────────────
function getAllRetailers({ search = '', filter = 'all', flag = '', status = '', sort = 'name_asc' } = {}) {
  let list = RETAILERS.filter(r => !r.deleted_at);

  // Search
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(r => 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.contact_person && r.contact_person.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.area && r.area.toLowerCase().includes(q)) ||
      (r.retailer_code && r.retailer_code.toLowerCase().includes(q))
    );
  }

  // Enrich with live stats
  let enriched = list.map(r => {
    const stats = calculateRetailerStats(r);
    return {
      ...r,
      code: r.retailer_code || r.code,
      current_stock_units: stats.currentStockUnits,
      current_stock_value: stats.currentStockValue,
      outstanding_credit: stats.outstandingCredit,
      total_amount_received: stats.totalAmountPaid,
      total_supplied_value: stats.totalSuppliedValue,
      total_orders_count: stats.totalOrders,
      next_expected_order_date: r.expected_next_order_date,
      health_status: {
        color: (stats.healthScore || 'GREEN').toLowerCase(),
        label: stats.healthScore || 'HEALTHY',
        reasons: stats.healthReasons || [],
        reorder_due: stats.isReorderDue,
        is_overdue: stats.healthScore === 'RED'
      },
      stats
    };
  });

  // Filter Pills
  const activeFilter = (filter !== 'all' ? filter : '') || flag || status || 'all';
  if (activeFilter === 'active' || activeFilter === 'ACTIVE') enriched = enriched.filter(r => r.status === 'ACTIVE');
  else if (activeFilter === 'inactive' || activeFilter === 'INACTIVE') enriched = enriched.filter(r => r.status === 'INACTIVE' || r.status === 'ON_HOLD');
  else if (activeFilter === 'has_stock') enriched = enriched.filter(r => r.stats.currentStockUnits > 0);
  else if (activeFilter === 'low_stock') enriched = enriched.filter(r => r.stats.currentStockUnits > 0 && r.stats.currentStockUnits <= 15);
  else if (activeFilter === 'credit_outstanding') enriched = enriched.filter(r => (r.current_outstanding || 0) > 0);
  else if (activeFilter === 'payment_due') enriched = enriched.filter(r => r.stats.healthScore === 'RED' || (r.current_outstanding || 0) > 0);
  else if (activeFilter === 'reorder_due') enriched = enriched.filter(r => r.stats.isReorderDue);

  // Sort
  if (sort === 'name_asc') enriched.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'name_desc') enriched.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === 'stock_high') enriched.sort((a, b) => b.stats.currentStockValue - a.stats.currentStockValue);
  else if (sort === 'outstanding_high') enriched.sort((a, b) => (b.current_outstanding || 0) - (a.current_outstanding || 0));
  else if (sort === 'last_order') enriched.sort((a, b) => new Date(b.last_order_date || 0) - new Date(a.last_order_date || 0));

  return enriched;
}

// ── 3. Get Retailer Profile 360° ──────────────────────────────────────────────
function getRetailerProfile(id) {
  const retailer = RETAILERS.find(r => r.id === id || r.retailer_code === id);
  if (!retailer || retailer.deleted_at) {
    throw new Error(`Retailer ${id} not found or has been archived.`);
  }

  const stats = calculateRetailerStats(retailer);
  const inventory = RETAILER_INVENTORY.filter(i => i.retailer_id === retailer.id).map(inv => ({
    ...inv,
    quantity_sold: inv.total_sold !== undefined ? inv.total_sold : (inv.quantity_sold || 0),
    total_sold: inv.total_sold !== undefined ? inv.total_sold : (inv.quantity_sold || 0),
    quantity_returned: inv.total_returned !== undefined ? inv.total_returned : (inv.quantity_returned || 0),
    total_returned: inv.total_returned !== undefined ? inv.total_returned : (inv.quantity_returned || 0),
    quantity_damaged: inv.total_damaged !== undefined ? inv.total_damaged : (inv.quantity_damaged || 0),
    total_damaged: inv.total_damaged !== undefined ? inv.total_damaged : (inv.quantity_damaged || 0),
    unit_price: (PRODUCT_CATALOG[inv.sku] || { price: 399 }).price
  }));
  const movements = INVENTORY_MOVEMENTS.filter(m => m.retailer_id === retailer.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const orders = SUPPLY_ORDERS.filter(o => o.retailer_id === retailer.id).sort((a, b) => new Date(b.order_date || b.created_at) - new Date(a.order_date || a.created_at));
  const rawLedger = FINANCIAL_LEDGER.filter(l => l.retailer_id === retailer.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const returns = RETURNS.filter(r => r.retailer_id === retailer.id).sort((a, b) => new Date(b.return_date || b.created_at) - new Date(a.return_date || a.created_at));
  const followups = FOLLOWUPS.filter(f => f.retailer_id === retailer.id).sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
  const notes = NOTES.filter(n => n.retailer_id === retailer.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const documents = DOCUMENTS.filter(d => d.retailer_id === retailer.id);

  const mappedLedger = rawLedger.map(l => ({
    ...l,
    entry_type: l.transaction_type || l.entry_type,
    debit: l.debit_amount !== undefined ? l.debit_amount : l.debit || 0,
    credit: l.credit_amount !== undefined ? l.credit_amount : l.credit || 0
  }));

  return {
    retailer: {
      ...retailer,
      code: retailer.retailer_code || retailer.code,
      current_stock_units: stats.currentStockUnits,
      current_stock_value: stats.currentStockValue,
      outstanding_credit: stats.outstandingCredit,
      total_amount_received: stats.totalAmountPaid,
      total_supplied_value: stats.totalSuppliedValue,
      total_orders_count: stats.totalOrders,
      next_expected_order_date: retailer.expected_next_order_date,
      health_status: {
        color: (stats.healthScore || 'GREEN').toLowerCase(),
        label: stats.healthScore || 'HEALTHY',
        reasons: stats.healthReasons || [],
        reorder_due: stats.isReorderDue,
        is_overdue: stats.healthScore === 'RED'
      },
      stats
    },
    inventory,
    movements,
    supply_orders: orders,
    orders,
    financial_ledger: mappedLedger,
    ledger: mappedLedger,
    returns,
    followups,
    notes,
    documents,
    health: {
      color: (stats.healthScore || 'GREEN').toLowerCase(),
      label: stats.healthScore || 'HEALTHY',
      reasons: stats.healthReasons || []
    }
  };
}

// ── 4. Create Retailer ────────────────────────────────────────────────────────
function createRetailer(data, actor = { name: 'Admin', role: 'OWNER' }) {
  if (!data.name || !data.contact_person || !data.phone || !data.city || !data.address) {
    throw new Error('Retailer Name, Contact Person, Phone, City, and Address are required.');
  }

  const nextNum = RETAILERS.length + 1;
  const retailer_code = data.retailer_code || `RET-${String(nextNum).padStart(3, '0')}`;
  const id = `RET-2026-${String(nextNum).padStart(3, '0')}`;

  const newRetailer = {
    id,
    retailer_code,
    name: data.name.trim(),
    contact_person: data.contact_person.trim(),
    phone: data.phone.trim(),
    whatsapp: data.whatsapp ? data.whatsapp.trim() : data.phone.trim(),
    email: data.email ? data.email.trim().toLowerCase() : '',
    gstin: data.gstin ? data.gstin.trim().toUpperCase() : '',
    retailer_type: data.retailer_type || 'Gourmet Store',
    channel_type: data.channel_type || 'RETAILER',
    address: data.address.trim(),
    area: data.area ? data.area.trim() : data.city.trim(),
    city: data.city.trim(),
    state: data.state || 'Delhi',
    pincode: data.pincode ? data.pincode.trim() : '',
    landmark: data.landmark ? data.landmark.trim() : '',
    gps_coordinates: data.gps_coordinates || '',
    status: data.status || 'ACTIVE',
    assigned_salesperson: data.assigned_salesperson || actor.name,
    payment_terms: data.payment_terms || '15_DAYS',
    credit_limit: parseInt(data.credit_limit, 10) || 20000,
    current_outstanding: 0,
    reorder_frequency_days: parseInt(data.reorder_frequency_days, 10) || 14,
    preferred_contact_method: data.preferred_contact_method || 'WHATSAPP',
    notes: data.notes || '',
    last_order_date: null,
    expected_next_order_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null
  };

  RETAILERS.unshift(newRetailer);

  // Initialize 0 stock positions for all catalog products
  Object.keys(PRODUCT_CATALOG).forEach((sku, idx) => {
    RETAILER_INVENTORY.push({
      id: `RINV-${Date.now()}-${idx}`,
      retailer_id: id,
      sku,
      product_name: PRODUCT_CATALOG[sku].name,
      current_stock: 0,
      total_supplied: 0,
      total_sold: 0,
      total_returned: 0,
      total_damaged: 0,
      total_sample: 0,
      last_supplied_at: null,
      last_reconciled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  logAuditEvent({
    action: 'RETAILER_CREATED',
    entity_type: 'RETAILER',
    entity_id: id,
    entity_name: newRetailer.name,
    actor_name: actor.name,
    actor_role: actor.role,
    new_value: newRetailer,
    reason: 'New retail partner onboarded'
  });

  return newRetailer;
}

// ── 5. Update Retailer ────────────────────────────────────────────────────────
function updateRetailer(id, data, actor = { name: 'Admin', role: 'OWNER' }) {
  const index = RETAILERS.findIndex(r => r.id === id || r.retailer_code === id);
  if (index === -1) throw new Error(`Retailer ${id} not found.`);

  const oldRetailer = { ...RETAILERS[index] };
  const updated = {
    ...oldRetailer,
    ...data,
    updated_at: new Date().toISOString()
  };

  RETAILERS[index] = updated;

  logAuditEvent({
    action: 'RETAILER_UPDATED',
    entity_type: 'RETAILER',
    entity_id: id,
    entity_name: updated.name,
    actor_name: actor.name,
    actor_role: actor.role,
    previous_value: oldRetailer,
    new_value: updated,
    reason: data.reason || 'Retailer profile updated'
  });

  return updated;
}

// ── 6. Soft Delete / Archive Retailer ─────────────────────────────────────────
function archiveRetailer(id, actor = { name: 'Admin', role: 'OWNER' }) {
  const target = RETAILERS.find(r => r.id === id || r.retailer_code === id);
  if (!target) throw new Error(`Retailer ${id} not found.`);

  target.status = 'ARCHIVED';
  target.deleted_at = new Date().toISOString();
  target.deleted_by = actor.name;
  target.updated_at = new Date().toISOString();

  logAuditEvent({
    action: 'RETAILER_ARCHIVED',
    entity_type: 'RETAILER',
    entity_id: id,
    entity_name: target.name,
    actor_name: actor.name,
    actor_role: actor.role,
    reason: 'Retailer archived by operator'
  });

  return { message: `Retailer ${target.name} archived successfully.` };
}

// ── 7. Atomic Supply Order Recording ──────────────────────────────────────────
function recordSupplyOrder(supplyData, actor = { name: 'Admin', role: 'OWNER' }) {
  const { retailer_id, items, payment_terms, due_date, notes, force_credit_override } = supplyData;

  const retailer = RETAILERS.find(r => r.id === retailer_id || r.retailer_code === retailer_id);
  if (!retailer || retailer.deleted_at) throw new Error('Valid retailer is required.');
  if (!Array.isArray(items) || items.length === 0) throw new Error('At least one product item is required.');

  // 1. Calculate order amounts & validate line items
  let totalUnits = 0;
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    if (!qty || qty <= 0) continue;

    const prod = PRODUCT_CATALOG[item.sku] || { price: parseInt(item.unit_price, 10) || 399, name: item.sku };
    const unitPrice = item.unit_price ? parseInt(item.unit_price, 10) : prod.price;
    const totalPrice = qty * unitPrice;

    totalUnits += qty;
    totalAmount += totalPrice;

    processedItems.push({
      sku: item.sku,
      product_name: prod.name || item.sku,
      quantity: qty,
      unit_price: unitPrice,
      total_price: totalPrice,
      batch_no: item.batch_no || 'B2608-DEFAULT'
    });
  }

  if (processedItems.length === 0) throw new Error('No valid quantities specified in supply items.');

  // 2. Check Credit Limit
  const newOutstanding = (retailer.current_outstanding || 0) + totalAmount;
  const creditLimit = retailer.credit_limit || 20000;

  if (newOutstanding > creditLimit && !force_credit_override && actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
    return {
      requires_approval: true,
      error: `CREDIT LIMIT EXCEEDED: New balance ₹${newOutstanding.toLocaleString('en-IN')} exceeds credit limit of ₹${creditLimit.toLocaleString('en-IN')}. Requires Owner approval.`,
      outstanding: retailer.current_outstanding,
      limit: creditLimit,
      orderTotal: totalAmount
    };
  }

  const nextOrderNum = SUPPLY_ORDERS.length + 1;
  const order_id = `RSO-2026-${String(nextOrderNum).padStart(3, '0')}`;
  const order_number = `RSO-${String(nextOrderNum).padStart(3, '0')}`;
  const nowStr = new Date().toISOString();

  const daysTerm = payment_terms === '7_DAYS' ? 7 : (payment_terms === '30_DAYS' ? 30 : 15);
  const calculatedDueDate = due_date || new Date(Date.now() + daysTerm * 24 * 60 * 60 * 1000).toISOString();

  // 3. Atomically update inventory & stock movements
  processedItems.forEach(item => {
    // 3a. Record movement in VEYANO warehouse (decrement warehouse stock)
    try {
      recordInventoryMovement({
        sku: item.sku,
        quantityDelta: -item.quantity,
        movementType: 'RETAIL_SUPPLY',
        reason: `Supply batch ${order_number} to ${retailer.name}`,
        referenceId: order_id,
        creatorName: actor.name,
        creatorEmail: actor.email || 'admin@veyano.in',
        notes: `Shipped to ${retailer.name} (${retailer.city})`
      });
    } catch (e) {
      console.warn('Warehouse stock decrement note:', e.message);
    }

    // 3b. Increment retailer stock
    let retailInv = RETAILER_INVENTORY.find(i => i.retailer_id === retailer.id && i.sku === item.sku);
    if (!retailInv) {
      retailInv = {
        id: `RINV-${Date.now()}-${item.sku}`,
        retailer_id: retailer.id,
        sku: item.sku,
        product_name: item.product_name,
        current_stock: 0,
        total_supplied: 0,
        total_sold: 0,
        total_returned: 0,
        total_damaged: 0,
        total_sample: 0,
        last_supplied_at: null,
        last_reconciled_at: null,
        created_at: nowStr,
        updated_at: nowStr
      };
      RETAILER_INVENTORY.push(retailInv);
    }

    const beforeQty = retailInv.current_stock || 0;
    const afterQty = beforeQty + item.quantity;

    retailInv.current_stock = afterQty;
    retailInv.total_supplied = (retailInv.total_supplied || 0) + item.quantity;
    retailInv.last_supplied_at = nowStr;
    retailInv.updated_at = nowStr;

    // 3c. Log immutable retailer stock movement
    INVENTORY_MOVEMENTS.unshift({
      id: `RIM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      retailer_id: retailer.id,
      sku: item.sku,
      movement_type: 'SUPPLIED',
      quantity_delta: item.quantity,
      before_quantity: beforeQty,
      after_quantity: afterQty,
      unit_price: item.unit_price,
      reference_id: order_id,
      reason: `Supply order ${order_number}`,
      actor_name: actor.name,
      actor_role: actor.role,
      notes: notes || 'Dispatched and handed over to retailer',
      created_at: nowStr
    });
  });

  // 4. Create Supply Order Record
  const supplyOrder = {
    id: order_id,
    order_number,
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    order_date: nowStr,
    total_units: totalUnits,
    subtotal_amount: totalAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    payment_status: 'CREDIT_PENDING',
    payment_terms: payment_terms || retailer.payment_terms || '15_DAYS',
    due_date: calculatedDueDate,
    amount_paid: 0,
    amount_outstanding: totalAmount,
    items: processedItems,
    notes: notes || '',
    created_by: actor.name,
    created_at: nowStr
  };
  SUPPLY_ORDERS.unshift(supplyOrder);

  // 5. Update Retailer Financial Ledger (Debit Invoice)
  retailer.current_outstanding = newOutstanding;
  retailer.last_order_date = nowStr;
  retailer.expected_next_order_date = new Date(Date.now() + (retailer.reorder_frequency_days || 14) * 24 * 60 * 60 * 1000).toISOString();
  retailer.updated_at = nowStr;

  FINANCIAL_LEDGER.unshift({
    id: `RFL-${Date.now()}`,
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    transaction_type: 'INVOICE',
    reference_id: order_id,
    debit_amount: totalAmount,
    credit_amount: 0,
    running_balance: newOutstanding,
    payment_method: null,
    payment_ref: null,
    recorded_by: actor.name,
    notes: `Supply Invoice ${order_number}`,
    created_at: nowStr
  });

  // 6. Log Audit Trail
  logAuditEvent({
    action: 'RETAIL_SUPPLY_RECORDED',
    entity_type: 'RETAIL_SUPPLY',
    entity_id: order_id,
    entity_name: `Supply #${order_number} to ${retailer.name}`,
    actor_name: actor.name,
    actor_role: actor.role,
    new_value: { totalUnits, totalAmount, newOutstanding },
    reason: notes || 'Retail stock supply batch recorded'
  });

  return {
    success: true,
    message: `Supply order ${order_number} recorded successfully.`,
    order: supplyOrder,
    outstanding: newOutstanding
  };
}

// ── 8. Record Payment ─────────────────────────────────────────────────────────
function recordPayment(paymentData, actor = { name: 'Admin', role: 'OWNER' }) {
  const { retailer_id, amount, payment_method, payment_ref, utr_number, order_id, notes, date, payment_date } = paymentData;

  const retailer = RETAILERS.find(r => r.id === retailer_id || r.retailer_code === retailer_id);
  if (!retailer) throw new Error('Valid retailer is required.');

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) throw new Error('Valid positive payment amount is required.');

  const prevOutstanding = retailer.current_outstanding || 0;
  const newOutstanding = Math.max(0, prevOutstanding - numAmount);
  const nowStr = payment_date || date ? new Date(payment_date || date).toISOString() : new Date().toISOString();

  retailer.current_outstanding = newOutstanding;
  retailer.updated_at = nowStr;

  // If specific order allocated, update order amount_paid
  if (order_id) {
    const targetOrder = SUPPLY_ORDERS.find(o => o.id === order_id);
    if (targetOrder) {
      targetOrder.amount_paid = (targetOrder.amount_paid || 0) + numAmount;
      targetOrder.amount_outstanding = Math.max(0, (targetOrder.total_amount || 0) - targetOrder.amount_paid);
      if (targetOrder.amount_outstanding === 0) targetOrder.payment_status = 'PAID';
      else targetOrder.payment_status = 'PARTIAL';
    }
  }

  const paymentId = `PAY-${Date.now()}`;
  const refNum = utr_number || payment_ref || 'Direct Settlement';

  const ledgerEntry = {
    id: `RFL-${Date.now()}`,
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    transaction_type: 'PAYMENT',
    reference_id: paymentId,
    debit_amount: 0,
    credit_amount: numAmount,
    running_balance: newOutstanding,
    payment_method: payment_method || 'UPI',
    payment_ref: refNum,
    utr_number: refNum,
    recorded_by: actor.name,
    notes: notes || (order_id ? `Settlement for order ${order_id}` : 'General ledger payment'),
    created_at: nowStr
  };

  FINANCIAL_LEDGER.unshift(ledgerEntry);

  logAuditEvent({
    action: 'RETAIL_PAYMENT_RECORDED',
    entity_type: 'RETAIL_PAYMENT',
    entity_id: paymentId,
    entity_name: `Payment of ₹${numAmount.toLocaleString('en-IN')} from ${retailer.name}`,
    actor_name: actor.name,
    actor_role: actor.role,
    previous_value: { outstanding: prevOutstanding },
    new_value: { paymentAmount: numAmount, newOutstanding, payment_ref: refNum, payment_method },
    reason: notes || 'Payment settlement recorded'
  });

  return {
    success: true,
    message: `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded successfully.`,
    newOutstanding,
    ledgerEntry
  };
}

// ── 9. Record Return & Quarantine ─────────────────────────────────────────────
function recordReturn(returnData, actor = { name: 'Admin', role: 'OWNER' }) {
  const { retailer_id, sku, quantity, reason, condition, batch_no, batch_number, credit_refund_value, credit_amount, notes, date } = returnData;

  const retailer = RETAILERS.find(r => r.id === retailer_id || r.retailer_code === retailer_id);
  if (!retailer) throw new Error('Valid retailer is required.');

  const qty = parseInt(quantity, 10);
  if (!qty || qty <= 0) throw new Error('Return quantity must be greater than zero.');

  const prod = PRODUCT_CATALOG[sku] || { name: sku, price: 399 };
  const unitVal = prod.price;
  const inputCredit = credit_amount !== undefined ? credit_amount : credit_refund_value;
  const totalVal = inputCredit !== undefined ? parseInt(inputCredit, 10) : (qty * unitVal);

  const returnNum = `RRN-${String(RETURNS.length + 1).padStart(3, '0')}`;
  const returnId = `RET-RET-${Date.now()}`;
  const nowStr = date ? new Date(date).toISOString() : new Date().toISOString();

  // 1. Decrease retailer stock
  const retailInv = RETAILER_INVENTORY.find(i => i.retailer_id === retailer.id && i.sku === sku);
  const beforeQty = retailInv ? retailInv.current_stock : 0;
  const afterQty = Math.max(0, beforeQty - qty);

  if (retailInv) {
    retailInv.current_stock = afterQty;
    retailInv.total_returned = (retailInv.total_returned || 0) + qty;
    retailInv.updated_at = nowStr;
  }

  // 2. Log Movement (RETURNED)
  INVENTORY_MOVEMENTS.unshift({
    id: `RIM-${Date.now()}`,
    retailer_id: retailer.id,
    sku,
    movement_type: 'RETURNED',
    quantity_delta: -qty,
    before_quantity: beforeQty,
    after_quantity: afterQty,
    unit_price: unitVal,
    reference_id: returnId,
    reason: `Return (${reason}): ${notes || 'Quarantined stock'}`,
    actor_name: actor.name,
    actor_role: actor.role,
    notes: `Condition: ${condition || 'SEALED'} | Batch: ${batch_number || batch_no || 'N/A'}`,
    created_at: nowStr
  });

  // 3. Log Return Record in Quarantine
  const returnRecord = {
    id: returnId,
    return_number: returnNum,
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    return_date: nowStr,
    sku,
    product_name: prod.name,
    quantity: qty,
    unit_value: unitVal,
    total_credit_value: totalVal,
    credit_amount: totalVal,
    reason: reason || 'DAMAGED',
    condition: condition || 'SEALED',
    batch_no: batch_number || batch_no || 'B2608-RETURN',
    status: 'QUARANTINED', // Strictly quarantined, NOT automatically added to sellable stock
    received_by: actor.name,
    notes: notes || '',
    created_at: nowStr
  };
  RETURNS.unshift(returnRecord);

  // 4. Financial adjustment (Credit Note if applicable)
  if (totalVal > 0) {
    const prevOutstanding = retailer.current_outstanding || 0;
    const newOutstanding = Math.max(0, prevOutstanding - totalVal);
    retailer.current_outstanding = newOutstanding;
    retailer.updated_at = nowStr;

    FINANCIAL_LEDGER.unshift({
      id: `RFL-${Date.now()}`,
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      transaction_type: 'CREDIT_NOTE',
      reference_id: returnNum,
      debit_amount: 0,
      credit_amount: totalVal,
      running_balance: newOutstanding,
      payment_method: null,
      payment_ref: `CRN-${returnNum}`,
      recorded_by: actor.name,
      notes: `Credit Note for return ${returnNum} (${qty}x ${prod.name})`,
      created_at: nowStr
    });
  }

  logAuditEvent({
    action: 'RETAIL_RETURN_RECORDED',
    entity_type: 'RETAIL_RETURN',
    entity_id: returnId,
    entity_name: `Return #${returnNum} (${qty} units of ${sku}) from ${retailer.name}`,
    actor_name: actor.name,
    actor_role: actor.role,
    new_value: { returnRecord, creditNote: totalVal },
    reason: `Product returned (${reason}) - placed in quarantine`
  });

  return {
    success: true,
    message: `Return ${returnNum} recorded and stock quarantined.`,
    return_record: returnRecord,
    returnRecord
  };
}

// ── 10. Physical Stock Reconciliation ─────────────────────────────────────────
function reconcileStock(reconcileData, actor = { name: 'Admin', role: 'OWNER' }) {
  const { retailer_id, sku, physical_stock, physical_count, reason, discrepancy_reason, notes } = reconcileData;

  const retailer = RETAILERS.find(r => r.id === retailer_id || r.retailer_code === retailer_id);
  if (!retailer) throw new Error('Valid retailer is required.');
  if (!sku) throw new Error('SKU is required.');

  const rawCount = physical_count !== undefined ? physical_count : physical_stock;
  if (rawCount === undefined || rawCount === null || isNaN(rawCount)) {
    throw new Error('Physical stock count is required.');
  }

  const physicalCount = parseInt(rawCount, 10);
  if (physicalCount < 0) throw new Error('Physical stock count cannot be negative.');

  const selectedReason = discrepancy_reason || reason || 'Physical audit adjustment';
  const prod = PRODUCT_CATALOG[sku] || { name: sku, price: 399 };
  let retailInv = RETAILER_INVENTORY.find(i => i.retailer_id === retailer.id && i.sku === sku);

  if (!retailInv) {
    retailInv = {
      id: `RINV-${Date.now()}-${sku}`,
      retailer_id: retailer.id,
      sku,
      product_name: prod.name,
      current_stock: 0,
      total_supplied: 0,
      total_sold: 0,
      total_returned: 0,
      total_damaged: 0,
      total_sample: 0,
      last_supplied_at: null,
      last_reconciled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    RETAILER_INVENTORY.push(retailInv);
  }

  const beforeQty = retailInv.current_stock || 0;
  const diff = physicalCount - beforeQty;
  const nowStr = new Date().toISOString();

  retailInv.current_stock = physicalCount;
  retailInv.last_reconciled_at = nowStr;
  retailInv.updated_at = nowStr;

  // If sold but not reported
  if (selectedReason === 'Sold but not reported' && diff < 0) {
    retailInv.total_sold = (retailInv.total_sold || 0) + Math.abs(diff);
  } else if (selectedReason === 'Damaged' && diff < 0) {
    retailInv.total_damaged = (retailInv.total_damaged || 0) + Math.abs(diff);
  }

  // Log Immutable Movement
  INVENTORY_MOVEMENTS.unshift({
    id: `RIM-${Date.now()}`,
    retailer_id: retailer.id,
    sku,
    movement_type: 'STOCK_ADJUSTMENT',
    quantity_delta: diff,
    before_quantity: beforeQty,
    after_quantity: physicalCount,
    unit_price: prod.price,
    reference_id: `RECON-${Date.now()}`,
    reason: `Physical audit reconciliation: ${selectedReason}`,
    actor_name: actor.name,
    actor_role: actor.role,
    notes: notes || `Audited by ${actor.name} (Diff: ${diff > 0 ? '+' : ''}${diff} units)`,
    created_at: nowStr
  });

  logAuditEvent({
    action: 'RETAIL_STOCK_RECONCILED',
    entity_type: 'RETAIL_STOCK',
    entity_id: `${retailer.id}:${sku}`,
    entity_name: `Reconciled ${sku} at ${retailer.name}`,
    actor_name: actor.name,
    actor_role: actor.role,
    previous_value: { system_stock: beforeQty },
    new_value: { physical_stock: physicalCount, difference: diff, reason },
    reason: notes || `Physical stock audit discrepancy resolved`
  });

  return {
    success: true,
    message: `Stock for ${sku} reconciled from ${beforeQty} to ${physicalCount} units (Difference: ${diff}).`,
    diff,
    delta: diff,
    physical_stock: physicalCount
  };
}

// ── 11. Global Retail Stock View Matrix ───────────────────────────────────────
function getRetailStockMatrix({ sku = '', city = '', search = '' } = {}) {
  let matrix = [];

  RETAILERS.filter(r => !r.deleted_at).forEach(retailer => {
    const invItems = RETAILER_INVENTORY.filter(i => i.retailer_id === retailer.id);

    invItems.forEach(item => {
      if (sku && item.sku !== sku) return;
      if (city && retailer.city.toLowerCase() !== city.toLowerCase()) return;
      if (search) {
        const q = search.toLowerCase();
        if (!retailer.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) return;
      }

      const prod = PRODUCT_CATALOG[item.sku] || { price: 399 };
      const stockValue = (item.current_stock || 0) * prod.price;

      // Estimated days of stock remaining (simple average velocity)
      const daysOfStock = item.current_stock > 0 ? Math.min(60, Math.round(item.current_stock * 2.5)) : 0;

      matrix.push({
        retailer_id: retailer.id,
        retailer_name: retailer.name,
        city: retailer.city,
        area: retailer.area,
        sku: item.sku,
        product_name: item.product_name,
        current_stock: item.current_stock || 0,
        stock_value: stockValue,
        last_supplied_at: item.last_supplied_at,
        last_reconciled_at: item.last_reconciled_at,
        estimated_days_of_stock: daysOfStock,
        expected_reorder_date: retailer.expected_next_order_date,
        is_estimate: true
      });
    });
  });

  return matrix.sort((a, b) => b.current_stock - a.current_stock);
}

// ── 12. Follow-ups Management ────────────────────────────────────────────────
function getFollowups({ status = 'ALL' } = {}) {
  let list = [...FOLLOWUPS];
  if (status !== 'ALL') {
    list = list.filter(f => f.status === status);
  }
  return list.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
}

function createFollowup(data, actor = { name: 'Admin', role: 'OWNER' }) {
  const { retailer_id, due_date, reason, assigned_person, notes } = data;
  const retailer = RETAILERS.find(r => r.id === retailer_id || r.retailer_code === retailer_id);
  if (!retailer) throw new Error('Valid retailer is required.');
  if (!due_date || !reason) throw new Error('Due Date and Reason are required.');

  const followup = {
    id: `FOL-${Date.now()}`,
    retailer_id: retailer.id,
    retailer_name: retailer.name,
    due_date: new Date(due_date).toISOString(),
    reason: reason.trim(),
    assigned_person: assigned_person || actor.name,
    status: 'PENDING',
    notes: notes || '',
    completed_at: null,
    created_at: new Date().toISOString()
  };

  FOLLOWUPS.unshift(followup);

  logAuditEvent({
    action: 'FOLLOWUP_CREATED',
    entity_type: 'FOLLOWUP',
    entity_id: followup.id,
    entity_name: `Follow-up for ${retailer.name} (${reason})`,
    actor_name: actor.name,
    actor_role: actor.role,
    new_value: followup,
    reason: 'Follow-up task scheduled'
  });

  return followup;
}

function completeFollowup(id, notes = '', actor = { name: 'Admin', role: 'OWNER' }) {
  const target = FOLLOWUPS.find(f => f.id === id);
  if (!target) throw new Error(`Follow-up ${id} not found.`);

  target.status = 'COMPLETED';
  target.completed_at = new Date().toISOString();
  if (notes) target.notes = `${target.notes ? target.notes + ' | ' : ''}Completion Note: ${notes}`;

  return target;
}

// ── 13. Retailer Internal Notes ───────────────────────────────────────────────
function addRetailerNote(retailerId, content, actor = { name: 'Admin', role: 'OWNER' }) {
  const retailer = RETAILERS.find(r => r.id === retailerId || r.retailer_code === retailerId);
  if (!retailer) throw new Error('Retailer not found.');
  if (!content || !content.trim()) throw new Error('Note content cannot be blank.');

  const note = {
    id: `NOTE-${Date.now()}`,
    retailer_id: retailer.id,
    author_name: actor.name,
    author_role: actor.role,
    content: content.trim(),
    is_sensitive: false,
    created_at: new Date().toISOString()
  };

  NOTES.unshift(note);
  return note;
}

// ── 14. Printable / Exportable Account Statement ──────────────────────────────
function getRetailerStatement(retailerId, { fromDate, toDate } = {}) {
  const retailer = RETAILERS.find(r => r.id === retailerId || r.retailer_code === retailerId);
  if (!retailer) throw new Error('Retailer not found.');

  let ledger = FINANCIAL_LEDGER.filter(l => l.retailer_id === retailer.id);

  if (fromDate) {
    const fTime = new Date(fromDate).getTime();
    ledger = ledger.filter(l => new Date(l.created_at).getTime() >= fTime);
  }
  if (toDate) {
    const tTime = new Date(toDate).getTime();
    ledger = ledger.filter(l => new Date(l.created_at).getTime() <= tTime);
  }

  // Calculate opening balance before fromDate if filtered
  let openingBalance = 0;
  if (fromDate) {
    const priorLedger = FINANCIAL_LEDGER.filter(l => l.retailer_id === retailer.id && new Date(l.created_at).getTime() < new Date(fromDate).getTime());
    openingBalance = priorLedger.reduce((bal, l) => bal + (l.debit_amount || 0) - (l.credit_amount || 0), 0);
  }

  const totalDebits = ledger.reduce((sum, l) => sum + (l.debit_amount !== undefined ? l.debit_amount : (l.debit || 0)), 0);
  const totalCredits = ledger.reduce((sum, l) => sum + (l.credit_amount !== undefined ? l.credit_amount : (l.credit || 0)), 0);
  const closingBalance = openingBalance + totalDebits - totalCredits;

  const mappedTransactions = ledger.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(l => ({
    ...l,
    entry_type: l.transaction_type || l.entry_type,
    debit: l.debit_amount !== undefined ? l.debit_amount : l.debit || 0,
    credit: l.credit_amount !== undefined ? l.credit_amount : l.credit || 0
  }));

  return {
    retailer: {
      id: retailer.id,
      name: retailer.name,
      code: retailer.retailer_code || retailer.code,
      contact_person: retailer.contact_person,
      phone: retailer.phone,
      address: `${retailer.address}, ${retailer.area}, ${retailer.city}, ${retailer.state} - ${retailer.pincode}`,
      gstin: retailer.gstin || 'N/A'
    },
    statementDate: new Date().toISOString(),
    openingBalance,
    opening_balance: openingBalance,
    totalDebits,
    total_debits: totalDebits,
    totalCredits,
    total_credits: totalCredits,
    closingBalance,
    closing_balance: closingBalance,
    transactions: mappedTransactions,
    ledger: mappedTransactions
  };
}

// ── 15. CSV Export Formatters ─────────────────────────────────────────────────
function exportRetailCSV(type = 'retailers', filters = {}, actor = { name: 'Admin', role: 'OWNER' }) {
  logAuditEvent({
    action: 'RETAIL_REPORT_EXPORTED',
    entity_type: 'REPORT',
    entity_id: type.toUpperCase(),
    entity_name: `Exported ${type} CSV report`,
    actor_name: actor.name,
    actor_role: actor.role,
    reason: `Report downloaded by ${actor.name}`
  });

  if (type === 'retailers') {
    const data = getAllRetailers(filters);
    const headers = ['Code', 'Name', 'Contact Person', 'Phone', 'City', 'Area', 'Status', 'Credit Limit (INR)', 'Outstanding (INR)', 'Current Stock Value (INR)', 'Last Order Date', 'Health'];
    const rows = data.map(r => [
      `"${r.retailer_code}"`,
      `"${r.name}"`,
      `"${r.contact_person}"`,
      `"${r.phone}"`,
      `"${r.city}"`,
      `"${r.area}"`,
      `"${r.status}"`,
      r.credit_limit,
      r.current_outstanding,
      r.stats.currentStockValue,
      `"${r.last_order_date ? new Date(r.last_order_date).toLocaleDateString('en-IN') : 'None'}"`,
      `"${r.stats.healthScore}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  if (type === 'stock') {
    const data = getRetailStockMatrix(filters);
    const headers = ['Retailer Name', 'City', 'SKU', 'Product Name', 'Current Stock (Units)', 'Stock Value (INR)', 'Last Supplied Date', 'Days of Stock Est.'];
    const rows = data.map(s => [
      `"${s.retailer_name}"`,
      `"${s.city}"`,
      `"${s.sku}"`,
      `"${s.product_name}"`,
      s.current_stock,
      s.stock_value,
      `"${s.last_supplied_at ? new Date(s.last_supplied_at).toLocaleDateString('en-IN') : 'None'}"`,
      s.estimated_days_of_stock
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  if (type === 'supplies') {
    const headers = ['Order Number', 'Retailer', 'Date', 'Total Units', 'Total Amount (INR)', 'Payment Status', 'Due Date', 'Created By'];
    const rows = SUPPLY_ORDERS.map(o => [
      `"${o.order_number}"`,
      `"${o.retailer_name}"`,
      `"${new Date(o.order_date).toLocaleDateString('en-IN')}"`,
      o.total_units,
      o.total_amount,
      `"${o.payment_status}"`,
      `"${o.due_date ? new Date(o.due_date).toLocaleDateString('en-IN') : 'N/A'}"`,
      `"${o.created_by}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  if (type === 'ledger') {
    const headers = ['Date', 'Retailer', 'Type', 'Reference', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Method', 'Recorded By'];
    const rows = FINANCIAL_LEDGER.map(l => [
      `"${new Date(l.created_at).toLocaleDateString('en-IN')}"`,
      `"${l.retailer_name}"`,
      `"${l.transaction_type}"`,
      `"${l.reference_id || ''}"`,
      l.debit_amount || 0,
      l.credit_amount || 0,
      l.running_balance || 0,
      `"${l.payment_method || ''}"`,
      `"${l.recorded_by}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  return 'No data available for export type.';
}

module.exports = {
  getRetailDashboardKPIs,
  getAllRetailers,
  getRetailerProfile,
  createRetailer,
  updateRetailer,
  archiveRetailer,
  recordSupplyOrder,
  recordPayment,
  recordReturn,
  reconcileStock,
  getRetailStockMatrix,
  getFollowups,
  createFollowup,
  completeFollowup,
  addRetailerNote,
  getRetailerStatement,
  exportRetailCSV,
  PRODUCT_CATALOG
};
