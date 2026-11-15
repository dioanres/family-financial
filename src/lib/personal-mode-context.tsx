"use client";

import { createContext, useContext, useState } from "react";

type PersonalModeContextValue = {
  isPersonal: boolean;
  setIsPersonal: (value: boolean) => void;
};

const PersonalModeContext = createContext<PersonalModeContextValue | null>(
  null
);

export function PersonalModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPersonal, setIsPersonal] = useState(false);

  return (
    <PersonalModeContext.Provider value={{ isPersonal, setIsPersonal }}>
      {children}
    </PersonalModeContext.Provider>
  );
}

export function usePersonalMode() {
  const context = useContext(PersonalModeContext);
  if (!context) {
    throw new Error(
      "usePersonalMode must be used within a PersonalModeProvider"
    );
  }
  return context;
}
