import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from "../api/emergency";

export function EmergencyContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [relationship, setRelationship] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchContacts();
    }, []);

    async function fetchContacts() {
        try {
            setLoading(true);
            const data = await getEmergencyContacts();
            setContacts(data);
        } catch (err) {
            setError('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddContact(e) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const newContact = await addEmergencyContact({ name, phone_number: phoneNumber, relationship });
            setContacts([...contacts, newContact]);
            // Clear form
            setName('');
            setPhoneNumber('');
            setRelationship('');
        } catch (err) {
            setError('Failed to add contact');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Are you sure you want to delete this contact?")) return;
        try {
            await deleteEmergencyContact(id);
            setContacts(contacts.filter(c => c.id !== id));
        } catch (err) {
            alert('Failed to delete contact');
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: '500px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0 }}>Emergency Contacts</h1>
                    <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>&larr; Back to Map</Link>
                </div>
                <p className="subtitle">Manage trusted contacts for SOS alerts.</p>

                {error && <div className="error-panel" style={{ marginBottom: '16px' }}>{error}</div>}

                <div style={{ marginBottom: '24px' }}>
                    {loading ? (
                        <p>Loading contacts...</p>
                    ) : contacts.length === 0 ? (
                        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No emergency contacts saved yet.</p>
                    ) : (
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                            {contacts.map(contact => (
                                <li key={contact.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong style={{ display: 'block' }}>{contact.name}</strong>
                                        <span style={{ fontSize: '14px', color: '#4b5563' }}>{contact.phone_number} • {contact.relationship}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(contact.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                                        title="Delete contact"
                                    >
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <h3 style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>Add New Contact</h3>
                <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="input-group">
                        <label>Name</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div className="input-group">
                        <label>Phone Number</label>
                        <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+639..." />
                    </div>
                    <div className="input-group">
                        <label>Relationship</label>
                        <input type="text" required value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="Parent, Spouse, Friend..." />
                    </div>
                    
                    <button type="submit" disabled={submitting || contacts.length >= 3} className="btn-primary" style={{ marginTop: '8px' }}>
                        {submitting ? 'Adding...' : contacts.length >= 3 ? 'Max 3 Contacts Allowed' : 'Add Contact'}
                    </button>
                    {contacts.length >= 3 && (
                        <p style={{ fontSize: '12px', color: '#ef4444', margin: 0, textAlign: 'center' }}>
                            You have reached the maximum of 3 emergency contacts.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
