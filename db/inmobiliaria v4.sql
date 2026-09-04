-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 19-06-2025 a las 18:27:56
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
(52, 11, 'alquiler', 'Alquiler July 2025', 157500.00, '2025-06-19 13:21:49', '2025-07-19', 0.00),
(53, 12, 'alquiler', 'Alquiler July 2025', 26250.00, '2025-06-19 13:21:49', '2025-07-19', 26250.00),
(54, 12, 'otros', 'puerta rota', 1500.00, '2025-06-19 13:24:58', '2025-06-20', 500.00);

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
(26, 54, 500.00, '2025-06-19 13:25:03', 'efectivo'),
(27, 53, 26250.00, '2025-06-19 13:25:08', 'efectivo');

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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garages`
--

CREATE TABLE `garages` (
  `id` int(11) NOT NULL,
  `address` varchar(255) NOT NULL,
  `total_spaces` int(10) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garages`
--

INSERT INTO `garages` (`id`, `address`, `total_spaces`, `created_at`) VALUES
(5, 'Bottaro 1760', 10, '2025-06-19 09:09:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_debts`
--

CREATE TABLE `garage_debts` (
  `garage_lease_id` int(11) NOT NULL,
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
-- Volcado de datos para la tabla `garage_debts`
--

INSERT INTO `garage_debts` (`garage_lease_id`, `id`, `lease_id`, `type`, `description`, `amount`, `generated_at`, `due_date`, `paid_amount`) VALUES
(15, 21, 0, 'alquiler', 'Alquiler 2025-06 (3 plaza/s)', 1679664.18, '2025-06-19 13:25:54', '2025-06-30', 1679664.18),
(16, 22, 0, 'alquiler', 'Alquiler 2025-06 (1 plaza/s)', 116643.36, '2025-06-19 13:25:54', '2025-06-30', 0.00),
(17, 23, 0, 'alquiler', 'Alquiler 2025-06 (4 plaza/s)', 1430824.80, '2025-06-19 13:25:54', '2025-06-30', 0.00),
(15, 24, 0, 'otros', 'prueba2', 500.00, '2025-06-19 13:26:45', '2025-06-19', 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_leases`
--

CREATE TABLE `garage_leases` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `rent` decimal(10,2) NOT NULL,
  `deposit` decimal(10,2) NOT NULL,
  `increase_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `status` enum('current','terminated') NOT NULL DEFAULT 'current'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_leases`
--

INSERT INTO `garage_leases` (`id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `increase_percent`, `status`) VALUES
(15, 6, '2025-06-01', '2025-06-30', 615876.87, 0.00, 0.00, 'current'),
(16, 7, '2025-06-19', '2025-06-30', 116643.36, 0.00, 0.00, 'current'),
(17, 8, '2025-06-18', '2025-06-29', 357706.20, 0.00, 0.00, 'current');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_lease_spaces`
--

CREATE TABLE `garage_lease_spaces` (
  `lease_id` int(11) NOT NULL,
  `space_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_lease_spaces`
--

INSERT INTO `garage_lease_spaces` (`lease_id`, `space_id`) VALUES
(15, 42),
(15, 43),
(15, 44),
(16, 45),
(17, 47),
(17, 48),
(17, 49),
(17, 50);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_payments`
--

CREATE TABLE `garage_payments` (
  `id` int(11) NOT NULL,
  `debt_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(20) NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `garage_payments`
--

INSERT INTO `garage_payments` (`id`, `debt_id`, `amount`, `method`, `paid_at`) VALUES
(8, 21, 1679664.18, 'efectivo', '2025-06-19 13:26:06');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_spaces`
--

CREATE TABLE `garage_spaces` (
  `id` int(11) NOT NULL,
  `garage_id` int(11) NOT NULL,
  `space_number` varchar(50) NOT NULL,
  `status` enum('free','occupied') NOT NULL DEFAULT 'free'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_spaces`
--

INSERT INTO `garage_spaces` (`id`, `garage_id`, `space_number`, `status`) VALUES
(42, 5, '1', 'occupied'),
(43, 5, '2', 'occupied'),
(44, 5, '3', 'occupied'),
(45, 5, '4', 'occupied'),
(46, 5, '5', 'free'),
(47, 5, '6', 'occupied'),
(48, 5, '7', 'occupied'),
(49, 5, '8', 'occupied'),
(50, 5, '9', 'occupied'),
(51, 5, '10', 'free');

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
(11, 8, 6, '2025-06-19', '2025-06-30', 157500.00, 0.00, 'current', '2025-06-19 13:21:14', 0.00),
(12, 7, 8, '2025-06-19', '2025-06-30', 31500.00, 0.00, 'current', '2025-06-19 13:21:34', 0.00);

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
(7, 'DEPTO BELGRANO', 'Belgrano 1530', 'Departamento', 2, 25.00, 350000.00, NULL, '2025-06-18 17:04:07'),
(8, 'CODIGOCASA1', 'Calle falsa 123', 'Departamento', 1, 1.00, NULL, NULL, '2025-06-19 11:54:54');

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
(28, 11, '2025-06-19', 150000.00, 157500.00, ''),
(29, 12, '2025-06-19', 25000.00, 26250.00, ''),
(30, 12, '2025-06-19', 26250.00, 31500.00, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rent_history_cochera`
--

CREATE TABLE `rent_history_cochera` (
  `id` int(11) NOT NULL,
  `lease_id` int(11) NOT NULL,
  `change_date` date NOT NULL,
  `old_rent` decimal(10,2) NOT NULL,
  `new_rent` decimal(10,2) NOT NULL,
  `percent` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rent_history_cochera`
--

INSERT INTO `rent_history_cochera` (`id`, `lease_id`, `change_date`, `old_rent`, `new_rent`, `percent`) VALUES
(28, 15, '2025-06-19', 279944.03, 559888.06, 100.00),
(29, 16, '2025-06-19', 58321.68, 116643.36, 100.00),
(30, 17, '2025-06-19', 178853.10, 357706.20, 100.00);

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
(6, 'augustobasquez@gmail.com', NULL, 'Augusto', 'Basquez', 37925831, '3329684696', 'active', '2025-06-18 17:03:24'),
(7, 'marcos@marcos.com', NULL, 'Marcos', 'Taurizano', 123123, '123131', 'active', '2025-06-19 09:51:56'),
(8, 'pablo@pablo', NULL, 'Pablo', 'Corbelli', 93423, '1231231', 'active', '2025-06-19 09:56:11');

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
  ADD UNIQUE KEY `uq_lease_type_period` (`lease_id`,`type`,`description`(60));

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
-- Indices de la tabla `garages`
--
ALTER TABLE `garages`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `garage_debts`
--
ALTER TABLE `garage_debts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_lease_type_period` (`lease_id`,`type`,`description`(60)),
  ADD UNIQUE KEY `uq_garage_debt` (`garage_lease_id`,`type`,`description`(60));

--
-- Indices de la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tenant` (`tenant_id`);

--
-- Indices de la tabla `garage_lease_spaces`
--
ALTER TABLE `garage_lease_spaces`
  ADD PRIMARY KEY (`lease_id`,`space_id`),
  ADD KEY `space_id` (`space_id`);

--
-- Indices de la tabla `garage_payments`
--
ALTER TABLE `garage_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debt_id` (`debt_id`);

--
-- Indices de la tabla `garage_spaces`
--
ALTER TABLE `garage_spaces`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_garage` (`garage_id`);

--
-- Indices de la tabla `leases`
--
ALTER TABLE `leases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `tenant_id` (`tenant_id`);

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
-- Indices de la tabla `rent_history_cochera`
--
ALTER TABLE `rent_history_cochera`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lease_id` (`lease_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT de la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `garages`
--
ALTER TABLE `garages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `garage_debts`
--
ALTER TABLE `garage_debts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `garage_payments`
--
ALTER TABLE `garage_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `garage_spaces`
--
ALTER TABLE `garage_spaces`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT de la tabla `leases`
--
ALTER TABLE `leases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rent_history`
--
ALTER TABLE `rent_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de la tabla `rent_history_cochera`
--
ALTER TABLE `rent_history_cochera`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de la tabla `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
-- Filtros para la tabla `garage_debts`
--
ALTER TABLE `garage_debts`
  ADD CONSTRAINT `fk_garage_debt_lease` FOREIGN KEY (`garage_lease_id`) REFERENCES `garage_leases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  ADD CONSTRAINT `fk_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Filtros para la tabla `garage_lease_spaces`
--
ALTER TABLE `garage_lease_spaces`
  ADD CONSTRAINT `garage_lease_spaces_ibfk_1` FOREIGN KEY (`lease_id`) REFERENCES `garage_leases` (`id`),
  ADD CONSTRAINT `garage_lease_spaces_ibfk_2` FOREIGN KEY (`space_id`) REFERENCES `garage_spaces` (`id`);

--
-- Filtros para la tabla `garage_payments`
--
ALTER TABLE `garage_payments`
  ADD CONSTRAINT `garage_payments_ibfk_1` FOREIGN KEY (`debt_id`) REFERENCES `garage_debts` (`id`);

--
-- Filtros para la tabla `garage_spaces`
--
ALTER TABLE `garage_spaces`
  ADD CONSTRAINT `fk_garage` FOREIGN KEY (`garage_id`) REFERENCES `garages` (`id`);

--
-- Filtros para la tabla `leases`
--
ALTER TABLE `leases`
  ADD CONSTRAINT `leases_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`),
  ADD CONSTRAINT `leases_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

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
-- Filtros para la tabla `rent_history_cochera`
--
ALTER TABLE `rent_history_cochera`
  ADD CONSTRAINT `rent_history_cochera_ibfk_1` FOREIGN KEY (`lease_id`) REFERENCES `garage_leases` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
