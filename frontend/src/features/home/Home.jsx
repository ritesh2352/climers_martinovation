import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthUser } from "../auth/hooks/authUser";

export default function Home() {
  const { user, handleLogout } = useAuthUser();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onLogout() {
    setError("");
    setSubmitting(true);
    try {
      await handleLogout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign out. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="home-page">
      <section className="home-card" aria-labelledby="welcome-heading">
        <h1 id="welcome-heading">
          Welcome{user?.userName ? `, ${user.userName}` : ""}
        </h1>
        <p>You’re signed in to Climers{user?.email ? ` as ${user.email}` : ""}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button
          className="button primary-button"
          type="button"
          onClick={onLogout}
          disabled={submitting}
        >
          {submitting ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </main>
  );
}
