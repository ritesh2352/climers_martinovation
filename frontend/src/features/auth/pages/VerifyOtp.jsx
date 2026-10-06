import { useLocation, useNavigate, Link } from "react-router";
import { useState } from "react";
import { verifyPasswordResetOtp } from "../services/authApi";
import "./auth.form.scss";

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError("Please enter the OTP.");
      return;
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError("OTP must be a 6-digit number.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyPasswordResetOtp({ email, otp: trimmedOtp });
      navigate("/reset-password", {
        replace: true,
        state: { email, resetToken: result.resetToken },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to verify the code. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="form-container">
        <h1>Verify OTP</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email || "your email"}</strong>.
        </p>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="input-group">
            <label htmlFor="otp">OTP</label>
            <input
              type="text"
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              maxLength={6}
              placeholder="123456"
              disabled={submitting}
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="button primary-button" type="submit" disabled={submitting}>
            {submitting ? "Verifying…" : "Verify OTP"}
          </button>
        </form>

        <p>
          <Link to="/forgot-password">Back</Link>
        </p>
      </div>
    </main>
  );
}

export default VerifyOtp;
