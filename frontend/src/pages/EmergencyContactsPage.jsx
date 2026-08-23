import { useState, useEffect } from "react";
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from "../api/emergency";
import { ShieldAlert, Trash2, UserPlus, Phone, AlertCircle, ShieldCheck } from "lucide-react";

export function EmergencyContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [relationship, setRelationship] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function fetchContacts() {
        try {
            setLoading(true);
            const data = await getEmergencyContacts();
            setContacts(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchContacts();
    }, []);

    async function handleAddContact(e) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const newContact = await addEmergencyContact({ name, phone_number: phoneNumber, relationship });
            setContacts([...contacts, newContact]);
            setName('');
            setPhoneNumber('');
            setRelationship('');
        } catch (e) {
            console.error(e);
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
        } catch (e) {
            console.error(e);
            alert('Failed to delete contact');
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 md:pb-12 animate-in fade-in duration-300">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 md:px-8">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-xl">
                        <ShieldAlert className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight m-0 text-foreground">
                            Emergency Contacts
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Manage trusted contacts for SOS alerts
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 md:px-8 pt-6 space-y-6">
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive text-sm font-bold rounded-2xl border border-destructive/20">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Contact List Card */}
                <section className="bg-card/90 backdrop-blur-md border border-border rounded-3xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Trusted Network
                    </h2>

                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-8">
                            <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No emergency contacts saved yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {contacts.map(contact => (
                                <li key={contact.id} className="flex items-center justify-between p-4 bg-muted/40 border border-border/50 rounded-2xl hover:bg-muted/60 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <strong className="block text-foreground font-bold">{contact.name}</strong>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {contact.phone_number} • {contact.relationship}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(contact.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                        title="Delete contact"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Add New Contact Form */}
                <section className="bg-card/90 backdrop-blur-md border border-border rounded-3xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add New Contact
                    </h2>

                    <form onSubmit={handleAddContact} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground ml-1">Name</label>
                            <input 
                                type="text" 
                                required 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="Jane Doe" 
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground ml-1">Phone Number</label>
                            <input 
                                type="tel" 
                                required 
                                value={phoneNumber} 
                                onChange={e => setPhoneNumber(e.target.value)} 
                                placeholder="+639..." 
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground ml-1">Relationship</label>
                            <input 
                                type="text" 
                                required 
                                value={relationship} 
                                onChange={e => setRelationship(e.target.value)} 
                                placeholder="Parent, Spouse, Friend..." 
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow placeholder:text-muted-foreground/50"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={submitting || contacts.length >= 3} 
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
                        >
                            <UserPlus className="w-5 h-5" />
                            {submitting ? 'Adding...' : contacts.length >= 3 ? 'Max 3 Contacts Allowed' : 'Add Contact'}
                        </button>
                        
                        {contacts.length >= 3 && (
                            <p className="text-xs text-destructive text-center font-bold mt-2">
                                You have reached the maximum of 3 emergency contacts.
                            </p>
                        )}
                    </form>
                </section>
            </main>
        </div>
    );
}
