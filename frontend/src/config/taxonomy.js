/**
 * Enterprise LMS Taxonomy Configuration
 * Centralized Single Source of Truth for Corporate Departments & Course Categories
 */

export const DEPARTMENTS = [
  'Recruitment',
  'Corporate Functions',
];

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((dept) => ({
  value: dept,
  label: dept,
}));

export const DEFAULT_COURSE_CATEGORIES = [
  'Fresher Training Program',
  'Lateral Training Program',
  'Continuous Learning Program',
  'Refresher Training Program',
  'ISMS',
  'EHS',
  'Assessment – Fresher',
  'Assessment – Lateral',
  'Assessment – Sourcing',
  'CEIPAL',
  'LinkedIn',
  'Communication',
  'Soft Skill',
  'Leadership',
  'Marketing',
];

export const CATEGORY_OPTIONS = DEFAULT_COURSE_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat,
}));
