import { Navigate } from "react-router";
import { useAuthUser } from "../hooks/authUser";

function Protected({children}) {
  const { user, loading } = useAuthUser();

  if (loading) {
    return <main className="app-loading" role="status">Loading your account…</main>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default Protected;