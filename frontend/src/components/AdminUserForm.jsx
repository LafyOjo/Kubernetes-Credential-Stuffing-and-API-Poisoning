import { useState } from "react";
import { apiFetch } from "../api";

function decode(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function AdminUserForm({ token }) {
  const decoded = decode(token);
  if (!decoded || decoded.role !== "admin") return null;

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "user",
    two_factor: false,
    security_question: false,
  });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const resp = await apiFetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setMessage("User created successfully");
      setForm({ username: "", password: "", role: "user", two_factor: false, security_question: false });
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Create User</h3>
      <form onSubmit={submit} className="space-y-2">
        <input
          className="block w-full p-1 border"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        <input
          className="block w-full p-1 border"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        <select
          className="block w-full p-1 border"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <label className="block">
          <input
            type="checkbox"
            name="two_factor"
            checked={form.two_factor}
            onChange={handleChange}
          />
          <span className="ml-2">Two Factor</span>
        </label>
        <label className="block">
          <input
            type="checkbox"
            name="security_question"
            checked={form.security_question}
            onChange={handleChange}
          />
          <span className="ml-2">Security Question</span>
        </label>
        <button type="submit" className="px-2 py-1 bg-blue-500 text-white rounded">
          Create
        </button>
      </form>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
