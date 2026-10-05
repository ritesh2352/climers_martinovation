import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthUser } from "../hooks/authUser";
import "./auth.form.scss";

function Login() {
  const { loading, handleLogin } = useAuthUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    // 1. Trim inputs to remove accidental spaces
  const trimmedEmail = email.trim();
  
  // 2. Validation Checks
  if (!trimmedEmail ||  !password) {
    setError("All fields are required.");
    return;
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    setError("Please enter a valid email address.");
    return;
  }
  
  
  
  if (password.length < 6) {
    setError("Password must be at least 6 characters long.");
    return;
  }
    setSubmitting(true);
    try {
      await handleLogin({ email, password });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="form-container">
        <h1>Login</h1>
        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              id="email"
              name="email"
              value={email}
              required
              disabled={submitting}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              id="password"
              name="password"
              value={password}
              required
              disabled={submitting}
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary-button" type="submit" disabled={loading || submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p>
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>
        <p>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </div>
    </main>
  );
}

export default Login;