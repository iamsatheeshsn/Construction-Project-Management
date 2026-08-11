-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 11, 2026 at 01:16 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cpm`
--

-- --------------------------------------------------------

--
-- Table structure for table `access_policies`
--

CREATE TABLE `access_policies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `effect` enum('allow','deny') NOT NULL DEFAULT 'allow',
  `scope` enum('platform','tenant','project') NOT NULL DEFAULT 'tenant',
  `permission_codes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permission_codes`)),
  `conditions_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`conditions_json`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `access_policies`
--

INSERT INTO `access_policies` (`id`, `tenant_id`, `code`, `name`, `description`, `effect`, `scope`, `permission_codes`, `conditions_json`, `is_active`, `is_system`, `created_at`, `updated_at`) VALUES
(1, NULL, 'owner_full_access', 'Owner full access', 'Tenant owners receive unrestricted workspace access.', 'allow', 'tenant', '[\"*\"]', '{\"requires_owner\":true}', 1, 1, '2026-08-11 02:40:53', '2026-08-11 02:40:53'),
(2, NULL, 'project_manager_ops', 'Project manager operations', 'Managers can run project delivery modules.', 'allow', 'project', '[\"projects.view\",\"projects.manage\",\"wbs.view\",\"wbs.manage\",\"tasks.view\",\"tasks.manage\",\"procurement.view\",\"procurement.manage\"]', '{\"role\":\"project_manager\"}', 1, 1, '2026-08-11 02:40:53', '2026-08-11 02:40:53'),
(3, NULL, 'viewer_read_only', 'Viewer read-only', 'Viewers may inspect records but cannot mutate.', 'allow', 'project', '[\"projects.view\",\"wbs.view\",\"tasks.view\",\"documents.view\"]', '{\"role\":\"viewer\"}', 1, 1, '2026-08-11 02:40:53', '2026-08-11 02:40:53'),
(4, 1, 'site_readonly', 'Site read-only', NULL, 'allow', 'project', '[\"site_diary.view\",\"documents.view\"]', NULL, 1, 0, '2026-08-11 02:46:26', '2026-08-11 02:46:26');

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event` varchar(120) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `properties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`properties`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approvals`
--

CREATE TABLE `approvals` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `workflow_instance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `step_name` varchar(120) DEFAULT NULL,
  `status` enum('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending',
  `requested_from` bigint(20) UNSIGNED DEFAULT NULL,
  `acted_by` bigint(20) UNSIGNED DEFAULT NULL,
  `acted_at` timestamp NULL DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `module` varchar(80) DEFAULT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `module`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 2, 'billing', 'project', 1, 'updated', NULL, '{\"demo\":true,\"n\":1}', '127.0.0.1', 'DemoSeeder', '2026-08-11 04:43:13'),
(2, 1, 2, 'procurement', 'project', 1, 'viewed', NULL, '{\"demo\":true,\"n\":2}', '127.0.0.1', 'DemoSeeder', '2026-08-11 03:43:13'),
(3, 1, 2, 'rbac', 'project', 1, 'exported', NULL, '{\"demo\":true,\"n\":3}', '127.0.0.1', 'DemoSeeder', '2026-08-11 02:43:13'),
(4, 1, 2, 'projects', 'project', 1, 'created', NULL, '{\"demo\":true,\"n\":4}', '127.0.0.1', 'DemoSeeder', '2026-08-11 01:43:13'),
(5, 1, 2, 'billing', 'project', 1, 'updated', NULL, '{\"demo\":true,\"n\":5}', '127.0.0.1', 'DemoSeeder', '2026-08-11 00:43:13'),
(6, 1, 2, 'procurement', 'project', 1, 'viewed', NULL, '{\"demo\":true,\"n\":6}', '127.0.0.1', 'DemoSeeder', '2026-08-10 23:43:13'),
(7, 1, 2, 'rbac', 'project', 1, 'exported', NULL, '{\"demo\":true,\"n\":7}', '127.0.0.1', 'DemoSeeder', '2026-08-10 22:43:13'),
(8, 1, 2, 'projects', 'project', 1, 'created', NULL, '{\"demo\":true,\"n\":8}', '127.0.0.1', 'DemoSeeder', '2026-08-10 21:43:13'),
(9, 1, 2, 'billing', 'project', 1, 'updated', NULL, '{\"demo\":true,\"n\":9}', '127.0.0.1', 'DemoSeeder', '2026-08-10 20:43:13'),
(10, 1, 2, 'procurement', 'project', 1, 'viewed', NULL, '{\"demo\":true,\"n\":10}', '127.0.0.1', 'DemoSeeder', '2026-08-10 19:43:13'),
(11, 1, 2, 'rbac', 'project', 1, 'exported', NULL, '{\"demo\":true,\"n\":11}', '127.0.0.1', 'DemoSeeder', '2026-08-10 18:43:13'),
(12, 1, 2, 'projects', 'project', 1, 'created', NULL, '{\"demo\":true,\"n\":12}', '127.0.0.1', 'DemoSeeder', '2026-08-10 17:43:13'),
(13, 1, 1, 'saas', 'tenant', 1, 'seeded', NULL, '{\"tenant\":\"desert-build\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:33:13'),
(14, 2, 1, 'saas', 'tenant', 2, 'seeded', NULL, '{\"tenant\":\"atlas-construct\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:34:13'),
(15, 3, 1, 'saas', 'tenant', 3, 'seeded', NULL, '{\"tenant\":\"summit-structures\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:35:13'),
(16, 4, 1, 'saas', 'tenant', 4, 'seeded', NULL, '{\"tenant\":\"gulf-works\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:36:13'),
(17, 5, 1, 'saas', 'tenant', 5, 'seeded', NULL, '{\"tenant\":\"oasis-infra\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:37:13'),
(18, 6, 1, 'saas', 'tenant', 6, 'seeded', NULL, '{\"tenant\":\"falcon-civil\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:38:13'),
(19, 7, 1, 'saas', 'tenant', 7, 'seeded', NULL, '{\"tenant\":\"horizon-mep\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:39:13'),
(20, 8, 1, 'saas', 'tenant', 8, 'seeded', NULL, '{\"tenant\":\"pearl-dev\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:40:13'),
(21, 9, 1, 'saas', 'tenant', 9, 'seeded', NULL, '{\"tenant\":\"cedar-eng\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:41:13'),
(22, 10, 1, 'saas', 'tenant', 10, 'seeded', NULL, '{\"tenant\":\"marina-fitout\"}', '127.0.0.1', 'DemoSeeder', '2026-08-11 05:42:13');

-- --------------------------------------------------------

--
-- Table structure for table `boqs`
--

CREATE TABLE `boqs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `version` varchar(30) NOT NULL DEFAULT '1.0',
  `status` enum('draft','issued','approved','superseded') NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `boqs`
--

INSERT INTO `boqs` (`id`, `tenant_id`, `project_id`, `title`, `version`, `status`, `currency`, `total_amount`, `notes`, `approved_at`, `approved_by`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'BOQ Version 1', '1', 'approved', 'AED', 50000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 2, 'BOQ Version 2', '2', 'draft', 'AED', 100000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 3, 'BOQ Version 3', '3', 'draft', 'AED', 150000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 4, 'BOQ Version 4', '4', 'draft', 'AED', 200000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 5, 'BOQ Version 5', '5', 'draft', 'AED', 250000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 6, 'BOQ Version 6', '6', 'draft', 'AED', 300000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 7, 'BOQ Version 7', '7', 'draft', 'AED', 350000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 8, 'BOQ Version 8', '8', 'draft', 'AED', 400000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 9, 'BOQ Version 9', '9', 'draft', 'AED', 450000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 10, 'BOQ Version 10', '10', 'draft', 'AED', 500000.00, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `boq_items`
--

CREATE TABLE `boq_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `boq_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `wbs_id` bigint(20) UNSIGNED DEFAULT NULL,
  `cost_code_id` bigint(20) UNSIGNED DEFAULT NULL,
  `item_no` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `boq_items`
--

INSERT INTO `boq_items` (`id`, `tenant_id`, `boq_id`, `parent_id`, `wbs_id`, `cost_code_id`, `item_no`, `description`, `unit`, `quantity`, `rate`, `amount`, `sort_order`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, NULL, NULL, '1.1', 'BOQ line 1.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, NULL, NULL, NULL, '1.2', 'BOQ line 1.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, NULL, NULL, NULL, '1.3', 'BOQ line 1.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 2, NULL, NULL, NULL, '2.1', 'BOQ line 2.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 2, NULL, NULL, NULL, '2.2', 'BOQ line 2.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 2, NULL, NULL, NULL, '2.3', 'BOQ line 2.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 3, NULL, NULL, NULL, '3.1', 'BOQ line 3.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 3, NULL, NULL, NULL, '3.2', 'BOQ line 3.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 3, NULL, NULL, NULL, '3.3', 'BOQ line 3.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 4, NULL, NULL, NULL, '4.1', 'BOQ line 4.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(11, 1, 4, NULL, NULL, NULL, '4.2', 'BOQ line 4.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(12, 1, 4, NULL, NULL, NULL, '4.3', 'BOQ line 4.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(13, 1, 5, NULL, NULL, NULL, '5.1', 'BOQ line 5.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(14, 1, 5, NULL, NULL, NULL, '5.2', 'BOQ line 5.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(15, 1, 5, NULL, NULL, NULL, '5.3', 'BOQ line 5.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(16, 1, 6, NULL, NULL, NULL, '6.1', 'BOQ line 6.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(17, 1, 6, NULL, NULL, NULL, '6.2', 'BOQ line 6.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(18, 1, 6, NULL, NULL, NULL, '6.3', 'BOQ line 6.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(19, 1, 7, NULL, NULL, NULL, '7.1', 'BOQ line 7.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(20, 1, 7, NULL, NULL, NULL, '7.2', 'BOQ line 7.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(21, 1, 7, NULL, NULL, NULL, '7.3', 'BOQ line 7.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(22, 1, 8, NULL, NULL, NULL, '8.1', 'BOQ line 8.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(23, 1, 8, NULL, NULL, NULL, '8.2', 'BOQ line 8.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(24, 1, 8, NULL, NULL, NULL, '8.3', 'BOQ line 8.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(25, 1, 9, NULL, NULL, NULL, '9.1', 'BOQ line 9.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(26, 1, 9, NULL, NULL, NULL, '9.2', 'BOQ line 9.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(27, 1, 9, NULL, NULL, NULL, '9.3', 'BOQ line 9.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(28, 1, 10, NULL, NULL, NULL, '10.1', 'BOQ line 10.1', 'm3', 10.0000, 100.0000, 1000.00, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(29, 1, 10, NULL, NULL, NULL, '10.2', 'BOQ line 10.2', 'm3', 20.0000, 200.0000, 4000.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(30, 1, 10, NULL, NULL, NULL, '10.3', 'BOQ line 10.3', 'm3', 30.0000, 300.0000, 9000.00, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(160) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `contact_person` varchar(160) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `tenant_id`, `name`, `code`, `contact_person`, `email`, `phone`, `address`, `country_code`, `notes`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'Al Noor Developments', 'CLI-01', 'Client Contact 1', 'client01@example.test', '+97141000001', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(2, 1, 'Blue Bay Holdings', 'CLI-02', 'Client Contact 2', 'client02@example.test', '+97141000002', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(3, 1, 'Cedar Realty', 'CLI-03', 'Client Contact 3', 'client03@example.test', '+97141000003', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(4, 1, 'Delta Properties', 'CLI-04', 'Client Contact 4', 'client04@example.test', '+97141000004', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(5, 1, 'Emerald Estates', 'CLI-05', 'Client Contact 5', 'client05@example.test', '+97141000005', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(6, 1, 'Falcon Investments', 'CLI-06', 'Client Contact 6', 'client06@example.test', '+97141000006', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(7, 1, 'Golden Gate RE', 'CLI-07', 'Client Contact 7', 'client07@example.test', '+97141000007', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(8, 1, 'Harbor Group', 'CLI-08', 'Client Contact 8', 'client08@example.test', '+97141000008', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(9, 1, 'Ivory Towers', 'CLI-09', 'Client Contact 9', 'client09@example.test', '+97141000009', NULL, 'AE', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(10, 1, 'Jade Capital', 'CLI-10', 'Client Contact 10', 'client10@example.test', '+97141000010', NULL, 'AE', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `trade_license_no` varchar(100) DEFAULT NULL,
  `tax_number` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `logo_path` varchar(500) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `tenant_id`, `name`, `legal_name`, `trade_license_no`, `tax_number`, `email`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `country_code`, `postal_code`, `logo_path`, `is_primary`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'Desert Build LLC', 'Desert Build LLC', NULL, NULL, 'company1@desertbuild.test', '+971500000001', NULL, NULL, 'Abu Dhabi', NULL, 'AE', NULL, NULL, 1, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(2, 1, 'Desert Entity 2', 'Desert Entity 2 FZ-LLC', NULL, NULL, 'company2@desertbuild.test', '+971500000002', NULL, NULL, 'Sharjah', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(3, 1, 'Desert Entity 3', 'Desert Entity 3 FZ-LLC', NULL, NULL, 'company3@desertbuild.test', '+971500000003', NULL, NULL, 'Dubai', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(4, 1, 'Desert Entity 4', 'Desert Entity 4 FZ-LLC', NULL, NULL, 'company4@desertbuild.test', '+971500000004', NULL, NULL, 'Abu Dhabi', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(5, 1, 'Desert Entity 5', 'Desert Entity 5 FZ-LLC', NULL, NULL, 'company5@desertbuild.test', '+971500000005', NULL, NULL, 'Sharjah', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(6, 1, 'Desert Entity 6', 'Desert Entity 6 FZ-LLC', NULL, NULL, 'company6@desertbuild.test', '+971500000006', NULL, NULL, 'Dubai', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(7, 1, 'Desert Entity 7', 'Desert Entity 7 FZ-LLC', NULL, NULL, 'company7@desertbuild.test', '+971500000007', NULL, NULL, 'Abu Dhabi', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(8, 1, 'Desert Entity 8', 'Desert Entity 8 FZ-LLC', NULL, NULL, 'company8@desertbuild.test', '+971500000008', NULL, NULL, 'Sharjah', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(9, 1, 'Desert Entity 9', 'Desert Entity 9 FZ-LLC', NULL, NULL, 'company9@desertbuild.test', '+971500000009', NULL, NULL, 'Dubai', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(10, 1, 'Desert Entity 10', 'Desert Entity 10 FZ-LLC', NULL, NULL, 'company10@desertbuild.test', '+971500000010', NULL, NULL, 'Abu Dhabi', NULL, 'AE', NULL, NULL, 0, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `consultants`
--

CREATE TABLE `consultants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `specialty` varchar(160) DEFAULT NULL,
  `contact_person` varchar(160) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

CREATE TABLE `contracts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `contract_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `contract_type` enum('main','subcontract','supply','consultancy') NOT NULL DEFAULT 'main',
  `status` enum('draft','active','suspended','completed','terminated') NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `contract_value` decimal(18,2) NOT NULL DEFAULT 0.00,
  `retention_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `advance_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `liquidated_damages_per_day` decimal(18,2) DEFAULT NULL,
  `payment_terms` text DEFAULT NULL,
  `warranty_months` int(10) UNSIGNED DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `signed_at` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contracts`
--

INSERT INTO `contracts` (`id`, `tenant_id`, `project_id`, `client_id`, `contract_no`, `title`, `contract_type`, `status`, `currency`, `contract_value`, `retention_percent`, `advance_percent`, `liquidated_damages_per_day`, `payment_terms`, `warranty_months`, `start_date`, `end_date`, `signed_at`, `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 1, 'CON-001', 'Main Contract 1', 'main', 'active', 'AED', 800000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 2, 2, 'CON-002', 'Main Contract 2', 'main', 'active', 'AED', 1600000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 3, 3, 'CON-003', 'Main Contract 3', 'main', 'active', 'AED', 2400000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 4, 4, 'CON-004', 'Main Contract 4', 'main', 'active', 'AED', 3200000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 5, 5, 'CON-005', 'Main Contract 5', 'main', 'active', 'AED', 4000000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 6, 6, 'CON-006', 'Main Contract 6', 'main', 'active', 'AED', 4800000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 7, 7, 'CON-007', 'Main Contract 7', 'main', 'active', 'AED', 5600000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 8, 8, 'CON-008', 'Main Contract 8', 'main', 'active', 'AED', 6400000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 9, 9, 'CON-009', 'Main Contract 9', 'main', 'active', 'AED', 7200000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 10, 10, 'CON-010', 'Main Contract 10', 'main', 'active', 'AED', 8000000.00, 10.00, 10.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `contract_items`
--

CREATE TABLE `contract_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `contract_id` bigint(20) UNSIGNED NOT NULL,
  `boq_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cost_codes`
--

CREATE TABLE `cost_codes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL = tenant master library',
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cost_codes`
--

INSERT INTO `cost_codes` (`id`, `tenant_id`, `project_id`, `code`, `name`, `category`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'CC-01', 'Cost Code 1', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(2, 1, 1, 'CC-02', 'Cost Code 2', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(3, 1, 1, 'CC-03', 'Cost Code 3', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(4, 1, 1, 'CC-04', 'Cost Code 4', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(5, 1, 1, 'CC-05', 'Cost Code 5', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(6, 1, 1, 'CC-06', 'Cost Code 6', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(7, 1, 1, 'CC-07', 'Cost Code 7', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(8, 1, 1, 'CC-08', 'Cost Code 8', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(9, 1, 1, 'CC-09', 'Cost Code 9', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(10, 1, 1, 'CC-10', 'Cost Code 10', 'Civil', NULL, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(160) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `document_type` enum('contract','drawing','rfi','submittal','certificate','report','photo','variation','other') NOT NULL DEFAULT 'other',
  `title` varchar(255) NOT NULL,
  `document_no` varchar(80) DEFAULT NULL,
  `status` enum('draft','submitted','under_review','approved','rejected','obsolete') NOT NULL DEFAULT 'draft',
  `current_version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `uploaded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `tenant_id`, `project_id`, `document_type`, `title`, `document_no`, `status`, `current_version`, `uploaded_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'drawing', 'Document 1', 'DOC-001', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 'rfi', 'Document 2', 'DOC-002', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 'submittal', 'Document 3', 'DOC-003', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 'certificate', 'Document 4', 'DOC-004', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 'report', 'Document 5', 'DOC-005', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 'photo', 'Document 6', 'DOC-006', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 'variation', 'Document 7', 'DOC-007', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 'other', 'Document 8', 'DOC-008', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 'report', 'Document 9', 'DOC-009', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 'contract', 'Document 10', 'DOC-010', 'approved', 1, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_versions`
--

CREATE TABLE `document_versions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `document_id` bigint(20) UNSIGNED NOT NULL,
  `version_no` int(10) UNSIGNED NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size` bigint(20) UNSIGNED DEFAULT NULL,
  `checksum` char(64) DEFAULT NULL,
  `change_notes` text DEFAULT NULL,
  `uploaded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `drawings`
--

CREATE TABLE `drawings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `document_id` bigint(20) UNSIGNED DEFAULT NULL,
  `drawing_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `discipline` enum('architectural','structural','electrical','plumbing','hvac','civil','other') NOT NULL DEFAULT 'other',
  `status` enum('draft','for_review','approved','superseded') NOT NULL DEFAULT 'draft',
  `current_revision` varchar(20) NOT NULL DEFAULT 'A',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `drawing_revisions`
--

CREATE TABLE `drawing_revisions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `drawing_id` bigint(20) UNSIGNED NOT NULL,
  `revision` varchar(20) NOT NULL,
  `document_version_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('draft','issued','approved','superseded') NOT NULL DEFAULT 'draft',
  `issued_at` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `company_id` bigint(20) UNSIGNED DEFAULT NULL,
  `branch_id` bigint(20) UNSIGNED DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `job_title` varchar(160) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `employment_type` enum('permanent','contract','temporary','consultant') NOT NULL DEFAULT 'permanent',
  `hire_date` date DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `equipment`
--

CREATE TABLE `equipment` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `ownership` enum('owned','rented','leased') NOT NULL DEFAULT 'owned',
  `status` enum('available','assigned','maintenance','retired') NOT NULL DEFAULT 'available',
  `manufacturer` varchar(160) DEFAULT NULL,
  `model` varchar(160) DEFAULT NULL,
  `serial_no` varchar(120) DEFAULT NULL,
  `daily_rate` decimal(18,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `equipment`
--

INSERT INTO `equipment` (`id`, `tenant_id`, `code`, `name`, `category`, `ownership`, `status`, `manufacturer`, `model`, `serial_no`, `daily_rate`, `notes`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'EQ-01', 'Equipment 1', NULL, 'rented', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 'EQ-02', 'Equipment 2', NULL, 'owned', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 'EQ-03', 'Equipment 3', NULL, 'rented', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 'EQ-04', 'Equipment 4', NULL, 'owned', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 'EQ-05', 'Equipment 5', NULL, 'rented', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 'EQ-06', 'Equipment 6', NULL, 'owned', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 'EQ-07', 'Equipment 7', NULL, 'rented', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 'EQ-08', 'Equipment 8', NULL, 'owned', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 'EQ-09', 'Equipment 9', NULL, 'rented', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 'EQ-10', 'Equipment 10', NULL, 'owned', 'available', NULL, NULL, NULL, 0.00, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `equipment_assignments`
--

CREATE TABLE `equipment_assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_id` bigint(20) UNSIGNED NOT NULL,
  `assignment_no` varchar(80) NOT NULL,
  `operator_name` varchar(160) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `daily_rate` decimal(18,2) NOT NULL DEFAULT 0.00,
  `status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `equipment_usage_logs`
--

CREATE TABLE `equipment_usage_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_assignment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `usage_date` date NOT NULL,
  `hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `fuel_liters` decimal(10,2) NOT NULL DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  `recorded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipts`
--

CREATE TABLE `goods_receipts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_id` bigint(20) UNSIGNED NOT NULL,
  `warehouse_id` bigint(20) UNSIGNED NOT NULL,
  `grn_no` varchar(80) NOT NULL,
  `received_date` date NOT NULL,
  `status` enum('draft','posted') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `received_by` bigint(20) UNSIGNED DEFAULT NULL,
  `posted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipt_items`
--

CREATE TABLE `goods_receipt_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `goods_receipt_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(30) NOT NULL DEFAULT 'nos',
  `category` varchar(120) DEFAULT NULL,
  `default_rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `tenant_id`, `sku`, `name`, `description`, `unit`, `category`, `default_rate`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'SKU-001', 'Material Item 1', NULL, 'ton', 'MEP', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 'SKU-002', 'Material Item 2', NULL, 'nos', 'Finishing', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 'SKU-003', 'Material Item 3', NULL, 'm', 'Civil', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 'SKU-004', 'Material Item 4', NULL, 'kg', 'MEP', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 'SKU-005', 'Material Item 5', NULL, 'm3', 'Finishing', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 'SKU-006', 'Material Item 6', NULL, 'ton', 'Civil', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 'SKU-007', 'Material Item 7', NULL, 'nos', 'MEP', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 'SKU-008', 'Material Item 8', NULL, 'm', 'Finishing', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 'SKU-009', 'Material Item 9', NULL, 'kg', 'Civil', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 'SKU-010', 'Material Item 10', NULL, 'm3', 'MEP', 0.0000, 1, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payment_certificate_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_no` varchar(80) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(18,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','issued','partially_paid','paid','void','overdue') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `tenant_id`, `project_id`, `client_id`, `payment_certificate_id`, `invoice_no`, `invoice_date`, `due_date`, `currency`, `subtotal`, `tax_amount`, `total_amount`, `amount_paid`, `status`, `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 1, NULL, 'INV-001', '2026-07-13', '2026-08-12', 'AED', 40000.00, 2000.00, 42000.00, 0.00, 'issued', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 1, NULL, 'INV-002', '2026-07-14', '2026-08-13', 'AED', 80000.00, 4000.00, 84000.00, 84000.00, 'paid', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 1, NULL, 'INV-003', '2026-07-15', '2026-08-14', 'AED', 120000.00, 6000.00, 126000.00, 0.00, 'issued', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 1, NULL, 'INV-004', '2026-07-16', '2026-08-15', 'AED', 160000.00, 8000.00, 168000.00, 168000.00, 'paid', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 1, NULL, 'INV-005', '2026-07-17', '2026-08-16', 'AED', 200000.00, 10000.00, 210000.00, 0.00, 'issued', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 1, NULL, 'INV-006', '2026-07-18', '2026-08-17', 'AED', 240000.00, 12000.00, 252000.00, 252000.00, 'paid', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 1, NULL, 'INV-007', '2026-07-19', '2026-08-18', 'AED', 280000.00, 14000.00, 294000.00, 0.00, 'issued', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 1, NULL, 'INV-008', '2026-07-20', '2026-08-19', 'AED', 320000.00, 16000.00, 336000.00, 336000.00, 'paid', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 1, NULL, 'INV-009', '2026-07-21', '2026-08-20', 'AED', 360000.00, 18000.00, 378000.00, 0.00, 'issued', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 1, NULL, 'INV-010', '2026-07-22', '2026-08-21', 'AED', 400000.00, 20000.00, 420000.00, 420000.00, 'paid', NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_issues`
--

CREATE TABLE `material_issues` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `warehouse_id` bigint(20) UNSIGNED NOT NULL,
  `issue_no` varchar(80) NOT NULL,
  `issue_date` date NOT NULL,
  `status` enum('draft','posted') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `issued_by` bigint(20) UNSIGNED DEFAULT NULL,
  `posted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_issue_items`
--

CREATE TABLE `material_issue_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `material_issue_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_requests`
--

CREATE TABLE `material_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `request_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `needed_by` date DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected','converted') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `requested_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `material_requests`
--

INSERT INTO `material_requests` (`id`, `tenant_id`, `project_id`, `request_no`, `title`, `needed_by`, `status`, `notes`, `requested_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'MR-001', 'Material request 1', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 'MR-002', 'Material request 2', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 'MR-003', 'Material request 3', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 'MR-004', 'Material request 4', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 'MR-005', 'Material request 5', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 'MR-006', 'Material request 6', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 'MR-007', 'Material request 7', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 'MR-008', 'Material request 8', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 'MR-009', 'Material request 9', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 'MR-010', 'Material request 10', NULL, 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `material_request_items`
--

CREATE TABLE `material_request_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `material_request_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000001_create_cache_table', 1),
(2, '0001_01_01_000002_create_jobs_table', 1),
(3, '2026_08_11_100000_create_r1_schema_tables', 1),
(4, '2026_08_11_120000_create_r2_ops_schema_tables', 2),
(5, '2026_08_11_130000_create_r2_rfq_equipment_subcontractors', 3),
(6, '2026_08_11_140000_saas_foundation_and_policies', 4);

-- --------------------------------------------------------

--
-- Table structure for table `milestones`
--

CREATE TABLE `milestones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_at` date DEFAULT NULL,
  `status` enum('pending','achieved','missed','cancelled') NOT NULL DEFAULT 'pending',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `type` varchar(120) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `channel` enum('in_app','email','sms','whatsapp') NOT NULL DEFAULT 'in_app',
  `data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data_json`)),
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `payment_no` varchar(80) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `method` enum('bank_transfer','cheque','cash','card','other') NOT NULL DEFAULT 'bank_transfer',
  `reference` varchar(120) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_applications`
--

CREATE TABLE `payment_applications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `contract_id` bigint(20) UNSIGNED DEFAULT NULL,
  `application_no` varchar(80) NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `status` enum('draft','submitted','under_review','certified','rejected','paid') NOT NULL DEFAULT 'draft',
  `gross_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `retention_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `advance_recovery` decimal(18,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_applications`
--

INSERT INTO `payment_applications` (`id`, `tenant_id`, `project_id`, `contract_id`, `application_no`, `period_start`, `period_end`, `status`, `gross_amount`, `retention_amount`, `advance_recovery`, `net_amount`, `submitted_at`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, 'PA-001', '2025-10-01', '2025-10-31', 'certified', 50000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, NULL, 'PA-002', '2025-11-01', '2025-11-30', 'certified', 100000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, NULL, 'PA-003', '2025-12-01', '2025-12-31', 'certified', 150000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, NULL, 'PA-004', '2026-01-01', '2026-01-31', 'certified', 200000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, NULL, 'PA-005', '2026-02-01', '2026-02-28', 'certified', 250000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, NULL, 'PA-006', '2026-03-01', '2026-03-31', 'certified', 300000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, NULL, 'PA-007', '2026-04-01', '2026-04-30', 'certified', 350000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, NULL, 'PA-008', '2026-05-01', '2026-05-31', 'draft', 400000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, NULL, 'PA-009', '2026-06-01', '2026-06-30', 'draft', 450000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, NULL, 'PA-010', '2026-07-01', '2026-07-31', 'draft', 500000.00, 0.00, 0.00, 0.00, NULL, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payment_application_items`
--

CREATE TABLE `payment_application_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `payment_application_id` bigint(20) UNSIGNED NOT NULL,
  `boq_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text NOT NULL,
  `previous_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `this_period_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `cumulative_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_certificates`
--

CREATE TABLE `payment_certificates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `payment_application_id` bigint(20) UNSIGNED NOT NULL,
  `certificate_no` varchar(80) NOT NULL,
  `certified_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `retention_held` decimal(18,2) NOT NULL DEFAULT 0.00,
  `certified_at` date DEFAULT NULL,
  `certified_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(120) NOT NULL,
  `name` varchar(160) NOT NULL,
  `module` varchar(80) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `code`, `name`, `module`, `description`, `created_at`, `updated_at`) VALUES
(1, 'users.view', 'View users', 'identity', NULL, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(2, 'users.manage', 'Manage users', 'identity', NULL, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(3, 'roles.manage', 'Manage roles', 'identity', NULL, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(4, 'projects.view', 'View projects', 'projects', NULL, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(5, 'projects.manage', 'Manage projects', 'projects', NULL, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(6, 'company.manage', 'Manage companies', 'organization', NULL, '2026-08-10 23:40:20', '2026-08-10 23:48:55'),
(7, 'company.view', 'View companies', 'organization', NULL, '2026-08-10 23:48:55', '2026-08-10 23:48:55'),
(8, 'clients.view', 'View clients', 'organization', NULL, '2026-08-10 23:48:55', '2026-08-10 23:48:55'),
(9, 'clients.manage', 'Manage clients', 'organization', NULL, '2026-08-10 23:48:55', '2026-08-10 23:48:55'),
(10, 'wbs.view', 'View WBS', 'planning', NULL, '2026-08-10 23:48:55', '2026-08-10 23:48:55'),
(11, 'wbs.manage', 'Manage WBS', 'planning', NULL, '2026-08-10 23:48:55', '2026-08-10 23:48:55'),
(12, 'tasks.view', 'View tasks', 'planning', NULL, '2026-08-10 23:55:11', '2026-08-10 23:55:11'),
(13, 'tasks.manage', 'Manage tasks', 'planning', NULL, '2026-08-10 23:55:11', '2026-08-10 23:55:11'),
(14, 'boq.view', 'View BOQ', 'commercial', NULL, '2026-08-11 00:01:50', '2026-08-11 00:01:50'),
(15, 'boq.manage', 'Manage BOQ', 'commercial', NULL, '2026-08-11 00:01:50', '2026-08-11 00:01:50'),
(16, 'contracts.view', 'View contracts', 'commercial', NULL, '2026-08-11 00:01:50', '2026-08-11 00:01:50'),
(17, 'contracts.manage', 'Manage contracts', 'commercial', NULL, '2026-08-11 00:01:50', '2026-08-11 00:01:50'),
(18, 'site_diary.view', 'View site diary', 'site', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(19, 'site_diary.manage', 'Manage site diary', 'site', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(20, 'documents.view', 'View documents', 'documents', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(21, 'documents.manage', 'Manage documents', 'documents', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(22, 'rfis.view', 'View RFIs', 'workflow', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(23, 'rfis.manage', 'Manage RFIs', 'workflow', NULL, '2026-08-11 00:10:37', '2026-08-11 00:10:37'),
(24, 'submittals.view', 'View submittals', 'workflow', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(25, 'submittals.manage', 'Manage submittals', 'workflow', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(26, 'variations.view', 'View variations', 'commercial', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(27, 'variations.manage', 'Manage variations', 'commercial', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(28, 'billing.view', 'View billing', 'billing', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(29, 'billing.manage', 'Manage billing', 'billing', NULL, '2026-08-11 00:22:40', '2026-08-11 00:22:40'),
(30, 'audit.view', 'View audit logs', 'audit', NULL, '2026-08-11 00:32:45', '2026-08-11 00:32:45'),
(31, 'procurement.view', 'View procurement', 'procurement', NULL, '2026-08-11 00:43:01', '2026-08-11 00:43:01'),
(32, 'procurement.manage', 'Manage procurement', 'procurement', NULL, '2026-08-11 00:43:01', '2026-08-11 00:43:01'),
(33, 'inventory.view', 'View inventory', 'inventory', NULL, '2026-08-11 00:43:01', '2026-08-11 00:43:01'),
(34, 'inventory.manage', 'Manage inventory', 'inventory', NULL, '2026-08-11 00:43:01', '2026-08-11 00:43:01'),
(35, 'equipment.view', 'View equipment', 'equipment', NULL, '2026-08-11 01:27:55', '2026-08-11 01:27:55'),
(36, 'equipment.manage', 'Manage equipment', 'equipment', NULL, '2026-08-11 01:27:56', '2026-08-11 01:27:56'),
(37, 'subcontractors.view', 'View subcontractors', 'subcontractors', NULL, '2026-08-11 01:27:56', '2026-08-11 01:27:56'),
(38, 'subcontractors.manage', 'Manage subcontractors', 'subcontractors', NULL, '2026-08-11 01:27:56', '2026-08-11 01:27:56');

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(1, 'App\\Models\\User', 1, 'qa', '1a91a96311e71df397f946f790ec77e8dfebed0a618c39344f8bae571bca11ae', '[\"*\"]', '2026-08-11 05:43:45', NULL, '2026-08-11 05:43:45', '2026-08-11 05:43:45'),
(2, 'App\\Models\\User', 2, 'qa', '5d256973bfe6258c215aab8c5c098620103bbddae5392ab019058788e360876e', '[\"*\"]', '2026-08-11 05:43:47', NULL, '2026-08-11 05:43:46', '2026-08-11 05:43:47'),
(3, 'App\\Models\\User', 3, 'qa', '65cf5c06c079254b1fce82bbc832cc2deb5daf600233c6455f93bf8b608aef5d', '[\"*\"]', '2026-08-11 05:43:49', NULL, '2026-08-11 05:43:48', '2026-08-11 05:43:49'),
(4, 'App\\Models\\User', 4, 'qa', '22ce8701890e31dbd41158fb3be48b83740f93d3219e29edaa584af0ab2b19cb', '[\"*\"]', '2026-08-11 05:43:50', NULL, '2026-08-11 05:43:49', '2026-08-11 05:43:50'),
(5, 'App\\Models\\User', 5, 'qa', '6bbaa6b319454655d66b786f465de51ed856973d3e15141f4cee89a5162cd73c', '[\"*\"]', '2026-08-11 05:43:52', NULL, '2026-08-11 05:43:51', '2026-08-11 05:43:52'),
(6, 'App\\Models\\User', 2, 'spa', '1e7b8d6998707ace9fc0d291cfc9d30a0ba54570c30745bf43d3666b75f7a7e2', '[\"*\"]', '2026-08-11 05:46:57', NULL, '2026-08-11 05:44:24', '2026-08-11 05:46:57'),
(7, 'App\\Models\\User', 1, 'qa', '150132b058c69d6bb43390f6d268aba3ee6a210a92d43305bfe3582dce564999', '[\"*\"]', '2026-08-11 05:44:29', NULL, '2026-08-11 05:44:28', '2026-08-11 05:44:29'),
(8, 'App\\Models\\User', 2, 'qa', '964cdc1f335ed22e0b1ad4fb9f6a44067cb02869af0075512851918ac7b005f7', '[\"*\"]', '2026-08-11 05:44:30', NULL, '2026-08-11 05:44:30', '2026-08-11 05:44:30'),
(9, 'App\\Models\\User', 3, 'qa', '8591fa300ae82952de0bc952466c9c93de1ef1121f50681269ce19d57d7c5cac', '[\"*\"]', '2026-08-11 05:44:32', NULL, '2026-08-11 05:44:31', '2026-08-11 05:44:32'),
(10, 'App\\Models\\User', 4, 'qa', '42a1247774310601d9d1b9175617ae403714633de09d345bf1f671c0a5a66474', '[\"*\"]', '2026-08-11 05:44:33', NULL, '2026-08-11 05:44:33', '2026-08-11 05:44:33'),
(11, 'App\\Models\\User', 5, 'qa', 'b74530585878dcc546756af422a2c740176d845917d4fc582aa1d8e0b936bd09', '[\"*\"]', '2026-08-11 05:44:35', NULL, '2026-08-11 05:44:34', '2026-08-11 05:44:35');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED DEFAULT NULL,
  `branch_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `consultant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `project_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `status` enum('lead','proposal','awarded','setup','planning','mobilization','execution','monitoring','testing','handover','completed','warranty','closed','on_hold','cancelled') NOT NULL DEFAULT 'setup',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `baseline_start_date` date DEFAULT NULL,
  `baseline_end_date` date DEFAULT NULL,
  `budget_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `contract_value` decimal(18,2) NOT NULL DEFAULT 0.00,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `tenant_id`, `company_id`, `branch_id`, `client_id`, `consultant_id`, `project_code`, `name`, `description`, `location`, `country_code`, `currency`, `status`, `start_date`, `end_date`, `baseline_start_date`, `baseline_end_date`, `budget_amount`, `contract_value`, `progress_percent`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, 1, NULL, 'PRJ-001', 'Marina Tower', 'Demo project seeded for QA and role testing.', 'Dubai Marina', NULL, 'AED', 'setup', '2026-03-11', '2027-05-11', NULL, NULL, 1000000.00, 1200000.00, 7.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 2, NULL, 2, NULL, 'PRJ-002', 'Oasis Mall', 'Demo project seeded for QA and role testing.', 'Business Bay', NULL, 'AED', 'planning', '2026-04-11', '2027-06-11', NULL, NULL, 2000000.00, 2400000.00, 14.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 3, NULL, 3, NULL, 'PRJ-003', 'Palm Villa Cluster', 'Demo project seeded for QA and role testing.', 'Palm Jumeirah', NULL, 'AED', 'execution', '2026-05-11', '2027-07-11', NULL, NULL, 3000000.00, 3600000.00, 21.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 4, NULL, 4, NULL, 'PRJ-004', 'Metro Depot', 'Demo project seeded for QA and role testing.', 'Al Quoz', NULL, 'AED', 'on_hold', '2026-06-11', '2027-08-11', NULL, NULL, 4000000.00, 4800000.00, 28.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 5, NULL, 5, NULL, 'PRJ-005', 'Airport Annex', 'Demo project seeded for QA and role testing.', 'DXB Airport', NULL, 'AED', 'completed', '2026-02-11', '2027-09-11', NULL, NULL, 5000000.00, 6000000.00, 35.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 6, NULL, 6, NULL, 'PRJ-006', 'Hospital Wing B', 'Demo project seeded for QA and role testing.', 'Al Ain', NULL, 'AED', 'planning', '2026-03-11', '2027-10-11', NULL, NULL, 6000000.00, 7200000.00, 42.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 7, NULL, 7, NULL, 'PRJ-007', 'School Campus', 'Demo project seeded for QA and role testing.', 'Sharjah', NULL, 'AED', 'execution', '2026-04-11', '2027-11-11', NULL, NULL, 7000000.00, 8400000.00, 49.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 8, NULL, 8, NULL, 'PRJ-008', 'Data Center DXB', 'Demo project seeded for QA and role testing.', 'Dubai South', NULL, 'AED', 'setup', '2026-05-11', '2027-12-11', NULL, NULL, 8000000.00, 9600000.00, 56.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 9, NULL, 9, NULL, 'PRJ-009', 'Hotel Retrofit', 'Demo project seeded for QA and role testing.', 'JLT', NULL, 'AED', 'execution', '2026-06-11', '2028-01-11', NULL, NULL, 9000000.00, 10800000.00, 63.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 10, NULL, 10, NULL, 'PRJ-010', 'Warehouse Park', 'Demo project seeded for QA and role testing.', 'DIP', NULL, 'AED', 'planning', '2026-02-11', '2028-02-11', NULL, NULL, 10000000.00, 12000000.00, 70.00, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `project_members`
--

CREATE TABLE `project_members` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_lead` tinyint(1) NOT NULL DEFAULT 0,
  `joined_at` date DEFAULT NULL,
  `left_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `project_members`
--

INSERT INTO `project_members` (`id`, `tenant_id`, `project_id`, `user_id`, `role_id`, `is_lead`, `joined_at`, `left_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 2, NULL, 1, '2026-05-11', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(2, 1, 1, 3, NULL, 0, '2026-05-11', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(3, 1, 1, 4, NULL, 0, '2026-05-11', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13'),
(4, 1, 1, 5, NULL, 0, '2026-05-11', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_request_id` bigint(20) UNSIGNED DEFAULT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `warehouse_id` bigint(20) UNSIGNED DEFAULT NULL,
  `po_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('draft','issued','partially_received','received','cancelled') NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `order_date` date DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `tenant_id`, `project_id`, `purchase_request_id`, `supplier_id`, `warehouse_id`, `po_no`, `title`, `status`, `currency`, `order_date`, `expected_date`, `subtotal`, `tax_amount`, `total_amount`, `notes`, `created_by`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, 1, NULL, 'PO-001', 'Purchase order 1', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 15000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, NULL, 2, NULL, 'PO-002', 'Purchase order 2', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 30000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, NULL, 3, NULL, 'PO-003', 'Purchase order 3', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 45000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, NULL, 4, NULL, 'PO-004', 'Purchase order 4', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 60000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, NULL, 5, NULL, 'PO-005', 'Purchase order 5', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 75000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, NULL, 6, NULL, 'PO-006', 'Purchase order 6', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 90000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, NULL, 7, NULL, 'PO-007', 'Purchase order 7', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 105000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, NULL, 8, NULL, 'PO-008', 'Purchase order 8', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 120000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, NULL, 9, NULL, 'PO-009', 'Purchase order 9', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 135000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, NULL, 10, NULL, 'PO-010', 'Purchase order 10', 'issued', 'AED', NULL, NULL, 0.00, 0.00, 150000.00, NULL, 2, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `received_quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requests`
--

CREATE TABLE `purchase_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `material_request_id` bigint(20) UNSIGNED DEFAULT NULL,
  `request_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('draft','submitted','approved','rejected','ordered') NOT NULL DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `requested_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_requests`
--

INSERT INTO `purchase_requests` (`id`, `tenant_id`, `project_id`, `material_request_id`, `request_no`, `title`, `status`, `notes`, `requested_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, 'PR-001', 'Purchase request 1', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, NULL, 'PR-002', 'Purchase request 2', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, NULL, 'PR-003', 'Purchase request 3', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, NULL, 'PR-004', 'Purchase request 4', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, NULL, 'PR-005', 'Purchase request 5', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, NULL, 'PR-006', 'Purchase request 6', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, NULL, 'PR-007', 'Purchase request 7', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, NULL, 'PR-008', 'Purchase request 8', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, NULL, 'PR-009', 'Purchase request 9', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, NULL, 'PR-010', 'Purchase request 10', 'approved', NULL, 3, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_request_items`
--

CREATE TABLE `purchase_request_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_request_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `estimated_rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `estimated_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfis`
--

CREATE TABLE `rfis` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `rfi_no` varchar(80) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `discipline` varchar(80) DEFAULT NULL,
  `status` enum('draft','submitted','under_review','responded','approved','rejected','closed') NOT NULL DEFAULT 'draft',
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `submitted_by` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rfis`
--

INSERT INTO `rfis` (`id`, `tenant_id`, `project_id`, `rfi_no`, `subject`, `description`, `discipline`, `status`, `priority`, `submitted_by`, `assigned_to`, `due_date`, `responded_at`, `closed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'RFI-001', 'Clarification request 1', 'Demo RFI seeded for QA.', NULL, 'submitted', 'medium', 3, NULL, '2026-08-12', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 'RFI-002', 'Clarification request 2', 'Demo RFI seeded for QA.', NULL, 'submitted', 'high', 3, NULL, '2026-08-13', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 'RFI-003', 'Clarification request 3', 'Demo RFI seeded for QA.', NULL, 'closed', 'low', 3, NULL, '2026-08-14', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 'RFI-004', 'Clarification request 4', 'Demo RFI seeded for QA.', NULL, 'submitted', 'medium', 3, NULL, '2026-08-15', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 'RFI-005', 'Clarification request 5', 'Demo RFI seeded for QA.', NULL, 'submitted', 'high', 3, NULL, '2026-08-16', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 'RFI-006', 'Clarification request 6', 'Demo RFI seeded for QA.', NULL, 'closed', 'low', 3, NULL, '2026-08-17', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 'RFI-007', 'Clarification request 7', 'Demo RFI seeded for QA.', NULL, 'submitted', 'medium', 3, NULL, '2026-08-18', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 'RFI-008', 'Clarification request 8', 'Demo RFI seeded for QA.', NULL, 'submitted', 'high', 3, NULL, '2026-08-19', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 'RFI-009', 'Clarification request 9', 'Demo RFI seeded for QA.', NULL, 'closed', 'low', 3, NULL, '2026-08-20', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 'RFI-010', 'Clarification request 10', 'Demo RFI seeded for QA.', NULL, 'submitted', 'medium', 3, NULL, '2026-08-21', NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `rfi_attachments`
--

CREATE TABLE `rfi_attachments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `rfi_id` bigint(20) UNSIGNED NOT NULL,
  `document_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfi_responses`
--

CREATE TABLE `rfi_responses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `rfi_id` bigint(20) UNSIGNED NOT NULL,
  `response_text` text NOT NULL,
  `responded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfqs`
--

CREATE TABLE `rfqs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_request_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rfq_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('draft','sent','quoted','awarded','cancelled') NOT NULL DEFAULT 'draft',
  `due_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `awarded_quotation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `awarded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfq_items`
--

CREATE TABLE `rfq_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `rfq_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfq_suppliers`
--

CREATE TABLE `rfq_suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `rfq_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `invited_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL = platform/system role template',
  `code` varchar(80) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `scope` enum('platform','tenant','project') NOT NULL DEFAULT 'tenant',
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `tenant_id`, `code`, `name`, `description`, `scope`, `is_system`, `created_at`, `updated_at`) VALUES
(1, NULL, 'company_owner', 'Company Owner', 'Full access within a tenant', 'tenant', 1, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(2, NULL, 'project_manager', 'Project Manager', 'Project-scoped manager', 'project', 1, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(3, NULL, 'viewer', 'Viewer', 'Read-only access', 'project', 1, '2026-08-10 23:40:20', '2026-08-10 23:40:20'),
(12, 1, 'site_supervisor', 'Site Supervisor', 'Site execution and diary access', 'project', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(13, 1, 'qs_engineer', 'QS Engineer', 'QS Engineer demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(14, 1, 'procurement_officer', 'Procurement Officer', 'Procurement Officer demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(15, 1, 'hse_officer', 'HSE Officer', 'HSE Officer demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(16, 1, 'document_controller', 'Document Controller', 'Document Controller demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(17, 1, 'commercial_manager', 'Commercial Manager', 'Commercial Manager demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(18, 1, 'planner', 'Planner', 'Planner demo role', 'tenant', 0, '2026-08-11 05:43:03', '2026-08-11 05:43:03');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(1, 8),
(1, 9),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 17),
(1, 18),
(1, 19),
(1, 20),
(1, 21),
(1, 22),
(1, 23),
(1, 24),
(1, 25),
(1, 26),
(1, 27),
(1, 28),
(1, 29),
(1, 30),
(1, 31),
(1, 32),
(1, 33),
(1, 34),
(1, 35),
(1, 36),
(1, 37),
(1, 38),
(2, 1),
(2, 4),
(2, 5),
(2, 7),
(2, 8),
(2, 9),
(2, 10),
(2, 11),
(2, 12),
(2, 13),
(2, 14),
(2, 15),
(2, 16),
(2, 17),
(2, 18),
(2, 19),
(2, 20),
(2, 21),
(2, 22),
(2, 23),
(2, 24),
(2, 25),
(2, 26),
(2, 27),
(2, 28),
(2, 29),
(2, 30),
(2, 31),
(2, 32),
(2, 33),
(2, 34),
(2, 35),
(2, 36),
(2, 37),
(2, 38),
(3, 4),
(3, 7),
(3, 8),
(3, 10),
(3, 12),
(3, 14),
(3, 16),
(3, 18),
(3, 20),
(3, 22),
(3, 24),
(3, 26),
(3, 28),
(3, 31),
(3, 33),
(3, 35),
(3, 37),
(12, 4),
(12, 10),
(12, 12),
(12, 13),
(12, 18),
(12, 19),
(12, 20),
(12, 22),
(12, 23),
(12, 24),
(12, 33),
(12, 35),
(13, 4),
(13, 14),
(13, 15),
(13, 16),
(13, 26),
(14, 4),
(14, 31),
(14, 32),
(14, 33),
(15, 4),
(15, 18),
(15, 20),
(16, 4),
(16, 20),
(16, 21),
(16, 24),
(17, 4),
(17, 16),
(17, 17),
(17, 26),
(17, 27),
(17, 28),
(18, 4),
(18, 10),
(18, 11),
(18, 12),
(18, 13);

-- --------------------------------------------------------

--
-- Table structure for table `saas_invoices`
--

CREATE TABLE `saas_invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `subscription_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_number` varchar(40) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `status` enum('draft','open','paid','void','uncollectible') NOT NULL DEFAULT 'open',
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `due_at` date DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `saas_invoices`
--

INSERT INTO `saas_invoices` (`id`, `tenant_id`, `subscription_id`, `invoice_number`, `amount`, `currency`, `status`, `period_start`, `period_end`, `due_at`, `paid_at`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'SAAS-0001', 499.00, 'AED', 'paid', '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-11 05:43:00', 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(2, 2, 2, 'SAAS-0002', 99.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(3, 3, 3, 'SAAS-0003', 249.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(4, 4, 4, 'SAAS-0004', 599.00, 'AED', 'paid', '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-11 05:43:00', 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(5, 5, 5, 'SAAS-0005', 0.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(6, 6, 6, 'SAAS-0006', 149.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(7, 7, 7, 'SAAS-0007', 349.00, 'AED', 'paid', '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-11 05:43:00', 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(8, 8, 8, 'SAAS-0008', 899.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(9, 9, 9, 'SAAS-0009', 179.00, 'AED', 'open', '2026-08-01', '2026-08-31', '2026-08-25', NULL, 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(10, 10, 10, 'SAAS-0010', 129.00, 'AED', 'paid', '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-11 05:43:00', 'Demo SaaS invoice', '2026-08-11 05:43:00', '2026-08-11 05:43:00');

-- --------------------------------------------------------

--
-- Table structure for table `site_diaries`
--

CREATE TABLE `site_diaries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `report_date` date NOT NULL,
  `weather` varchar(120) DEFAULT NULL,
  `temperature_c` decimal(5,2) DEFAULT NULL,
  `work_completed` text DEFAULT NULL,
  `work_planned` text DEFAULT NULL,
  `issues` text DEFAULT NULL,
  `delays` text DEFAULT NULL,
  `visitors` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('draft','submitted','approved') NOT NULL DEFAULT 'draft',
  `prepared_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `site_diaries`
--

INSERT INTO `site_diaries` (`id`, `tenant_id`, `project_id`, `report_date`, `weather`, `temperature_c`, `work_completed`, `work_planned`, `issues`, `delays`, `visitors`, `remarks`, `status`, `prepared_by`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, '2026-08-02', 'Cloudy', 29.00, 'Completed package work day 1', 'Plan for day 1', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, '2026-08-03', 'Humid', 30.00, 'Completed package work day 2', 'Plan for day 2', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, '2026-08-04', 'Clear', 31.00, 'Completed package work day 3', 'Plan for day 3', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, '2026-08-05', 'Cloudy', 32.00, 'Completed package work day 4', 'Plan for day 4', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, '2026-08-06', 'Humid', 33.00, 'Completed package work day 5', 'Plan for day 5', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, '2026-08-07', 'Clear', 34.00, 'Completed package work day 6', 'Plan for day 6', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, '2026-08-08', 'Cloudy', 35.00, 'Completed package work day 7', 'Plan for day 7', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, '2026-08-09', 'Humid', 28.00, 'Completed package work day 8', 'Plan for day 8', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, '2026-08-10', 'Clear', 29.00, 'Completed package work day 9', 'Plan for day 9', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, '2026-08-11', 'Cloudy', 30.00, 'Completed package work day 10', 'Plan for day 10', NULL, NULL, NULL, NULL, 'submitted', 5, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `site_diary_equipment`
--

CREATE TABLE `site_diary_equipment` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `site_diary_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_name` varchar(160) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_diary_labours`
--

CREATE TABLE `site_diary_labours` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `site_diary_id` bigint(20) UNSIGNED NOT NULL,
  `trade` varchar(120) NOT NULL,
  `company_name` varchar(160) DEFAULT NULL,
  `headcount` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `hours` decimal(8,2) NOT NULL DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_diary_materials`
--

CREATE TABLE `site_diary_materials` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `site_diary_id` bigint(20) UNSIGNED NOT NULL,
  `material_name` varchar(160) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_issues`
--

CREATE TABLE `site_issues` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `site_diary_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `reported_by` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_photos`
--

CREATE TABLE `site_photos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `site_diary_id` bigint(20) UNSIGNED DEFAULT NULL,
  `document_id` bigint(20) UNSIGNED NOT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `taken_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_balances`
--

CREATE TABLE `stock_balances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `warehouse_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `avg_unit_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_transactions`
--

CREATE TABLE `stock_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `warehouse_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_item_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `txn_type` enum('in','out','adjustment','transfer','consumption') NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `reference_type` varchar(80) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcontractors`
--

CREATE TABLE `subcontractors` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `trade` varchar(120) DEFAULT NULL,
  `contact_name` varchar(160) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive','blacklisted') NOT NULL DEFAULT 'active',
  `quality_score` decimal(5,2) DEFAULT NULL,
  `schedule_score` decimal(5,2) DEFAULT NULL,
  `cost_score` decimal(5,2) DEFAULT NULL,
  `safety_score` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subcontractors`
--

INSERT INTO `subcontractors` (`id`, `tenant_id`, `code`, `name`, `trade`, `contact_name`, `email`, `phone`, `address`, `status`, `quality_score`, `schedule_score`, `cost_score`, `safety_score`, `notes`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'SUB-01', 'Subcontractor 1', 'Electrical', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 'SUB-02', 'Subcontractor 2', 'Plumbing', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 'SUB-03', 'Subcontractor 3', 'Steel', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 'SUB-04', 'Subcontractor 4', 'Finishing', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 'SUB-05', 'Subcontractor 5', 'Civil', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 'SUB-06', 'Subcontractor 6', 'Electrical', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 'SUB-07', 'Subcontractor 7', 'Plumbing', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 'SUB-08', 'Subcontractor 8', 'Steel', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 'SUB-09', 'Subcontractor 9', 'Finishing', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 'SUB-10', 'Subcontractor 10', 'Civil', NULL, NULL, NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `subcontract_packages`
--

CREATE TABLE `subcontract_packages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `subcontractor_id` bigint(20) UNSIGNED NOT NULL,
  `package_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('draft','awarded','active','completed','terminated') NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `contract_value` decimal(18,2) NOT NULL DEFAULT 0.00,
  `retention_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `awarded_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcontract_package_items`
--

CREATE TABLE `subcontract_package_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `subcontract_package_id` bigint(20) UNSIGNED NOT NULL,
  `description` text NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submittals`
--

CREATE TABLE `submittals` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `submittal_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `submittal_type` enum('material','shop_drawing','sample','technical','other') NOT NULL DEFAULT 'material',
  `status` enum('draft','submitted','consultant_review','approved','approved_with_comments','rejected') NOT NULL DEFAULT 'draft',
  `submitted_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_comments` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `submittals`
--

INSERT INTO `submittals` (`id`, `tenant_id`, `project_id`, `submittal_no`, `title`, `description`, `submittal_type`, `status`, `submitted_by`, `reviewed_by`, `due_date`, `submitted_at`, `reviewed_at`, `review_comments`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'SUBM-001', 'Material submittal 1', NULL, 'material', 'submitted', 3, NULL, '2026-08-17', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 'SUBM-002', 'Material submittal 2', NULL, 'material', 'approved', 3, NULL, '2026-08-18', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 'SUBM-003', 'Material submittal 3', NULL, 'material', 'submitted', 3, NULL, '2026-08-19', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 'SUBM-004', 'Material submittal 4', NULL, 'material', 'approved', 3, NULL, '2026-08-20', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 'SUBM-005', 'Material submittal 5', NULL, 'material', 'submitted', 3, NULL, '2026-08-21', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 'SUBM-006', 'Material submittal 6', NULL, 'material', 'approved', 3, NULL, '2026-08-22', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 'SUBM-007', 'Material submittal 7', NULL, 'material', 'submitted', 3, NULL, '2026-08-23', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 'SUBM-008', 'Material submittal 8', NULL, 'material', 'approved', 3, NULL, '2026-08-24', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 'SUBM-009', 'Material submittal 9', NULL, 'material', 'submitted', 3, NULL, '2026-08-25', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 'SUBM-010', 'Material submittal 10', NULL, 'material', 'approved', 3, NULL, '2026-08-26', NULL, NULL, NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `submittal_attachments`
--

CREATE TABLE `submittal_attachments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `submittal_id` bigint(20) UNSIGNED NOT NULL,
  `document_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('trialing','active','past_due','cancelled','expired') NOT NULL DEFAULT 'trialing',
  `billing_cycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
  `starts_at` date NOT NULL,
  `ends_at` date DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `tenant_id`, `plan_id`, `status`, `billing_cycle`, `starts_at`, `ends_at`, `cancelled_at`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 'active', 'monthly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(2, 2, 1, 'active', 'yearly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(3, 3, 2, 'active', 'monthly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(4, 4, 3, 'active', 'yearly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(5, 5, 5, 'trialing', 'monthly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(6, 6, 6, 'trialing', 'yearly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(7, 7, 7, 'trialing', 'monthly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(8, 8, 8, 'past_due', 'yearly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(9, 9, 9, 'active', 'monthly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(10, 10, 10, 'active', 'yearly', '2026-06-11', '2027-08-11', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price_monthly` decimal(12,2) NOT NULL DEFAULT 0.00,
  `price_yearly` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `max_projects` int(10) UNSIGNED DEFAULT NULL,
  `max_users` int(10) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `code`, `name`, `description`, `price_monthly`, `price_yearly`, `currency`, `max_projects`, `max_users`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'starter', 'Starter', 'Starter plan for Keystone workspaces.', 99.00, 990.00, 'AED', 5, 10, 1, 1, '2026-08-11 05:10:20', '2026-08-11 05:42:23'),
(2, 'professional', 'Professional', 'Professional plan for Keystone workspaces.', 249.00, 2490.00, 'AED', 25, 50, 1, 2, '2026-08-11 05:10:20', '2026-08-11 05:42:23'),
(3, 'enterprise', 'Enterprise', 'Enterprise plan for Keystone workspaces.', 599.00, 5990.00, 'AED', 0, 0, 1, 3, '2026-08-11 05:10:20', '2026-08-11 05:42:23'),
(4, 'growth', 'Growth', NULL, 499.00, 4990.00, 'AED', 3, 5, 1, 0, '2026-08-11 04:04:30', '2026-08-11 04:04:30'),
(5, 'trial_plus', 'Trial Plus', 'Trial Plus plan for Keystone workspaces.', 0.00, 0.00, 'AED', 3, 5, 1, 4, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(6, 'field_crew', 'Field Crew', 'Field Crew plan for Keystone workspaces.', 149.00, 1490.00, 'AED', 10, 20, 1, 5, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(7, 'commercial_pro', 'Commercial Pro', 'Commercial Pro plan for Keystone workspaces.', 349.00, 3490.00, 'AED', 40, 80, 1, 6, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(8, 'mega_projects', 'Mega Projects', 'Mega Projects plan for Keystone workspaces.', 899.00, 8990.00, 'AED', 100, 200, 1, 7, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(9, 'consultant', 'Consultant', 'Consultant plan for Keystone workspaces.', 179.00, 1790.00, 'AED', 15, 15, 1, 8, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(10, 'subcontractor', 'Subcontractor Suite', 'Subcontractor Suite plan for Keystone workspaces.', 129.00, 1290.00, 'AED', 8, 12, 1, 9, '2026-08-11 05:42:23', '2026-08-11 05:42:23'),
(11, 'enterprise_plus', 'Enterprise Plus', 'Enterprise Plus plan for Keystone workspaces.', 999.00, 9990.00, 'AED', 0, 0, 1, 10, '2026-08-11 05:42:24', '2026-08-11 05:42:24');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_name` varchar(160) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `payment_terms` varchar(120) DEFAULT NULL,
  `status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `tenant_id`, `code`, `name`, `contact_name`, `email`, `phone`, `address`, `payment_terms`, `status`, `notes`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'SUP-01', 'Supplier 1', 'Sales 1', 'supplier01@example.test', '+971502000001', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 'SUP-02', 'Supplier 2', 'Sales 2', 'supplier02@example.test', '+971502000002', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 'SUP-03', 'Supplier 3', 'Sales 3', 'supplier03@example.test', '+971502000003', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 'SUP-04', 'Supplier 4', 'Sales 4', 'supplier04@example.test', '+971502000004', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 'SUP-05', 'Supplier 5', 'Sales 5', 'supplier05@example.test', '+971502000005', NULL, NULL, 'inactive', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 'SUP-06', 'Supplier 6', 'Sales 6', 'supplier06@example.test', '+971502000006', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 'SUP-07', 'Supplier 7', 'Sales 7', 'supplier07@example.test', '+971502000007', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 'SUP-08', 'Supplier 8', 'Sales 8', 'supplier08@example.test', '+971502000008', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 'SUP-09', 'Supplier 9', 'Sales 9', 'supplier09@example.test', '+971502000009', NULL, NULL, 'active', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 'SUP-10', 'Supplier 10', 'Sales 10', 'supplier10@example.test', '+971502000010', NULL, NULL, 'inactive', NULL, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_quotations`
--

CREATE TABLE `supplier_quotations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `rfq_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `quote_no` varchar(80) NOT NULL,
  `status` enum('draft','submitted','awarded','rejected') NOT NULL DEFAULT 'draft',
  `currency` char(3) NOT NULL DEFAULT 'AED',
  `valid_until` date DEFAULT NULL,
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `lead_time_days` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_quotation_items`
--

CREATE TABLE `supplier_quotation_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_quotation_id` bigint(20) UNSIGNED NOT NULL,
  `rfq_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `inventory_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `lead_time_days` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `wbs_id` bigint(20) UNSIGNED DEFAULT NULL,
  `milestone_id` bigint(20) UNSIGNED DEFAULT NULL,
  `parent_task_id` bigint(20) UNSIGNED DEFAULT NULL,
  `task_code` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('not_started','in_progress','completed','on_hold','cancelled') NOT NULL DEFAULT 'not_started',
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `planned_start_date` date DEFAULT NULL,
  `planned_end_date` date DEFAULT NULL,
  `baseline_start_date` date DEFAULT NULL,
  `baseline_end_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `duration_days` decimal(8,2) DEFAULT NULL,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `tenant_id`, `project_id`, `wbs_id`, `milestone_id`, `parent_task_id`, `task_code`, `name`, `description`, `status`, `priority`, `planned_start_date`, `planned_end_date`, `baseline_start_date`, `baseline_end_date`, `actual_start_date`, `actual_end_date`, `duration_days`, `progress_percent`, `assigned_to`, `sort_order`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 1, NULL, NULL, 'T-001', 'Activity 1', NULL, 'completed', 'medium', '2026-08-14', '2026-08-24', NULL, NULL, NULL, NULL, NULL, 100.00, 3, 1, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 2, NULL, NULL, 'T-002', 'Activity 2', NULL, 'completed', 'high', '2026-08-17', '2026-08-27', NULL, NULL, NULL, NULL, NULL, 100.00, 3, 2, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 3, NULL, NULL, 'T-003', 'Activity 3', NULL, 'completed', 'critical', '2026-08-20', '2026-08-30', NULL, NULL, NULL, NULL, NULL, 100.00, 3, 3, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, 4, NULL, NULL, 'T-004', 'Activity 4', NULL, 'in_progress', 'low', '2026-08-23', '2026-09-02', NULL, NULL, NULL, NULL, NULL, 40.00, 3, 4, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 5, NULL, NULL, 'T-005', 'Activity 5', NULL, 'in_progress', 'medium', '2026-08-26', '2026-09-05', NULL, NULL, NULL, NULL, NULL, 40.00, 3, 5, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 6, NULL, NULL, 'T-006', 'Activity 6', NULL, 'in_progress', 'high', '2026-08-29', '2026-09-08', NULL, NULL, NULL, NULL, NULL, 40.00, 3, 6, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, 7, NULL, NULL, 'T-007', 'Activity 7', NULL, 'in_progress', 'critical', '2026-09-01', '2026-09-11', NULL, NULL, NULL, NULL, NULL, 40.00, 3, 7, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 8, NULL, NULL, 'T-008', 'Activity 8', NULL, 'not_started', 'low', '2026-09-04', '2026-09-14', NULL, NULL, NULL, NULL, NULL, 0.00, 3, 8, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 9, NULL, NULL, 'T-009', 'Activity 9', NULL, 'not_started', 'medium', '2026-09-07', '2026-09-17', NULL, NULL, NULL, NULL, NULL, 0.00, 3, 9, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, 10, NULL, NULL, 'T-010', 'Activity 10', NULL, 'not_started', 'high', '2026-09-10', '2026-09-20', NULL, NULL, NULL, NULL, NULL, 0.00, 3, 10, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(11, 1, 1, 1, NULL, NULL, 'T-011', 'Activity 11', NULL, 'not_started', 'critical', '2026-09-13', '2026-09-23', NULL, NULL, NULL, NULL, NULL, 0.00, 3, 11, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(12, 1, 1, 2, NULL, NULL, 'T-012', 'Activity 12', NULL, 'not_started', 'low', '2026-09-16', '2026-09-26', NULL, NULL, NULL, NULL, NULL, 0.00, 3, 12, 2, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `task_dependencies`
--

CREATE TABLE `task_dependencies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `predecessor_task_id` bigint(20) UNSIGNED NOT NULL,
  `successor_task_id` bigint(20) UNSIGNED NOT NULL,
  `dependency_type` enum('FS','SS','FF','SF') NOT NULL DEFAULT 'FS',
  `lag_days` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `default_currency` char(3) NOT NULL DEFAULT 'AED',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Dubai',
  `locale` varchar(10) NOT NULL DEFAULT 'en',
  `brand_name` varchar(120) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT NULL,
  `accent_color` varchar(20) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `status` enum('trial','active','suspended','cancelled') NOT NULL DEFAULT 'trial',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `uuid`, `name`, `slug`, `legal_name`, `country_code`, `default_currency`, `timezone`, `locale`, `brand_name`, `primary_color`, `accent_color`, `logo_url`, `status`, `trial_ends_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '0f1861f6-5701-44c2-a0d4-acf09c9cfcce', 'Desert Build LLC', 'desert-build', 'Desert Build LLC', 'AE', 'AED', 'Asia/Dubai', 'en', 'Desert', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(2, '5f8a67c7-5421-4d3e-a6b0-c157c91da75d', 'Atlas Construct Co', 'atlas-construct', 'Atlas Construct Co', 'AE', 'AED', 'Asia/Dubai', 'en', 'Atlas', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(3, '62622860-dfd2-4851-9880-098b187f305d', 'Summit Structures LLC', 'summit-structures', 'Summit Structures LLC', 'AE', 'AED', 'Asia/Dubai', 'en', 'Summit', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(4, '7d5aa5a7-89d1-40bd-affa-c499e2dda495', 'Gulf Works Contracting', 'gulf-works', 'Gulf Works Contracting', 'AE', 'AED', 'Asia/Dubai', 'en', 'Gulf', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(5, 'c2f247df-7593-4fec-b8cd-3a6c438d62f0', 'Oasis Infrastructure', 'oasis-infra', 'Oasis Infrastructure', 'AE', 'AED', 'Asia/Dubai', 'en', 'Oasis', '#1F4E79', '#C47A11', NULL, 'trial', '2026-08-21 05:43:00', '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(6, '354d7b77-52f3-4140-90f5-4fd823070c6f', 'Falcon Civil Group', 'falcon-civil', 'Falcon Civil Group', 'AE', 'AED', 'Asia/Dubai', 'en', 'Falcon', '#1F4E79', '#C47A11', NULL, 'trial', '2026-08-20 05:43:00', '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(7, '3b46d12f-5249-4068-877c-be6e13626378', 'Horizon MEP Services', 'horizon-mep', 'Horizon MEP Services', 'AE', 'AED', 'Asia/Dubai', 'en', 'Horizon', '#1F4E79', '#C47A11', NULL, 'trial', '2026-08-19 05:43:00', '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(8, 'd1cd714c-a055-4219-b702-a9e23c2a88d0', 'Pearl Developments', 'pearl-dev', 'Pearl Developments', 'AE', 'AED', 'Asia/Dubai', 'en', 'Pearl', '#1F4E79', '#C47A11', NULL, 'suspended', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(9, 'bf1029b0-5125-46e1-a812-a5a482abad63', 'Cedar Engineering', 'cedar-eng', 'Cedar Engineering', 'AE', 'AED', 'Asia/Dubai', 'en', 'Cedar', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL),
(10, '032bfe3e-eae1-4bec-806c-27f193b97ac2', 'Marina Fitout Partners', 'marina-fitout', 'Marina Fitout Partners', 'AE', 'AED', 'Asia/Dubai', 'en', 'Marina', '#1F4E79', '#C47A11', NULL, 'active', NULL, '2026-08-11 05:43:00', '2026-08-11 05:43:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tenant_features`
--

CREATE TABLE `tenant_features` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `feature_key` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `limits_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`limits_json`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenant_features`
--

INSERT INTO `tenant_features` (`id`, `tenant_id`, `feature_key`, `is_enabled`, `limits_json`, `created_at`, `updated_at`) VALUES
(1, 1, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(2, 1, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(3, 1, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(4, 1, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(5, 1, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(6, 2, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(7, 2, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(8, 2, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(9, 2, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(10, 2, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(11, 3, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(12, 3, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(13, 3, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(14, 3, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(15, 3, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(16, 4, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(17, 4, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(18, 4, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(19, 4, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(20, 4, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(21, 5, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(22, 5, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(23, 5, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(24, 5, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(25, 5, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(26, 6, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(27, 6, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(28, 6, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(29, 6, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(30, 6, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(31, 7, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(32, 7, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(33, 7, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(34, 7, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(35, 7, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(36, 8, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(37, 8, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(38, 8, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(39, 8, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(40, 8, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(41, 9, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(42, 9, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(43, 9, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(44, 9, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(45, 9, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(46, 10, 'projects', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(47, 10, 'users', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(48, 10, 'boq', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(49, 10, 'documents', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00'),
(50, 10, 'procurement', 1, '{\"max\":100}', '2026-08-11 05:43:00', '2026-08-11 05:43:00');

-- --------------------------------------------------------

--
-- Table structure for table `tenant_users`
--

CREATE TABLE `tenant_users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('invited','active','suspended','left') NOT NULL DEFAULT 'invited',
  `is_owner` tinyint(1) NOT NULL DEFAULT 0,
  `job_title` varchar(120) DEFAULT NULL,
  `invited_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenant_users`
--

INSERT INTO `tenant_users` (`id`, `tenant_id`, `user_id`, `status`, `is_owner`, `job_title`, `invited_at`, `joined_at`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'active', 1, 'Managing Director', NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(2, 1, 3, 'active', 0, 'Project Manager', NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(3, 1, 4, 'active', 0, 'Viewer', NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(4, 1, 5, 'active', 0, 'Site Supervisor', NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(5, 1, 6, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(6, 1, 7, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04', '2026-08-11 05:43:04'),
(7, 1, 8, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04', '2026-08-11 05:43:04'),
(8, 1, 9, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:05', '2026-08-11 05:43:05', '2026-08-11 05:43:05'),
(9, 1, 10, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(10, 1, 11, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(11, 1, 12, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(12, 1, 13, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07', '2026-08-11 05:43:07'),
(13, 1, 14, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07', '2026-08-11 05:43:07'),
(14, 1, 15, 'active', 0, 'Staff', NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08', '2026-08-11 05:43:08'),
(15, 2, 16, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08', '2026-08-11 05:43:08'),
(16, 3, 17, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09', '2026-08-11 05:43:09'),
(17, 4, 18, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09', '2026-08-11 05:43:09'),
(18, 5, 19, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10', '2026-08-11 05:43:10'),
(19, 6, 20, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10', '2026-08-11 05:43:10'),
(20, 7, 21, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11', '2026-08-11 05:43:11'),
(21, 8, 22, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11', '2026-08-11 05:43:11'),
(22, 9, 23, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', '2026-08-11 05:43:12'),
(23, 10, 24, 'active', 1, 'Owner', NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', '2026-08-11 05:43:12');

-- --------------------------------------------------------

--
-- Table structure for table `tenant_user_roles`
--

CREATE TABLE `tenant_user_roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `tenant_user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL = tenant-wide role',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tenant_user_roles`
--

INSERT INTO `tenant_user_roles` (`id`, `tenant_id`, `tenant_user_id`, `role_id`, `project_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(2, 1, 2, 2, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(3, 1, 3, 3, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(4, 1, 4, 12, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(5, 1, 5, 3, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03'),
(6, 1, 6, 3, NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04'),
(7, 1, 7, 2, NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04'),
(8, 1, 8, 3, NULL, '2026-08-11 05:43:05', '2026-08-11 05:43:05'),
(9, 1, 9, 3, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(10, 1, 10, 2, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(11, 1, 11, 3, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06'),
(12, 1, 12, 3, NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07'),
(13, 1, 13, 2, NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07'),
(14, 1, 14, 3, NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08'),
(15, 2, 15, 1, NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08'),
(16, 3, 16, 1, NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09'),
(17, 4, 17, 1, NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09'),
(18, 5, 18, 1, NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10'),
(19, 6, 19, 1, NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10'),
(20, 7, 20, 1, NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11'),
(21, 8, 21, 1, NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11'),
(22, 9, 22, 1, NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12'),
(23, 10, 23, 1, NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_path` varchar(500) DEFAULT NULL,
  `preferred_locale` varchar(10) DEFAULT NULL,
  `is_super_admin` tinyint(1) NOT NULL DEFAULT 0,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `uuid`, `name`, `email`, `email_verified_at`, `password`, `phone`, `avatar_path`, `preferred_locale`, `is_super_admin`, `last_login_at`, `remember_token`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '61eb7053-786c-45fd-80c3-eba3678612ff', 'SaaS Admin', 'saas.admin@cpm.test', '2026-08-11 05:43:00', '$2y$12$m2tOoV3axTXOdt1IMtS45.Lqo1FX/YJlffQmZJtUETCvNOcqtxSrO', NULL, NULL, 'en', 1, '2026-08-11 05:44:28', NULL, '2026-08-11 05:43:00', '2026-08-11 05:44:28', NULL),
(2, '32166a00-5f2c-4379-a5e4-bdd25195120d', 'Desert Owner', 'owner@desertbuild.test', '2026-08-11 05:43:00', '$2y$12$tEI28i.BMHUZEvi0hsnCUOIpIc/8mZL3ykpXE4vqxWNDyc702VeTu', NULL, NULL, 'en', 0, '2026-08-11 05:44:30', NULL, '2026-08-11 05:43:01', '2026-08-11 05:44:30', NULL),
(3, '17120f5c-1d50-4d9b-a619-08ca3f1c1ab8', 'Desert Project Manager', 'pm@desertbuild.test', '2026-08-11 05:43:01', '$2y$12$jnZcZuNKlNJpwtaYuQ8S6uT.iCVGWW955aShVr1DY2actnJnoidN.', NULL, NULL, 'en', 0, '2026-08-11 05:44:31', NULL, '2026-08-11 05:43:01', '2026-08-11 05:44:31', NULL),
(4, '59cc3b75-f4ad-4db9-8949-8a201c5edbd0', 'Desert Viewer', 'viewer@desertbuild.test', '2026-08-11 05:43:01', '$2y$12$c5ShQDBlqfnO8n3VT/7VTeK7zykhFxTgRCHt27FAvtHYCDranl9za', NULL, NULL, 'en', 0, '2026-08-11 05:44:33', NULL, '2026-08-11 05:43:02', '2026-08-11 05:44:33', NULL),
(5, 'f5d88ca1-fba4-4a5c-8634-2de812cda846', 'Desert Site Supervisor', 'supervisor@desertbuild.test', '2026-08-11 05:43:02', '$2y$12$8j4d.d1jnQwnT5YhiILA5.Q.JHphv9LiJzQN/Z/Sy/m5z38YNDHKS', NULL, NULL, 'en', 0, '2026-08-11 05:44:34', NULL, '2026-08-11 05:43:03', '2026-08-11 05:44:34', NULL),
(6, 'c34fff3f-ec97-4d95-acb9-b7e813b55fd5', 'Team Member 1', 'member01@desertbuild.test', '2026-08-11 05:43:03', '$2y$12$G3Yu7JVXYpyQWFR.0.q/8.3hO3dgaua2xD6yfVCD06izMlxG6zhkm', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:03', '2026-08-11 05:43:03', NULL),
(7, 'efcb5186-99f1-4cee-afe4-7d10ec3439cd', 'Team Member 2', 'member02@desertbuild.test', '2026-08-11 05:43:03', '$2y$12$2vW37CuJ1cTnQyMGWSumN.litSicQrpIOgsHeh..OS0BrGHHdLOi6', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04', NULL),
(8, 'f8cf7a59-293f-435d-a294-827d48a4a930', 'Team Member 3', 'member03@desertbuild.test', '2026-08-11 05:43:04', '$2y$12$MNddPI6uLPXKjKMBc31mQ.EWqgwHQc8LM4m0Z3bhn5NvgD9ZW519O', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:04', '2026-08-11 05:43:04', NULL),
(9, 'ce28d874-d14b-4c5e-afbd-416e2948b632', 'Team Member 4', 'member04@desertbuild.test', '2026-08-11 05:43:04', '$2y$12$1ya25KhEv6nMpJ5CNSCnvu8/LnMXIZUNYQRuyg1q.Ca06n0lMgk7W', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:05', '2026-08-11 05:43:05', NULL),
(10, 'a0034078-59bd-4aca-b825-5cd881eba6f0', 'Team Member 5', 'member05@desertbuild.test', '2026-08-11 05:43:05', '$2y$12$JpS4qpAavMzShhqD5nhGRu2hXbjjtm9x2u8MDacPNx4oMxQyfE0Su', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', NULL),
(11, '9fc5d38a-6d9f-4c21-9096-e9c8756a5c46', 'Team Member 6', 'member06@desertbuild.test', '2026-08-11 05:43:06', '$2y$12$71cnDYs6EdKjOktkeOitFuVgNNVB67QBPmqjCvyeBPCU/eYsLSCIO', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', NULL),
(12, '4e798255-5f21-43b4-9fd5-4688db059de1', 'Team Member 7', 'member07@desertbuild.test', '2026-08-11 05:43:06', '$2y$12$wPfkkQ7lliJ4ZyRQbOH5VeJuUGq.2G8dz41W6fFe8dzQ3zq8aHnb6', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:06', '2026-08-11 05:43:06', NULL),
(13, '04eba43e-152d-4754-8093-9c22595498d6', 'Team Member 8', 'member08@desertbuild.test', '2026-08-11 05:43:06', '$2y$12$W2c/WPoCJ.9FEMnqMilUxO5MnljDemB3HA6WMyxUOcmKH/9U7Wo5q', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07', NULL),
(14, '63eaaf41-2426-42e6-a193-97cc355c6754', 'Team Member 9', 'member09@desertbuild.test', '2026-08-11 05:43:07', '$2y$12$czrl743hdh1lq2d3zvPKrOd7BS1Ku5sumaZw5T/GaFGWJ1u8f81LS', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:07', '2026-08-11 05:43:07', NULL),
(15, '1e2a35c2-1ebb-4e70-a0db-7f47d74e0675', 'Team Member 10', 'member10@desertbuild.test', '2026-08-11 05:43:07', '$2y$12$iEhEfgGJ.INggYoVBD69A.zJZ68/Fp2Bcz1H6kuhJCVBTssi3/V7W', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08', NULL),
(16, '1bfadd83-eddf-428b-8e28-a2b1310ed28a', 'Atlas Construct Co Owner', 'owner@atlas-construct.test', '2026-08-11 05:43:08', '$2y$12$wXMV5bJxijMrgkcLuLDdyO0Me3bK0VpTxNf5/.6Mrdu3k0poT.wOq', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:08', '2026-08-11 05:43:08', NULL),
(17, '35967b53-c9d5-4ad4-98d8-67718b2df2f2', 'Summit Structures LLC Owner', 'owner@summit-structures.test', '2026-08-11 05:43:08', '$2y$12$Lk5P7ZFfnUHqK5RVtG/WUeAbw7.equdARDgdp9D3/cro/iWGzdg.S', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09', NULL),
(18, '15d8adeb-fbb2-4c03-85dd-379de2ef4f42', 'Gulf Works Contracting Owner', 'owner@gulf-works.test', '2026-08-11 05:43:09', '$2y$12$/YNaRmRsf2QmJ.XXpQOKOeUf7Hk.taICP3MH0GGet96VJZ6Vu/f1G', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:09', '2026-08-11 05:43:09', NULL),
(19, '9714782b-0604-4734-9aaa-6a29fce641a8', 'Oasis Infrastructure Owner', 'owner@oasis-infra.test', '2026-08-11 05:43:09', '$2y$12$1.rdmhwNZUrjjXHEpc9yYO6h.MzKGSgl9ZAxukWnVfl634IDjl3za', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10', NULL),
(20, '1374b411-3dee-4039-8397-042c76b56389', 'Falcon Civil Group Owner', 'owner@falcon-civil.test', '2026-08-11 05:43:10', '$2y$12$NdtNqjAL/92VR.ISq94TeekkHKw8bIDW7lNu59BuA7WUSmqc33wEe', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:10', '2026-08-11 05:43:10', NULL),
(21, 'f7c88227-2247-4f02-803d-821d57cc4ae1', 'Horizon MEP Services Owner', 'owner@horizon-mep.test', '2026-08-11 05:43:10', '$2y$12$hrQdKqCIGgMhhWq56GQ2y.QKllpkH1B93R2XZflVR1eOMhzI1f0rW', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11', NULL),
(22, 'e0a2eb7b-7560-41f2-9eab-9652b1cafe0f', 'Pearl Developments Owner', 'owner@pearl-dev.test', '2026-08-11 05:43:11', '$2y$12$dd1GxsbwDYYjB63eyQp3q.JKsTJ2UeJh/A4rL2eMvkzPNlKRSGzZq', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:11', '2026-08-11 05:43:11', NULL),
(23, '9d4accc8-2619-4405-868b-0028b2e5b769', 'Cedar Engineering Owner', 'owner@cedar-eng.test', '2026-08-11 05:43:11', '$2y$12$F95npShL0putdOlrFob7xOmMvw9bpE/r6SoRNyR89GTE65tImmbV2', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL),
(24, '97086ff0-aaef-4b06-8f57-41587b46f8a6', 'Marina Fitout Partners Owner', 'owner@marina-fitout.test', '2026-08-11 05:43:12', '$2y$12$FjUOhVJGNhxtVwHty.zqg.F9/D3YcOJ84bpIZLQsYyGRsi0DK4UZW', NULL, NULL, 'en', 0, NULL, NULL, '2026-08-11 05:43:12', '2026-08-11 05:43:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `variations`
--

CREATE TABLE `variations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `contract_id` bigint(20) UNSIGNED DEFAULT NULL,
  `variation_no` varchar(80) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('draft','submitted','under_review','cost_assessment','client_review','approved','rejected','implemented') NOT NULL DEFAULT 'draft',
  `cost_impact` decimal(18,2) NOT NULL DEFAULT 0.00,
  `time_impact_days` int(11) NOT NULL DEFAULT 0,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `decided_at` timestamp NULL DEFAULT NULL,
  `decided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `variations`
--

INSERT INTO `variations` (`id`, `tenant_id`, `project_id`, `contract_id`, `variation_no`, `title`, `description`, `reason`, `status`, `cost_impact`, `time_impact_days`, `submitted_at`, `decided_at`, `decided_by`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, 'VO-001', 'Variation Order 1', NULL, NULL, 'draft', 10000.00, 1, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, NULL, 'VO-002', 'Variation Order 2', NULL, NULL, 'approved', 20000.00, 2, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, NULL, 'VO-003', 'Variation Order 3', NULL, NULL, 'draft', 30000.00, 3, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, NULL, 'VO-004', 'Variation Order 4', NULL, NULL, 'approved', 40000.00, 4, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, NULL, 'VO-005', 'Variation Order 5', NULL, NULL, 'draft', 50000.00, 5, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, NULL, 'VO-006', 'Variation Order 6', NULL, NULL, 'approved', 60000.00, 6, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, NULL, 'VO-007', 'Variation Order 7', NULL, NULL, 'draft', 70000.00, 7, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, NULL, 'VO-008', 'Variation Order 8', NULL, NULL, 'approved', 80000.00, 8, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, NULL, 'VO-009', 'Variation Order 9', NULL, NULL, 'draft', 90000.00, 9, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, NULL, 'VO-010', 'Variation Order 10', NULL, NULL, 'approved', 100000.00, 10, NULL, NULL, NULL, 3, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `variation_items`
--

CREATE TABLE `variation_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `variation_id` bigint(20) UNSIGNED NOT NULL,
  `boq_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `cost_code_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` text NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `rate` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `tenant_id`, `project_id`, `code`, `name`, `location`, `is_default`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, NULL, 'WH-01', 'Warehouse 1', 'Yard 1, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, NULL, 'WH-02', 'Warehouse 2', 'Yard 2, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, NULL, 'WH-03', 'Warehouse 3', 'Yard 3, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, NULL, 'WH-04', 'Warehouse 4', 'Yard 4, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, NULL, 'WH-05', 'Warehouse 5', 'Yard 5, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, NULL, 'WH-06', 'Warehouse 6', 'Yard 6, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, NULL, 'WH-07', 'Warehouse 7', 'Yard 7, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, NULL, 'WH-08', 'Warehouse 8', 'Yard 8, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, NULL, 'WH-09', 'Warehouse 9', 'Yard 9, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, NULL, 'WH-10', 'Warehouse 10', 'Yard 10, Dubai', 0, 'active', '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `wbs`
--

CREATE TABLE `wbs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `level` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wbs`
--

INSERT INTO `wbs` (`id`, `tenant_id`, `project_id`, `parent_id`, `code`, `name`, `description`, `level`, `sort_order`, `progress_percent`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, NULL, '01', 'Package 1', NULL, 1, 1, 5.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(2, 1, 1, 1, '02', 'Package 2', NULL, 2, 2, 10.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(3, 1, 1, 1, '03', 'Package 3', NULL, 2, 3, 15.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(4, 1, 1, NULL, '04', 'Package 4', NULL, 1, 4, 20.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(5, 1, 1, 1, '05', 'Package 5', NULL, 2, 5, 25.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(6, 1, 1, 1, '06', 'Package 6', NULL, 2, 6, 30.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(7, 1, 1, NULL, '07', 'Package 7', NULL, 1, 7, 35.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(8, 1, 1, 1, '08', 'Package 8', NULL, 2, 8, 40.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(9, 1, 1, 1, '09', 'Package 9', NULL, 2, 9, 45.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL),
(10, 1, 1, NULL, '10', 'Package 10', NULL, 1, 10, 50.00, '2026-08-11 05:43:13', '2026-08-11 05:43:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `workflow_definitions`
--

CREATE TABLE `workflow_definitions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL = system default',
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `entity_type` varchar(80) NOT NULL COMMENT 'rfi|submittal|variation|payment_application|document',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config_json`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workflow_instances`
--

CREATE TABLE `workflow_instances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `workflow_definition_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `current_state` varchar(80) NOT NULL,
  `started_by` bigint(20) UNSIGNED DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workflow_transitions`
--

CREATE TABLE `workflow_transitions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `workflow_instance_id` bigint(20) UNSIGNED NOT NULL,
  `from_state` varchar(80) NOT NULL,
  `to_state` varchar(80) NOT NULL,
  `action` varchar(80) NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `access_policies`
--
ALTER TABLE `access_policies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `access_policies_tenant_id_code_unique` (`tenant_id`,`code`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_project` (`project_id`,`created_at`),
  ADD KEY `fk_activity_tenant` (`tenant_id`),
  ADD KEY `fk_activity_user` (`user_id`);

--
-- Indexes for table `approvals`
--
ALTER TABLE `approvals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_approvals_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_approvals_pending` (`tenant_id`,`status`,`requested_from`),
  ADD KEY `fk_approvals_project` (`project_id`),
  ADD KEY `fk_approvals_wi` (`workflow_instance_id`),
  ADD KEY `fk_approvals_requested_from` (`requested_from`),
  ADD KEY `fk_approvals_acted_by` (`acted_by`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_tenant_created` (`tenant_id`,`created_at`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_user` (`user_id`);

--
-- Indexes for table `boqs`
--
ALTER TABLE `boqs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_boqs_project` (`project_id`),
  ADD KEY `fk_boqs_tenant` (`tenant_id`),
  ADD KEY `fk_boqs_approved_by` (`approved_by`),
  ADD KEY `fk_boqs_created_by` (`created_by`);

--
-- Indexes for table `boq_items`
--
ALTER TABLE `boq_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_boq_item_no` (`boq_id`,`item_no`),
  ADD KEY `idx_boq_items_wbs` (`wbs_id`),
  ADD KEY `idx_boq_items_cost_code` (`cost_code_id`),
  ADD KEY `fk_boq_items_tenant` (`tenant_id`),
  ADD KEY `fk_boq_items_parent` (`parent_id`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_branches_tenant` (`tenant_id`),
  ADD KEY `idx_branches_company` (`company_id`);

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_clients_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_clients_tenant` (`tenant_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_companies_tenant` (`tenant_id`);

--
-- Indexes for table `consultants`
--
ALTER TABLE `consultants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_consultants_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_consultants_tenant` (`tenant_id`);

--
-- Indexes for table `contracts`
--
ALTER TABLE `contracts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_contracts_tenant_no` (`tenant_id`,`contract_no`),
  ADD KEY `idx_contracts_project` (`project_id`),
  ADD KEY `fk_contracts_client` (`client_id`),
  ADD KEY `fk_contracts_created_by` (`created_by`);

--
-- Indexes for table `contract_items`
--
ALTER TABLE `contract_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contract_items_contract` (`contract_id`),
  ADD KEY `fk_ci_tenant` (`tenant_id`),
  ADD KEY `fk_ci_boq_item` (`boq_item_id`);

--
-- Indexes for table `cost_codes`
--
ALTER TABLE `cost_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cost_codes` (`tenant_id`,`project_id`,`code`),
  ADD KEY `fk_cost_codes_project` (`project_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_departments_tenant` (`tenant_id`),
  ADD KEY `fk_departments_company` (`company_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_documents_tenant_project` (`tenant_id`,`project_id`),
  ADD KEY `idx_documents_type` (`document_type`),
  ADD KEY `fk_documents_project` (`project_id`),
  ADD KEY `fk_documents_uploaded_by` (`uploaded_by`),
  ADD KEY `fk_documents_approved_by` (`approved_by`);

--
-- Indexes for table `document_versions`
--
ALTER TABLE `document_versions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_doc_version` (`document_id`,`version_no`),
  ADD KEY `fk_dv_tenant` (`tenant_id`),
  ADD KEY `fk_dv_uploaded_by` (`uploaded_by`);

--
-- Indexes for table `drawings`
--
ALTER TABLE `drawings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_drawings_project_no` (`project_id`,`drawing_no`),
  ADD KEY `fk_drawings_tenant` (`tenant_id`),
  ADD KEY `fk_drawings_document` (`document_id`);

--
-- Indexes for table `drawing_revisions`
--
ALTER TABLE `drawing_revisions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_drawing_rev` (`drawing_id`,`revision`),
  ADD KEY `idx_drawing_rev_current` (`drawing_id`,`is_current`),
  ADD KEY `fk_dr_tenant` (`tenant_id`),
  ADD KEY `fk_dr_doc_version` (`document_version_id`),
  ADD KEY `fk_dr_created_by` (`created_by`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_employees_tenant_code` (`tenant_id`,`employee_code`),
  ADD KEY `idx_employees_tenant` (`tenant_id`),
  ADD KEY `idx_employees_user` (`user_id`),
  ADD KEY `fk_employees_company` (`company_id`),
  ADD KEY `fk_employees_branch` (`branch_id`),
  ADD KEY `fk_employees_department` (`department_id`);

--
-- Indexes for table `equipment`
--
ALTER TABLE `equipment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_equipment_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_equipment_status` (`tenant_id`,`status`);

--
-- Indexes for table `equipment_assignments`
--
ALTER TABLE `equipment_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_eq_assign_project_no` (`project_id`,`assignment_no`),
  ADD KEY `idx_eq_assign_equipment` (`equipment_id`,`status`),
  ADD KEY `fk_eqa_tenant` (`tenant_id`),
  ADD KEY `fk_eqa_created_by` (`created_by`);

--
-- Indexes for table `equipment_usage_logs`
--
ALTER TABLE `equipment_usage_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_eq_usage_project` (`project_id`,`usage_date`),
  ADD KEY `fk_equ_tenant` (`tenant_id`),
  ADD KEY `fk_equ_equipment` (`equipment_id`),
  ADD KEY `fk_equ_assignment` (`equipment_assignment_id`),
  ADD KEY `fk_equ_recorded_by` (`recorded_by`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_grn_project_no` (`project_id`,`grn_no`),
  ADD KEY `idx_grn_po` (`purchase_order_id`),
  ADD KEY `fk_grn_tenant` (`tenant_id`),
  ADD KEY `fk_grn_warehouse` (`warehouse_id`),
  ADD KEY `fk_grn_received_by` (`received_by`);

--
-- Indexes for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gri_grn` (`goods_receipt_id`),
  ADD KEY `fk_gri_tenant` (`tenant_id`),
  ADD KEY `fk_gri_poi` (`purchase_order_item_id`),
  ADD KEY `fk_gri_item` (`inventory_item_id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_items_sku` (`tenant_id`,`sku`),
  ADD KEY `idx_inventory_items_tenant` (`tenant_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_invoices_tenant_no` (`tenant_id`,`invoice_no`),
  ADD KEY `idx_invoices_project` (`project_id`),
  ADD KEY `fk_invoices_client` (`client_id`),
  ADD KEY `fk_invoices_cert` (`payment_certificate_id`),
  ADD KEY `fk_invoices_created_by` (`created_by`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `material_issues`
--
ALTER TABLE `material_issues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mi_project_no` (`project_id`,`issue_no`),
  ADD KEY `idx_mi_project` (`project_id`),
  ADD KEY `fk_mi_tenant` (`tenant_id`),
  ADD KEY `fk_mi_warehouse` (`warehouse_id`),
  ADD KEY `fk_mi_issued_by` (`issued_by`);

--
-- Indexes for table `material_issue_items`
--
ALTER TABLE `material_issue_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mii_mi` (`material_issue_id`),
  ADD KEY `fk_mii_tenant` (`tenant_id`),
  ADD KEY `fk_mii_item` (`inventory_item_id`);

--
-- Indexes for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mr_project_no` (`project_id`,`request_no`),
  ADD KEY `idx_mr_status` (`tenant_id`,`status`),
  ADD KEY `fk_mr_requested_by` (`requested_by`),
  ADD KEY `fk_mr_approved_by` (`approved_by`);

--
-- Indexes for table `material_request_items`
--
ALTER TABLE `material_request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mri_mr` (`material_request_id`),
  ADD KEY `fk_mri_tenant` (`tenant_id`),
  ADD KEY `fk_mri_item` (`inventory_item_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `milestones`
--
ALTER TABLE `milestones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_milestones_project` (`project_id`),
  ADD KEY `fk_milestones_tenant` (`tenant_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`read_at`),
  ADD KEY `idx_notifications_tenant` (`tenant_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_invoice` (`invoice_id`),
  ADD KEY `fk_payments_tenant` (`tenant_id`),
  ADD KEY `fk_payments_project` (`project_id`),
  ADD KEY `fk_payments_recorded_by` (`recorded_by`);

--
-- Indexes for table `payment_applications`
--
ALTER TABLE `payment_applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pay_app_project_no` (`project_id`,`application_no`),
  ADD KEY `idx_pay_app_status` (`tenant_id`,`status`),
  ADD KEY `fk_pa_contract` (`contract_id`),
  ADD KEY `fk_pa_created_by` (`created_by`);

--
-- Indexes for table `payment_application_items`
--
ALTER TABLE `payment_application_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pai_app` (`payment_application_id`),
  ADD KEY `fk_pai_tenant` (`tenant_id`),
  ADD KEY `fk_pai_boq_item` (`boq_item_id`);

--
-- Indexes for table `payment_certificates`
--
ALTER TABLE `payment_certificates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pay_cert_no` (`project_id`,`certificate_no`),
  ADD KEY `idx_pay_cert_app` (`payment_application_id`),
  ADD KEY `fk_pc_tenant` (`tenant_id`),
  ADD KEY `fk_pc_certified_by` (`certified_by`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_permissions_code` (`code`),
  ADD KEY `idx_permissions_module` (`module`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pat_token` (`token`),
  ADD KEY `idx_pat_tokenable` (`tokenable_type`,`tokenable_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_projects_tenant_code` (`tenant_id`,`project_code`),
  ADD KEY `idx_projects_tenant_status` (`tenant_id`,`status`),
  ADD KEY `idx_projects_client` (`client_id`),
  ADD KEY `fk_projects_company` (`company_id`),
  ADD KEY `fk_projects_branch` (`branch_id`),
  ADD KEY `fk_projects_consultant` (`consultant_id`),
  ADD KEY `fk_projects_created_by` (`created_by`);

--
-- Indexes for table `project_members`
--
ALTER TABLE `project_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_project_member` (`project_id`,`user_id`),
  ADD KEY `idx_pm_tenant` (`tenant_id`),
  ADD KEY `fk_pm_user` (`user_id`),
  ADD KEY `fk_pm_role` (`role_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_po_project_no` (`project_id`,`po_no`),
  ADD KEY `idx_po_status` (`tenant_id`,`status`),
  ADD KEY `fk_po_pr` (`purchase_request_id`),
  ADD KEY `fk_po_supplier` (`supplier_id`),
  ADD KEY `fk_po_warehouse` (`warehouse_id`),
  ADD KEY `fk_po_created_by` (`created_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_poi_po` (`purchase_order_id`),
  ADD KEY `fk_poi_tenant` (`tenant_id`),
  ADD KEY `fk_poi_item` (`inventory_item_id`);

--
-- Indexes for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pr_project_no` (`project_id`,`request_no`),
  ADD KEY `idx_pr_status` (`tenant_id`,`status`),
  ADD KEY `fk_pr_mr` (`material_request_id`),
  ADD KEY `fk_pr_requested_by` (`requested_by`),
  ADD KEY `fk_pr_approved_by` (`approved_by`);

--
-- Indexes for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pri_pr` (`purchase_request_id`),
  ADD KEY `fk_pri_tenant` (`tenant_id`),
  ADD KEY `fk_pri_item` (`inventory_item_id`);

--
-- Indexes for table `rfis`
--
ALTER TABLE `rfis`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rfis_project_no` (`project_id`,`rfi_no`),
  ADD KEY `idx_rfis_status` (`tenant_id`,`status`),
  ADD KEY `fk_rfis_submitted_by` (`submitted_by`),
  ADD KEY `fk_rfis_assigned_to` (`assigned_to`);

--
-- Indexes for table `rfi_attachments`
--
ALTER TABLE `rfi_attachments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rfi_doc` (`rfi_id`,`document_id`),
  ADD KEY `fk_rfi_att_tenant` (`tenant_id`),
  ADD KEY `fk_rfi_att_doc` (`document_id`);

--
-- Indexes for table `rfi_responses`
--
ALTER TABLE `rfi_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rfi_responses_rfi` (`rfi_id`),
  ADD KEY `fk_rfi_resp_tenant` (`tenant_id`),
  ADD KEY `fk_rfi_resp_user` (`responded_by`);

--
-- Indexes for table `rfqs`
--
ALTER TABLE `rfqs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rfq_project_no` (`project_id`,`rfq_no`),
  ADD KEY `idx_rfq_status` (`tenant_id`,`status`),
  ADD KEY `fk_rfq_pr` (`purchase_request_id`),
  ADD KEY `fk_rfq_created_by` (`created_by`),
  ADD KEY `fk_rfq_awarded_quote` (`awarded_quotation_id`);

--
-- Indexes for table `rfq_items`
--
ALTER TABLE `rfq_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rfq_items_rfq` (`rfq_id`),
  ADD KEY `fk_rfqi_tenant` (`tenant_id`),
  ADD KEY `fk_rfqi_item` (`inventory_item_id`);

--
-- Indexes for table `rfq_suppliers`
--
ALTER TABLE `rfq_suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rfq_supplier` (`rfq_id`,`supplier_id`),
  ADD KEY `fk_rfqs_tenant` (`tenant_id`),
  ADD KEY `fk_rfqs_supplier` (`supplier_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_roles_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_roles_scope` (`scope`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_rp_permission` (`permission_id`);

--
-- Indexes for table `saas_invoices`
--
ALTER TABLE `saas_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `saas_invoices_invoice_number_unique` (`invoice_number`),
  ADD KEY `saas_invoices_tenant_id_index` (`tenant_id`),
  ADD KEY `saas_invoices_subscription_id_foreign` (`subscription_id`);

--
-- Indexes for table `site_diaries`
--
ALTER TABLE `site_diaries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_site_diary_day` (`project_id`,`report_date`),
  ADD KEY `idx_site_diaries_tenant` (`tenant_id`),
  ADD KEY `fk_sd_prepared_by` (`prepared_by`),
  ADD KEY `fk_sd_approved_by` (`approved_by`);

--
-- Indexes for table `site_diary_equipment`
--
ALTER TABLE `site_diary_equipment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sde_diary` (`site_diary_id`),
  ADD KEY `fk_sde_tenant` (`tenant_id`);

--
-- Indexes for table `site_diary_labours`
--
ALTER TABLE `site_diary_labours`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sdl_diary` (`site_diary_id`),
  ADD KEY `fk_sdl_tenant` (`tenant_id`);

--
-- Indexes for table `site_diary_materials`
--
ALTER TABLE `site_diary_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sdm_diary` (`site_diary_id`),
  ADD KEY `fk_sdm_tenant` (`tenant_id`);

--
-- Indexes for table `site_issues`
--
ALTER TABLE `site_issues`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site_issues_project` (`project_id`,`status`),
  ADD KEY `fk_si_tenant` (`tenant_id`),
  ADD KEY `fk_si_diary` (`site_diary_id`),
  ADD KEY `fk_si_reported_by` (`reported_by`),
  ADD KEY `fk_si_assigned_to` (`assigned_to`);

--
-- Indexes for table `site_photos`
--
ALTER TABLE `site_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site_photos_project` (`project_id`),
  ADD KEY `fk_sp_tenant` (`tenant_id`),
  ADD KEY `fk_sp_diary` (`site_diary_id`),
  ADD KEY `fk_sp_document` (`document_id`),
  ADD KEY `fk_sp_created_by` (`created_by`);

--
-- Indexes for table `stock_balances`
--
ALTER TABLE `stock_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_stock_balance` (`warehouse_id`,`inventory_item_id`,`project_id`),
  ADD KEY `idx_stock_item` (`inventory_item_id`),
  ADD KEY `fk_stock_tenant` (`tenant_id`),
  ADD KEY `fk_stock_project` (`project_id`);

--
-- Indexes for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_txn_wh` (`warehouse_id`,`created_at`),
  ADD KEY `idx_stock_txn_ref` (`reference_type`,`reference_id`),
  ADD KEY `fk_stock_txn_tenant` (`tenant_id`),
  ADD KEY `fk_stock_txn_item` (`inventory_item_id`),
  ADD KEY `fk_stock_txn_project` (`project_id`),
  ADD KEY `fk_stock_txn_user` (`created_by`);

--
-- Indexes for table `subcontractors`
--
ALTER TABLE `subcontractors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_subcon_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_subcon_trade` (`tenant_id`,`trade`);

--
-- Indexes for table `subcontract_packages`
--
ALTER TABLE `subcontract_packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pkg_project_no` (`project_id`,`package_no`),
  ADD KEY `idx_pkg_status` (`tenant_id`,`status`),
  ADD KEY `fk_pkg_subcon` (`subcontractor_id`),
  ADD KEY `fk_pkg_created_by` (`created_by`);

--
-- Indexes for table `subcontract_package_items`
--
ALTER TABLE `subcontract_package_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pkg_items` (`subcontract_package_id`),
  ADD KEY `fk_pkgi_tenant` (`tenant_id`);

--
-- Indexes for table `submittals`
--
ALTER TABLE `submittals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_submittals_project_no` (`project_id`,`submittal_no`),
  ADD KEY `idx_submittals_status` (`tenant_id`,`status`),
  ADD KEY `fk_submittals_submitted_by` (`submitted_by`),
  ADD KEY `fk_submittals_reviewed_by` (`reviewed_by`);

--
-- Indexes for table `submittal_attachments`
--
ALTER TABLE `submittal_attachments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_submittal_doc` (`submittal_id`,`document_id`),
  ADD KEY `fk_sa_tenant` (`tenant_id`),
  ADD KEY `fk_sa_doc` (`document_id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscriptions_tenant` (`tenant_id`),
  ADD KEY `idx_subscriptions_plan` (`plan_id`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_plans_code` (`code`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_suppliers_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_suppliers_tenant` (`tenant_id`);

--
-- Indexes for table `supplier_quotations`
--
ALTER TABLE `supplier_quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_quote_project_no` (`project_id`,`quote_no`),
  ADD KEY `idx_quote_rfq` (`rfq_id`),
  ADD KEY `fk_sq_tenant` (`tenant_id`),
  ADD KEY `fk_sq_supplier` (`supplier_id`);

--
-- Indexes for table `supplier_quotation_items`
--
ALTER TABLE `supplier_quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sqi_quote` (`supplier_quotation_id`),
  ADD KEY `fk_sqi_tenant` (`tenant_id`),
  ADD KEY `fk_sqi_rfq_item` (`rfq_item_id`),
  ADD KEY `fk_sqi_item` (`inventory_item_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tasks_project` (`project_id`),
  ADD KEY `idx_tasks_wbs` (`wbs_id`),
  ADD KEY `idx_tasks_dates` (`planned_start_date`,`planned_end_date`),
  ADD KEY `fk_tasks_tenant` (`tenant_id`),
  ADD KEY `fk_tasks_milestone` (`milestone_id`),
  ADD KEY `fk_tasks_parent` (`parent_task_id`),
  ADD KEY `fk_tasks_assignee` (`assigned_to`),
  ADD KEY `fk_tasks_created_by` (`created_by`);

--
-- Indexes for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_task_dep` (`predecessor_task_id`,`successor_task_id`,`dependency_type`),
  ADD KEY `idx_task_dep_project` (`project_id`),
  ADD KEY `fk_td_tenant` (`tenant_id`),
  ADD KEY `fk_td_succ` (`successor_task_id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenants_uuid` (`uuid`),
  ADD UNIQUE KEY `uq_tenants_slug` (`slug`),
  ADD KEY `idx_tenants_status` (`status`);

--
-- Indexes for table `tenant_features`
--
ALTER TABLE `tenant_features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenant_feature` (`tenant_id`,`feature_key`);

--
-- Indexes for table `tenant_users`
--
ALTER TABLE `tenant_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenant_user` (`tenant_id`,`user_id`),
  ADD KEY `idx_tenant_users_user` (`user_id`);

--
-- Indexes for table `tenant_user_roles`
--
ALTER TABLE `tenant_user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tur` (`tenant_user_id`,`role_id`,`project_id`),
  ADD KEY `idx_tur_tenant` (`tenant_id`),
  ADD KEY `idx_tur_project` (`project_id`),
  ADD KEY `fk_tur_role` (`role_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_uuid` (`uuid`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- Indexes for table `variations`
--
ALTER TABLE `variations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_variations_project_no` (`project_id`,`variation_no`),
  ADD KEY `idx_variations_status` (`tenant_id`,`status`),
  ADD KEY `fk_variations_contract` (`contract_id`),
  ADD KEY `fk_variations_decided_by` (`decided_by`),
  ADD KEY `fk_variations_created_by` (`created_by`);

--
-- Indexes for table `variation_items`
--
ALTER TABLE `variation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_variation_items_variation` (`variation_id`),
  ADD KEY `fk_vi_tenant` (`tenant_id`),
  ADD KEY `fk_vi_boq_item` (`boq_item_id`),
  ADD KEY `fk_vi_cost_code` (`cost_code_id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_warehouses_tenant_code` (`tenant_id`,`code`),
  ADD KEY `idx_warehouses_project` (`project_id`);

--
-- Indexes for table `wbs`
--
ALTER TABLE `wbs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wbs_project_code` (`project_id`,`code`),
  ADD KEY `idx_wbs_parent` (`parent_id`),
  ADD KEY `idx_wbs_tenant_project` (`tenant_id`,`project_id`);

--
-- Indexes for table `workflow_definitions`
--
ALTER TABLE `workflow_definitions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wf_def` (`tenant_id`,`code`);

--
-- Indexes for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wi_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_wi_tenant_project` (`tenant_id`,`project_id`),
  ADD KEY `fk_wi_def` (`workflow_definition_id`),
  ADD KEY `fk_wi_project` (`project_id`),
  ADD KEY `fk_wi_started_by` (`started_by`);

--
-- Indexes for table `workflow_transitions`
--
ALTER TABLE `workflow_transitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wt_instance` (`workflow_instance_id`),
  ADD KEY `fk_wt_tenant` (`tenant_id`),
  ADD KEY `fk_wt_actor` (`actor_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `access_policies`
--
ALTER TABLE `access_policies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approvals`
--
ALTER TABLE `approvals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `boqs`
--
ALTER TABLE `boqs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `boq_items`
--
ALTER TABLE `boq_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `consultants`
--
ALTER TABLE `consultants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contracts`
--
ALTER TABLE `contracts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `contract_items`
--
ALTER TABLE `contract_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cost_codes`
--
ALTER TABLE `cost_codes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `document_versions`
--
ALTER TABLE `document_versions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `drawings`
--
ALTER TABLE `drawings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `drawing_revisions`
--
ALTER TABLE `drawing_revisions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `equipment`
--
ALTER TABLE `equipment`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `equipment_assignments`
--
ALTER TABLE `equipment_assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `equipment_usage_logs`
--
ALTER TABLE `equipment_usage_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_issues`
--
ALTER TABLE `material_issues`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_issue_items`
--
ALTER TABLE `material_issue_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_requests`
--
ALTER TABLE `material_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `material_request_items`
--
ALTER TABLE `material_request_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `milestones`
--
ALTER TABLE `milestones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_applications`
--
ALTER TABLE `payment_applications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `payment_application_items`
--
ALTER TABLE `payment_application_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_certificates`
--
ALTER TABLE `payment_certificates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `project_members`
--
ALTER TABLE `project_members`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfis`
--
ALTER TABLE `rfis`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `rfi_attachments`
--
ALTER TABLE `rfi_attachments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfi_responses`
--
ALTER TABLE `rfi_responses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfqs`
--
ALTER TABLE `rfqs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfq_items`
--
ALTER TABLE `rfq_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfq_suppliers`
--
ALTER TABLE `rfq_suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `saas_invoices`
--
ALTER TABLE `saas_invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `site_diaries`
--
ALTER TABLE `site_diaries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `site_diary_equipment`
--
ALTER TABLE `site_diary_equipment`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_diary_labours`
--
ALTER TABLE `site_diary_labours`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_diary_materials`
--
ALTER TABLE `site_diary_materials`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_issues`
--
ALTER TABLE `site_issues`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_photos`
--
ALTER TABLE `site_photos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_balances`
--
ALTER TABLE `stock_balances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subcontractors`
--
ALTER TABLE `subcontractors`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `subcontract_packages`
--
ALTER TABLE `subcontract_packages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subcontract_package_items`
--
ALTER TABLE `subcontract_package_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submittals`
--
ALTER TABLE `submittals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `submittal_attachments`
--
ALTER TABLE `submittal_attachments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `supplier_quotations`
--
ALTER TABLE `supplier_quotations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_quotation_items`
--
ALTER TABLE `supplier_quotation_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tenant_features`
--
ALTER TABLE `tenant_features`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `tenant_users`
--
ALTER TABLE `tenant_users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `tenant_user_roles`
--
ALTER TABLE `tenant_user_roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `variations`
--
ALTER TABLE `variations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `variation_items`
--
ALTER TABLE `variation_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `wbs`
--
ALTER TABLE `wbs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `workflow_definitions`
--
ALTER TABLE `workflow_definitions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workflow_transitions`
--
ALTER TABLE `workflow_transitions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `access_policies`
--
ALTER TABLE `access_policies`
  ADD CONSTRAINT `access_policies_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_activity_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_activity_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `approvals`
--
ALTER TABLE `approvals`
  ADD CONSTRAINT `fk_approvals_acted_by` FOREIGN KEY (`acted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_approvals_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_approvals_requested_from` FOREIGN KEY (`requested_from`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_approvals_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_approvals_wi` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `boqs`
--
ALTER TABLE `boqs`
  ADD CONSTRAINT `fk_boqs_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_boqs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_boqs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_boqs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `boq_items`
--
ALTER TABLE `boq_items`
  ADD CONSTRAINT `fk_boq_items_boq` FOREIGN KEY (`boq_id`) REFERENCES `boqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_boq_items_cost_code` FOREIGN KEY (`cost_code_id`) REFERENCES `cost_codes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_boq_items_parent` FOREIGN KEY (`parent_id`) REFERENCES `boq_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_boq_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_boq_items_wbs` FOREIGN KEY (`wbs_id`) REFERENCES `wbs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `fk_branches_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  ADD CONSTRAINT `fk_branches_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `fk_clients_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `fk_companies_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `consultants`
--
ALTER TABLE `consultants`
  ADD CONSTRAINT `fk_consultants_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `fk_contracts_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_contracts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_contracts_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_contracts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `contract_items`
--
ALTER TABLE `contract_items`
  ADD CONSTRAINT `fk_ci_boq_item` FOREIGN KEY (`boq_item_id`) REFERENCES `boq_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ci_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ci_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `cost_codes`
--
ALTER TABLE `cost_codes`
  ADD CONSTRAINT `fk_cost_codes_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cost_codes_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  ADD CONSTRAINT `fk_departments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_documents_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_documents_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `document_versions`
--
ALTER TABLE `document_versions`
  ADD CONSTRAINT `fk_dv_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dv_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_dv_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `drawings`
--
ALTER TABLE `drawings`
  ADD CONSTRAINT `fk_drawings_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_drawings_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_drawings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `drawing_revisions`
--
ALTER TABLE `drawing_revisions`
  ADD CONSTRAINT `fk_dr_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_dr_doc_version` FOREIGN KEY (`document_version_id`) REFERENCES `document_versions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_dr_drawing` FOREIGN KEY (`drawing_id`) REFERENCES `drawings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employees_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `fk_employees_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  ADD CONSTRAINT `fk_employees_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `fk_employees_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_employees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `equipment`
--
ALTER TABLE `equipment`
  ADD CONSTRAINT `fk_equipment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `equipment_assignments`
--
ALTER TABLE `equipment_assignments`
  ADD CONSTRAINT `fk_eqa_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_eqa_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  ADD CONSTRAINT `fk_eqa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eqa_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `equipment_usage_logs`
--
ALTER TABLE `equipment_usage_logs`
  ADD CONSTRAINT `fk_equ_assignment` FOREIGN KEY (`equipment_assignment_id`) REFERENCES `equipment_assignments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_equ_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  ADD CONSTRAINT `fk_equ_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_equ_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_equ_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD CONSTRAINT `fk_grn_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `fk_grn_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_grn_received_by` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_grn_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_grn_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD CONSTRAINT `fk_gri_grn` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_gri_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_gri_poi` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_gri_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `fk_inventory_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_cert` FOREIGN KEY (`payment_certificate_id`) REFERENCES `payment_certificates` (`id`),
  ADD CONSTRAINT `fk_invoices_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_invoices_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `material_issues`
--
ALTER TABLE `material_issues`
  ADD CONSTRAINT `fk_mi_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_mi_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_mi_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `material_issue_items`
--
ALTER TABLE `material_issue_items`
  ADD CONSTRAINT `fk_mii_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_mii_mi` FOREIGN KEY (`material_issue_id`) REFERENCES `material_issues` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mii_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD CONSTRAINT `fk_mr_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_mr_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mr_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_mr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `material_request_items`
--
ALTER TABLE `material_request_items`
  ADD CONSTRAINT `fk_mri_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_mri_mr` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mri_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `milestones`
--
ALTER TABLE `milestones`
  ADD CONSTRAINT `fk_milestones_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_milestones_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  ADD CONSTRAINT `fk_payments_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_payments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `payment_applications`
--
ALTER TABLE `payment_applications`
  ADD CONSTRAINT `fk_pa_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`),
  ADD CONSTRAINT `fk_pa_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_pa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pa_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `payment_application_items`
--
ALTER TABLE `payment_application_items`
  ADD CONSTRAINT `fk_pai_app` FOREIGN KEY (`payment_application_id`) REFERENCES `payment_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pai_boq_item` FOREIGN KEY (`boq_item_id`) REFERENCES `boq_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pai_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `payment_certificates`
--
ALTER TABLE `payment_certificates`
  ADD CONSTRAINT `fk_pc_app` FOREIGN KEY (`payment_application_id`) REFERENCES `payment_applications` (`id`),
  ADD CONSTRAINT `fk_pc_certified_by` FOREIGN KEY (`certified_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_pc_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pc_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_projects_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  ADD CONSTRAINT `fk_projects_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `consultants` (`id`),
  ADD CONSTRAINT `fk_projects_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_projects_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `project_members`
--
ALTER TABLE `project_members`
  ADD CONSTRAINT `fk_pm_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_pm_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_po_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_po_pr` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_po_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `fk_po_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_po_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_poi_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_poi_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_poi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD CONSTRAINT `fk_pr_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_pr_mr` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pr_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pr_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_pr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `purchase_request_items`
--
ALTER TABLE `purchase_request_items`
  ADD CONSTRAINT `fk_pri_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pri_pr` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pri_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `rfis`
--
ALTER TABLE `rfis`
  ADD CONSTRAINT `fk_rfis_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_rfis_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfis_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_rfis_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `rfi_attachments`
--
ALTER TABLE `rfi_attachments`
  ADD CONSTRAINT `fk_rfi_att_doc` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfi_att_rfi` FOREIGN KEY (`rfi_id`) REFERENCES `rfis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfi_att_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `rfi_responses`
--
ALTER TABLE `rfi_responses`
  ADD CONSTRAINT `fk_rfi_resp_rfi` FOREIGN KEY (`rfi_id`) REFERENCES `rfis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfi_resp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_rfi_resp_user` FOREIGN KEY (`responded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `rfqs`
--
ALTER TABLE `rfqs`
  ADD CONSTRAINT `fk_rfq_awarded_quote` FOREIGN KEY (`awarded_quotation_id`) REFERENCES `supplier_quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rfq_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_rfq_pr` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rfq_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfq_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `rfq_items`
--
ALTER TABLE `rfq_items`
  ADD CONSTRAINT `fk_rfqi_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rfqi_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfqi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `rfq_suppliers`
--
ALTER TABLE `rfq_suppliers`
  ADD CONSTRAINT `fk_rfqs_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfqs_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `fk_rfqs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `saas_invoices`
--
ALTER TABLE `saas_invoices`
  ADD CONSTRAINT `saas_invoices_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `saas_invoices_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_diaries`
--
ALTER TABLE `site_diaries`
  ADD CONSTRAINT `fk_sd_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_sd_prepared_by` FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_sd_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sd_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_diary_equipment`
--
ALTER TABLE `site_diary_equipment`
  ADD CONSTRAINT `fk_sde_diary` FOREIGN KEY (`site_diary_id`) REFERENCES `site_diaries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sde_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_diary_labours`
--
ALTER TABLE `site_diary_labours`
  ADD CONSTRAINT `fk_sdl_diary` FOREIGN KEY (`site_diary_id`) REFERENCES `site_diaries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sdl_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_diary_materials`
--
ALTER TABLE `site_diary_materials`
  ADD CONSTRAINT `fk_sdm_diary` FOREIGN KEY (`site_diary_id`) REFERENCES `site_diaries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sdm_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_issues`
--
ALTER TABLE `site_issues`
  ADD CONSTRAINT `fk_si_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_si_diary` FOREIGN KEY (`site_diary_id`) REFERENCES `site_diaries` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_si_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_si_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_si_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `site_photos`
--
ALTER TABLE `site_photos`
  ADD CONSTRAINT `fk_sp_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_sp_diary` FOREIGN KEY (`site_diary_id`) REFERENCES `site_diaries` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sp_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sp_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `stock_balances`
--
ALTER TABLE `stock_balances`
  ADD CONSTRAINT `fk_stock_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`),
  ADD CONSTRAINT `fk_stock_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `stock_transactions`
--
ALTER TABLE `stock_transactions`
  ADD CONSTRAINT `fk_stock_txn_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`),
  ADD CONSTRAINT `fk_stock_txn_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_txn_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_stock_txn_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_stock_txn_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `subcontractors`
--
ALTER TABLE `subcontractors`
  ADD CONSTRAINT `fk_subcon_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `subcontract_packages`
--
ALTER TABLE `subcontract_packages`
  ADD CONSTRAINT `fk_pkg_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_pkg_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pkg_subcon` FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors` (`id`),
  ADD CONSTRAINT `fk_pkg_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `subcontract_package_items`
--
ALTER TABLE `subcontract_package_items`
  ADD CONSTRAINT `fk_pkgi_pkg` FOREIGN KEY (`subcontract_package_id`) REFERENCES `subcontract_packages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pkgi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `submittals`
--
ALTER TABLE `submittals`
  ADD CONSTRAINT `fk_submittals_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_submittals_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_submittals_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_submittals_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `submittal_attachments`
--
ALTER TABLE `submittal_attachments`
  ADD CONSTRAINT `fk_sa_doc` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sa_submittal` FOREIGN KEY (`submittal_id`) REFERENCES `submittals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sa_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  ADD CONSTRAINT `fk_subscriptions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `fk_suppliers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `supplier_quotations`
--
ALTER TABLE `supplier_quotations`
  ADD CONSTRAINT `fk_sq_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sq_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sq_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `fk_sq_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `supplier_quotation_items`
--
ALTER TABLE `supplier_quotation_items`
  ADD CONSTRAINT `fk_sqi_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sqi_quote` FOREIGN KEY (`supplier_quotation_id`) REFERENCES `supplier_quotations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sqi_rfq_item` FOREIGN KEY (`rfq_item_id`) REFERENCES `rfq_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sqi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_tasks_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_parent` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tasks_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_tasks_wbs` FOREIGN KEY (`wbs_id`) REFERENCES `wbs` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `task_dependencies`
--
ALTER TABLE `task_dependencies`
  ADD CONSTRAINT `fk_td_pred` FOREIGN KEY (`predecessor_task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_td_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_td_succ` FOREIGN KEY (`successor_task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_td_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `tenant_features`
--
ALTER TABLE `tenant_features`
  ADD CONSTRAINT `fk_tenant_features_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `tenant_users`
--
ALTER TABLE `tenant_users`
  ADD CONSTRAINT `fk_tu_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_tu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `tenant_user_roles`
--
ALTER TABLE `tenant_user_roles`
  ADD CONSTRAINT `fk_tur_membership` FOREIGN KEY (`tenant_user_id`) REFERENCES `tenant_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tur_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_tur_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `variations`
--
ALTER TABLE `variations`
  ADD CONSTRAINT `fk_variations_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`),
  ADD CONSTRAINT `fk_variations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_variations_decided_by` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_variations_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_variations_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `variation_items`
--
ALTER TABLE `variation_items`
  ADD CONSTRAINT `fk_vi_boq_item` FOREIGN KEY (`boq_item_id`) REFERENCES `boq_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_vi_cost_code` FOREIGN KEY (`cost_code_id`) REFERENCES `cost_codes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_vi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_vi_variation` FOREIGN KEY (`variation_id`) REFERENCES `variations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD CONSTRAINT `fk_warehouses_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_warehouses_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `wbs`
--
ALTER TABLE `wbs`
  ADD CONSTRAINT `fk_wbs_parent` FOREIGN KEY (`parent_id`) REFERENCES `wbs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wbs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wbs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `workflow_definitions`
--
ALTER TABLE `workflow_definitions`
  ADD CONSTRAINT `fk_wf_def_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `workflow_instances`
--
ALTER TABLE `workflow_instances`
  ADD CONSTRAINT `fk_wi_def` FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions` (`id`),
  ADD CONSTRAINT `fk_wi_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wi_started_by` FOREIGN KEY (`started_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_wi_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `workflow_transitions`
--
ALTER TABLE `workflow_transitions`
  ADD CONSTRAINT `fk_wt_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_wt_instance` FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wt_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
