-- =============================================================================
-- Construction Project Management SaaS — Release 1 (MVP) MySQL Schema
-- Database: cpm
-- Engine: InnoDB | Charset: utf8mb4
-- Tenancy: shared database with tenant_id on all business tables
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `cpm`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cpm`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. SaaS
-- -----------------------------------------------------------------------------

CREATE TABLE tenants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  legal_name VARCHAR(255) NULL,
  country_code CHAR(2) NULL,
  default_currency CHAR(3) NOT NULL DEFAULT 'AED',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dubai',
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  status ENUM('trial', 'active', 'suspended', 'cancelled') NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_tenants_uuid (uuid),
  UNIQUE KEY uq_tenants_slug (slug),
  KEY idx_tenants_status (status)
) ENGINE=InnoDB;

CREATE TABLE subscription_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  max_projects INT UNSIGNED NULL,
  max_users INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_plans_code (code)
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired') NOT NULL DEFAULT 'trialing',
  billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  starts_at DATE NOT NULL,
  ends_at DATE NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_subscriptions_tenant (tenant_id),
  KEY idx_subscriptions_plan (plan_id),
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
) ENGINE=InnoDB;

CREATE TABLE tenant_features (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  limits_json JSON NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_tenant_feature (tenant_id, feature_key),
  CONSTRAINT fk_tenant_features_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. Identity & RBAC
-- -----------------------------------------------------------------------------

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  avatar_path VARCHAR(500) NULL,
  preferred_locale VARCHAR(10) NULL,
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at TIMESTAMP NULL,
  remember_token VARCHAR(100) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_users_uuid (uuid),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Sanctum
CREATE TABLE personal_access_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL,
  abilities TEXT NULL,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_pat_token (token),
  KEY idx_pat_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NULL COMMENT 'NULL = platform/system role template',
  code VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  scope ENUM('platform', 'tenant', 'project') NOT NULL DEFAULT 'tenant',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_roles_tenant_code (tenant_id, code),
  KEY idx_roles_scope (scope),
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  module VARCHAR(80) NOT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_permissions_code (code),
  KEY idx_permissions_module (module)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tenant_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('invited', 'active', 'suspended', 'left') NOT NULL DEFAULT 'invited',
  is_owner TINYINT(1) NOT NULL DEFAULT 0,
  job_title VARCHAR(120) NULL,
  invited_at TIMESTAMP NULL,
  joined_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_tenant_user (tenant_id, user_id),
  KEY idx_tenant_users_user (user_id),
  CONSTRAINT fk_tu_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_tu_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE tenant_user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  tenant_user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT 'NULL = tenant-wide role',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_tur (tenant_user_id, role_id, project_id),
  KEY idx_tur_tenant (tenant_id),
  KEY idx_tur_project (project_id),
  CONSTRAINT fk_tur_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_tur_membership FOREIGN KEY (tenant_user_id) REFERENCES tenant_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tur_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. Organization
-- -----------------------------------------------------------------------------

CREATE TABLE companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NULL,
  trade_license_no VARCHAR(100) NULL,
  tax_number VARCHAR(100) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country_code CHAR(2) NULL,
  postal_code VARCHAR(30) NULL,
  logo_path VARCHAR(500) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_companies_tenant (tenant_id),
  CONSTRAINT fk_companies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NULL,
  city VARCHAR(120) NULL,
  country_code CHAR(2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_branches_tenant (tenant_id),
  KEY idx_branches_company (company_id),
  CONSTRAINT fk_branches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_branches_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB;

CREATE TABLE departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_departments_tenant (tenant_id),
  CONSTRAINT fk_departments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_departments_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB;

CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  contact_person VARCHAR(160) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  country_code CHAR(2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_clients_tenant_code (tenant_id, code),
  KEY idx_clients_tenant (tenant_id),
  CONSTRAINT fk_clients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE consultants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NULL,
  specialty VARCHAR(160) NULL,
  contact_person VARCHAR(160) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_consultants_tenant_code (tenant_id, code),
  KEY idx_consultants_tenant (tenant_id),
  CONSTRAINT fk_consultants_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  company_id BIGINT UNSIGNED NULL,
  branch_id BIGINT UNSIGNED NULL,
  department_id BIGINT UNSIGNED NULL,
  employee_code VARCHAR(50) NULL,
  full_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(160) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  employment_type ENUM('permanent', 'contract', 'temporary', 'consultant') NOT NULL DEFAULT 'permanent',
  hire_date DATE NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_employees_tenant_code (tenant_id, employee_code),
  KEY idx_employees_tenant (tenant_id),
  KEY idx_employees_user (user_id),
  CONSTRAINT fk_employees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. Projects (central aggregate)
-- -----------------------------------------------------------------------------

CREATE TABLE projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  company_id BIGINT UNSIGNED NULL,
  branch_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  consultant_id BIGINT UNSIGNED NULL,
  project_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  location VARCHAR(255) NULL,
  country_code CHAR(2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  status ENUM(
    'lead', 'proposal', 'awarded', 'setup', 'planning', 'mobilization',
    'execution', 'monitoring', 'testing', 'handover', 'completed',
    'warranty', 'closed', 'on_hold', 'cancelled'
  ) NOT NULL DEFAULT 'setup',
  start_date DATE NULL,
  end_date DATE NULL,
  baseline_start_date DATE NULL,
  baseline_end_date DATE NULL,
  budget_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  contract_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_projects_tenant_code (tenant_id, project_code),
  KEY idx_projects_tenant_status (tenant_id, status),
  KEY idx_projects_client (client_id),
  CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_projects_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_projects_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
  CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_projects_consultant FOREIGN KEY (consultant_id) REFERENCES consultants (id),
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- deferred FK from tenant_user_roles.project_id
ALTER TABLE tenant_user_roles
  ADD CONSTRAINT fk_tur_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;

CREATE TABLE project_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NULL,
  is_lead TINYINT(1) NOT NULL DEFAULT 0,
  joined_at DATE NULL,
  left_at DATE NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_project_member (project_id, user_id),
  KEY idx_pm_tenant (tenant_id),
  CONSTRAINT fk_pm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_pm_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB;

CREATE TABLE milestones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  due_date DATE NULL,
  completed_at DATE NULL,
  status ENUM('pending', 'achieved', 'missed', 'cancelled') NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_milestones_project (project_id),
  CONSTRAINT fk_milestones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wbs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_wbs_project_code (project_id, code),
  KEY idx_wbs_parent (parent_id),
  KEY idx_wbs_tenant_project (tenant_id, project_id),
  CONSTRAINT fk_wbs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_wbs_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_wbs_parent FOREIGN KEY (parent_id) REFERENCES wbs (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  wbs_id BIGINT UNSIGNED NULL,
  milestone_id BIGINT UNSIGNED NULL,
  parent_task_id BIGINT UNSIGNED NULL,
  task_code VARCHAR(50) NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled') NOT NULL DEFAULT 'not_started',
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  planned_start_date DATE NULL,
  planned_end_date DATE NULL,
  baseline_start_date DATE NULL,
  baseline_end_date DATE NULL,
  actual_start_date DATE NULL,
  actual_end_date DATE NULL,
  duration_days DECIMAL(8,2) NULL,
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  assigned_to BIGINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_tasks_project (project_id),
  KEY idx_tasks_wbs (wbs_id),
  KEY idx_tasks_dates (planned_start_date, planned_end_date),
  CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_wbs FOREIGN KEY (wbs_id) REFERENCES wbs (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) REFERENCES users (id),
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE task_dependencies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  predecessor_task_id BIGINT UNSIGNED NOT NULL,
  successor_task_id BIGINT UNSIGNED NOT NULL,
  dependency_type ENUM('FS', 'SS', 'FF', 'SF') NOT NULL DEFAULT 'FS',
  lag_days DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_task_dep (predecessor_task_id, successor_task_id, dependency_type),
  KEY idx_task_dep_project (project_id),
  CONSTRAINT fk_td_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_td_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_td_pred FOREIGN KEY (predecessor_task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_td_succ FOREIGN KEY (successor_task_id) REFERENCES tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. Commercial — Cost codes, BOQ, Contracts, Variations
-- -----------------------------------------------------------------------------

CREATE TABLE cost_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL COMMENT 'NULL = tenant master library',
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_cost_codes (tenant_id, project_id, code),
  CONSTRAINT fk_cost_codes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_cost_codes_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE boqs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  version VARCHAR(30) NOT NULL DEFAULT '1.0',
  status ENUM('draft', 'issued', 'approved', 'superseded') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  approved_at TIMESTAMP NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_boqs_project (project_id),
  CONSTRAINT fk_boqs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_boqs_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_boqs_approved_by FOREIGN KEY (approved_by) REFERENCES users (id),
  CONSTRAINT fk_boqs_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE boq_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  boq_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  wbs_id BIGINT UNSIGNED NULL,
  cost_code_id BIGINT UNSIGNED NULL,
  item_no VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_boq_item_no (boq_id, item_no),
  KEY idx_boq_items_wbs (wbs_id),
  KEY idx_boq_items_cost_code (cost_code_id),
  CONSTRAINT fk_boq_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_boq_items_boq FOREIGN KEY (boq_id) REFERENCES boqs (id) ON DELETE CASCADE,
  CONSTRAINT fk_boq_items_parent FOREIGN KEY (parent_id) REFERENCES boq_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_boq_items_wbs FOREIGN KEY (wbs_id) REFERENCES wbs (id) ON DELETE SET NULL,
  CONSTRAINT fk_boq_items_cost_code FOREIGN KEY (cost_code_id) REFERENCES cost_codes (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE contracts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NULL,
  contract_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  contract_type ENUM('main', 'subcontract', 'supply', 'consultancy') NOT NULL DEFAULT 'main',
  status ENUM('draft', 'active', 'suspended', 'completed', 'terminated') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  contract_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  retention_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  advance_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  liquidated_damages_per_day DECIMAL(18,2) NULL,
  payment_terms TEXT NULL,
  warranty_months INT UNSIGNED NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  signed_at DATE NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_contracts_tenant_no (tenant_id, contract_no),
  KEY idx_contracts_project (project_id),
  CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_contracts_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_contracts_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE contract_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  contract_id BIGINT UNSIGNED NOT NULL,
  boq_item_id BIGINT UNSIGNED NULL,
  description TEXT NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_contract_items_contract (contract_id),
  CONSTRAINT fk_ci_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_ci_contract FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_boq_item FOREIGN KEY (boq_item_id) REFERENCES boq_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE variations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  contract_id BIGINT UNSIGNED NULL,
  variation_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  reason TEXT NULL,
  status ENUM(
    'draft', 'submitted', 'under_review', 'cost_assessment',
    'client_review', 'approved', 'rejected', 'implemented'
  ) NOT NULL DEFAULT 'draft',
  cost_impact DECIMAL(18,2) NOT NULL DEFAULT 0,
  time_impact_days INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NULL,
  decided_at TIMESTAMP NULL,
  decided_by BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_variations_project_no (project_id, variation_no),
  KEY idx_variations_status (tenant_id, status),
  CONSTRAINT fk_variations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_variations_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_variations_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
  CONSTRAINT fk_variations_decided_by FOREIGN KEY (decided_by) REFERENCES users (id),
  CONSTRAINT fk_variations_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE variation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  variation_id BIGINT UNSIGNED NOT NULL,
  boq_item_id BIGINT UNSIGNED NULL,
  cost_code_id BIGINT UNSIGNED NULL,
  description TEXT NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  rate DECIMAL(18,4) NOT NULL DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_variation_items_variation (variation_id),
  CONSTRAINT fk_vi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_vi_variation FOREIGN KEY (variation_id) REFERENCES variations (id) ON DELETE CASCADE,
  CONSTRAINT fk_vi_boq_item FOREIGN KEY (boq_item_id) REFERENCES boq_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_vi_cost_code FOREIGN KEY (cost_code_id) REFERENCES cost_codes (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. Documents & Drawings
-- -----------------------------------------------------------------------------

CREATE TABLE documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  document_type ENUM(
    'contract', 'drawing', 'rfi', 'submittal', 'certificate',
    'report', 'photo', 'variation', 'other'
  ) NOT NULL DEFAULT 'other',
  title VARCHAR(255) NOT NULL,
  document_no VARCHAR(80) NULL,
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'obsolete') NOT NULL DEFAULT 'draft',
  current_version INT UNSIGNED NOT NULL DEFAULT 1,
  uploaded_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  KEY idx_documents_tenant_project (tenant_id, project_id),
  KEY idx_documents_type (document_type),
  CONSTRAINT fk_documents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_documents_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id),
  CONSTRAINT fk_documents_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE document_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT UNSIGNED NULL,
  checksum CHAR(64) NULL,
  change_notes TEXT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_doc_version (document_id, version_no),
  CONSTRAINT fk_dv_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_dv_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_dv_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE drawings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NULL,
  drawing_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  discipline ENUM('architectural', 'structural', 'electrical', 'plumbing', 'hvac', 'civil', 'other') NOT NULL DEFAULT 'other',
  status ENUM('draft', 'for_review', 'approved', 'superseded') NOT NULL DEFAULT 'draft',
  current_revision VARCHAR(20) NOT NULL DEFAULT 'A',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_drawings_project_no (project_id, drawing_no),
  CONSTRAINT fk_drawings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_drawings_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_drawings_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE drawing_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  drawing_id BIGINT UNSIGNED NOT NULL,
  revision VARCHAR(20) NOT NULL,
  document_version_id BIGINT UNSIGNED NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('draft', 'issued', 'approved', 'superseded') NOT NULL DEFAULT 'draft',
  issued_at DATE NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_drawing_rev (drawing_id, revision),
  KEY idx_drawing_rev_current (drawing_id, is_current),
  CONSTRAINT fk_dr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_dr_drawing FOREIGN KEY (drawing_id) REFERENCES drawings (id) ON DELETE CASCADE,
  CONSTRAINT fk_dr_doc_version FOREIGN KEY (document_version_id) REFERENCES document_versions (id) ON DELETE SET NULL,
  CONSTRAINT fk_dr_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. Workflow engine + RFI / Submittals
-- -----------------------------------------------------------------------------

CREATE TABLE workflow_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NULL COMMENT 'NULL = system default',
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  entity_type VARCHAR(80) NOT NULL COMMENT 'rfi|submittal|variation|payment_application|document',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  config_json JSON NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_wf_def (tenant_id, code),
  CONSTRAINT fk_wf_def_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
) ENGINE=InnoDB;

CREATE TABLE workflow_instances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  current_state VARCHAR(80) NOT NULL,
  started_by BIGINT UNSIGNED NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_wi_entity (entity_type, entity_id),
  KEY idx_wi_tenant_project (tenant_id, project_id),
  CONSTRAINT fk_wi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_wi_def FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions (id),
  CONSTRAINT fk_wi_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_wi_started_by FOREIGN KEY (started_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE workflow_transitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  workflow_instance_id BIGINT UNSIGNED NOT NULL,
  from_state VARCHAR(80) NOT NULL,
  to_state VARCHAR(80) NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NULL,
  KEY idx_wt_instance (workflow_instance_id),
  CONSTRAINT fk_wt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_wt_instance FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances (id) ON DELETE CASCADE,
  CONSTRAINT fk_wt_actor FOREIGN KEY (actor_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE approvals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  workflow_instance_id BIGINT UNSIGNED NULL,
  step_name VARCHAR(120) NULL,
  status ENUM('pending', 'approved', 'rejected', 'skipped') NOT NULL DEFAULT 'pending',
  requested_from BIGINT UNSIGNED NULL,
  acted_by BIGINT UNSIGNED NULL,
  acted_at TIMESTAMP NULL,
  comments TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_approvals_entity (entity_type, entity_id),
  KEY idx_approvals_pending (tenant_id, status, requested_from),
  CONSTRAINT fk_approvals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_approvals_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_wi FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances (id) ON DELETE SET NULL,
  CONSTRAINT fk_approvals_requested_from FOREIGN KEY (requested_from) REFERENCES users (id),
  CONSTRAINT fk_approvals_acted_by FOREIGN KEY (acted_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE rfis (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  rfi_no VARCHAR(80) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NULL,
  discipline VARCHAR(80) NULL,
  status ENUM('draft', 'submitted', 'under_review', 'responded', 'approved', 'rejected', 'closed') NOT NULL DEFAULT 'draft',
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  submitted_by BIGINT UNSIGNED NULL,
  assigned_to BIGINT UNSIGNED NULL,
  due_date DATE NULL,
  responded_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_rfis_project_no (project_id, rfi_no),
  KEY idx_rfis_status (tenant_id, status),
  CONSTRAINT fk_rfis_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfis_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfis_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (id),
  CONSTRAINT fk_rfis_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE rfi_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  rfi_id BIGINT UNSIGNED NOT NULL,
  response_text TEXT NOT NULL,
  responded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_rfi_responses_rfi (rfi_id),
  CONSTRAINT fk_rfi_resp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfi_resp_rfi FOREIGN KEY (rfi_id) REFERENCES rfis (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfi_resp_user FOREIGN KEY (responded_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE rfi_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  rfi_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY uq_rfi_doc (rfi_id, document_id),
  CONSTRAINT fk_rfi_att_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_rfi_att_rfi FOREIGN KEY (rfi_id) REFERENCES rfis (id) ON DELETE CASCADE,
  CONSTRAINT fk_rfi_att_doc FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE submittals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  submittal_no VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  submittal_type ENUM('material', 'shop_drawing', 'sample', 'technical', 'other') NOT NULL DEFAULT 'material',
  status ENUM(
    'draft', 'submitted', 'consultant_review',
    'approved', 'approved_with_comments', 'rejected'
  ) NOT NULL DEFAULT 'draft',
  submitted_by BIGINT UNSIGNED NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  due_date DATE NULL,
  submitted_at TIMESTAMP NULL,
  reviewed_at TIMESTAMP NULL,
  review_comments TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_submittals_project_no (project_id, submittal_no),
  KEY idx_submittals_status (tenant_id, status),
  CONSTRAINT fk_submittals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_submittals_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_submittals_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (id),
  CONSTRAINT fk_submittals_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE submittal_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  submittal_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY uq_submittal_doc (submittal_id, document_id),
  CONSTRAINT fk_sa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sa_submittal FOREIGN KEY (submittal_id) REFERENCES submittals (id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_doc FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. Site operations (diary)
-- -----------------------------------------------------------------------------

CREATE TABLE site_diaries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  report_date DATE NOT NULL,
  weather VARCHAR(120) NULL,
  temperature_c DECIMAL(5,2) NULL,
  work_completed TEXT NULL,
  work_planned TEXT NULL,
  issues TEXT NULL,
  delays TEXT NULL,
  visitors TEXT NULL,
  remarks TEXT NULL,
  status ENUM('draft', 'submitted', 'approved') NOT NULL DEFAULT 'draft',
  prepared_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_site_diary_day (project_id, report_date),
  KEY idx_site_diaries_tenant (tenant_id),
  CONSTRAINT fk_sd_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sd_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_sd_prepared_by FOREIGN KEY (prepared_by) REFERENCES users (id),
  CONSTRAINT fk_sd_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE site_diary_labours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_diary_id BIGINT UNSIGNED NOT NULL,
  trade VARCHAR(120) NOT NULL,
  company_name VARCHAR(160) NULL,
  headcount INT UNSIGNED NOT NULL DEFAULT 0,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_sdl_diary (site_diary_id),
  CONSTRAINT fk_sdl_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sdl_diary FOREIGN KEY (site_diary_id) REFERENCES site_diaries (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE site_diary_equipment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_diary_id BIGINT UNSIGNED NOT NULL,
  equipment_name VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_sde_diary (site_diary_id),
  CONSTRAINT fk_sde_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sde_diary FOREIGN KEY (site_diary_id) REFERENCES site_diaries (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE site_diary_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_diary_id BIGINT UNSIGNED NOT NULL,
  material_name VARCHAR(160) NOT NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  remarks VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_sdm_diary (site_diary_id),
  CONSTRAINT fk_sdm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sdm_diary FOREIGN KEY (site_diary_id) REFERENCES site_diaries (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE site_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  site_diary_id BIGINT UNSIGNED NULL,
  document_id BIGINT UNSIGNED NOT NULL,
  caption VARCHAR(255) NULL,
  taken_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_site_photos_project (project_id),
  CONSTRAINT fk_sp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_sp_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_diary FOREIGN KEY (site_diary_id) REFERENCES site_diaries (id) ON DELETE SET NULL,
  CONSTRAINT fk_sp_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE site_issues (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  site_diary_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  reported_by BIGINT UNSIGNED NULL,
  assigned_to BIGINT UNSIGNED NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_site_issues_project (project_id, status),
  CONSTRAINT fk_si_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_si_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_si_diary FOREIGN KEY (site_diary_id) REFERENCES site_diaries (id) ON DELETE SET NULL,
  CONSTRAINT fk_si_reported_by FOREIGN KEY (reported_by) REFERENCES users (id),
  CONSTRAINT fk_si_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. Billing (project finance basics)
-- -----------------------------------------------------------------------------

CREATE TABLE payment_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  contract_id BIGINT UNSIGNED NULL,
  application_no VARCHAR(80) NOT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  status ENUM('draft', 'submitted', 'under_review', 'certified', 'rejected', 'paid') NOT NULL DEFAULT 'draft',
  gross_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  retention_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  advance_recovery DECIMAL(18,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_pay_app_project_no (project_id, application_no),
  KEY idx_pay_app_status (tenant_id, status),
  CONSTRAINT fk_pa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pa_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
  CONSTRAINT fk_pa_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE payment_application_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  payment_application_id BIGINT UNSIGNED NOT NULL,
  boq_item_id BIGINT UNSIGNED NULL,
  description TEXT NOT NULL,
  previous_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  this_period_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cumulative_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_pai_app (payment_application_id),
  CONSTRAINT fk_pai_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pai_app FOREIGN KEY (payment_application_id) REFERENCES payment_applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_pai_boq_item FOREIGN KEY (boq_item_id) REFERENCES boq_items (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE payment_certificates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  payment_application_id BIGINT UNSIGNED NOT NULL,
  certificate_no VARCHAR(80) NOT NULL,
  certified_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  retention_held DECIMAL(18,2) NOT NULL DEFAULT 0,
  certified_at DATE NULL,
  certified_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_pay_cert_no (project_id, certificate_no),
  KEY idx_pay_cert_app (payment_application_id),
  CONSTRAINT fk_pc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_pc_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_app FOREIGN KEY (payment_application_id) REFERENCES payment_applications (id),
  CONSTRAINT fk_pc_certified_by FOREIGN KEY (certified_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NULL,
  payment_certificate_id BIGINT UNSIGNED NULL,
  invoice_no VARCHAR(80) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NULL,
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(18,2) NOT NULL DEFAULT 0,
  status ENUM('draft', 'issued', 'partially_paid', 'paid', 'void', 'overdue') NOT NULL DEFAULT 'draft',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_invoices_tenant_no (tenant_id, invoice_no),
  KEY idx_invoices_project (project_id),
  CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_invoices_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_invoices_cert FOREIGN KEY (payment_certificate_id) REFERENCES payment_certificates (id),
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  payment_no VARCHAR(80) NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  method ENUM('bank_transfer', 'cheque', 'cash', 'card', 'other') NOT NULL DEFAULT 'bank_transfer',
  reference VARCHAR(120) NULL,
  notes TEXT NULL,
  recorded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_payments_invoice (invoice_id),
  CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_payments_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
  CONSTRAINT fk_payments_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. Notifications & Audit
-- -----------------------------------------------------------------------------

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  channel ENUM('in_app', 'email', 'sms', 'whatsapp') NOT NULL DEFAULT 'in_app',
  data_json JSON NULL,
  read_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  KEY idx_notifications_user (user_id, read_at),
  KEY idx_notifications_tenant (tenant_id),
  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  module VARCHAR(80) NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_tenant_created (tenant_id, created_at),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_user (user_id),
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  event VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  properties JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_project (project_id, created_at),
  CONSTRAINT fk_activity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT fk_activity_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seed: subscription plans (optional starter data)
-- =============================================================================

INSERT INTO subscription_plans (code, name, description, price_monthly, price_yearly, currency, max_projects, max_users, is_active, sort_order, created_at, updated_at)
VALUES
  ('starter', 'Starter', '1 company, limited projects/users', 0, 0, 'AED', 3, 10, 1, 1, NOW(), NOW()),
  ('professional', 'Professional', 'Client portal, procurement, documents', 0, 0, 'AED', 10, 50, 1, 2, NOW(), NOW()),
  ('enterprise', 'Enterprise', 'Unlimited + portals + QA/QC + HSE + AI', 0, 0, 'AED', NULL, NULL, 1, 3, NOW(), NOW());
