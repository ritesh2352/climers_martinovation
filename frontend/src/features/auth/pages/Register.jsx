import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthUser } from "../hooks/authUser";
import "./auth.form.scss";

function Register() {
  const { loading, handleRegister } = useAuthUser();
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
      const trimmedEmail = email.trim();
  const trimmedUsername = userName.trim();
  
  // 2. Validation Checks
  if (!trimmedEmail || !trimmedUsername || !password) {
    setError("All fields are required.");
    return;
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    setError("Please enter a valid email address.");
    return;
  }
  
  if (trimmedUsername.length < 3) {
    setError("Username must be at least 3 characters long.");
    return;
  }
  
  if (password.length < 6) {
    setError("Password must be at least 6 characters long.");
    return;
  }
    setSubmitting(true);
    try {
      await handleRegister({ email, userName, password });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create your account. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="form-container">
        <h1>Create your account</h1>
        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="input-group">
            <label htmlFor="userName">Name</label>
            <input
              autoComplete="username"
              onChange={(event) => setUserName(event.target.value)}
              type="text"
              id="userName"
              name="userName"
              value={userName}
              required
              disabled={submitting}
            />
          </div>
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
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              id="password"
              name="password"
              value={password}
              required
              minLength={8}
              disabled={submitting}
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary-button" type="submit" disabled={loading || submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;