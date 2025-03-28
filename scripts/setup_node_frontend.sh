#!/bin/bash

# Instala NVM si no existe
if [ ! -d "$HOME/.nvm" ]; then
  echo "Instalando NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Cargar NVM para este script
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Instala Node LTS si no está
if ! command -v node &> /dev/null; then
  echo "Instalando Node.js LTS..."
  nvm install --lts
fi

# Crear proyecto con Vite
echo "Creando proyecto React + Vite..."
npm create vite@latest app-oficios-frontend -- --template react-ts

cd app-oficios-frontend
npm install

echo "✅ Proyecto creado. Ejecutá:"
echo "cd app-oficios-frontend && npm run dev"

