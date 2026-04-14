-- Schema para Proección y Moda JLS - Sistema de Turnos
-- ESTE ARCHIVO LIMPIA LAS TABLAS EXISTENTES Y LAS VUELVE A CREAR
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- PRIMERO: ELIMINAR TABLAS EXISTENTES (en orden inverso por foreign keys)
-- ============================================
DROP TABLE IF EXISTS coworker_history CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- ============================================
-- Habilitar extensión UUID
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STORES TABLE (Tiendas)
-- ============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  address TEXT,
  schedule_weekday TEXT NOT NULL,
  schedule_weekend TEXT NOT NULL,
  lunch_minutes INTEGER NOT NULL DEFAULT 30,
  logo_url TEXT,
  color_theme TEXT NOT NULL,
  slots_required INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMPLOYEES TABLE (Empleados)
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_id TEXT UNIQUE NOT NULL,
  phone TEXT,
  photo_url TEXT,
  work_permission TEXT NOT NULL CHECK (work_permission IN ('koaj_only', 'quest_only', 'both')),
  employee_type TEXT NOT NULL CHECK (employee_type IN ('complete', 'weekends_only', 'weekends_half', 'hourly', 'on_call')),
  available_days TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_work_permission ON employees(work_permission);
CREATE INDEX idx_employees_type ON employees(employee_type);
CREATE INDEX idx_employees_active ON employees(is_active);

-- ============================================
-- USERS TABLE (Usuarios para login)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('developer', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHIFTS TABLE (Turnos)
-- ============================================
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by UUID REFERENCES users(id),
  is_auto_scheduled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_date, employee_id, start_time)
);

CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_store ON shifts(store_id);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_date_store ON shifts(shift_date, store_id);

-- ============================================
-- COWORKER_HISTORY TABLE
-- ============================================
CREATE TABLE coworker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_1 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_2 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_date, store_id, employee_1, employee_2)
);

CREATE INDEX idx_coworker_date ON coworker_history(shift_date);
CREATE INDEX idx_coworker_employee ON coworker_history(employee_1, employee_2);

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR FECHAS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (SEED DATA)
-- ============================================

-- 4 Tiendas
INSERT INTO stores (name, display_name, address, schedule_weekday, schedule_weekend, lunch_minutes, color_theme, slots_required) VALUES
  ('koaj_centro', 'KOAJ Centro B24', 'Calle 24 #123, Fusagasugá', '9:00-19:00', '10:00-19:00', 30, 'blue', 2),
  ('koaj_manila', 'KOAJ Manila B65', 'Barrio Manila, Fusagasugá', '9:30-19:30', '10:00-19:00', 30, 'green', 2),
  ('koaj_avvenida', 'KOAJ Avenida D13', 'Avenida 13 #456, Fusagasugá', '10:00-20:00', '10:00-20:00', 30, 'purple', 2),
  ('quest', 'QUEST', 'Centro Comercial, Fusagasugá', '9:00-21:00', '9:00-21:00', 60, 'orange', 1);

-- Usuarios de login (contraseñas en texto plano para desarrollo)
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', 'admin123', 'developer'),
  ('gerente', 'gerente123', 'manager');

-- Empleados de ejemplo
INSERT INTO employees (full_name, document_id, phone, work_permission, employee_type, available_days) VALUES
  ('María Rodríguez', '12345678', '3001234567', 'koaj_only', 'complete', '{}'),
  ('Juan Pérez', '12345679', '3001234568', 'koaj_only', 'complete', '{}'),
  ('Ana García', '12345680', '3001234569', 'koaj_only', 'complete', '{}'),
  ('Carlos López', '12345681', '3001234570', 'koaj_only', 'weekends_only', '{}'),
  ('Lucía Martínez', '12345682', '3001234571', 'koaj_only', 'weekends_half', '{}'),
  ('Roberto Gómez', '12345690', '3001234580', 'koaj_only', 'complete', '{}'),
  ('Patricia Silva', '12345691', '3001234581', 'koaj_only', 'complete', '{}'),
  ('Fernando Ruiz', '12345692', '3001234582', 'koaj_only', 'hourly', '{}'),
  ('Pedro Sánchez', '12345683', '3001234572', 'quest_only', 'complete', '{}'),
  ('Sofía Ramírez', '12345684', '3001234573', 'quest_only', 'weekends_only', '{}'),
  ('Jorge Castillo', '12345693', '3001234583', 'quest_only', 'complete', '{}'),
  ('Diego Torres', '12345685', '3001234574', 'both', 'complete', '{}'),
  ('Valentina Díaz', '12345686', '3001234575', 'both', 'hourly', '{}'),
  ('Andrés Morales', '12345687', '3001234576', 'both', 'on_call', '{"monday","wednesday","friday"}'),
  ('Camila Herrera', '12345688', '3001234577', 'both', 'on_call', '{"tuesday","thursday","saturday"}'),
  ('Mariana Vega', '12345694', '3001234584', 'both', 'complete', '{}'),
  ('Óscar Mendoza', '12345695', '3001234585', 'both', 'weekends_only', '{}');
