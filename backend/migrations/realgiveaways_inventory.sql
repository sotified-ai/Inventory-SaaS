-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 26, 2025 at 06:26 PM
-- Server version: 11.4.8-MariaDB-cll-lve
-- PHP Version: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `realgiveaways_inventory`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `payload` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_users`
--

CREATE TABLE `auth_users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','stock_manager','sales','accountant','viewer') DEFAULT 'viewer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auth_users`
--

INSERT INTO `auth_users` (`id`, `username`, `password_hash`, `role`, `created_at`) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', '2025-11-21 13:15:02');

-- --------------------------------------------------------

--
-- Table structure for table `brokers`
--

CREATE TABLE `brokers` (
  `id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `commission_type` enum('percentage','fixed') DEFAULT 'percentage',
  `commission_value` decimal(10,2) DEFAULT 0.00,
  `territory` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `challans`
--

CREATE TABLE `challans` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `challan_number` varchar(50) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `driver_id` varchar(36) DEFAULT NULL,
  `status` enum('pending','in_transit','delivered','returned') DEFAULT 'pending',
  `delivery_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `challan_items`
--

CREATE TABLE `challan_items` (
  `id` varchar(36) NOT NULL,
  `challan_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commission_entries`
--

CREATE TABLE `commission_entries` (
  `id` varchar(36) NOT NULL,
  `broker_id` varchar(36) NOT NULL,
  `market_supply_id` varchar(36) DEFAULT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` varchar(36) NOT NULL,
  `customer_code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `credit_limit` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `customer_code`, `name`, `phone`, `email`, `address`, `credit_limit`, `created_at`, `updated_at`) VALUES
('', '777', 'Farrukh', '999979', NULL, 'lahore', 0.00, '2025-11-23 16:36:54', '2025-11-23 16:36:54');

-- --------------------------------------------------------

--
-- Table structure for table `customer_returns`
--

CREATE TABLE `customer_returns` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `return_number` varchar(50) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `return_type` enum('good','damaged') DEFAULT 'good',
  `total_amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_return_items`
--

CREATE TABLE `customer_return_items` (
  `id` varchar(36) NOT NULL,
  `return_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

CREATE TABLE `drivers` (
  `id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `vehicle_number` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `drivers`
--

INSERT INTO `drivers` (`id`, `name`, `phone`, `vehicle_number`, `license_number`, `created_at`, `updated_at`) VALUES
('', 'Hassan', '0322223', 'laala eleo 333', '3e090uhasd', '2025-11-23 16:29:57', '2025-11-23 16:29:57');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `related_invoice_id` varchar(36) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `deliveryman_name` varchar(200) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `final_discount_amount` decimal(10,2) DEFAULT 0.00,
  `final_total_amount` decimal(10,2) DEFAULT 0.00,
  `sale_timestamp` timestamp NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `warehouse_id` int(11) DEFAULT 1,
  `customer_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `user_id`, `invoice_number`, `customer_name`, `customer_phone`, `customer_address`, `deliveryman_name`, `total_amount`, `subtotal`, `total`, `discount_percentage`, `final_discount_amount`, `final_total_amount`, `sale_timestamp`, `is_deleted`, `warehouse_id`, `customer_id`, `created_at`, `updated_at`) VALUES
('baaeaf87-8215-4361-a6fc-e299120ede36', 'mysql-admin', 'INV-1763737899-baaeaf87', 'asdads', NULL, NULL, NULL, 0.00, 120000.00, 120000.00, 0.00, 0.00, 120000.00, '2025-11-21 15:11:39', 0, 1, NULL, '2025-11-21 15:11:39', '2025-11-23 15:40:19');

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `bonus_quantity` int(11) DEFAULT 0,
  `returned_quantity` int(11) NOT NULL DEFAULT 0,
  `unit_price` decimal(10,2) NOT NULL,
  `price_per_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_line_price` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `total` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `cost_price_snapshot` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`id`, `invoice_id`, `product_id`, `product_name`, `sku`, `quantity`, `bonus_quantity`, `returned_quantity`, `unit_price`, `price_per_unit`, `discount`, `total_line_price`, `total`, `cost_price_snapshot`, `created_at`) VALUES
('', 'baaeaf87-8215-4361-a6fc-e299120ede36', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', 'abc', 'acbasd', 120, 2, 0, 1000.00, 1000.00, 0.00, 120000.0000, 120000.0000, NULL, '2025-11-23 15:40:19');

-- --------------------------------------------------------

--
-- Table structure for table `market_supply`
--

CREATE TABLE `market_supply` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `supply_number` varchar(50) NOT NULL,
  `market_name` varchar(200) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `total_ctns` int(11) DEFAULT 0,
  `total_quantity` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `broker_id` varchar(36) DEFAULT NULL,
  `driver_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `market_supply`
--

INSERT INTO `market_supply` (`id`, `user_id`, `created_by`, `supply_number`, `market_name`, `customer_id`, `total_amount`, `total_ctns`, `total_quantity`, `notes`, `warehouse_id`, `broker_id`, `driver_id`, `created_at`, `updated_at`) VALUES
('69456d43-9da3-468e-977e-80eb0c6c7a0f', '', 'mysql-admin', 'SUPPLY-1763738973-69456d43', '', NULL, 0.00, 0, 1, NULL, 1, NULL, NULL, '2025-11-21 15:29:33', '2025-11-21 15:29:33'),
('a4acc890-a4b2-4f38-87e6-25fc3e5263d7', '', 'mysql-admin', 'SUPPLY-1763738142-a4acc890', '', NULL, 0.00, 0, 100, NULL, 1, NULL, NULL, '2025-11-21 15:15:42', '2025-11-21 15:15:42'),
('e90aa3db-d110-4b07-aa77-aa35001e10f2', '', 'mysql-admin', 'SUPPLY-1763739008-e90aa3db', '', NULL, 0.00, 0, 1, NULL, 1, NULL, NULL, '2025-11-21 15:30:08', '2025-11-21 15:30:08');

-- --------------------------------------------------------

--
-- Table structure for table `market_supply_items`
--

CREATE TABLE `market_supply_items` (
  `id` varchar(36) NOT NULL,
  `market_supply_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `return_quantity` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `ctns` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `market_supply_items`
--

INSERT INTO `market_supply_items` (`id`, `market_supply_id`, `product_id`, `product_name`, `quantity`, `return_quantity`, `ctns`, `unit_price`, `created_at`) VALUES
('91754bb3-430e-4708-b187-383433d29434', 'e90aa3db-d110-4b07-aa77-aa35001e10f2', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', NULL, 1, 100.0000, 0.0000, 0.00, '2025-11-21 15:30:08'),
('c287323a-ca38-4e5b-8009-cd0e85e74f74', 'a4acc890-a4b2-4f38-87e6-25fc3e5263d7', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', NULL, 100, 0.0000, 0.0000, 0.00, '2025-11-21 15:15:42'),
('fb917312-bec2-451d-8a62-dd4003972933', '69456d43-9da3-468e-977e-80eb0c6c7a0f', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', NULL, 1, 100.0000, 0.0000, 0.00, '2025-11-21 15:29:33');

-- --------------------------------------------------------

--
-- Table structure for table `price_history`
--

CREATE TABLE `price_history` (
  `id` int(11) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `old_cost_price` decimal(10,2) NOT NULL,
  `new_cost_price` decimal(10,2) NOT NULL,
  `old_selling_price` decimal(10,2) NOT NULL,
  `new_selling_price` decimal(10,2) NOT NULL,
  `changed_by` varchar(36) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `default_selling_price` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `selling_price` decimal(10,2) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `min_stock` int(11) DEFAULT 0,
  `category_id` varchar(36) DEFAULT NULL,
  `packing_unit` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `user_id`, `name`, `sku`, `default_selling_price`, `selling_price`, `cost_price`, `stock`, `min_stock`, `category_id`, `packing_unit`, `created_at`, `updated_at`) VALUES
('b126c59c-037b-4e62-92d9-0e225ed7e8c6', 'mysql-admin', 'abc', 'acbasd', 0.0000, 1000.00, 100.00, 976, 100, NULL, NULL, '2025-11-21 13:45:24', '2025-11-23 16:34:02');

-- --------------------------------------------------------

--
-- Table structure for table `restock_items`
--

CREATE TABLE `restock_items` (
  `id` varchar(36) NOT NULL,
  `restock_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `packing_unit` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `cost_per_unit` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `total_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `restock_items`
--

INSERT INTO `restock_items` (`id`, `restock_id`, `product_id`, `product_name`, `packing_unit`, `quantity`, `unit_cost`, `cost_per_unit`, `total_cost`, `created_at`) VALUES
('6ce5fc1b-a51a-47a2-9e21-62a68912795c', '17db96f3-1955-411a-8aeb-4d3aa0c4c867', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', 'abc', NULL, 100, 0.00, 0.0000, 0.0000, '2025-11-21 15:28:40'),
('ecb7c364-c033-4bf1-b09f-138963cf0398', '1f585e86-d607-4153-b3a8-0742471c5074', 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', 'abc', NULL, 100, 0.00, 0.0000, 0.0000, '2025-11-23 16:34:02');

-- --------------------------------------------------------

--
-- Table structure for table `restock_transactions`
--

CREATE TABLE `restock_transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `restock_number` varchar(50) NOT NULL,
  `restock_timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `total_restock_value` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `total_cost` decimal(10,2) NOT NULL,
  `total_items_restocked` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `booker_name` varchar(100) DEFAULT NULL,
  `deliveryman_name` varchar(100) DEFAULT NULL,
  `supplier_name` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `supplier_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `restock_transactions`
--

INSERT INTO `restock_transactions` (`id`, `user_id`, `restock_number`, `restock_timestamp`, `total_restock_value`, `total_cost`, `total_items_restocked`, `booker_name`, `deliveryman_name`, `supplier_name`, `notes`, `warehouse_id`, `supplier_id`, `created_at`, `updated_at`) VALUES
('17db96f3-1955-411a-8aeb-4d3aa0c4c867', 'mysql-admin', 'RESTOCK-1763738920-17db96f3', '2025-11-21 16:28:40', 0.0000, 0.00, 100.0000, 'Ahmed', NULL, NULL, NULL, 1, NULL, '2025-11-21 15:28:40', '2025-11-21 15:28:40'),
('1f585e86-d607-4153-b3a8-0742471c5074', 'mysql-admin', 'RESTOCK-1763915642-1f585e86', '2025-11-23 17:34:02', 0.0000, 0.00, 100.0000, 'Farrukh', NULL, NULL, NULL, 1, NULL, '2025-11-23 16:34:02', '2025-11-23 16:34:02');

-- --------------------------------------------------------

--
-- Table structure for table `sales_orders`
--

CREATE TABLE `sales_orders` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `order_number` varchar(50) NOT NULL,
  `customer_id` varchar(36) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT 1,
  `status` enum('draft','confirmed','invoiced','cancelled') DEFAULT 'draft',
  `total_amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_items`
--

CREATE TABLE `sales_order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustments`
--

CREATE TABLE `stock_adjustments` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `product_id` varchar(36) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity_change` int(11) NOT NULL,
  `reason` enum('damaged','missing','found','correction','other') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_levels`
--

CREATE TABLE `stock_levels` (
  `id` int(11) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `reserved_quantity` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_levels`
--

INSERT INTO `stock_levels` (`id`, `product_id`, `warehouse_id`, `quantity`, `reserved_quantity`, `updated_at`) VALUES
(3, 'b126c59c-037b-4e62-92d9-0e225ed7e8c6', 1, 1000, 0, '2025-11-21 13:45:24');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` varchar(36) NOT NULL,
  `supplier_code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `name`, `address`, `created_at`, `updated_at`) VALUES
(1, 'Main Warehouse', 'Default warehouse location', '2025-11-21 13:13:29', '2025-11-21 13:13:29');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `entity_type` (`entity_type`),
  ADD KEY `entity_id` (`entity_id`),
  ADD KEY `created_at` (`created_at`);

--
-- Indexes for table `auth_users`
--
ALTER TABLE `auth_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `brokers`
--
ALTER TABLE `brokers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `challans`
--
ALTER TABLE `challans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `challan_number` (`challan_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `driver_id` (`driver_id`),
  ADD KEY `status` (`status`),
  ADD KEY `idx_challans_created_by` (`created_by`);

--
-- Indexes for table `challan_items`
--
ALTER TABLE `challan_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `challan_id` (`challan_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `commission_entries`
--
ALTER TABLE `commission_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `broker_id` (`broker_id`),
  ADD KEY `market_supply_id` (`market_supply_id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `customer_code` (`customer_code`);

--
-- Indexes for table `customer_returns`
--
ALTER TABLE `customer_returns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `return_number` (`return_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `idx_customer_returns_created_by` (`created_by`);

--
-- Indexes for table `customer_return_items`
--
ALTER TABLE `customer_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `return_id` (`return_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `expense_date` (`expense_date`),
  ADD KEY `category` (`category`),
  ADD KEY `idx_expenses_created_by` (`created_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `invoice_number` (`invoice_number`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `idx_invoices_user_date` (`user_id`,`created_at`),
  ADD KEY `idx_invoices_sale_timestamp` (`sale_timestamp`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `market_supply`
--
ALTER TABLE `market_supply`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `supply_number` (`supply_number`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `broker_id` (`broker_id`),
  ADD KEY `driver_id` (`driver_id`),
  ADD KEY `idx_market_supply_user_date` (`user_id`,`created_at`),
  ADD KEY `idx_market_supply_created_by` (`created_by`);

--
-- Indexes for table `market_supply_items`
--
ALTER TABLE `market_supply_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `market_supply_id` (`market_supply_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `price_history`
--
ALTER TABLE `price_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `changed_by` (`changed_by`),
  ADD KEY `changed_at` (`changed_at`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `sku` (`sku`),
  ADD KEY `idx_products_user_category` (`user_id`,`category_id`);

--
-- Indexes for table `restock_items`
--
ALTER TABLE `restock_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `restock_id` (`restock_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `restock_transactions`
--
ALTER TABLE `restock_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `restock_number` (`restock_number`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `idx_restock_user_date` (`user_id`,`created_at`);

--
-- Indexes for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `status` (`status`),
  ADD KEY `idx_sales_orders_created_by` (`created_by`);

--
-- Indexes for table `sales_order_items`
--
ALTER TABLE `sales_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `idx_stock_adjustments_created_by` (`created_by`);

--
-- Indexes for table `stock_levels`
--
ALTER TABLE `stock_levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_warehouse` (`product_id`,`warehouse_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `supplier_code` (`supplier_code`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `price_history`
--
ALTER TABLE `price_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_levels`
--
ALTER TABLE `stock_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `challans`
--
ALTER TABLE `challans`
  ADD CONSTRAINT `fk_challans_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_challans_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_challans_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `challan_items`
--
ALTER TABLE `challan_items`
  ADD CONSTRAINT `fk_challan_items_challan` FOREIGN KEY (`challan_id`) REFERENCES `challans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_challan_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `commission_entries`
--
ALTER TABLE `commission_entries`
  ADD CONSTRAINT `fk_commission_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_commission_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_commission_market_supply` FOREIGN KEY (`market_supply_id`) REFERENCES `market_supply` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customer_returns`
--
ALTER TABLE `customer_returns`
  ADD CONSTRAINT `fk_customer_returns_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_customer_returns_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `customer_return_items`
--
ALTER TABLE `customer_return_items`
  ADD CONSTRAINT `fk_customer_return_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_customer_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `customer_returns` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invoices_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `market_supply`
--
ALTER TABLE `market_supply`
  ADD CONSTRAINT `fk_market_supply_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_market_supply_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_market_supply_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `restock_transactions`
--
ALTER TABLE `restock_transactions`
  ADD CONSTRAINT `fk_restock_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_restock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD CONSTRAINT `fk_sales_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sales_orders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `sales_order_items`
--
ALTER TABLE `sales_order_items`
  ADD CONSTRAINT `fk_sales_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sales_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD CONSTRAINT `fk_stock_adjustments_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stock_adjustments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_levels`
--
ALTER TABLE `stock_levels`
  ADD CONSTRAINT `fk_stock_levels_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stock_levels_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
