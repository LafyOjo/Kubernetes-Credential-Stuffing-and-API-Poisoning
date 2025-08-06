import { useEffect, useState } from 'react';
import { apiFetch } from './api';

export default function SecurityMeter({ username }) {
  const [enabled, setEnabled] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchState() {
      try {
        const resp = await apiFetch('/api/security');
        if (resp.ok) {
          const data = await resp.json();
          setEnabled(data.enabled);
        } else {
          setError(await resp.text());
        }
      } catch (err) {
        setError(err.message);
      }
    }
    fetchState();
  }, []);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (enabled === null) {
    return <p>Loading status for {username}...</p>;
  }

  return (
    <p>
      {username}: {enabled ? 'Zero Trust Enabled' : 'Zero Trust Disabled'}
    </p>
  );
}

