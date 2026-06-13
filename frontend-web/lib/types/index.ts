// User types
export type UserRole = 'student' | 'teacher' | 'admin';
export type Gender = 'male' | 'female';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  student_profile?: StudentProfile;
  teacher_profile?: TeacherProfile;
}

export interface LegacyFormEntry {
  question: string;
  answer: string;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  gender: Gender;
  profile_photo?: string;
  /** URL complète (Spaces CDN pour .webp, disk public pour legacy) — accesseur backend */
  profile_photo_url?: string | null;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contact?: string;
  legacy_form_data?: LegacyFormEntry[];
}

export interface TeacherProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  gender?: Gender;
  profile_photo?: string;
  /** URL complète (Spaces CDN pour .webp, disk public pour legacy) — accesseur backend */
  profile_photo_url?: string | null;
  phone?: string;
  specialization: string;
  bio?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: UserRole;
  phone?: string;
  specialization?: string;
  bio?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// Program types
export interface ProgramSchedule {
  day: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  start_time: string; // Format HH:MM
  end_time: string; // Format HH:MM
}

export interface Program {
  id: number;
  name: string;
  description: string;
  price: number;
  max_installments: number;
  default_class_id?: number;
  active: boolean;
  created_by: number;
  teacher_id: number;
  /** @deprecated L'emploi du temps est désormais porté par la classe (ClassModel.schedule) */
  schedule?: ProgramSchedule[];
  subject: string;
  subject_description?: string;
  enrollment_conditions?: string;
  creator?: User;
  teacher?: User;
  classes?: ClassModel[];
  default_class?: ClassModel;
  // Levels (niveaux supérieurs)
  levels?: ProgramLevel[];
  levels_count?: number;
  created_at: string;
  updated_at: string;
}

// Program Level types (Niveaux de programme)
export interface ProgramLevelActivation {
  id: number;
  program_level_id: number;
  class_id: number;
  start_date?: string;
  end_date?: string;
  schedule?: ProgramSchedule[] | null;
  activated_by: number;
  activated_at: string;
  class?: ClassModel;
  program_level?: ProgramLevel;
  activator?: User;
  created_at: string;
  updated_at: string;
}

export interface ClassCurrentPeriod {
  level_number: number;
  level_name: string | null;
  schedule: ProgramSchedule[] | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ProgramLevel {
  id: number;
  program_id: number;
  level_number: number; // 2, 3, 4... (niveau 1 = programme principal)
  name: string;
  description?: string;
  price: number;
  max_installments: number;
  schedule?: ProgramSchedule[];
  teacher_id?: number;
  is_active: boolean;
  // Relations
  program?: Program;
  teacher?: User;
  activations?: ProgramLevelActivation[];
  // Computed
  has_enrollments?: boolean;
  enrollments_count?: number;
  created_at: string;
  updated_at: string;
}

// Reinscription types
export interface AvailableReinscription {
  program: Program;
  level: ProgramLevel;
  current_level: number;
}

// Class types (Promotions/Cohorts)
export type ClassStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface ClassModel {
  id: number;
  program_id: number;
  name: string;
  academic_year: string; // Format: "2025/2026"
  start_date: string;
  end_date: string;
  max_students?: number;
  status: ClassStatus;
  zoom_link?: string;
  schedule: ProgramSchedule[]; // Jours/heures de cours de la classe (niveau 1)
  program?: Program;
  enrollments?: Enrollment[];
  sessions?: Session[];
  enrolled_students_count?: number;
  enrolled_count?: number;
  remaining_capacity?: number;
  parent_class_id?: number | null;
  parent_class?: ClassModel;
  child_classes?: ClassModel[];
  current_period?: ClassCurrentPeriod;
  level_activations?: ProgramLevelActivation[];
  created_at: string;
  updated_at: string;
}

// Session types
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Session {
  id: number;
  class_id: number;
  teacher_id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatus;
  color?: string | null;
  program_level_id?: number | null;
  level_number?: number;
  // Replay fields
  replay_url?: string;
  replay_validity_days?: number;
  replay_added_at?: string;
  replay_valid?: boolean;
  replay_expires_at?: string;
  // Relations
  class?: ClassModel;
  teacher?: User;
  materials?: SessionMaterial[];
}

// Class Student type (returned by /classes/{id}/students endpoint)
export interface ClassStudent {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  student_profile?: StudentProfile;
  enrollment_status: EnrollmentStatus;
  payment_status?: 'paid' | 'partial'; // présent uniquement pour les niveaux 2+ (statut de réinscription)
  enrolled_at: string;
}

// Enrollment & Attendance types
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface Enrollment {
  id: number;
  student_id: number;
  class_id: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  expires_at?: string;
  student?: User;
  class?: ClassModel;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: number;
  session_id: number;
  student_id: number;
  attended: boolean;
  duration_minutes?: number;
  joined_at?: string;
  student?: User;
  session?: Session;
}

export interface AttendanceStatistics {
  total_sessions: number;
  attended_sessions: number;
  attendance_rate: number;
}

export type MessageAttachmentType = 'image' | 'pdf' | 'audio';

// Message types
export interface Message {
  id: number;
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
  content: string;
  attachment_path?: string | null;
  attachment_type?: MessageAttachmentType | null;
  attachment_original_name?: string | null;
  attachment_size?: number | null;
  attachment_url?: string | null;
  read_at?: string;
  sent_at: string;
  sender?: User;
  receiver?: User;
  group?: MessageGroup;
  created_at: string;
  updated_at: string;
}

export type MessageGroupType = 'program' | 'class' | 'custom';

export interface MessageGroup {
  id: number;
  name: string;
  type: MessageGroupType;
  program_id?: number;
  class_id?: number;
  created_by: number;
  students_can_write?: boolean;
  can_write?: boolean;
  program?: Program;
  class?: ClassModel;
  creator?: User;
  users?: User[];
  members_count?: number;
  last_message?: Message;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  user: User;
  last_message?: Message;
  unread_count: number;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Order types
export type PaymentMethod = 'stripe' | 'paypal' | 'free' | 'cash' | 'transfer';
export type OrderStatus = 'paid' | 'partial' | 'failed' | 'refunded';
export type PaymentStatus = 'scheduled' | 'succeeded' | 'failed' | 'refunded';

export interface OrderPayment {
  id: number;
  order_id: number;
  amount: number;
  installment_number: number;
  status: PaymentStatus;
  scheduled_at?: string;
  paid_at?: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  attempt_count?: number;
  next_retry_at?: string;
  last_attempt_at?: string;
  error_message?: string;
  // Régularisation
  recovery_for_payment_id?: number;
  is_recovery_payment?: boolean;
  is_recovered?: boolean; // Calculé: si ce paiement échoué a été régularisé
  recovery_payment?: OrderPayment; // Le paiement de régularisation (si échoué et régularisé)
  failed_payment_origin?: OrderPayment; // Le paiement échoué d'origine (si c'est une régularisation)
  created_at: string;
  updated_at: string;
}

// Payment History types (Historique des paiements avec régularisations)
export interface PaymentHistoryItem {
  id: number;
  installment_number: number;
  amount: number;
  status: PaymentStatus;
  scheduled_at?: string;
  paid_at?: string;
  error_message?: string;
  last_attempt_at?: string;
  is_recovered: boolean;
  recovery_payment?: {
    id: number;
    status: PaymentStatus;
    paid_at?: string;
    amount: number;
  };
}

export interface OrderPaymentHistory {
  id: number;
  program_name: string;
  level_name?: string;
  total_amount: number;
  installments_count: number;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  created_at: string;
  payments: PaymentHistoryItem[];
}

export interface Order {
  id: number;
  student_id?: number;
  program_id: number;
  class_id?: number;
  level_number: number; // 1 = programme principal, 2+ = niveaux supérieurs
  program_level_id?: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  installments_count: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  admin_notes?: string;
  stripe_checkout_session_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  student?: User;
  program?: Program;
  class?: ClassModel;
  program_level?: ProgramLevel;
  payments?: OrderPayment[];
  // Computed
  paid_amount?: number;
  remaining_amount?: number;
  successful_payments_count?: number;
  pending_payments_count?: number;
  failed_payments_count?: number;
  refunded_payments_count?: number;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  pending_revenue: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_payment_method: Record<PaymentMethod, number>;
}

// Tracking Forms types (Formulaires de suivi)
export type QuestionType = 'text' | 'multiple_choice';

export interface TrackingFormQuestion {
  id: number;
  form_id: number;
  question: string;
  type: QuestionType;
  options?: string[];
  order: number;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackingFormResponse {
  id: number;
  assignment_id: number;
  question_id: number;
  answer: string;
  question?: TrackingFormQuestion;
  created_at: string;
  updated_at: string;
}

export interface TrackingFormAssignment {
  id: number;
  form_id: number;
  student_id: number;
  sent_at: string;
  completed_at?: string;
  draft_saved_at?: string | null; // formulaire commencé puis mis en pause (brouillon)
  student?: User;
  form?: TrackingForm;
  responses?: TrackingFormResponse[];
  created_at: string;
  updated_at: string;
}

export interface TrackingForm {
  id: number;
  title: string;
  description?: string;
  created_by: number;
  is_active: boolean;
  creator?: User;
  questions?: TrackingFormQuestion[];
  assignments?: TrackingFormAssignment[];
  // Computed counts
  assignments_count?: number;
  completed_count?: number;
  pending_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackingFormData {
  title: string;
  description?: string;
  questions: {
    question: string;
    type: QuestionType;
    options?: string[];
    required?: boolean;
  }[];
}

export interface AssignFormData {
  student_ids?: number[];
  class_id?: number;
}

export interface SubmitFormResponseData {
  responses: {
    question_id: number;
    answer: string;
  }[];
}

// Quiz types
export type QuizQuestionType = 'multiple_choice' | 'free_text';

export interface QuizOption {
  id: number;
  question_id: number;
  option_text: string;
  is_correct?: boolean; // exposé uniquement en contexte admin/révision
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  type: QuizQuestionType;
  answer_explanation?: string | null;
  options?: QuizOption[];
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Quiz {
  id: number;
  session_id: number;
  class_id: number;
  title: string;
  description?: string;
  created_by: number;
  session?: Session;
  class?: ClassModel;
  creator?: User;
  questions?: QuizQuestion[];
  submissions_count?: number;
  // Champs calculés côté élève
  submitted?: boolean;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAnswer {
  id: number;
  submission_id: number;
  question_id: number;
  selected_option_id?: number;
  free_text_answer?: string;
  is_correct?: boolean | null;
  question?: QuizQuestion;
  selected_option?: QuizOption;
  created_at?: string;
  updated_at?: string;
}

export interface QuizSubmission {
  id: number;
  quiz_id: number;
  student_id: number;
  submitted_at: string;
  student?: User;
  answers?: QuizAnswer[];
  score?: QuizScore;
  created_at?: string;
  updated_at?: string;
}

export interface QuizScore {
  correct: number;
  incorrect: number;
  total: number;
}

export interface CreateQuizData {
  session_id: number;
  class_id: number;
  title: string;
  description?: string;
  questions: {
    question_text: string;
    type: QuizQuestionType;
    answer_explanation?: string;
    options?: { option_text: string; is_correct: boolean }[];
  }[];
}

export interface SubmitQuizData {
  answers: {
    question_id: number;
    selected_option_id?: number;
    free_text_answer?: string;
  }[];
}

// Notification types
export type NotificationType = 'session' | 'message' | 'enrollment' | 'material' | 'payment' | 'level' | 'tracking' | 'quiz' | 'other';
export type NotificationCategory =
  | 'payment_success'
  | 'payment_failed'
  | 'payment_action_required'
  | 'payment_uncollectible'
  | 'level_available'
  | null;

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  action_url?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
  by_type: Record<NotificationType, number>;
}

// Session Material types (Supports de cours)
export type MaterialFileType = 'pdf' | 'image' | 'video' | 'audio' | 'document' | 'other';

export interface SessionMaterial {
  id: number;
  session_id: number;
  title: string;
  file_path: string;
  file_type: MaterialFileType;
  file_size: number;
  uploaded_by: number;
  uploaded_at: string;
  session?: Session;
  uploader?: User;
  created_at: string;
  updated_at: string;
}
