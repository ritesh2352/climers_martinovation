import { useContext } from "react";
import { AuthContext } from "../authContext.jsx";

export function useAuthUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthUser must be used within an AuthProvider");
  }
  return context;
}