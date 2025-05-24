import React, { useState } from "react";

interface ModalCalificacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (calificacion: number, observacion: string) => void;
  titulo: string;
}

const ModalCalificacion: React.FC<ModalCalificacionProps> = ({
  isOpen,
  onClose,
  onSubmit,
  titulo,
}) => {
  const [calificacion, setCalificacion] = useState(0);
  const [observacion, setObservacion] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-lg font-bold"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">{titulo}</h2>

        <div className="flex gap-2 justify-center mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setCalificacion(n)}
              className={`text-2xl ${
                calificacion >= n ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          placeholder="Observación (opcional)"
          className="w-full border p-2 rounded mb-4"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSubmit(calificacion, observacion);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={calificacion === 0}
          >
            Calificar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCalificacion;
