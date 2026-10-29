<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
*/
$route['default_controller'] = 'welcome';
$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;

/*
| -------------------------------------------------------------------------
| LMS REST API ROUTING DEFINITIONS
| -------------------------------------------------------------------------
*/
$route['api/auth/login']          = 'api/auth/login';
$route['api/auth/google-login']   = 'api/auth/google_login';
$route['api/auth/check-email-status']['post'] = 'api/auth/check_email_status';
$route['api/auth/request-first-login-otp']  = 'api/auth/request_first_login_otp';
$route['api/auth/verify-first-login-otp']   = 'api/auth/verify_first_login_otp';
$route['api/auth/resend-first-login-otp']   = 'api/auth/resend_first_login_otp';
$route['api/auth/complete-first-login']     = 'api/auth/complete_first_login';
$route['api/auth/logout']         = 'api/auth/logout';
$route['api/auth/me']             = 'api/auth/me';
$route['api/dashboard/stats']     = 'api/dashboard/stats';

// Course Management Routes
$route['api/courses']['get']                    = 'api/courses/index';
$route['api/courses']['post']                   = 'api/courses/create';
$route['api/courses/(:num)']['get']             = 'api/courses/show/$1';
$route['api/courses/(:num)']['put']             = 'api/courses/update/$1';
$route['api/courses/(:num)']['delete']          = 'api/courses/delete/$1';
$route['api/courses/(:num)/publish']            = 'api/courses/publish/$1';
$route['api/courses/(:num)/unpublish']          = 'api/courses/unpublish/$1';

// Course Categories Routes
$route['api/categories']['get']                 = 'api/categories/index';
$route['api/categories']['post']                = 'api/categories/create';
$route['api/categories/(:num)']['delete']       = 'api/categories/delete/$1';

// Curriculum Modules Routes
$route['api/courses/(:num)/modules']['post']    = 'api/modules/create/$1';
$route['api/modules/(:num)']['put']             = 'api/modules/update/$1';
$route['api/modules/(:num)']['delete']          = 'api/modules/delete/$1';

// Lessons Routes
$route['api/courses/(:num)/lessons']['post']   = 'api/lessons/create_for_course/$1';
$route['api/courses/(:num)/lessons']['get']    = 'api/lessons/index_for_course/$1';
$route['api/modules/(:num)/lessons']['post']    = 'api/lessons/create/$1';
$route['api/lessons/(:num)']['get']             = 'api/lessons/show/$1';
$route['api/lessons/(:num)']['put']             = 'api/lessons/update/$1';
$route['api/lessons/(:num)']['delete']          = 'api/lessons/delete/$1';

// Materials Routes
$route['api/lessons/(:num)/materials']['post']  = 'api/materials/upload/$1';
$route['api/materials/(:num)/preview']['get']   = 'api/materials/preview/$1';
$route['api/materials/(:num)/stream']    = 'api/materials/stream/$1';
$route['api/materials/(:num)/download']  = 'api/materials/download/$1';
$route['api/materials/(:num)']['delete']        = 'api/materials/delete/$1';

// Phase 3: Course Assignments Routes
$route['api/course-assignments/learners']       = 'api/assignments/learners';
$route['api/course-assignments/batches']        = 'api/assignments/batches';
$route['api/course-assignments']['get']         = 'api/assignments/index';
$route['api/course-assignments']['post']        = 'api/assignments/create';
$route['api/course-assignments/(:num)']['delete'] = 'api/assignments/delete/$1';
$route['api/course-assignments/(:num)/admin-complete']['post'] = 'api/assignments/admin_complete/$1';
$route['api/course-assignments/(:num)/admin-reset']['post']    = 'api/assignments/admin_reset/$1';
$route['api/my-courses']                        = 'api/assignments/my_courses';

// Phase 3: Learning Progress Routes
$route['api/lessons/(:num)/view-material']         = 'api/progress/view_material/$1';
$route['api/lessons/(:num)/complete']           = 'api/progress/complete_lesson/$1';
$route['api/lessons/(:num)/uncomplete']         = 'api/progress/uncomplete_lesson/$1';
$route['api/lessons/(:num)/time-spent']         = 'api/progress/record_time_spent/$1';
$route['api/courses/(:num)/progress']           = 'api/progress/course_progress/$1';
$route['api/courses/(:num)/assessment']['get']     = 'api/assessments/course_assessment/$1';

// Phase 4: Assessment & Exam Routes
$route['api/assessments/import/template']['get']             = 'api/assessment_importer/template';
$route['api/assessments/import/upload']['post']               = 'api/assessment_importer/upload';
$route['api/assessments/import/session/(:any)']['get']        = 'api/assessment_importer/get_session/$1';
$route['api/assessments/import/session/(:any)/question/(:num)']['put'] = 'api/assessment_importer/update_question/$1/$2';
$route['api/assessments/import/confirm']['post']              = 'api/assessment_importer/confirm';
$route['api/assessments/import/cancel']['post']               = 'api/assessment_importer/cancel';

$route['api/assessments']['get']                       = 'api/assessments/index';
$route['api/assessments']['post']                      = 'api/assessments/create';
$route['api/assessments/(:num)']['get']                = 'api/assessments/show/$1';
$route['api/assessments/(:num)']['put']                = 'api/assessments/update/$1';
$route['api/assessments/(:num)']['delete']             = 'api/assessments/delete/$1';
$route['api/assessments/(:num)/questions']['post']     = 'api/assessments/add_question/$1';
$route['api/questions/(:num)']['put']                  = 'api/assessments/update_question/$1';
$route['api/questions/(:num)']['delete']               = 'api/assessments/delete_question/$1';

$route['api/my-assessments']                           = 'api/assessments/my_assessments';
$route['api/assessments/(:num)/start']['post']         = 'api/assessments/start/$1';
$route['api/assessment-attempts/(:num)/submit']['post'] = 'api/assessments/submit/$1';
$route['api/assessment-attempts/(:num)/result']['get']  = 'api/assessments/result/$1';
$route['api/trainee-performance']['get']               = 'api/assessments/performance';

// Phase 5: User Governance & Administration
$route['api/users/roles']['get']                       = 'api/users/roles';
$route['api/users']['get']                             = 'api/users/index';
$route['api/users']['post']                            = 'api/users/create';
$route['api/users/(:num)']['get']                      = 'api/users/show/$1';
$route['api/users/(:num)/details']['get']              = 'api/users/learner_details/$1';
$route['api/users/(:num)']['put']                      = 'api/users/update/$1';
$route['api/users/(:num)']['delete']                   = 'api/users/delete/$1';
$route['api/users/(:num)/status']['patch']             = 'api/users/toggle_status/$1';

// Phase 5: Enterprise Reporting & Analytics
$route['api/reports/overview']['get']                  = 'api/reports/overview';
$route['api/reports/courses']['get']                   = 'api/reports/courses';
$route['api/reports/compliance']['get']                = 'api/reports/compliance';

// Phase 5: In-App Notifications
$route['api/notifications']['get']                     = 'api/notifications/index';
$route['api/notifications/unread-count']['get']        = 'api/notifications/unread_count';
$route['api/notifications/(:num)/read']['patch']        = 'api/notifications/mark_read/$1';
$route['api/notifications/read-all']['post']           = 'api/notifications/read_all';

// Phase 5: Security & Activity Audit Logs
$route['api/audit-logs']['get']                        = 'api/auditLogs/index';

// Phase 6: Certificate Generation & Verification
$route['api/certificates']['get']                      = 'api/certificates/index';
$route['api/certificates/(:num)']['get']              = 'api/certificates/show/$1';
$route['api/certificates/verify/(:any)']['get']        = 'api/certificates/verify/$1';
$route['api/certificates/check-eligibility']['post']   = 'api/certificates/check_eligibility';

// User Governance: Batches & Segregation
$route['api/users/batches']['get']                     = 'api/users/batches';

// Google Sheets Synchronization
$route['api/google-sheets/sync']['post']               = 'api/google_sheets/sync';
$route['api/google-sheets/webhook']['post']            = 'api/google_sheets/webhook';
$route['api/google-sheets/status']['get']              = 'api/google_sheets/status';
$route['api/google-sheets/config']['get']              = 'api/google_sheets/config';
$route['api/google-sheets/config']['put']              = 'api/google_sheets/update_config';

// Course Catalog & Self-Enrollment Requests
$route['api/enrollments/catalog']['get']               = 'api/enrollments/catalog';
$route['api/enrollments/request']['post']              = 'api/enrollments/request';
$route['api/enrollments/requests']['get']              = 'api/enrollments/requests';
$route['api/enrollments/pending-count']['get']         = 'api/enrollments/pending_count';
$route['api/enrollments/(:num)/approve']['post']       = 'api/enrollments/approve/$1';
$route['api/enrollments/(:num)/reject']['post']        = 'api/enrollments/reject/$1';

