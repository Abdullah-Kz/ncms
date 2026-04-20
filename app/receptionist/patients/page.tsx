"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, ChevronRight } from "lucide-react";

// Defined OUTSIDE the component so it never re-mounts on state change
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && " *"}</label>
      {children}
    </div>
  );
}

interface FormState {
  full_name: string;
  id_card_number: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  primary_language: string;
  medical_history: string;
  allergies: string;
  blood_group: string;
}

const INITIAL_FORM: FormState = {
  full_name: "", id_card_number: "", date_of_birth: "", gender: "",
  phone: "", email: "", address: "", emergency_contact: "", emergency_phone: "",
  primary_language: "English", medical_history: "", allergies: "", blood_group: "",
};

export default function RegisterPatient() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.id_card_number.trim()) {
      toast.error("Name and ID card number are required");
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("id_card_number", form.id_card_number.trim())
        .maybeSingle();

      if (existing) {
        toast.error(`Patient already registered: ${existing.full_name}`);
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("patients")
        .insert({ ...form, id_card_number: form.id_card_number.trim(), registered_by: profile?.id })
        .select()
        .single();

      if (error) throw error;
      toast.success("Patient registered successfully!");
      router.push(`/receptionist/queue?patient_id=${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title">Patient Registration</h1>
        <p className="page-subtitle">Onboard new patients into the clinical ecosystem</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identity */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#4a9eff]/10 flex items-center justify-center">
              <UserPlus size={15} className="text-[#4a9eff]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Identity & Demographics</h2>
              <p className="text-xs text-[#475569]">Basic patient identification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input className="input" value={form.full_name} onChange={update("full_name")} placeholder="e.g. Jonathan Doe" />
            </Field>

            <Field label="CNIC / ID Card Number" required>
              <input className="input" value={form.id_card_number} onChange={update("id_card_number")} placeholder="00000-0000000-0" />
            </Field>

            <Field label="Date of Birth">
              <input className="input" type="date" value={form.date_of_birth} onChange={update("date_of_birth")} />
            </Field>

            <Field label="Gender">
              <select className="input" value={form.gender} onChange={update("gender")}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>

            <Field label="Phone Number">
              <input className="input" value={form.phone} onChange={update("phone")} placeholder="+92 300 0000000" />
            </Field>

            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={update("email")} placeholder="patient@email.com" />
            </Field>

            <Field label="Blood Group">
              <select className="input" value={form.blood_group} onChange={update("blood_group")}>
                <option value="">Select Blood Group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </Field>

            <Field label="Primary Language">
              <select className="input" value={form.primary_language} onChange={update("primary_language")}>
                {["English", "Urdu", "Pashto", "Punjabi", "Sindhi", "Balochi", "Arabic"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Address">
                <input className="input" value={form.address} onChange={update("address")} placeholder="Street, City, Province" />
              </Field>
            </div>

            <Field label="Emergency Contact Name">
              <input className="input" value={form.emergency_contact} onChange={update("emergency_contact")} placeholder="Next of kin name" />
            </Field>

            <Field label="Emergency Contact Phone">
              <input className="input" value={form.emergency_phone} onChange={update("emergency_phone")} placeholder="+92 300 0000000" />
            </Field>
          </div>
        </div>

        {/* Clinical */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
              <div className="w-4 h-4 rounded border-2 border-[#f59e0b]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Clinical Foundation</h2>
              <p className="text-xs text-[#475569]">Pre-existing conditions and medical background</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Medical History & Primary Complaint">
              <textarea
                className="input resize-none"
                rows={3}
                value={form.medical_history}
                onChange={update("medical_history")}
                placeholder="Describe pre-existing conditions, current symptoms, and concerns..."
              />
            </Field>
            <Field label="Known Allergies">
              <textarea
                className="input resize-none"
                rows={2}
                value={form.allergies}
                onChange={update("allergies")}
                placeholder="List any known drug or food allergies..."
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><UserPlus size={15} /> Register & Assign Token <ChevronRight size={15} /></>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
