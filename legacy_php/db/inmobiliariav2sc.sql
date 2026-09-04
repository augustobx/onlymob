-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-06-2025 a las 18:59:16
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `inmobiliaria`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `debts`
--

CREATE TABLE `debts` (
  `id` int(11) NOT NULL,
  `lease_id` int(11) NOT NULL,
  `type` enum('alquiler','deposito','luz','gas','agua','otros') NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `generated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `due_date` date NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `debts`
--

INSERT INTO `debts` (`id`, `lease_id`, `type`, `description`, `amount`, `generated_at`, `due_date`, `paid_amount`) VALUES
(1, 7, 'alquiler', 'Alquiler correspondiente a mes 06', 1500000.00, '2025-06-18 11:48:34', '2025-06-21', 1500000.00),
(2, 7, 'otros', 'prueba', 150.00, '2025-06-18 11:55:29', '2025-06-19', 150.00),
(3, 7, 'otros', 'prueba2', 1.00, '2025-06-18 11:59:20', '2025-06-19', 1.00),
(4, 7, 'alquiler', 'Alquiler 2', 111.00, '2025-06-18 12:13:38', '2025-06-19', 111.00),
(5, 7, 'gas', 'prueba2', 55.00, '2025-06-18 12:44:47', '2025-06-19', 55.00),
(6, 2, 'alquiler', 'Cuota 2025-07-18', 1125000.00, '2025-06-18 13:24:25', '2025-07-18', 1125000.00),
(7, 3, 'alquiler', 'Cuota 2025-07-18', 225000.00, '2025-06-18 13:24:25', '2025-07-18', 0.00),
(8, 5, 'alquiler', 'Cuota 2025-07-18', 4500000.00, '2025-06-18 13:24:25', '2025-07-18', 0.00),
(9, 6, 'alquiler', 'Cuota 2025-07-18', 2250000.00, '2025-06-18 13:24:25', '2025-07-18', 0.00),
(10, 7, 'alquiler', 'Cuota 2025-07-18', 37.13, '2025-06-18 13:24:25', '2025-07-18', 37.13),
(11, 8, 'alquiler', 'Cuota 2025-07-18', 5625041.25, '2025-06-18 13:24:25', '2025-07-18', 0.00),
(12, 2, 'alquiler', 'prueba2', 99999999.99, '2025-06-18 13:39:27', '2025-06-19', 99999999.99);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `debt_payments`
--

CREATE TABLE `debt_payments` (
  `id` int(11) NOT NULL,
  `debt_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp(),
  `method` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `debt_payments`
--

INSERT INTO `debt_payments` (`id`, `debt_id`, `amount`, `paid_at`, `method`) VALUES
(1, 1, 15000.00, '2025-06-18 11:49:40', ''),
(2, 1, 1485000.00, '2025-06-18 11:50:16', ''),
(3, 2, 100.00, '2025-06-18 11:55:36', ''),
(4, 2, 50.00, '2025-06-18 11:55:40', ''),
(5, 3, 1.00, '2025-06-18 12:13:22', 'efectivo'),
(6, 4, 50.00, '2025-06-18 12:44:23', 'efectivo'),
(7, 10, 37.13, '2025-06-18 13:30:36', 'efectivo'),
(8, 5, 55.00, '2025-06-18 13:30:46', 'efectivo'),
(9, 4, 61.00, '2025-06-18 13:30:55', 'efectivo'),
(10, 12, 99999999.99, '2025-06-18 13:39:41', 'efectivo'),
(11, 6, 1125000.00, '2025-06-18 13:39:45', 'efectivo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(80) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `documents`
--

INSERT INTO `documents` (`id`, `category`, `property_id`, `tenant_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `uploaded_at`) VALUES
(7, 'recibo_garante', 5, NULL, 'Cierre cuenta Uruguay.pdf', '684e00bf945f4_Cierre_cuenta_Uruguay.pdf', 404316, 'application/pdf', '2025-06-14 20:07:43');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `month_year` char(7) DEFAULT NULL,
  `amount_total` decimal(10,2) DEFAULT NULL,
  `paid_by_owner` decimal(10,2) DEFAULT NULL,
  `paid_by_tenants` decimal(10,2) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `leases`
--

CREATE TABLE `leases` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `rent` decimal(10,2) DEFAULT NULL,
  `deposit` decimal(10,2) DEFAULT NULL,
  `status` enum('current','terminated') DEFAULT 'current',
  `created_at` datetime DEFAULT current_timestamp(),
  `increase_percent` decimal(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `leases`
--

INSERT INTO `leases` (`id`, `property_id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `status`, `created_at`, `increase_percent`) VALUES
(1, 1, 1, '2025-07-01', '2025-12-31', 10000.00, 150000.00, 'terminated', '2025-06-13 13:01:38', 0.00),
(2, 3, 2, '2025-06-13', '2025-06-19', 1136250.00, 500000.00, 'current', '2025-06-13 17:18:49', 0.00),
(3, 4, 3, '2025-06-01', '2026-03-31', 227250.00, 300000.00, 'current', '2025-06-13 18:06:55', 0.00),
(4, 5, 4, '2025-06-14', '2025-11-14', 150000.00, 300000.00, 'terminated', '2025-06-14 19:51:13', 0.00),
(5, 4, 2, '2025-06-18', '2025-06-19', 4545000.00, 0.00, 'current', '2025-06-18 10:23:22', 0.00),
(6, 1, 1, '2025-06-18', '2025-06-19', 2272500.00, 0.00, 'current', '2025-06-18 10:39:47', 0.00),
(7, 6, 2, '2025-06-21', '2025-06-29', 37.50, 1.00, 'current', '2025-06-18 10:40:28', 10.00),
(8, 2, 3, '2025-07-08', '2025-07-12', 5681291.66, 123.00, 'current', '2025-06-18 11:06:09', 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `lease_id` int(11) DEFAULT NULL,
  `concept` enum('rent','expense','service') DEFAULT NULL,
  `service_type` enum('luz','gas','agua') DEFAULT NULL,
  `period` char(7) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `method` enum('cash','transfer') DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `payments`
--

INSERT INTO `payments` (`id`, `lease_id`, `concept`, `service_type`, `period`, `amount`, `method`, `paid_at`, `created_at`) VALUES
(1, 1, 'rent', NULL, '2025-07', 3453.00, 'cash', '2025-06-13 13:21:43', '2025-06-13 13:21:43'),
(2, 1, 'rent', NULL, '2025-06', 500.00, 'cash', '2025-06-13 13:39:23', '2025-06-13 13:39:23'),
(3, 1, 'rent', NULL, '2025-06', 9500.00, 'cash', '2025-06-13 13:39:31', '2025-06-13 13:39:31'),
(4, 3, 'rent', NULL, '2025-06', 50000.00, 'cash', '2025-06-13 18:08:57', '2025-06-13 18:08:57'),
(5, 3, 'rent', NULL, '2025-07', 32452.00, 'transfer', '2025-06-13 18:10:58', '2025-06-13 18:10:58'),
(6, 4, 'rent', NULL, '2025-06', 50000.00, 'cash', '2025-06-14 20:03:00', '2025-06-14 20:03:00'),
(7, 4, 'rent', NULL, '2025-06', 25000.00, 'cash', '2025-06-14 20:03:47', '2025-06-14 20:03:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `properties`
--

CREATE TABLE `properties` (
  `id` int(11) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `type` enum('Departamento','Casa','Local','Terreno') DEFAULT NULL,
  `rooms` tinyint(4) DEFAULT NULL,
  `sqm` decimal(6,2) DEFAULT NULL,
  `price_rent` decimal(10,2) DEFAULT NULL,
  `expenses_share` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `properties`
--

INSERT INTO `properties` (`id`, `code`, `address`, `type`, `rooms`, `sqm`, `price_rent`, `expenses_share`, `created_at`) VALUES
(1, '01', 'calle 123', 'Departamento', 2, 25.00, 350000.00, NULL, '2025-06-13 12:32:24'),
(2, 'IN33.402455', 'Botar 1760', 'Casa', 5, 333.00, 123.00, 1.00, '2025-06-13 12:36:41'),
(3, 'IN33.403601', 'Calle falsa 123', 'Departamento', 4, 33.00, 344234.00, 32.00, '2025-06-13 13:15:51'),
(4, 'CODIGOCASA1', 'Calle falsa 123', 'Casa', 3, 25.00, 150000.00, 25.00, '2025-06-13 18:05:24'),
(5, 'DEPTO CALLE PELEGRINI', 'PELLEGRINI 1535', 'Departamento', 3, 0.00, 150000.00, 0.00, '2025-06-14 19:48:31'),
(6, '7862', 'sdffsdfsdsdfsfdsfd', 'Departamento', 1, 1.00, 23323232.00, 1.00, '2025-06-18 10:04:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reminders`
--

CREATE TABLE `reminders` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `send_at` datetime DEFAULT NULL,
  `sent` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rent_history`
--

CREATE TABLE `rent_history` (
  `id` int(11) NOT NULL,
  `lease_id` int(11) NOT NULL,
  `change_date` date NOT NULL,
  `old_rent` decimal(10,2) NOT NULL,
  `new_rent` decimal(10,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rent_history`
--

INSERT INTO `rent_history` (`id`, `lease_id`, `change_date`, `old_rent`, `new_rent`, `notes`) VALUES
(1, 2, '2025-06-18', 150000.00, 300000.00, NULL),
(2, 7, '2025-06-18', 1.00, 1.50, NULL),
(3, 5, '2025-06-18', 1500000.00, 3000000.00, NULL),
(4, 7, '2025-06-18', 1.50, 2.25, NULL),
(5, 7, '2025-06-18', 2.25, 24.75, NULL),
(6, 8, '2025-06-18', 1500011.00, 1875013.75, NULL),
(7, 8, '2025-06-18', 1875013.75, 3750027.50, NULL),
(8, 2, '2025-06-18', 300000.00, 750000.00, NULL),
(9, 2, '2025-06-18', 750000.00, 1125000.00, ''),
(10, 3, '2025-06-18', 150000.00, 225000.00, ''),
(11, 5, '2025-06-18', 3000000.00, 4500000.00, ''),
(12, 6, '2025-06-18', 1500000.00, 2250000.00, ''),
(13, 7, '2025-06-18', 24.75, 37.13, ''),
(14, 8, '2025-06-18', 3750027.50, 5625041.25, ''),
(15, 2, '2025-06-18', 1125000.00, 1136250.00, ''),
(16, 3, '2025-06-18', 225000.00, 227250.00, ''),
(17, 5, '2025-06-18', 4500000.00, 4545000.00, ''),
(18, 6, '2025-06-18', 2250000.00, 2272500.00, ''),
(19, 7, '2025-06-18', 37.13, 37.50, ''),
(20, 8, '2025-06-18', 5625041.25, 5681291.66, '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `type` enum('agua','gas','luz') DEFAULT NULL,
  `contract_number` varchar(50) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `due_day` tinyint(4) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services_due`
--

CREATE TABLE `services_due` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `period` char(7) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `service_bills`
--

CREATE TABLE `service_bills` (
  `id` int(11) NOT NULL,
  `contract_id` int(11) NOT NULL,
  `period` char(7) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `service_bills`
--

INSERT INTO `service_bills` (`id`, `contract_id`, `period`, `amount`, `paid`, `created_at`) VALUES
(1, 1, '2025-06', 8500.00, 0, '2025-06-13 13:51:30'),
(2, 2, '2025-07', 123123.00, 0, '2025-06-13 13:55:36'),
(3, 3, '2025-07', 3333.00, 0, '2025-06-13 14:04:20'),
(4, 1, '2025-05', 121212.00, 0, '2025-06-13 14:54:38'),
(5, 3, '2025-05', 43353.00, 0, '2025-06-13 14:55:40'),
(6, 4, '2025-06', 50000.00, 0, '2025-06-13 18:16:23'),
(7, 5, '2025-06', 150.00, 0, '2025-06-14 19:59:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `service_contracts`
--

CREATE TABLE `service_contracts` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `type` enum('agua','gas','luz') NOT NULL,
  `contract_number` varchar(50) DEFAULT NULL,
  `provider` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `service_contracts`
--

INSERT INTO `service_contracts` (`id`, `property_id`, `type`, `contract_number`, `provider`, `created_at`) VALUES
(1, 3, 'gas', '4efwsef6we6fw', 'LITORAL GAS', '2025-06-13 13:51:23'),
(2, 1, 'agua', '123412312', 'LITORAL GAS1', '2025-06-13 13:55:19'),
(3, 1, 'luz', '1', 'LITORAL luz', '2025-06-13 14:04:00'),
(4, 4, 'gas', '25488215', 'LITORAL GAS', '2025-06-13 18:15:57'),
(5, 5, 'luz', '0000001', 'coopser', '2025-06-14 19:59:15');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `settings`
--

CREATE TABLE `settings` (
  `key` varchar(100) NOT NULL,
  `value` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `settings`
--

INSERT INTO `settings` (`key`, `value`) VALUES
('mail.mass_send', '0');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `dni` int(11) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tenants`
--

INSERT INTO `tenants` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `dni`, `phone`, `status`, `created_at`) VALUES
(1, 'augustobasquez2@gmail.com', '$2y$10$M5pNEiayajCepe4BIV3.yuxWSUOyMRFGN.TScDNwi9tli/VGUY3yG', 'Augusto', 'Basqueza', 11111, '03329684696', 'active', '2025-06-13 12:41:08'),
(2, 'correo@correo.com', '$2y$10$V2n7xBdRVaUk0JE8J0XvkOBNMbY60DJbgEczUu.dl5MtpTWD39.0q', 'Roberto', 'Frataslafra', 22368774, '0303456', 'active', '2025-06-13 17:17:44'),
(3, 'david@comeviejis.com', '$2y$10$GNFkDbTzELQ2BqvZDUSTHO8vQPiQqJXtuFF1CvBU7ga0W0rXYrB2.', 'David', 'Goliat', 0, '3329684696', 'active', '2025-06-13 18:06:11'),
(4, 'AUGUSTO@HOTMAIL.COM', '$2y$10$JtN7/TuDDdDTGf7sQyapVu35CWKDsz2Geo1abCsiCkNRxd/k0p3km', 'ricardo', 'fort', 0, '3329684696', 'active', '2025-06-14 19:49:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','staff') DEFAULT 'admin',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'admin@admin.com', '$2y$10$2G.vv7XGlzoiaWr9RD0Uc.0Q0jxwVtLTDpCv77WtwaoW0BtJ3QEsC', 'admin', '0000-00-00 00:00:00');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debts_fk_lease` (`lease_id`);

--
-- Indices de la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debt_payments_fk_debt` (`debt_id`);

--
-- Indices de la tabla `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indices de la tabla `leases`
--
ALTER TABLE `leases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indices de la tabla `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lease_id` (`lease_id`);

--
-- Indices de la tabla `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indices de la tabla `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indices de la tabla `rent_history`
--
ALTER TABLE `rent_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lease_id` (`lease_id`);

--
-- Indices de la tabla `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indices de la tabla `services_due`
--
ALTER TABLE `services_due`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_services_due_prop` (`property_id`,`period`);

--
-- Indices de la tabla `service_bills`
--
ALTER TABLE `service_bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `contract_id` (`contract_id`);

--
-- Indices de la tabla `service_contracts`
--
ALTER TABLE `service_contracts`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`key`);

--
-- Indices de la tabla `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `debts`
--
ALTER TABLE `debts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `leases`
--
ALTER TABLE `leases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rent_history`
--
ALTER TABLE `rent_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `services_due`
--
ALTER TABLE `services_due`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `service_bills`
--
ALTER TABLE `service_bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `service_contracts`
--
ALTER TABLE `service_contracts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `debts_fk_lease` FOREIGN KEY (`lease_id`) REFERENCES `leases` (`id`);

--
-- Filtros para la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD CONSTRAINT `debt_payments_fk_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`);

--
-- Filtros para la tabla `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`);

--
-- Filtros para la tabla `leases`
--
ALTER TABLE `leases`
  ADD CONSTRAINT `leases_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`),
  ADD CONSTRAINT `leases_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Filtros para la tabla `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`lease_id`) REFERENCES `leases` (`id`);

--
-- Filtros para la tabla `reminders`
--
ALTER TABLE `reminders`
  ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Filtros para la tabla `rent_history`
--
ALTER TABLE `rent_history`
  ADD CONSTRAINT `rent_history_ibfk_1` FOREIGN KEY (`lease_id`) REFERENCES `leases` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`);

--
-- Filtros para la tabla `service_bills`
--
ALTER TABLE `service_bills`
  ADD CONSTRAINT `service_bills_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `service_contracts` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
