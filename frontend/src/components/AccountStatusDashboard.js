import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api'; // Assuming an api utility exists

const cardStyle = {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '280px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
};

const AccountStatusDashboard = () => {
    const [userStatuses, setUserStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserStatuses = async () => {
            try {
                const data = await apiFetch('/api/admin/account-status');
                setUserStatuses(data);
            } catch (err) {
                setError('Failed to fetch account statuses. Please ensure you are logged in as an administrator.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserStatuses();
    }, []);

    if (loading) return <div>Loading Account Statuses...</div>;
    if (error) return <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>{error}</div>;

    return (
        <div style={{ marginTop: '20px' }}>
            <h2>Demo Account Status</h2>
            <p>This provides a default overview of the security policies for the demo accounts.</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
                {userStatuses.length > 0 ? userStatuses.map(user => (
                    <div key={user.username} style={cardStyle}>
                        <h3 style={{ textTransform: 'capitalize', marginTop: 0 }}>{user.username}</h3>
                        <p><strong>Policy:</strong> {user.policy_name}</p>
                        <p><strong>Threshold:</strong> Block after <strong>{user.fail_limit} failures</strong> in <strong>{user.fail_window_seconds}s</strong>.</p>
                    </div>
                )) : <p>No status information found for Alice or Ben.</p>}
            </div>
        </div>
    );
};

export default AccountStatusDashboard;