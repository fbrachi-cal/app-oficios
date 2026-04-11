import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbars/AuthNavbar";
import Footer from "../../components/Footers/Footer";
import config from "../../config";
import { fetchConToken } from "../../utils/fetchConToken";
import { useTranslation } from "react-i18next";
import { ChatDrawer } from "../../components/Chat/ChatDrawer";
import ModalSolicitud from "../../components/Modal/ModalSolicitud";
import FormSolicitud from "../../components/Forms/FormSolicitud";
import default_avatar from "../../assets/img/default_avatar.png";
import { solicitudService } from "../../services/solicitudService";
import { useLoading } from "../../context/LoadingContext";
import { useNavigate } from "react-router-dom";

const PerfilProfesional: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [profesional, setProfesional] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSolicitudOpen, setIsSolicitudOpen] = useState(false);
  const { setLoading } = useLoading();
  const [mensaje, setMensaje] = useState<string | null>(null);



  useEffect(() => {
    const obtenerProfesional = async () => {
      const res = await fetchConToken(`${config.apiBaseUrl}/usuarios/${id}`);
      const data = await res.json();
      setProfesional(data);
    };

    obtenerProfesional();
  }, [id]);

  if (!profesional) return <div className="text-center p-10">{t("cargando")}</div>;

  return (
    <>
      <Navbar transparent />
      <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow hover:bg-blue-100 transition"
                title="Volver">
                <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
      {mensaje && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow z-[9999]">
          {mensaje}
        </div>
      )}
      <main className="profile-page">
        <section className="relative block h-500-px">
          <div
            className="absolute top-0 w-full h-full bg-center bg-cover"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1499336315816-097655dcfbda?auto=format&fit=crop&w=2710&q=80')",
            }}
          >
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-50 bg-black"
            ></span>
          </div>
          <div
            className="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-70-px"
            style={{ transform: "translateZ(0)" }}
          >
            <svg
              className="absolute bottom-0 overflow-hidden"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2560 100"
            >
              <polygon
                className="text-blueGray-200 fill-current"
                points="2560 0 2560 100 0 100"
              ></polygon>
            </svg>
          </div>
        </section>

        <section className="relative py-16 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-xl rounded-lg -mt-64">
              <div className="px-6">
                <div className="flex flex-wrap justify-center">
                  <div className="w-full lg:w-3/12 px-4 lg:order-2 flex justify-center">
                    <div className="relative">
                      <img
                        alt="..."
                        src={profesional.foto || default_avatar}
                        className="shadow-xl rounded-full h-auto align-middle border-none absolute -m-16 -ml-20 lg:-ml-16 max-w-150-px"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-4/12 px-4 lg:order-3 lg:text-right lg:self-center">
                    <div className="py-6 px-3 mt-32 sm:mt-0">
                      <button
                        className="bg-lightBlue-500 text-white text-xs px-4 py-2 rounded"
                        type="button"
                        onClick={() => setIsSolicitudOpen(true)
                          //setIsChatOpen(true)
                        }
                      >
                        {t("contactar")}
                      </button>
                    </div>
                  </div>
                  <div className="w-full lg:w-4/12 px-4 lg:order-1">
                    <div className="flex justify-center py-4 lg:pt-4 pt-8">
                      <div className="mr-4 p-3 text-center">
                        <span className="text-xl font-bold block text-blueGray-600">
                          {profesional.cantidadCalificaciones ?? 0}
                        </span>
                        <span className="text-sm text-blueGray-400">{t("trabajos")}</span>
                      </div>
                      <div className="mr-4 p-3 text-center">
                        <span className="text-xl font-bold block text-blueGray-600">
                          {profesional.promedioCalificacion ?? 0}⭐
                        </span>
                        <span className="text-sm text-blueGray-400">{t("calificacion")}</span>
                      </div>
                      <div className="p-3 text-center">
                        <span className="text-xl font-bold block text-blueGray-600">
                          {profesional.disponibilidad || t("no_especificada")}
                        </span>
                        <span className="text-sm text-blueGray-400">{t("disponibilidad")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-12">
                  <h3 className="text-4xl font-semibold text-blueGray-700">
                    {profesional.nombre}
                  </h3>
                  <div className="text-sm text-blueGray-400 mt-2">
                    <i className="fas fa-map-marker-alt mr-2 text-lg text-blueGray-400"></i>
                    {profesional.zonas?.join(", ") || t("sin_zonas_asignadas")}
                  </div>
                  <div className="mb-2 text-blueGray-600 mt-4">
                    <i className="fas fa-tools mr-2 text-lg text-blueGray-400"></i>
                    {profesional.subcategorias?.join(", ") || t("sin_oficios")}
                  </div>
                </div>

                <div className="mt-10 py-10 border-t border-blueGray-200 text-center">
                  <div className="flex flex-wrap justify-center">
                    <div className="w-full lg:w-9/12 px-4">
                      <p className="mb-4 text-lg leading-relaxed text-blueGray-700">
                        {profesional.descripcion || t("sin_descripcion_profesional")}
                      </p>
                      <a href="#" className="font-normal text-lightBlue-500">
                        {t("mostrar_mas")}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>      
      <Footer />
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialProfessionalId={id}
      />

      <ModalSolicitud isOpen={isSolicitudOpen} onClose={() => setIsSolicitudOpen(false)}>
        <h2 className="text-xl font-bold mb-4 text-blueGray-700">{t("nueva_solicitud")}</h2>
        <FormSolicitud
          zonasDisponibles={profesional.zonas || []}
          subcategoriasDisponibles={profesional.subcategorias || []}
          onCancel={() => setIsSolicitudOpen(false)}
          
          onSubmit={async (data) => {
            try {
              setLoading(true);
              if (!id) return <div className="text-center p-10">{t("id_invalido")}</div>;
              const respuesta = await solicitudService.crearSolicitud(id, data);
              logger.info("Solicitud enviada", { respuesta });
              setMensaje("✅ " + t("solicitud_enviada_exito"));
              setIsSolicitudOpen(false);              
              navigate("/landing"); // o donde quieras
            } catch (error) {
              logger.error("Error al enviar solicitud", error);
              setMensaje("❌ " + t("error_enviar_solicitud"));
            } finally {
              setLoading(false);
              setTimeout(() => setMensaje(null), 4000); // ocultar mensaje después de 4s
            }
          }}
        />
      </ModalSolicitud>
    </>
  );
};

export default PerfilProfesional;
