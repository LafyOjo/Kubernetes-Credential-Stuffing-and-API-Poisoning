import './LoginActivity.css';

export default function LoginActivity({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return <p>No login activity.</p>;
  }

  return (
    <table className="login-activity">
      <thead>
        <tr>
          <th>Time</th>
          <th>IP</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((a, idx) => (
          <tr key={idx}>
            <td>{a.time || 'Unknown'}</td>
            <td>{a.ip || 'Unknown'}</td>
            <td>{a.status || 'Unknown'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
