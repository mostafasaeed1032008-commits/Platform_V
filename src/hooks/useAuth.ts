import { useAuth as useContextAuth } from "../contexts/AuthContext";

export const useAuth = () => {
  return useContextAuth();
};
