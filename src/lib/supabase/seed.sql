-- Seed Data para Proección y Moda JLS - Sistema de Turnos
-- Ejecutar después del schema.sql en el SQL Editor de Supabase

-- ============================================
-- STORES (4 Tiendas)
-- ============================================
INSERT INTO stores (name, display_name, address, schedule_weekday, schedule_weekend, lunch_minutes, color_theme, slots_required) VALUES
  ('koaj_centro', 'KOAJ Centro B24', 'Calle 24 #123, Fusagasugá', '9:00-19:00', '10:00-19:00', 30, 'blue', 2),
  ('koaj_manila', 'KOAJ Manila B65', 'Barrio Manila, Fusagasugá', '9:30-19:30', '10:00-19:00', 30, 'green', 2),
  ('koaj_avvenida', 'KOAJ Avenida D13', 'Avenida 13 #456, Fusagasugá', '10:00-20:00', '10:00-20:00', 30, 'purple', 2),
  ('quest', 'QUEST', 'Centro Comercial, Fusagasugá', '9:00-21:00', '9:00-21:00', 60, 'orange', 1)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  address = EXCLUDED.address,
  schedule_weekday = EXCLUDED.schedule_weekday,
  schedule_weekend = EXCLUDED.schedule_weekend,
  lunch_minutes = EXCLUDED.lunch_minutes,
  color_theme = EXCLUDED.color_theme,
  slots_required = EXCLUDED.slots_required;

-- ============================================
-- USERS (Login)
-- ============================================
-- Contraseñas: admin/admin123, gerente/gerente123
-- Los hashes son generados con bcrypt para desarrollo
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2a$10$rH0zZU5nRz.XfZqVqJ8tLe.6qQqKzWzVqJ8tLe.6qQqKzWzVqJ8tL', 'developer'),
  ('gerente', '$2a$10$rH0zZU5nRz.XfZqVqJ8tLe.6qQqKzWzVqJ8tL.6qQqKzWzVqJ8tL', 'manager')
ON CONFLICT (username) DO UPDATE SET
  role = EXCLUDED.role;

-- Para desarrollo, actualizamos las contraseñas a valores simples
-- NOTA: En producción, usar bcrypt real con hash seguro
UPDATE users SET password_hash = 'admin123' WHERE username = 'admin';
UPDATE users SET password_hash = 'gerente123' WHERE username = 'gerente';

-- ============================================
-- EMPLOYEES (Empleados de ejemplo)
-- ============================================
INSERT INTO employees (full_name, document_id, phone, work_permission, employee_type, available_days) VALUES
  -- KOAJ only employees (completos)
  ('María Rodríguez', '12345678', '3001234567', 'koaj_only', 'complete', '{}'),
  ('Juan Pérez', '12345679', '3001234568', 'koaj_only', 'complete', '{}'),
  ('Ana García', '12345680', '3001234569', 'koaj_only', 'complete', '{}'),
  ('Carlos López', '12345681', '3001234570', 'koaj_only', 'weekends_only', '{}'),
  ('Lucía Martínez', '12345682', '3001234571', 'koaj_only', 'weekends_half', '{}'),
  ('Roberto Gómez', '12345690', '3001234580', 'koaj_only', 'complete', '{}'),
  ('Patricia Silva', '12345691', '3001234581', 'koaj_only', 'complete', '{}'),
  ('Fernando Ruiz', '12345692', '3001234582', 'koaj_only', 'hourly', '{}'),

  -- QUEST only employees
  ('Pedro Sánchez', '12345683', '3001234572', 'quest_only', 'complete', '{}'),
  ('Sofía Ramírez', '12345684', '3001234573', 'quest_only', 'weekends_only', '{}'),
  ('Jorge Castillo', '12345693', '3001234583', 'quest_only', 'complete', '{}'),

  -- Both permissions (pueden trabajar en KOAJ y QUEST)
  ('Diego Torres', '12345685', '3001234574', 'both', 'complete', '{}'),
  ('Valentina Díaz', '12345686', '3001234575', 'both', 'hourly', '{}'),
  ('Andrés Morales', '12345687', '3001234576', 'both', 'on_call', '{"monday","wednesday","friday"}'),
  ('Camila Herrera', '12345688', '3001234577', 'both', 'on_call', '{"tuesday","thursday","saturday"}'),
  ('Mariana Vega', '12345694', '3001234584', 'both', 'complete', '{}'),
  ('Óscar Mendoza', '12345695', '3001234585', 'both', 'weekends_only', '{}')
ON CONFLICT (document_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  work_permission = EXCLUDED.work_permission,
  employee_type = EXCLUDED.employee_type,
  available_days = EXCLUDED.available_days,
  is_active = true;

-- ============================================
-- Verificación de datos
-- ============================================
-- Descomentar para verificar después del seed:
-- SELECT COUNT(*) as total_stores FROM stores;
-- SELECT COUNT(*) as total_employees FROM employees;
-- SELECT COUNT(*) as total_users FROM users;
-- SELECT * FROM employees WHERE is_active = true ORDER BY full_name;
