-- phpMyAdmin SQL Dump
-- version 4.9.11
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 01-07-2025 a las 09:16:32
-- Versión del servidor: 8.0.35
-- Versión de PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `c2801249_sm2`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `debts`
--

CREATE TABLE `debts` (
  `id` int NOT NULL,
  `lease_id` int NOT NULL,
  `type` enum('alquiler','deposito','luz','gas','agua','otros') COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` date NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `debt_payments`
--

CREATE TABLE `debt_payments` (
  `id` int NOT NULL,
  `debt_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `method` varchar(50) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` int NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_id` int DEFAULT NULL,
  `tenant_id` int DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garages`
--

CREATE TABLE `garages` (
  `id` int NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_spaces` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garages`
--

INSERT INTO `garages` (`id`, `address`, `total_spaces`, `created_at`) VALUES
(7, 'ansaloni', 19, '2025-06-19 19:39:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_debts`
--

CREATE TABLE `garage_debts` (
  `garage_lease_id` int NOT NULL,
  `id` int NOT NULL,
  `lease_id` int NOT NULL,
  `type` enum('alquiler','deposito','luz','gas','agua','otros') COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` date NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_leases`
--

CREATE TABLE `garage_leases` (
  `id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `rent` decimal(10,2) NOT NULL,
  `deposit` decimal(10,2) NOT NULL,
  `increase_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `status` enum('current','terminated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'current'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_leases`
--

INSERT INTO `garage_leases` (`id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `increase_percent`, `status`) VALUES
(22, 9, '2025-06-02', '2026-06-19', '25000.00', '0.00', '0.00', 'current'),
(23, 18, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(24, 20, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(25, 16, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(26, 12, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(27, 11, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(28, 26, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'terminated'),
(29, 26, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(30, 21, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(31, 15, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(32, 25, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(33, 22, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(34, 14, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(35, 17, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(36, 10, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(37, 13, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current'),
(38, 24, '2025-06-06', '2025-06-06', '25000.00', '0.00', '0.00', 'current'),
(39, 23, '2025-06-06', '2026-06-06', '25000.00', '0.00', '0.00', 'current');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_lease_spaces`
--

CREATE TABLE `garage_lease_spaces` (
  `lease_id` int NOT NULL,
  `space_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_lease_spaces`
--

INSERT INTO `garage_lease_spaces` (`lease_id`, `space_id`) VALUES
(22, 62),
(23, 63),
(24, 64),
(25, 65),
(26, 66),
(27, 67),
(28, 68),
(29, 68),
(30, 69),
(31, 70),
(32, 71),
(33, 72),
(34, 73),
(35, 74),
(36, 75),
(37, 76),
(38, 77),
(39, 78);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_payments`
--

CREATE TABLE `garage_payments` (
  `id` int NOT NULL,
  `debt_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `garage_spaces`
--

CREATE TABLE `garage_spaces` (
  `id` int NOT NULL,
  `garage_id` int NOT NULL,
  `space_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('free','occupied') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `garage_spaces`
--

INSERT INTO `garage_spaces` (`id`, `garage_id`, `space_number`, `status`) VALUES
(62, 7, '1', 'occupied'),
(63, 7, '2', 'occupied'),
(64, 7, '3', 'occupied'),
(65, 7, '4', 'occupied'),
(66, 7, '5', 'occupied'),
(67, 7, '6', 'occupied'),
(68, 7, '7', 'free'),
(69, 7, '8', 'occupied'),
(70, 7, '9', 'occupied'),
(71, 7, '10', 'occupied'),
(72, 7, '11', 'occupied'),
(73, 7, '12', 'occupied'),
(74, 7, '13', 'occupied'),
(75, 7, '14', 'occupied'),
(76, 7, '15', 'occupied'),
(77, 7, '16', 'occupied'),
(78, 7, '17', 'occupied'),
(79, 7, '18', 'free'),
(80, 7, '19', 'free');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `leases`
--

CREATE TABLE `leases` (
  `id` int NOT NULL,
  `property_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `rent` decimal(10,2) DEFAULT NULL,
  `deposit` decimal(10,2) DEFAULT NULL,
  `status` enum('current','terminated') COLLATE utf8mb4_unicode_ci DEFAULT 'current',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `increase_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `update_period` int NOT NULL DEFAULT '12' COMMENT 'Cada cuántos meses se aplica el ajuste IPC'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `leases`
--

INSERT INTO `leases` (`id`, `property_id`, `tenant_id`, `start_date`, `end_date`, `rent`, `deposit`, `status`, `created_at`, `increase_percent`, `update_period`) VALUES
(20, 11, 27, '2025-04-01', '2027-03-30', '280000.00', '0.00', 'current', '2025-06-25 17:10:49', '0.00', 4),
(21, 21, 28, '2024-12-01', '2026-11-30', '300000.00', '0.00', 'current', '2025-06-25 17:12:52', '0.00', 4),
(22, 20, 30, '2025-01-01', '2027-12-31', '280000.00', '0.00', 'current', '2025-06-25 17:14:56', '0.00', 4),
(23, 19, 31, '2025-05-01', '2027-04-30', '280000.00', '0.00', 'current', '2025-06-25 17:15:44', '0.00', 4),
(24, 30, 46, '2025-01-01', '2027-12-31', '600000.00', '0.00', 'current', '2025-06-25 17:16:45', '0.00', 4),
(25, 38, 45, '2025-01-01', '2026-01-31', '350000.00', '0.00', 'current', '2025-06-25 17:18:26', '0.00', 4),
(26, 32, 47, '2025-04-01', '2027-03-31', '300000.00', '0.00', 'current', '2025-06-25 17:19:21', '0.00', 4),
(27, 28, 38, '2025-01-01', '2026-12-31', '213000.00', '0.00', 'current', '2025-06-25 17:20:14', '0.00', 4),
(28, 35, 51, '2025-01-01', '2026-12-31', '170000.00', '0.00', 'current', '2025-06-25 17:20:43', '0.00', 4),
(29, 34, 52, '2025-01-01', '2026-12-31', '280000.00', '0.00', 'current', '2025-06-25 17:22:25', '0.00', 4),
(30, 33, 48, '2025-02-01', '2027-01-31', '400000.00', '0.00', 'current', '2025-06-25 17:23:05', '0.00', 4),
(31, 31, 50, '2025-01-01', '2026-12-31', '250000.00', '0.00', 'current', '2025-06-25 17:24:16', '0.00', 4),
(32, 36, 49, '2025-01-01', '2026-12-31', '99999999.99', '0.00', 'terminated', '2025-06-25 17:24:46', '0.00', 4),
(33, 36, 49, '2025-01-01', '2026-12-31', '350000.00', '0.00', 'current', '2025-06-25 17:26:09', '0.00', 12),
(34, 29, 39, '2025-01-01', '2026-12-31', '430000.00', '0.00', 'current', '2025-06-25 17:26:45', '0.00', 4),
(35, 23, 34, '2025-01-01', '2025-06-30', '200000.00', '0.00', 'current', '2025-06-25 17:28:30', '0.00', 6),
(36, 48, 33, '2025-03-01', '2027-02-28', '340000.00', '0.00', 'current', '2025-06-25 17:29:33', '0.00', 4),
(37, 24, 35, '2024-12-01', '2026-11-30', '300000.00', '0.00', 'current', '2025-06-25 17:35:49', '0.00', 4),
(38, 25, 37, '2025-01-01', '2026-12-31', '280000.00', '0.00', 'current', '2025-06-25 17:40:02', '0.00', 4),
(39, 26, 36, '2023-11-01', '2026-10-31', '230000.00', '0.00', 'current', '2025-06-25 17:41:20', '0.00', 6),
(40, 27, 32, '2024-08-01', '2026-07-31', '180000.00', '0.00', 'current', '2025-06-25 17:42:34', '0.00', 4),
(41, 22, 29, '2023-12-01', '2025-11-30', '370000.00', '0.00', 'current', '2025-06-25 17:43:56', '0.00', 6),
(42, 37, 42, '2025-01-01', '2026-12-31', '350000.00', '0.00', 'current', '2025-06-25 17:45:21', '0.00', 4),
(43, 39, 44, '2023-09-01', '2026-08-31', '200000.00', '0.00', 'current', '2025-06-25 17:47:07', '0.00', 12),
(44, 40, 43, '2025-01-01', '2026-12-31', '300000.00', '0.00', 'current', '2025-06-25 17:47:44', '0.00', 4),
(45, 41, 41, '2025-01-31', '2026-12-31', '300000.00', '0.00', 'current', '2025-06-25 17:48:31', '0.00', 4),
(46, 42, 40, '2025-03-01', '2025-08-31', '350000.00', '0.00', 'current', '2025-06-25 17:50:04', '0.00', 6),
(47, 47, 54, '2025-01-01', '2026-12-31', '330000.00', '0.00', 'current', '2025-06-25 17:51:04', '0.00', 6),
(48, 43, 55, '2024-10-01', '2026-09-30', '190000.00', '0.00', 'current', '2025-06-25 17:52:22', '0.00', 12),
(49, 44, 53, '2025-03-01', '2027-02-28', '250000.00', '0.00', 'current', '2025-06-25 17:55:05', '0.00', 4),
(50, 45, 56, '2025-01-01', '2026-12-31', '280000.00', '0.00', 'current', '2025-06-25 17:55:48', '0.00', 4),
(51, 46, 57, '2025-01-01', '2026-01-01', '280000.00', '0.00', 'current', '2025-06-25 17:56:19', '0.00', 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `properties`
--

CREATE TABLE `properties` (
  `id` int NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('Departamento','Casa','Local','Terreno') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rooms` tinyint DEFAULT NULL,
  `sqm` decimal(6,2) DEFAULT NULL,
  `price_rent` decimal(10,2) DEFAULT NULL,
  `expenses_share` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `properties`
--

INSERT INTO `properties` (`id`, `code`, `address`, `type`, `rooms`, `sqm`, `price_rent`, `expenses_share`, `created_at`) VALUES
(11, '1', 'HUMANES 1530 DPTO 1', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 15:55:49'),
(19, '2', 'HUMANES 1530 DPTO 2 ', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:56:21'),
(20, '3', 'HUMANES 1530 DPTO 3', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:56:43'),
(21, '4', 'HUMANES 1530 DPTO 4', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:57:01'),
(22, '5', 'HUMANES CASA ', 'Casa', NULL, NULL, NULL, NULL, '2025-06-25 16:57:27'),
(23, '6', 'SAN MARTIN 750 DPTO 1', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:58:07'),
(24, '7', 'SAN MARTIN 750 DPTO 2', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:58:22'),
(25, '8', 'SAN MARTIN 750 DPTO 3', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:58:32'),
(26, '9', 'SAN MARTIN 750 DPTO 4', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:58:44'),
(27, '10', 'SAN MARTIN 750 PLANTA ALTA', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 16:59:04'),
(28, '11', 'SAN MARTIN 750 LOCAL', 'Local', NULL, NULL, NULL, NULL, '2025-06-25 16:59:24'),
(29, '12', 'CASEROS CASA  ', 'Casa', NULL, NULL, NULL, NULL, '2025-06-25 17:00:22'),
(30, '13', 'PELLEGRINI LOCAL', 'Local', NULL, NULL, NULL, NULL, '2025-06-25 17:01:02'),
(31, '14', 'BALCARCE 164 DEPTO 1', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:01:26'),
(32, '15', 'BALCARCE 164 DEPTO 2', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:01:42'),
(33, '16', 'BALCARCE 164 DEPTO 3', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:01:55'),
(34, '17', 'BALCARCE 164 DEPTO 4', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:02:17'),
(35, '18', 'BALCARCE 164 PLANTA ALTA', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:02:33'),
(36, '19', 'BALCARCE LOCAL', 'Local', NULL, NULL, NULL, NULL, '2025-06-25 17:02:45'),
(37, '20', 'TRES DE FEBRERO DEPTO 1', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:03:05'),
(38, '21', 'TRES DE FEBRERO DEPTO 2', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:03:28'),
(39, '22', 'TRES DE FEBRERO DEPTO 3 PLANTA ALTA ', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:03:49'),
(40, '23', 'TRES DE FEBRERO DEPTO 4 PLANTA ALTA ', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:04:09'),
(41, '24', 'TRES DE FEBRERO 463 LOCAL', 'Local', NULL, NULL, NULL, NULL, '2025-06-25 17:04:34'),
(42, '25', 'TRES DE FEBRERO 467 LOCAL', 'Local', NULL, NULL, NULL, NULL, '2025-06-25 17:04:48'),
(43, '26', 'BALCARCE 850 DEPTO A', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:05:28'),
(44, '27', 'BALCARCE 850 DEPTO B', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:05:42'),
(45, '28', 'BALCARCE 850 DEPTO C', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:06:06'),
(46, '29', 'BALCARCE 850 DEPTO D', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:06:29'),
(47, '30', 'BALCARACE 850 CASA ', 'Casa', NULL, NULL, NULL, NULL, '2025-06-25 17:08:39'),
(48, '31', 'SAN MARTIN 750 DPTO 5', 'Departamento', NULL, NULL, NULL, NULL, '2025-06-25 17:37:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reminders`
--

CREATE TABLE `reminders` (
  `id` int NOT NULL,
  `tenant_id` int DEFAULT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `send_at` datetime DEFAULT NULL,
  `sent` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rent_history`
--

CREATE TABLE `rent_history` (
  `id` int NOT NULL,
  `lease_id` int NOT NULL,
  `change_date` date NOT NULL,
  `old_rent` decimal(10,2) NOT NULL,
  `new_rent` decimal(10,2) NOT NULL,
  `notes` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rent_history_cochera`
--

CREATE TABLE `rent_history_cochera` (
  `id` int NOT NULL,
  `lease_id` int NOT NULL,
  `change_date` date NOT NULL,
  `old_rent` decimal(10,2) NOT NULL,
  `new_rent` decimal(10,2) NOT NULL,
  `percent` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `settings`
--

CREATE TABLE `settings` (
  `key` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `value` varchar(200) COLLATE utf8mb4_general_ci NOT NULL
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
  `id` int NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dni` int NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tenants`
--

INSERT INTO `tenants` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `dni`, `phone`, `status`, `created_at`) VALUES
(9, 'silvio@gmail.com', NULL, 'silvio ', 'corti', 0, '', 'active', '2025-06-19 19:40:46'),
(10, 'guille@gmail.com', NULL, 'guillermo nicolas ', 'navarro', 0, '', 'active', '2025-06-22 19:24:05'),
(11, 'nelson@gmail.com', NULL, 'nelson', 'benitez', 0, '', 'active', '2025-06-22 19:25:01'),
(12, 'bargonamonica@gmail.com', NULL, 'monica', 'barbona', 0, '', 'active', '2025-06-22 19:25:41'),
(13, 'nicolerolon@gmail.com', NULL, 'nicole', 'rolon', 0, '', 'active', '2025-06-22 19:26:11'),
(14, 'montijorge@gmail.com', NULL, 'monti', 'jorge', 0, '', 'active', '2025-06-22 19:26:40'),
(15, 'fantilenatalia@gmail.com', NULL, 'natalia/valentin', 'fantile', 0, '', 'active', '2025-06-22 19:27:28'),
(16, 'castanoandres@gmail.com', NULL, 'castano', 'andres', 0, '', 'active', '2025-06-22 19:28:06'),
(17, 'juliomorosini@gmail.com', NULL, 'julio', 'morosini', 0, '', 'active', '2025-06-22 19:28:33'),
(18, 'cocozzoagustin@hotmail.com', NULL, 'cocozzo ', 'agustin', 0, '', 'active', '2025-06-22 19:29:15'),
(20, 'cocozzoagustin@gmail.com', NULL, 'cocozzo ', 'agustin jose', 0, '', 'active', '2025-06-22 19:30:03'),
(21, 'lucascomment@gmail.com', NULL, 'lucas', 'comment', 0, '', 'active', '2025-06-22 19:30:33'),
(22, 'nestorgonzalez@gmail.com', NULL, 'nestor', 'gonzalez', 0, '', 'active', '2025-06-22 19:31:14'),
(23, 'sandrasosa@gmail.com', NULL, 'sandra', 'sosa', 0, '', 'active', '2025-06-22 19:31:55'),
(24, 'victorsegalat@gmail.com', NULL, 'victor', 'segalat', 0, '', 'active', '2025-06-22 19:33:48'),
(25, 'pablogol@gmail.com', NULL, 'pablo', 'gol ', 0, '', 'active', '2025-06-22 19:34:32'),
(26, 'burgosguillermo@gmail.com', NULL, 'guillermo', 'burgos', 0, '', 'active', '2025-06-22 19:35:06'),
(27, 'JOANADANIELA@GMAIL.COM', NULL, 'JOANA DANIELA ', 'FERREYRA', 4111980, '3329575093', 'active', '2025-06-25 15:57:32'),
(28, 'FRANNOIR@GMAIL.COM', NULL, 'FRANCISCO', 'NOIR', 41688727, '3329383811', 'active', '2025-06-25 15:58:31'),
(29, 'JONABE@GMAIL.COM', NULL, 'JONATHAN ', 'BE', 38858565, '3329553497', 'active', '2025-06-25 15:59:41'),
(30, 'IVANBILLO@GMAIL.COM', NULL, 'IVAN GABRIEL', 'BILLORDO', 41688455, '3329537380', 'active', '2025-06-25 16:01:00'),
(31, 'ANAPAIZ@GMAIL.COM', NULL, 'ANALIA', 'PAIZ', 27817829, '3329392735', 'active', '2025-06-25 16:02:59'),
(32, 'VIKICASTILLO@GMAIL.COM', NULL, 'MARIA VICTORIA', 'CASTILLO', 36990066, '3329477211', 'active', '2025-06-25 16:04:35'),
(33, 'AEVILEO@GMAIL.COM', NULL, 'LEONARDO HECTOR', 'AEBI', 30740821, '3329512434', 'active', '2025-06-25 16:05:20'),
(34, 'MIGUELVILLEGAS@GMAIL.COM', NULL, 'MIGUEL ANGEL MARCELO', 'VILLEGAS', 10122331, '3329590710', 'active', '2025-06-25 16:06:15'),
(35, 'BLANCOJULIANA@GMAIL.COM', NULL, 'JULIANA ESTEFANIA', 'BLANCO', 37076688, '3329339417', 'active', '2025-06-25 16:06:54'),
(36, 'RENATALAFUENTE@GMAIL.COM', NULL, 'RENATA MICAELA', 'LAFUENTE', 41579892, '3329339264', 'active', '2025-06-25 16:08:36'),
(37, 'LOURDESGI@GMAIL.COM', NULL, 'GIMENEZ ', 'LOURDES', 39553306, '3329320570', 'active', '2025-06-25 16:09:56'),
(38, 'ALBARRACINMARTIN@GMAIL.COM', NULL, 'ALBARRACIN', 'HERNAN MARTIN', 31756897, '3329541656', 'active', '2025-06-25 16:16:09'),
(39, 'ROLFOLOURDES@GMAIL.COM', NULL, 'LOURDES', 'ROLFO', 32193531, '3329691015', 'active', '2025-06-25 16:25:32'),
(40, 'FELIPE@GMAIL.COM', NULL, 'FELIPE', 'BARAYBAR', 43264000, '3329696757', 'active', '2025-06-25 16:30:01'),
(41, 'MATIGOMEZ@GMAIL.COM', NULL, 'MATIAS', 'GOMEZ', 36660397, '3329570387', 'active', '2025-06-25 16:31:06'),
(42, 'SABBIONIOMAR@GMAIL.COM', NULL, 'RICARDO OMAR', 'SABBIONI', 10673148, '3329539914', 'active', '2025-06-25 16:32:04'),
(43, 'CHIROLA@GMAIL.COM', NULL, 'CLAUDIO NESTROR', 'DIEZ', 18206805, '3329641952', 'active', '2025-06-25 16:33:05'),
(44, 'DAMIANPUGLIESE@GMAIL.COM', NULL, 'CARLOS DAMIAN ', 'PUGLIESE', 35902833, '3329644097', 'active', '2025-06-25 16:35:14'),
(45, 'LOPEZCRISTIAN@GMAIL.COM', NULL, 'CRISTIAN VALENTIN', 'LOPEZ', 43055616, '3329634310', 'active', '2025-06-25 16:37:12'),
(46, 'ARREGUIMAT@HOTMAIL.COM', NULL, 'ARREGUI', 'CRISTIAN MATIAS ', 30050245, '1144017646', 'active', '2025-06-25 16:39:31'),
(47, 'ZAPATAALAN@GMAIL.COM', NULL, 'ALAN ESTEBAN', 'ZAPATA', 43741714, '3329329720', 'active', '2025-06-25 16:40:41'),
(48, 'NATICLAVERINI@HOTMAIL.COM', NULL, 'NATALIA LUJAN', 'CLAVERINI', 25016989, '3329568472', 'active', '2025-06-25 16:41:28'),
(49, 'HIDALGO@GMAIL.COM', NULL, 'MARIA MARTA', 'HIDALGO', 12208290, '3329613413', 'active', '2025-06-25 16:42:48'),
(50, 'CHURRUARINWLTER@GMAIL.COM', NULL, 'WALTER IGNACIO', 'CHURRUARIN', 21679077, '3329596900', 'active', '2025-06-25 16:44:27'),
(51, 'BALUSTROMARISA@GMAIL.COM', NULL, 'MARISA ELENA', 'BALUSTRO', 23033711, '3329467476', 'active', '2025-06-25 16:45:21'),
(52, 'BRUCHEZNATALIA@GMAIL.COM', NULL, 'NATALIA SOLEDAD ', 'BRUCHEZ', 31193578, '3329635200', 'active', '2025-06-25 16:46:14'),
(53, 'LEMA@GMAIL.COM', NULL, 'CARLOS JESUS', 'LEMA', 40305671, '1123229100', 'active', '2025-06-25 16:47:22'),
(54, 'ANTOORTEGA@GMAIL.COM', NULL, 'ANTONELLA SOLGE', 'ORTEGA', 40650534, '332948946', 'active', '2025-06-25 16:48:43'),
(55, 'VEGACAMILA@GMAIL.COM', NULL, 'CAMILA ROSARIO', 'VEGA', 38858516, '3329318732', 'active', '2025-06-25 16:49:32'),
(56, 'CLAUZARATE@GMAIL.COM', NULL, 'CLAUDIA BEATRIZ', 'ZARATE', 22476435, '3329468309', 'active', '2025-06-25 16:50:22'),
(57, 'MACIEL@GMAIL.COM', NULL, 'DARIO EDUARDO', 'MACIEL', 29077170, '1141463053', 'active', '2025-06-25 16:53:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','staff') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT de la tabla `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `garages`
--
ALTER TABLE `garages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `garage_debts`
--
ALTER TABLE `garage_debts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT de la tabla `garage_leases`
--
ALTER TABLE `garage_leases`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `garage_payments`
--
ALTER TABLE `garage_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `garage_spaces`
--
ALTER TABLE `garage_spaces`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT de la tabla `leases`
--
ALTER TABLE `leases`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT de la tabla `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT de la tabla `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rent_history`
--
ALTER TABLE `rent_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT de la tabla `rent_history_cochera`
--
ALTER TABLE `rent_history_cochera`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
