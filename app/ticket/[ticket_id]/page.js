"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function TicketPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [ticket, setTicket] = useState(null);
    const [pillStock, setPillStock] = useState([]);
    const [selectedPills, setSelectedPills] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const ticket_id = pathname.split('/').pop();

    useEffect(() => {
        if (!ticket_id) {
            router.push('/dashboard');
            return;
        }

        if (status === 'loading') {
            return;
        }

        if (!session) {
            router.push('/');
            return;
        }

        async function fetchTicket() {
            try {
                const response = await fetch(`/api/ticket/${ticket_id}`);
                if (!response.ok) {
                    const text = await response.text();
                    if (text.includes('<!DOCTYPE html>')) {
                        console.error('Received HTML response:', text);
                        throw new Error('Received HTML response, possibly a 404 or error page.');
                    }
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                if (data.status === 0) {
                    router.push('/dashboard');
                    return;
                }
                setTicket(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        async function fetchPillStock() {
            try {
                const response = await fetch('/api/medicine', { method: 'GET' });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setPillStock(data);
            } catch (err) {
                console.error('Error fetching pill stock:', err);
                setError(err.message);
            }
        }

        fetchTicket();
        fetchPillStock();
    }, [ticket_id, router, session, status]);

    const handlePillClick = (pill) => {
        setSelectedPills((prevSelectedPills) => {
            if (prevSelectedPills.some(selectedPill => selectedPill.pillstock_id === pill.pillstock_id)) {
                return prevSelectedPills; 
            }
            return [...prevSelectedPills, { ...pill, count: 0 }]; 
        });
    };

    const handleCountChange = (index, count) => {
        setSelectedPills((prevSelectedPills) => 
            prevSelectedPills.map((pill, i) =>
                i === index ? { ...pill, count: count } : pill
            )
        );
        setError('');
    };

    const handleSubmit = async () => {
        if (selectedPills.length === 0 || selectedPills.some(pill => pill.count === 0)) {
            toast.error('Pill count is required');
            return;
        }

        const pillRecords = selectedPills.map(pill => ({
            pillstock_id: pill.pillstock_id,
            quantity: pill.count,
        }));

        try {
            const response = await fetch('/api/medicine/submit_pillrecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ticket_id, pillRecords }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Data saved successfully:', data);

            // Update the local state to reflect the changes
            const updatedPillStock = pillStock.map(item => {
                const selectedPill = selectedPills.find(p => p.pillstock_id === item.pillstock_id);
                if (selectedPill) {
                    return { ...item, total: item.total - selectedPill.count }; // Deduct quantity from total
                }
                return item;
            });

            setPillStock(updatedPillStock);
            setSelectedPills([]);

            // Fetch the ticket status to check if it is 0
            const ticketResponse = await fetch(`/api/ticket/${ticket_id}`);
            if (!ticketResponse.ok) {
                throw new Error(`HTTP error! status: ${ticketResponse.status}`);
            }

            const ticketData = await ticketResponse.json();
            if (ticketData.status === 0) {
                router.push('/dashboard');
            }

        } catch (err) {
            console.error('Error saving data:', err);
            setError(err.message);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!ticket) {
        return <div>No ticket found.</div>;
    }

    return (
        <main>
            <Navbar session={session} />
            <ToastContainer />
            <div>
                <div className="flex min-h-screen bg-gray-100 grid col-3 gap-2">
                    <div className="">
                        <div className="grid col-start-2 ">
                            <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full m-auto">
                                <h1 className="flex justify-center content-center text-xl">Ticket Details</h1>
                                <p>Date and Time: {new Date(ticket.datetime).toLocaleString()}</p>
                                <p>Student Name: {ticket.student_name}</p>
                                <h2>Symptoms</h2>
                                {ticket.symptoms.length > 0 ? (
                                    <ul>
                                        {ticket.symptoms.map((symptom, index) => (
                                            <li key={symptom.symptomrecord_id || index}>
                                                {symptom.symptom_name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No symptoms recorded.</p>
                                )}
                            </div>
                        </div>

                        <div className="grid col-span-3">
                            <div className="flex justify-center items-center mx-5 mt-20">
                                <div className="w-full">
                                    <table className="border-collapse border mx-auto w-4/6">
                                        <thead>
                                            <tr className="border">
                                                <th className="border px-4 py-2">Lot Id</th>
                                                <th className="border px-4 py-2">Pill Name</th>
                                                <th className="border px-4 py-2">Dose</th>
                                                <th className="border px-4 py-2">Type Name</th>
                                                <th className="border px-4 py-2">Expire Date</th>
                                                <th className="border px-4 py-2">Total</th>
                                                <th className="border px-4 py-2">Unit Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pillStock.filter(item => item.total > 0).map(item => (
                                                <tr 
                                                    key={item.pillstock_id} 
                                                    className="border bg-blue-100 cursor-pointer transition-transform transform hover:scale-105 hover:shadow-lg" 
                                                    onClick={() => handlePillClick(item)}
                                                >
                                                    <td className="border px-4 py-2">{item.pillstock_id}</td>
                                                    <td className="border px-4 py-2">{item.pill_name}</td>
                                                    <td className="border px-4 py-2">{item.dose}</td>
                                                    <td className="border px-4 py-2">{item.type_name}</td>
                                                    <td className="border px-4 py-2">{new Date(item.expire).toLocaleDateString()}</td>
                                                    <td className="border px-4 py-2">{item.total}</td>
                                                    <td className="border px-4 py-2">{item.unit_type}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <br />
                                    <table className="border-collapse border mx-auto w-4/6 mt-4">
                                        <thead>
                                            <tr className="border">
                                                <th className="border px-4 py-2">Lot Id</th>
                                                <th className="border px-4 py-2">Pill Name</th>
                                                <th className="border px-4 py-2">Dose</th>
                                                <th className="border px-4 py-2">Type Name</th>
                                                <th className="border px-4 py-2">Expire Date</th>
                                                <th className="border px-4 py-2">Total</th>
                                                <th className="border px-4 py-2">Unit Type</th>
                                                <th className="border px-4 py-2 w-40">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPills.length > 0 ? (
                                                selectedPills.map((pill, index) => (
                                                    <tr 
                                                        key={index} 
                                                        className="border bg-blue-100 transition-transform transform hover:scale-105 hover:shadow-lg"
                                                    >
                                                        <td className="border px-4 py-2">{pill.pillstock_id}</td>
                                                        <td className="border px-4 py-2">{pill.pill_name}</td>
                                                        <td className="border px-4 py-2">{pill.dose}</td>
                                                        <td className="border px-4 py-2">{pill.type_name}</td>
                                                        <td className="border px-4 py-2">{new Date(pill.expire).toLocaleDateString()}</td>
                                                        <td className="border px-4 py-2">{pill.total}</td>
                                                        <td className="border px-4 py-2">{pill.unit_type}</td>
                                                        <td className="border px-4 py-2 w-20">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="border rounded px-2 py-1 w-full"
                                                                value={pill.count || ''}
                                                                onChange={(e) => handleCountChange(index, parseInt(e.target.value, 10))}
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border px-4 py-2 w-20">
                                                            <button
                                                                className="bg-red-500 text-white px-2 py-1 rounded"
                                                                onClick={() => {
                                                                    setSelectedPills((prevSelectedPills) =>
                                                                        prevSelectedPills.filter((_, i) => i !== index)
                                                                    );
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className="border bg-blue-100">
                                                    <td className="border px-4 py-2" colSpan="9">No pill selected</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-end mt-4 mx-80">
                                        <Button onClick={handleSubmit}>Submit</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}