import axios from "../utils/axiosWithAuth";

export type StatusHistoryEntry = {
  status: string;
  date: string;
};

export type CV = {
  id: string;
  candidate_name: string;
  email: string | null;
  phone: string;
  file_url: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  skills: string[];
  seniority: string;
  status: string;
  status_history: StatusHistoryEntry[];
  notes: string;
  source: string;
  residence_zone?: string | null;
  age?: number | null;
  salary_expectation?: string | null;
  casa_rayuela_interview_result?: string | null;
  client_interview_notes?: string | null;
};

export type CVUpdateData = {
  candidate_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  skills?: string[];
  seniority?: string;
  status?: string;
  notes?: string;
  source?: string;
  residence_zone?: string | null;
  age?: number | null;
  salary_expectation?: string | null;
  casa_rayuela_interview_result?: string | null;
  client_interview_notes?: string | null;
};

export const cvService = {
  async getCvs(params?: { status?: string; seniority?: string; search_text?: string; salary_expectation?: string; casa_rayuela_interview_result?: string; residence_zone?: string }): Promise<CV[]> {
    const res = await axios.get("/cvs/", { params });
    return res.data;
  },

  async getCv(id: string): Promise<CV> {
    const res = await axios.get(`/cvs/${id}`);
    return res.data;
  },

  async uploadCv(formData: FormData): Promise<CV> {
    const res = await axios.post("/cvs/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async updateCv(id: string, data: CVUpdateData): Promise<CV> {
    const res = await axios.put(`/cvs/${id}`, data);
    return res.data;
  },
};
