import { useState } from "react";
import { Link, useLocation } from "react-router";
import { changePassword, resetPassword } from "../services/authApi";
import "./auth.form.scss";

function ResetPassword() {
  const location = useLocation();
  const resetToken = location.state?.resetToken || "";
  const [email, setEmail] = useState(location.state?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (resetToken) {
        await resetPassword({ token: resetToken, newPassword });
      } else {
        await changePassword({
          email: normalizedEmail,
          currentPassword,
          newPassword,
        });
      }
      setComplete(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to change your password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="form-container">
        <h1>{complete ? "Password changed" : resetToken ? "Reset password" : "Change password"}</h1>

        {complete ? (
          <>
            <p className="auth-subtitle">
              Your password has been updated. You can now sign in with your new
              password.
            </p>
            <p>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              {resetToken
                ? "Your code was verified. Choose a new password."
                : "Enter your email, current password, and choose a new password."}
            </p>
            <form onSubmit={handleSubmit} aria-busy={submitting}>
              {!resetToken && (
                <>
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
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="currentPassword">Current password</label>
                    <input
                      autoComplete="current-password"
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </>
              )}
              <div className="input-group">
                <label htmlFor="newPassword">New password</label>
                <input
                  autoComplete="new-password"
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  autoComplete="new-password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={submitting}
                />
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <button
                className="button primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Saving password…"
                  : resetToken
                    ? "Reset password"
                    : "Change password"}
              </button>
            </form>
            <p>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default ResetPassword;
