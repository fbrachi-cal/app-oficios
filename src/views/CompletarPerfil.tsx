import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const CompletarPerfil = () => {
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<'cliente' | 'profesional'>('cliente');
    const [zonas, setZonas] = useState<string[]>([]);
    const [oficios, setOficios] = useState<string[]>([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [uid, setUid] = useState('');
    const [token, setToken] = useState('');

    const [zonasDisponibles, setZonasDisponibles] = useState<string[]>([]);
    const [oficiosDisponibles, setOficiosDisponibles] = useState<string[]>([]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/login');
            return;
        }

        fetch(`${config.apiBaseUrl}/utils/zonas`)
            .then(res => res.json())
            .then(setZonasDisponibles);

        fetch(`${config.apiBaseUrl}/utils/oficios`)
            .then(res => res.json())
            .then(setOficiosDisponibles);

        setUid(user.uid);
        user.getIdToken().then(setToken);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const payload: any = {
                id: uid,
                nombre,
                tipo,
            };

            if (tipo === 'profesional') {
                payload.zonas = zonas;
                payload.oficios = oficios;
            }

            const res = await fetch(`${config.apiBaseUrl}/usuarios/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Error al registrar usuario en backend');

            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('Error al completar perfil');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl mb-4 font-bold">Completar Perfil</h2>

                {error && <p className="text-red-500 mb-3">{error}</p>}

                <input
                    type="text"
                    placeholder="Nombre completoss"
                    className="w-full mb-3 p-2 border rounded"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                />

                <select
                    className="w-full mb-4 p-2 border rounded"
                    value={tipo}
                    onChange={e => setTipo(e.target.value as 'cliente' | 'profesional')}
                >
                    <option value="cliente">Cliente</option>
                    <option value="profesional">Profesional</option>
                </select>

                {tipo === 'profesional' && (
                    <>
                        <label className="block mb-1 font-medium">Zonas donde trabaja</label>
                        <select
                            multiple
                            className="w-full mb-3 p-2 border rounded"
                            onChange={e =>
                                setZonas(Array.from(e.target.selectedOptions, option => option.value))
                            }
                        >
                            {zonasDisponibles.map(z => (
                                <option key={z} value={z}>{z}</option>
                            ))}
                        </select>

                        <label className="block mb-1 font-medium">Oficios</label>
                        <select
                            multiple
                            className="w-full mb-4 p-2 border rounded"
                            onChange={e =>
                                setOficios(Array.from(e.target.selectedOptions, option => option.value))
                            }
                        >
                            {oficiosDisponibles.map(o => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </>
                )}


                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                    Guardar Perfil
                </button>
            </form>
        </div>
    );
};

export default CompletarPerfil;
