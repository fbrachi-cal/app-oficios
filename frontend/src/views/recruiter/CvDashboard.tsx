import React, { useState, useEffect } from "react";
import { cvService, CV } from "../../services/cvService";
import CvUploadModal from "../../components/recruiter/CvUploadModal";
import { FiDownload, FiSearch, FiFilter } from "react-icons/fi";

const CvDashboard = () => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const loadCvs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchText) params.search_text = searchText;
      if (filterStatus) params.status = filterStatus;
      
      const data = await cvService.getCvs(params);
      setCvs(data);
    } catch (error) {
      console.error("Error loading cvs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCvs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCvs();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-blueGray-200">
        <div>
          <h1 className="text-2xl font-bold text-blueGray-800">
            Gestión de CVs
          </h1>
          <p className="text-sm text-blueGray-500 mt-1">Administrá y buscá candidatos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded shadow transition-colors"
        >
          Subir CV
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-blueGray-200">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-blueGray-400">
              <FiSearch />
            </span>
            <input 
              type="text" 
              placeholder="Buscar por skills, tags o texto..." 
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-blueGray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="w-full md:w-48 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-blueGray-400">
              <FiFilter />
            </span>
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-blueGray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="New">Nuevo</option>
              <option value="Contacted">Contactado</option>
              <option value="Interviewed">Entrevistado</option>
              <option value="Discarded">Descartado</option>
            </select>
          </div>
          <button type="submit" className="bg-blueGray-800 text-white px-4 py-2 rounded hover:bg-blueGray-900 font-semibold">
            Buscar
          </button>
        </form>

        {loading ? (
          <div className="text-center py-10">Cargando datos...</div>
        ) : cvs.length === 0 ? (
          <div className="text-center py-10 bg-blueGray-50 rounded border border-dashed border-blueGray-300 text-blueGray-500">
            No se encontraron CVs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blueGray-50 border-b border-blueGray-200 text-xs uppercase font-bold text-blueGray-500">
                  <th className="px-4 py-3">Candidato</th>
                  <th className="px-4 py-3">Seniority</th>
                  <th className="px-4 py-3">Tags & Skills</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Subido</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cvs.map(cv => (
                  <tr key={cv.id} className="border-b border-blueGray-100 hover:bg-blueGray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-blueGray-800">{cv.candidate_name}</div>
                      <div className="text-xs text-blueGray-500">{cv.email || 'Sin email'} | {cv.phone}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-blueGray-700">
                      {cv.seniority}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {cv.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{t}</span>)}
                        {cv.skills?.map(s => <span key={s} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{s}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                        {cv.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-blueGray-500">
                      {new Date(cv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a 
                        href={cv.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors tooltip"
                        title="Descargar CV"
                      >
                        <FiDownload />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CvUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setSearchText("");
          setFilterStatus("");
          loadCvs();
        }}
      />
    </div>
  );
};

export default CvDashboard;
