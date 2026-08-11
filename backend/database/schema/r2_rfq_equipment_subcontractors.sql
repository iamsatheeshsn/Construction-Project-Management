-- =============================================================================
-- CPM SaaS — R2 Ops extension: RFQ, Equipment, Subcontractors
-- Database: cpm
-- =============================================================================

USE `cpm`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- RFQ & quotations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rfqs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  purchase_request_id BIGINT UNSIGNED NULL,
  rfq_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'sent', 'quoted', 'awarded', 'cancelled') NOT NULL DEFAULT 'draft',
  due_date DATE NULL,
  notes TEXT NULL,
  awarded_quotation_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  sent_at TIMESTAMP NULL,
  awarded_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_rfq_project_no (project_id, rfq_no),
  KEY idx_rfq_status (tenant_id, status),
  CONSTRAINT fk_rfq_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfq_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfq_pr FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests (id) ON DELETE SET NULL,
  CONSTRAINT fk_rfq_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rfq_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  rfq_id BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_rfq_items_rfq (rfq_id),
  CONSTRAINT fk_rfqi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfqi_rfq FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfqi_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  rfq_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  invited_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_rfq_supplier (rfq_id, supplier_id),
  CONSTRAINT fk_rfqs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfqs_rfq FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfqs_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_quotations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  rfq_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  quote_no VARCHAR(80) NOT NULL,
  status ENUM('draft', 'submitted', 'awarded', 'rejected') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  valid_until DATE NULL,
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  lead_time_days INT UNSIGNED NULL,
  notes TEXT NULL,
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_quote_project_no (project_id, quote_no),
  KEY idx_quote_rfq (rfq_id),
  CONSTRAINT fk_sq_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sq_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_sq_rfq FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE CASCADE,
  CONSTRAINT fk_sq_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_quotation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  supplier_quotation_id BIGINT UNSIGNED NOT NULL,
  rfq_item_id BIGINT UNSIGNED NULL,
  inventory_item_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  lead_time_days INT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_sqi_quote (supplier_quotation_id),
  CONSTRAINT fk_sqi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sqi_quote FOREIGN KEY (supplier_quotation_id) REFERENCES supplier_quotations (id) ON DELETE CASCADE,
  CONSTRAINT fk_sqi_rfq_item FOREIGN KEY (rfq_item_id) REFERENCES rfq_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_sqi_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Awarded quotation FK (added after supplier_quotations exists)
ALTER TABLE rfqs
  ADD CONSTRAINT fk_rfq_awarded_quote
  FOREIGN KEY (awarded_quotation_id) REFERENCES supplier_quotations (id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Equipment
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS equipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NULL,
  ownership ENUM('owned', 'rented', 'leased') NOT NULL DEFAULT 'owned',
  status ENUM('available', 'assigned', 'maintenance', 'retired') NOT NULL DEFAULT 'available',
  manufacturer VARCHAR(160) NULL,
  model VARCHAR(160) NULL,
  serial_no VARCHAR(120) NULL,
  daily_rate DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_equipment_tenant_code (tenant_id, code),
  KEY idx_equipment_status (tenant_id, status),
  CONSTRAINT fk_equipment_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  assignment_no VARCHAR(80) NOT NULL,
  operator_name VARCHAR(160) NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  daily_rate DECIMAL(18,2) NOT NULL DEFAULT 0,
  status ENUM('planned', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'planned',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_eq_assign_project_no (project_id, assignment_no),
  KEY idx_eq_assign_equipment (equipment_id, status),
  CONSTRAINT fk_eqa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_eqa_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_eqa_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (id),
  CONSTRAINT fk_eqa_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_usage_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  equipment_id BIGINT UNSIGNED NOT NULL,
  equipment_assignment_id BIGINT UNSIGNED NULL,
  usage_date DATE NOT NULL,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  fuel_liters DECIMAL(10,2) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  recorded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_eq_usage_project (project_id, usage_date),
  CONSTRAINT fk_equ_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_equ_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_equ_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (id),
  CONSTRAINT fk_equ_assignment FOREIGN KEY (equipment_assignment_id) REFERENCES equipment_assignments (id) ON DELETE SET NULL,
  CONSTRAINT fk_equ_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Subcontractors
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subcontractors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  trade VARCHAR(120) NULL,
  contact_name VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  status ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
  quality_score DECIMAL(5,2) NULL,
  schedule_score DECIMAL(5,2) NULL,
  cost_score DECIMAL(5,2) NULL,
  safety_score DECIMAL(5,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_subcon_tenant_code (tenant_id, code),
  KEY idx_subcon_trade (tenant_id, trade),
  CONSTRAINT fk_subcon_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subcontract_packages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  subcontractor_id BIGINT UNSIGNED NOT NULL,
  package_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('draft', 'awarded', 'active', 'completed', 'terminated') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  contract_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  retention_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  awarded_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_pkg_project_no (project_id, package_no),
  KEY idx_pkg_status (tenant_id, status),
  CONSTRAINT fk_pkg_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pkg_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_pkg_subcon FOREIGN KEY (subcontractor_id) REFERENCES subcontractors (id),
  CONSTRAINT fk_pkg_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subcontract_package_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  subcontract_package_id BIGINT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_pkg_items (subcontract_package_id),
  CONSTRAINT fk_pkgi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pkgi_pkg FOREIGN KEY (subcontract_package_id) REFERENCES subcontract_packages (id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
