import React, { createContext, useContext, useState } from "react";

interface LoadingContextType {
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  loading: false,
  setLoading: () => {},
});

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
