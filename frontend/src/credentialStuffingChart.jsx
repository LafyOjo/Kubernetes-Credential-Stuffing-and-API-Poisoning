import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from './api';

const CredentialStuffingChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/api/credential-stuffing-stats');
                const stats = response.data;
                const chartData = [
                    {
                        name: 'Alice',
                        total: stats.alice.total_attempts,
                        successful: stats.alice.successful_attempts,
                    },
                    {
                        name: 'Ben',
                        total: stats.ben.total_attempts,
                        successful: stats.ben.successful_attempts,
                    },
                ];
                setData(chartData);
            } catch (error) {
                console.error("Error fetching credential stuffing stats:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Credential Stuffing Attempts</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total Attempts" />
                    <Bar dataKey="successful" fill="#82ca9d" name="Successful Attempts" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CredentialStuffingChart;