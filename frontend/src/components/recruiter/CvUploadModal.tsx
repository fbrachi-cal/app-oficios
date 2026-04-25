import React, { useState } from "react";
import { FiX, FiUploadCloud } from "react-icons/fi";
import { cvService } from "../../services/cvService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const CvUploadModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [skills, setSkills] = useState("");
  const [seniority, setSeniority] = useState("Junior");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload (.pdf, .doc, .docx)");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("candidate_name", name);
      formData.append("phone", phone);
      if (email) formData.append("email", email);
      formData.append("tags", tags);
      formData.append("skills", skills);
      formData.append("seniority", seniority);
      formData.append("file", file);

      await cvService.uploadCv(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error uploading CV. Check file size and type.");
    } finally {
      setLoading(false);
    }
  };

  const activeInputClass = "w-full border-blueGray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blueGray-900 bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-blueGray-200 flex justify-between items-center bg-blueGray-50">
          <h2 className="font-bold text-lg text-blueGray-800">Subir Nuevo CV</h2>
          <button onClick={onClose} className="p-1 hover:bg-blueGray-200 rounded-full transition-colors">
            <FiX className="text-blueGray-600" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded text-sm font-medium">
              {error}
            </div>
          )}

          <form id="upload-cv-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Nombre Completo *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className={activeInputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Teléfono *</label>
                <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className={activeInputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={activeInputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Seniority</label>
                <select value={seniority} onChange={e => setSeniority(e.target.value)} className={activeInputClass}>
                  <option value="Trainee">Trainee</option>
                  <option value="Junior">Junior</option>
                  <option value="Semi-Senior">Semi-Senior</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Tags (separados por coma)</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Ej: remoto, part-time" className={activeInputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-blueGray-600 uppercase mb-1">Skills (separados por coma)</label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Ej: React, Python, AWS" className={activeInputClass} />
              </div>
            </div>

            <div className="mt-6 border-2 border-dashed border-blueGray-300 rounded-lg p-6 bg-blueGray-50 text-center hover:bg-blueGray-100 transition-colors">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".pdf,.doc,.docx"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <FiUploadCloud className="text-4xl text-indigo-500 mb-3" />
                <span className="text-sm font-semibold text-blueGray-700">
                  {file ? file.name : "Seleccionar archivo (PDF o Word)"}
                </span>
                <span className="text-xs text-blueGray-500 mt-1">Arrastrá y soltá o hacé clic</span>
              </label>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-blueGray-200 bg-blueGray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded font-bold text-sm bg-white border border-blueGray-300 text-blueGray-700 hover:bg-blueGray-100">
            Cancelar
          </button>
          <button type="submit" form="upload-cv-form" disabled={loading} className="px-4 py-2 rounded font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
            {loading ? "Subiendo..." : "Subir CV"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CvUploadModal;
