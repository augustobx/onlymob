-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-06-2025 a las 22:15:13
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
(23, 9, 'alquiler', 'Alquiler July 2025', 3000000.00, '2025-06-18 17:06:40', '2025-07-18', 3000000.00),
(29, 9, 'otros', 'cochera', 150.00, '2025-06-18 17:10:10', '2025-06-18', 150.00);

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
(19, 23, 3000000.00, '2025-06-18 17:07:02', 'efectivo'),
(20, 29, 150.00, '2025-06-18 17:10:14', 'efectivo');

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
(4, 'MITRE 1500', 4, '2025-06-18 17:05:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_leases`
--

CREATE TABLE `garage_leases` (
  `id` int(11) NOT NULL,
  `space_id` int(11) NOT NULL,
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

INSERT INTO `garage_leases` (`id`, `space_id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `increase_percent`, `status`) VALUES
(4, 38, 6, '2025-06-01', '2025-06-30', 75000.00, 0.00, 0.00, 'current');

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
(38, 4, '1', 'occupied'),
(39, 4, '2', 'free'),
(40, 4, '3', 'free'),
(41, 4, '4', 'free');

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
(9, 7, 6, '2025-06-01', '2025-06-30', 3450000.00, 0.00, 'current', '2025-06-18 17:04:55', 0.00);

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
(7, 'DEPTO BELGRANO', 'Belgrano 1530', 'Departamento', 2, 25.00, 350000.00, NULL, '2025-06-18 17:04:07');

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
(23, 9, '2025-06-18', 3000000.00, 3450000.00, NULL);

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
(3, 4, '2025-06-18', 50000.00, 75000.00, 50.00);

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
(6, 'augustobasquez@gmail.com', NULL, 'Augusto', 'Basquez', 37925831, '3329684696', 'active', '2025-06-18 17:03:24');

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
-- Indices de la tabla `garages`
--
ALTER TABLE `garages`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_space` (`space_id`),
  ADD KEY `fk_tenant` (`tenant_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT de la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `garages`
--
ALTER TABLE `garages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `garage_spaces`
--
ALTER TABLE `garage_spaces`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT de la tabla `leases`
--
ALTER TABLE `leases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rent_history`
--
ALTER TABLE `rent_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `rent_history_cochera`
--
ALTER TABLE `rent_history_cochera`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
-- Filtros para la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  ADD CONSTRAINT `fk_space` FOREIGN KEY (`space_id`) REFERENCES `garage_spaces` (`id`),
  ADD CONSTRAINT `fk_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

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
