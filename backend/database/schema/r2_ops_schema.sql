-- =============================================================================
-- Construction Project Management SaaS — Release 2 (Ops) MySQL Schema
-- Database: cpm (extends R1)
-- Focus: Procurement + Inventory core
-- Flow: Material Request → Purchase Request → PO → GRN → Stock → Material Issue
-- =============================================================================

USE `cpm`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Suppliers & catalog
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  payment_terms VARCHAR(120) NULL,
  status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_suppliers_tenant_code (tenant_id, code),
  KEY idx_suppliers_tenant (tenant_id),
  CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  unit VARCHAR(30) NOT NULL DEFAULT 'nos',
  category VARCHAR(120) NULL,
  default_rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_inventory_items_sku (tenant_id, sku),
  KEY idx_inventory_items_tenant (tenant_id),
  CONSTRAINT fk_inventory_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_warehouses_tenant_code (tenant_id, code),
  KEY idx_warehouses_project (project_id),
  CONSTRAINT fk_warehouses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_warehouses_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  avg_unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY uq_stock_balance (warehouse_id, inventory_item_id, project_id),
  KEY idx_stock_item (inventory_item_id),
  CONSTRAINT fk_stock_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
  CONSTRAINT fk_stock_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
  CONSTRAINT fk_stock_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  txn_type ENUM('in', 'out', 'adjustment', 'transfer', 'consumption') NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  reference_type VARCHAR(80) NULL,
  reference_id BIGINT UNSIGNED NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_txn_wh (warehouse_id, created_at),
  KEY idx_stock_txn_ref (reference_type, reference_id),
  CONSTRAINT fk_stock_txn_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_stock_txn_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
  CONSTRAINT fk_stock_txn_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
  CONSTRAINT fk_stock_txn_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_txn_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Procurement documents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS material_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  request_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  needed_by DATE NULL,
  status ENUM('draft', 'submitted', 'approved', 'rejected', 'converted') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  requested_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_mr_project_no (project_id, request_no),
  KEY idx_mr_status (tenant_id, status),
  CONSTRAINT fk_mr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_mr_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_mr_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT fk_mr_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  material_request_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_mri_mr (material_request_id),
  CONSTRAINT fk_mri_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_mri_mr FOREIGN KEY (material_request_id) REFERENCES material_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_mri_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  material_request_id BIGINT UNSIGNED NULL,
  request_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'submitted', 'approved', 'rejected', 'ordered') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  requested_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_pr_project_no (project_id, request_no),
  KEY idx_pr_status (tenant_id, status),
  CONSTRAINT fk_pr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pr_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_mr FOREIGN KEY (material_request_id) REFERENCES material_requests (id) ON DELETE SET NULL,
  CONSTRAINT fk_pr_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT fk_pr_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  purchase_request_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  estimated_rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  estimated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_pri_pr (purchase_request_id),
  CONSTRAINT fk_pri_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pri_pr FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  purchase_request_id BIGINT UNSIGNED NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  po_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'issued', 'partially_received', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  order_date DATE NULL,
  expected_date DATE NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  issued_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_po_project_no (project_id, po_no),
  KEY idx_po_status (tenant_id, status),
  CONSTRAINT fk_po_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_po_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_po_pr FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests (id) ON DELETE SET NULL,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
  CONSTRAINT fk_po_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE SET NULL,
  CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  received_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_poi_po (purchase_order_id),
  CONSTRAINT fk_poi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goods_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  grn_no VARCHAR(80) NOT NULL,
  received_date DATE NOT NULL,
  status ENUM('draft', 'posted') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  received_by BIGINT UNSIGNED NULL,
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_grn_project_no (project_id, grn_no),
  KEY idx_grn_po (purchase_order_id),
  CONSTRAINT fk_grn_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_grn_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_grn_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id),
  CONSTRAINT fk_grn_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
  CONSTRAINT fk_grn_received_by FOREIGN KEY (received_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  goods_receipt_id BIGINT UNSIGNED NOT NULL,
  purchase_order_item_id BIGINT UNSIGNED NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_gri_grn (goods_receipt_id),
  CONSTRAINT fk_gri_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_gri_grn FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts (id) ON DELETE CASCADE,
  CONSTRAINT fk_gri_poi FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_gri_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_issues (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  issue_no VARCHAR(80) NOT NULL,
  issue_date DATE NOT NULL,
  status ENUM('draft', 'posted') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  issued_by BIGINT UNSIGNED NULL,
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_mi_project_no (project_id, issue_no),
  KEY idx_mi_project (project_id),
  CONSTRAINT fk_mi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_mi_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_mi_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
  CONSTRAINT fk_mi_issued_by FOREIGN KEY (issued_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_issue_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  material_issue_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_mii_mi (material_issue_id),
  CONSTRAINT fk_mii_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_mii_mi FOREIGN KEY (material_issue_id) REFERENCES material_issues (id) ON DELETE CASCADE,
  CONSTRAINT fk_mii_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
