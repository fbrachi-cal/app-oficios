import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TermsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${t("terminos_condiciones")} | CasaClick`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" lang={i18n.language || "es"}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 min-w-0" aria-label="CasaClick home">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-slate-900 truncate">CasaClick</span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            ← {t("volver")}
          </Link>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12">
        <article className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 md:p-12">
            <header className="mb-8 pb-8 border-b border-slate-100">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                {t("terminos_condiciones")}
              </h1>
            </header>

            <div className="space-y-10">
              <section aria-labelledby="terms-heading" className="space-y-4">
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {t("texto_terminos_condiciones")}
                </div>
              </section>

              <section
                aria-labelledby="responsibility-heading"
                className="pt-8 border-t border-slate-100 space-y-4"
              >
                <p className="text-slate-600 leading-relaxed">
                  {t("comprendo_responsabilidad_casa_click")}
                </p>
              </section>

              <section
                aria-labelledby="community-commitment-heading"
                className="pt-8 border-t border-slate-100 space-y-4"
              >
                <h2
                  id="community-commitment-heading"
                  className="text-xl sm:text-2xl font-bold text-slate-900"
                >
                  {t("ver_compromiso")}
                </h2>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {t("texto_compromiso_comunidad")}
                </div>
              </section>
            </div>
          </div>
        </article>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CasaClick ·{" "}
        <a href="https://www.calconsultora.com.ar" className="hover:text-slate-800">
          Cal Consultora
        </a>
        {" · "}
        <Link to="/privacy" className="hover:text-slate-800">
          {t("politica_privacidad")}
        </Link>
      </footer>
    </div>
  );
};

export default TermsPage;
