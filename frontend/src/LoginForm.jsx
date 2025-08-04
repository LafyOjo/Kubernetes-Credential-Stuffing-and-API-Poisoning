import { useState } from "react";
import { apiFetch } from "./api";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      localStorage.setItem("token", data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">API Shield +</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Username</label>
          <input
            className="w-full px-3 py-2 border rounded"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <div className="flex">
            <input
              className="w-full px-3 py-2 border rounded"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(sp => !sp)}
              className="ml-2 px-2 py-1 border rounded"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-blue-500 text-white rounded"
        >
          Login
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </div>
  );
}
