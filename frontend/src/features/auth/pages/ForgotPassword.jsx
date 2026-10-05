import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { forgotPassword } from "../services/authApi";
import "./auth.form.scss";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    try {
      await forgotPassword({ email: trimmedEmail });
      navigate("/verify-otp", { replace: true, state: { email: trimmedEmail } });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not process your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="form-container">
        <h1>Forgot Password</h1>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
              required
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="button primary-button" type="submit" disabled={submitting}>
            {submitting ? "Sending OTP…" : "Send OTP"}
          </button>
        </form>

        <p>
          Remember your password? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </main>
  );
}

export default ForgotPassword;