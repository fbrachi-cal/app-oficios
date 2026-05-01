import React, { useState } from "react";
import { FiX, FiCheck, FiDownload } from "react-icons/fi";
import { cvService, CV } from "../../services/cvService";
import { useTranslation } from "react-i18next";

type Props = {
  isOpen: boolean;
  cv: CV | null;
  onClose: () => void;
  onUpdate: () => void;
};

const CvDetailModal = ({ isOpen, cv, onClose, onUpdate }: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [salaryExp, setSalaryExp] = useState("");
  const [interviewResult, setInterviewResult] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [residenceZone, setResidenceZone] = useState("");
  const [age, setAge] = useState<number | "">("");

  React.useEffect(() => {
    if (cv) {
      setNotes(cv.notes || "");
      setStatus(cv.status || "New");
      setSalaryExp(cv.salary_expectation || "");
      setInterviewResult(cv.casa_rayuela_interview_result || "");
      setClientNotes(cv.client_interview_notes || "");
      setResidenceZone(cv.residence_zone || "");
      setAge(cv.age || "");
      setEditMode(false);
      setError("");
    }
  }, [cv]);

  if (!isOpen || !cv) return null;

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError("");
      await cvService.updateCv(cv.id, {
        notes,
        status,
        salary_expectation: salaryExp || null,
        casa_rayuela_interview_result: interviewResult || null,
        client_interview_notes: clientNotes || null,
        residence_zone: residenceZone || null,
        age: age === "" ? null : Number(age),
      });
      setEditMode(false);
      onUpdate();
    } catch (err: any) {
      setError("Error actualizando CV");
    } finally {
      setLoading(false);
    }
  };

  const activeInputClass = "w-full border-blueGray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blueGray-900 bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-blueGray-200 flex justify-between items-center bg-blueGray-50">
          <h2 className="font-bold text-lg text-blueGray-800">Detalle de CV</h2>
          <button onClick={onClose} className="p-1 hover:bg-blueGray-200 rounded-full transition-colors">
            <FiX className="text-blueGray-600" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-sm text-blueGray-700">
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-blueGray-900">{cv.candidate_name}</h3>
              <p className="text-blueGray-500 mt-1">
                {cv.phone} {cv.email ? `| ${cv.email}` : ""}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded">
                  {cv.seniority}
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                  {cv.status}
                </span>
              </div>
            </div>
            <a href={cv.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blueGray-800 text-white px-4 py-2 rounded hover:bg-blueGray-900 shadow font-bold text-xs uppercase">
              <FiDownload size={14} />
              {t("cv.resup") || "Descargar CV"}
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blueGray-50 p-4 rounded border border-blueGray-200">
              <h4 className="font-bold text-blueGray-800 mb-2 uppercase text-xs">Información Básica</h4>
              <p><strong>{t("cv.age")}:</strong> {cv.age || "-"}</p>
              <p><strong>{t("cv.residence_zone")}:</strong> {cv.residence_zone || "-"}</p>
              <p><strong>{t("cv.salary_expectation")}:</strong> {cv.salary_expectation ? t(`cv.${cv.salary_expectation}`) : "-"}</p>
              <p><strong>Fuente:</strong> {cv.source}</p>
            </div>
            <div className="bg-blueGray-50 p-4 rounded border border-blueGray-200">
              <h4 className="font-bold text-blueGray-800 mb-2 uppercase text-xs">Skills & Tags</h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {cv.skills?.map(s => <span key={s} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded border border-green-200">{s}</span>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {cv.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">{t}</span>)}
              </div>
            </div>
          </div>

          <div className="border-t border-blueGray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-blueGray-800 uppercase text-xs">Evaluación / Notas</h4>
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="text-indigo-600 font-bold text-xs hover:text-indigo-800 transition-colors">
                  Editar Evaluación
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4 bg-indigo-50 p-4 rounded border border-indigo-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blueGray-600 mb-1">Estado</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={activeInputClass}>
                      <option value="New">Nuevo</option>
                      <option value="Contacted">Contactado</option>
                      <option value="Interviewed">Entrevistado</option>
                      <option value="Discarded">Descartado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blueGray-600 mb-1">{t("cv.salary_expectation")}</label>
                    <select value={salaryExp} onChange={e => setSalaryExp(e.target.value)} className={activeInputClass}>
                      <option value="">(No asignada)</option>
                      <option value="high">{t("cv.high")}</option>
                      <option value="medium">{t("cv.medium")}</option>
                      <option value="low">{t("cv.low")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blueGray-600 mb-1">{t("cv.residence_zone")}</label>
                    <input type="text" value={residenceZone} onChange={e => setResidenceZone(e.target.value)} className={activeInputClass} placeholder="Ej: CABA" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blueGray-600 mb-1">{t("cv.age")}</label>
                    <input type="number" min="16" max="99" value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : "")} className={activeInputClass} placeholder="Ej: 25" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blueGray-600 mb-1">{t("cv.casa_rayuela_interview_result")}</label>
                    <select value={interviewResult} onChange={e => setInterviewResult(e.target.value)} className={activeInputClass}>
                      <option value="">(Sin entrevista)</option>
                      <option value="excellent">{t("cv.excellent")}</option>
                      <option value="intermediate">{t("cv.intermediate")}</option>
                      <option value="bad">{t("cv.bad")}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blueGray-600 mb-1">Notas Internas (Rayuela)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className={activeInputClass} rows={3}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blueGray-600 mb-1">{t("cv.client_interview_notes")}</label>
                  <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} className={activeInputClass} rows={3}></textarea>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setEditMode(false)} className="px-3 py-1 bg-white border border-blueGray-300 text-blueGray-700 rounded text-xs font-bold hover:bg-blueGray-50">Cancelar</button>
                  <button onClick={handleUpdate} disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-indigo-700">
                    <FiCheck /> {loading ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-blueGray-500 mb-1">{t("cv.casa_rayuela_interview_result")}</p>
                  <p className="font-semibold text-blueGray-800">{cv.casa_rayuela_interview_result ? t(`cv.${cv.casa_rayuela_interview_result}`) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blueGray-500 mb-1">Notas Internas (Rayuela)</p>
                  <p className="whitespace-pre-wrap bg-blueGray-50 p-3 rounded text-blueGray-700">{cv.notes || "Sin notas"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blueGray-500 mb-1">{t("cv.client_interview_notes")}</p>
                  <p className="whitespace-pre-wrap bg-blueGray-50 p-3 rounded text-blueGray-700">{cv.client_interview_notes || "Sin notas"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CvDetailModal;
