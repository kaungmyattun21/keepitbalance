import { createContext, useContext } from "react";

export const FieldIdPrefixContext = createContext("");

export function useFieldIdPrefix(): string {
  return useContext(FieldIdPrefixContext);
}
