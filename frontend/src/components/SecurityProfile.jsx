import './SecurityProfile.css';

const humanize = (str) => {
  const result = str.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export default function SecurityProfile({ profile = {} }) {
  if (!profile || Object.keys(profile).length === 0) {
    return <p>No security profile.</p>;
  }

  const entries = Object.entries(profile);
  return (
    <ul className="security-profile">
      {entries.map(([key, value]) => {
        if (typeof value === 'boolean') {
          return (
            <li key={key}>{`${humanize(key)} is ${value ? 'enabled' : 'disabled'}.`}</li>
          );
        }
        return (
          <li key={key}>{`${humanize(key)}: ${value ?? 'N/A'}.`}</li>
        );
      })}
    </ul>
  );
}
