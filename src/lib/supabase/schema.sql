-- Schema for Proección y Moda JLS - Sistema de Turnos
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STORES TABLE (Tiendas)
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
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
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_id TEXT UNIQUE NOT NULL,
  phone TEXT,
  photo_url TEXT,
  work_permission TEXT NOT NULL CHECK (work_permission IN ('koaj_only', 'quest_only', 'both')),
  employee_type TEXT NOT NULL CHECK (employee_type IN ('complete', 'weekends_only', 'weekends_half', 'hourly', 'on_call')),
  available_days TEXT[] DEFAULT '{}', -- For on_call type: ['monday', 'tuesday', etc.]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_work_permission ON employees(work_permission);
CREATE INDEX IF NOT EXISTS idx_employees_type ON employees(employee_type);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

-- ============================================
-- USERS TABLE (Usuarios para login)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS shifts (
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

-- Indexes for schedule queries
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_store ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date_store ON shifts(shift_date, store_id);

-- ============================================
-- COWORKER_HISTORY TABLE (Para evitar repetir compañeros)
-- ============================================
CREATE TABLE IF NOT EXISTS coworker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_1 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_2 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_date, store_id, employee_1, employee_2)
);

CREATE INDEX IF NOT EXISTS idx_coworker_date ON coworker_history(shift_date);
CREATE INDEX IF NOT EXISTS idx_coworker_employee ON coworker_history(employee_1, employee_2);

-- ============================================
-- SEED DATA (Datos iniciales)
-- ============================================

-- Insert 4 stores
INSERT INTO stores (name, display_name, address, schedule_weekday, schedule_weekend, lunch_minutes, color_theme, slots_required) VALUES
  ('koaj_centro', 'KOAJ Centro B24', 'Calle 24 #123, Fusagasugá', '9:00-19:00', '10:00-19:00', 30, 'blue', 2),
  ('koaj_manila', 'KOAJ Manila B65', 'Barrio Manila, Fusagasugá', '9:30-19:30', '10:00-19:00', 30, 'green', 2),
  ('koaj_avvenida', 'KOAJ Avenida D13', 'Avenida 13 #456, Fusagasugá', '10:00-20:00', '10:00-20:00', 30, 'purple', 2),
  ('quest', 'QUEST', 'Centro Comercial, Fusagasugá', '9:00-21:00', '9:00-21:00', 60, 'orange', 1);

-- Insert default users (passwords are hashed with bcrypt, cost 10)
-- Developer: admin / admin123
-- Manager: gerente / gerente123
-- Note: These are example hashes. In production, use proper password hashing.
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$rH0zZU5nRz.XfZqVqJ8tLe.6qQqKzWzVqJ8tLe.6qQqKzWzVqJ8tL', 'developer'),
  ('gerente', '$2b$10$rH0zZU5nRz.XfZqVqJ8tLe.6qQqKzWzVqJ8tL.6qQqKzWzVqJ8tL', 'manager');

-- Insert sample employees
INSERT INTO employees (full_name, document_id, phone, work_permission, employee_type, available_days) VALUES
  -- KOAJ only employees (complete)
  ('María Rodríguez', '12345678', '3001234567', 'koaj_only', 'complete', '{}'),
  ('Juan Pérez', '12345679', '3001234568', 'koaj_only', 'complete', '{}'),
  ('Ana García', '12345680', '3001234569', 'koaj_only', 'complete', '{}'),
  ('Carlos López', '12345681', '3001234570', 'koaj_only', 'weekends_only', '{}'),
  ('Lucía Martínez', '12345682', '3001234571', 'koaj_only', 'weekends_half', '{}'),

  -- QUEST only employees
  ('Pedro Sánchez', '12345683', '3001234572', 'quest_only', 'complete', '{}'),
  ('Sofía Ramírez', '12345684', '3001234573', 'quest_only', 'weekends_only', '{}'),

  -- Both permissions
  ('Diego Torres', '12345685', '3001234574', 'both', 'complete', '{}'),
  ('Valentina Díaz', '12345686', '3001234575', 'both', 'hourly', '{}'),
  ('Andrés Morales', '12345687', '3001234576', 'both', 'on_call', '{"monday","wednesday","friday"}'),
  ('Camila Herrera', '12345688', '3001234577', 'both', 'on_call', '{"tuesday","thursday","saturday"}');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
