export type UserRole = "admin" | "receptionist" | "doctor";
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TokenStatus = "waiting" | "calling" | "in_session" | "completed" | "no_show";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "referred";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone?: string;
  specialization?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface Patient {
  id: string;
  full_name: string;
  id_card_number: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  primary_language?: string;
  medical_history?: string;
  allergies?: string;
  blood_group?: string;
  registered_by?: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  fee: number;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  service_id?: string;
  scheduled_at: string;
  status: AppointmentStatus;
  chief_complaint?: string;
  notes?: string;
  created_at: string;
  patient?: Patient;
  doctor?: Profile;
  service?: Service;
}

export interface Token {
  id: string;
  token_number: string;
  appointment_id?: string;
  patient_id: string;
  doctor_id?: string;
  service_id?: string;
  status: TokenStatus;
  category: string;
  issued_at: string;
  called_at?: string;
  session_start?: string;
  session_end?: string;
  wait_minutes?: number;
  date: string;
  patient?: Patient;
  doctor?: Profile;
  service?: Service;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  appointment_id?: string;
  token_id?: string;
  patient_id: string;
  doctor_id?: string;
  service_id?: string;
  amount: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  issued_at: string;
  patient?: Patient;
  doctor?: Profile;
  service?: Service;
}

export interface Session {
  id: string;
  appointment_id?: string;
  token_id?: string;
  patient_id: string;
  doctor_id: string;
  status: SessionStatus;
  chief_complaint?: string;
  history_of_illness?: string;
  examination_findings?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescription?: string;
  follow_up_date?: string;
  referral_doctor_id?: string;
  referral_notes?: string;
  vital_signs?: {
    bp?: string;
    pulse?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
    height?: number;
  };
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  created_at: string;
  patient?: Patient;
  doctor?: Profile;
  referral_doctor?: Profile;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_patients: number;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
