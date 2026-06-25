import React, { useState, useEffect } from 'react';

// 👇 Use environment variable for backend URL (falls back to localhost)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function LeadsDashboard() {
  const [activeTab, setActiveTab] = useState('pipeline'); // Manage navigation tabs ('pipeline' or 'automation')
  const [leads, setLeads] = useState([]);
  const [newNotes, setNewNotes] = useState({}); // Tracking local inputs per lead ID
  
  // Track state and security credentials dynamically
  const [currentExecutive, setCurrentExecutive] = useState(() => localStorage.getItem('crm_user_identity') || '');
  const [token, setToken] = useState(() => localStorage.getItem('crm_auth_token') || '');
  const currentRole = "Executive"; // Explicitly defined to meet backend route access rules safely

  // Core linear pipeline steps for the visual tracker graphic
  const pipelineSteps = ['New', 'Contacted', 'Qualified', 'Approved', 'Converted'];

  // All valid stages available to the Executive in their workflow dropdown
  const corporateStages = [
    'New', 'Claimed', 'Contacted', 'Interested', 'Document Pending', 
    'Under Review', 'Qualified', 'Approved', 'Rejected', 'Converted', 'Lost', 'Resurrected'
  ];

  // Request token securely from backend auth pipeline – now with password
  const handleIdentityLogin = async (name, inputPassword) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, password: inputPassword }) // Sends the passcode down the wire safely
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('crm_auth_token', data.token);
        localStorage.setItem('crm_user_identity', data.username);
        setToken(data.token);
        setCurrentExecutive(data.username);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_user_identity');
    setToken('');
    setCurrentExecutive('');
    setLeads([]);
  };

  // Fetch leads passing encrypted authentication token headers
  const fetchLeads = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/v1/leads?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  useEffect(() => {
    if (token && currentExecutive) {
      fetchLeads();
      const interval = setInterval(fetchLeads, 10000); // Polling every 10s
      return () => clearInterval(interval);
    }
  }, [token, currentExecutive]);

  const handleGrabLead = async (leadId) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/leads/${leadId}/grab`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert(`Lead successfully assigned to you!`);
        fetchLeads(); 
      } else {
        const errData = await response.json();
        alert(`Grab Failed: ${errData.error}`);
        fetchLeads();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStageChange = async (leadId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchLeads();
      } else {
        const errData = await response.json();
        alert(`Status Change Rejected: ${errData.error}`);
      }
    } catch (error) {
      console.error("Error updating stage:", error);
    }
  };

  const handleNoteInputChange = (leadId, value) => {
    setNewNotes({ ...newNotes, [leadId]: value });
  };

  const handleAddNote = async (leadId) => {
    const noteText = newNotes[leadId];
    if (!noteText || !noteText.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/v1/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: noteText })
      });
      if (response.ok) {
        setNewNotes({ ...newNotes, [leadId]: '' }); 
        fetchLeads(); 
      } else {
        alert("Failed to save note.");
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  // Helper to calculate total value dynamically for dashboard counters
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
  const pendingApproval = leads.filter(l => l.status === 'Pending Approval').length;
  const approvedLeads = leads.filter(l => l.status === 'Approved').length;
  const rejectedLeads = leads.filter(l => l.status === 'Rejected').length;
  const convertedCustomers = leads.filter(l => l.status === 'Converted').length;

  // Calculates revenue by summing the deal_value of all 'Converted' leads
  const revenueGenerated = leads
    .filter(l => l.status === 'Converted')
    .reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

  // Helper to determine active highlights in the visual pipeline bar elements
  const getActivePipelineIndex = (currentStatus) => {
    if (pipelineSteps.includes(currentStatus)) return pipelineSteps.indexOf(currentStatus);
    if (['Contacted', 'Interested', 'Claimed', 'Resurrected'].includes(currentStatus)) return 1; 
    if (['Document Pending', 'Under Review', 'Qualified'].includes(currentStatus)) return 2; 
    if (currentStatus === 'Approved') return 3;
    if (currentStatus === 'Converted') return 4;
    return -1; 
  };

  if (!currentExecutive || !token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ color: '#1f2937', marginBottom: '8px' }}>🔐 CRM Verification Check</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Select your profile signature and provide your secure authorization passcode key.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['Alex (Sales)', 'Anjali (Sales)', 'Sachin (Sales)'].map(name => {
              // Creating a unique local variable scope per user option field block
              const formId = `pass_${name.replace(/\s+/g, '')}`;
              return (
                <div key={name} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#334155' }}>{name}</div>
                  <input 
                    id={formId}
                    type="password" 
                    placeholder="Enter password..." 
                    style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => {
                      const passValue = document.getElementById(formId).value;
                      handleIdentityLogin(name, passValue);
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                  >
                    Authenticate Session
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Dynamic CSS Injector for Fluidity across Screen Ratios & Layout Blocks */}
      <style>{`
        .crm-nav-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
        }
        .crm-nav-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .crm-responsive-row {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr 1fr 1fr 2fr 1fr;
          gap: 16px;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          align-items: start;
        }
        .crm-header-row {
          display: grid;
          font-weight: 600;
          background-color: #f3f4f6;
          color: #4b5563;
          font-size: 14px;
        }
        .crm-mobile-label {
          display: none;
          font-size: 11px;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .automation-flow-container {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: #ffffff;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .flow-step-block {
          text-align: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          min-width: 130px;
          flex: 1;
        }

        /* Responsive Breakpoint for Phone Media & Small Tablets */
        @media (max-width: 1024px) {
          .crm-header-row {
            display: none !important;
          }
          .crm-responsive-row {
            grid-template-columns: 1fr !important;
            gap: 14px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 16px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }
          .crm-mobile-label {
            display: block !important;
          }
          .automation-flow-container {
            flex-direction: column;
            align-items: stretch;
          }
          .flow-arrow {
            transform: rotate(90deg);
            margin: 4px auto;
          }
        }
      `}</style>

      {/* Header Profile Title Panel with Logout/Switch Switchboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#1f2937' }}>🔥 Enterprise Lead Pipeline & Dashboard</h2>
          <p style={{ margin: '0', color: '#4b5563' }}>Logged in as: <strong style={{ color: '#2563eb' }}>{currentExecutive}</strong> ({currentRole})</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          🔄 Switch Profile
        </button>
      </div>

      {/* Navigation Submenu Engine */}
      <div className="crm-nav-bar">
        <button 
          className="crm-nav-button"
          onClick={() => setActiveTab('pipeline')}
          style={{ 
            backgroundColor: activeTab === 'pipeline' ? '#2563eb' : '#e5e7eb',
            color: activeTab === 'pipeline' ? '#ffffff' : '#4b5563'
          }}
        >
          📋 Pipeline Dashboard
        </button>
        <button 
          className="crm-nav-button"
          onClick={() => setActiveTab('automation')}
          style={{ 
            backgroundColor: activeTab === 'automation' ? '#2563eb' : '#e5e7eb',
            color: activeTab === 'automation' ? '#ffffff' : '#4b5563'
          }}
        >
          ⚡ Real-Time Automation Setup
        </button>
      </div>
      
      {/* --- TAB VIEW 1: PIPELINE DASHBOARD --- */}
      {activeTab === 'pipeline' && (
        <>
          {/* --- ALL 8 METRICS DISPLAY GRID PANELS --- */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '32px' 
          }}>
            <div style={cardStyle('#ffffff', '#1f2937')}>
              <span style={labelStyle}>Total Leads</span>
              <span style={valueStyle}>{totalLeads}</span>
            </div>
            <div style={cardStyle('#e6f7ff', '#0050b3')}>
              <span style={labelStyle}>New Leads</span>
              <span style={valueStyle}>{newLeadsCount}</span>
            </div>
            <div style={cardStyle('#feffe6', '#ad8b00')}>
              <span style={labelStyle}>Qualified Leads</span>
              <span style={valueStyle}>{qualifiedLeads}</span>
            </div>
            <div style={cardStyle('#fff7e6', '#d46b08')}>
              <span style={labelStyle}>Pending Approval</span>
              <span style={valueStyle}>{pendingApproval}</span>
            </div>
            <div style={cardStyle('#f6ffed', '#389e0d')}>
              <span style={labelStyle}>Approved</span>
              <span style={valueStyle}>{approvedLeads}</span>
            </div>
            <div style={cardStyle('#fff1f0', '#cf1322')}>
              <span style={labelStyle}>Rejected</span>
              <span style={valueStyle}>{rejectedLeads}</span>
            </div>
            <div style={cardStyle('#f9f0ff', '#531dab')}>
              <span style={labelStyle}>Converted Customers</span>
              <span style={valueStyle}>{convertedCustomers}</span>
            </div>
            <div style={cardStyle('#e6fffb', '#08979c', true)}>
              <span style={labelStyle}>Revenue Generated</span>
              <span style={{ ...valueStyle, fontSize: '22px' }}>
                ${revenueGenerated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* --- LEADS DATA MANAGEMENT PIPELINE SECTION --- */}
          <div style={{ backgroundColor: 'transparent', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '16px', color: '#374151' }}>Lead Pipeline Records</h3>
            
            {/* Table Head row layout */}
            <div className="crm-responsive-row crm-header-row" style={{ borderRadius: '8px 8px 0 0', borderBottom: '2px solid #e5e7eb' }}>
              <div>Company / Lead Name</div>
              <div>Pipeline Funnel (Visual Tracker)</div>
              <div>Current Stage</div>
              <div>Assigned To</div>
              <div>Historical Interaction Notes</div>
              <div>Workflow Controls</div>
            </div>

            {/* Dynamic Records Content */}
            <div>
              {leads.map(lead => {
                const currentStepIdx = getActivePipelineIndex(lead.status);
                const savedNotesArray = Array.isArray(lead.notes) ? lead.notes : [];

                return (
                  <div 
                    key={lead.id} 
                    className="crm-responsive-row" 
                    style={{ 
                      backgroundColor: lead.status === 'New' ? '#f0f7ff' : '#ffffff',
                    }}
                  >
                    {/* 1. Profile Data Column */}
                    <div>
                      <div className="crm-mobile-label">Company / Lead</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{lead.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{lead.phone}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{lead.email || '—'}</div>
                      <div style={{ marginTop: '6px', fontSize: '12px' }}>
                        {lead.source_link && lead.source_link.startsWith('http') ? (
                          <a href={lead.source_link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>View Source ↗</a>
                        ) : (
                          <span style={{ color: '#64748b', fontStyle: 'italic' }}>{lead.source_link || '—'}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 2. Visual Pipeline Steps Column */}
                    <div>
                      <div className="crm-mobile-label">Pipeline Funnel</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                        {pipelineSteps.map((step, idx) => {
                          let stepBg = '#e2e8f0'; 
                          let stepText = '#64748b';
                          
                          if (idx <= currentStepIdx && currentStepIdx !== -1) {
                            stepBg = step === 'Converted' ? '#10b981' : '#3b82f6'; 
                            stepText = '#fff';
                          }
                          
                          return (
                            <div key={step} style={{ 
                              flex: '1 1 50px', 
                              backgroundColor: stepBg, 
                              color: stepText, 
                              padding: '6px 2px', 
                              textAlign: 'center', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: '600',
                              transition: 'all 0.3s ease'
                            }}>
                              {step}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Badge Indicators Column */}
                    <div>
                      <div className="crm-mobile-label">Current Stage</div>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '9999px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        display: 'inline-block',
                        ...getBadgeStyles(lead.status)
                      }}>
                        {lead.status}
                      </span>
                    </div>

                    {/* 4. Executive Assignment Info Column */}
                    <div>
                      <div className="crm-mobile-label">Assigned To</div>
                      <span style={{ fontSize: '14px', color: '#4b5563' }}>
                        {lead.assigned_to || <em style={{ color: '#9ca3af' }}>Unassigned</em>}
                      </span>
                    </div>

                    {/* 5. Logs & Communications Area Column */}
                    <div>
                      <div className="crm-mobile-label">Historical Interaction Notes</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                        {savedNotesArray.length > 0 && (
                          <div style={{ maxHeight: '110px', overflowY: 'auto', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                            {savedNotesArray.map((n, i) => (
                              <div key={i} style={{ fontSize: '12px', paddingBottom: '6px', marginBottom: '6px', borderBottom: i !== savedNotesArray.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>[{n.timestamp}]: </span>
                                <span style={{ color: '#334155' }}>{n.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Add Note</label>
                          <textarea 
                            rows="2" 
                            placeholder="e.g., Customer requested callback..." 
                            value={newNotes[lead.id] || ''} 
                            onChange={(e) => handleNoteInputChange(lead.id, e.target.value)} 
                            style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} 
                          />
                          <button 
                            onClick={() => handleAddNote(lead.id)} 
                            disabled={lead.assigned_to !== currentExecutive}
                            style={{ width: 'fit-content', padding: '6px 14px', background: lead.assigned_to === currentExecutive ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '6px', cursor: lead.assigned_to === currentExecutive ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '600' }}
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 6. Executive Control Actions Workflow Select */}
                    <div>
                      <div className="crm-mobile-label">Actions</div>
                      {(!lead.assigned_to || lead.status === 'New') ? (
                        <button 
                          onClick={() => handleGrabLead(lead.id)} 
                          style={{ backgroundColor: '#10b981', color: '#fff', padding: '8px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', width: '100%' }}
                        >
                          Grab Lead ⚡
                        </button>
                      ) : (
                        <select 
                          value={lead.status} 
                          onChange={(e) => handleStageChange(lead.id, e.target.value)} 
                          disabled={lead.assigned_to !== currentExecutive}
                          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', cursor: lead.assigned_to === currentExecutive ? 'pointer' : 'not-allowed', width: '100%' }}
                        >
                          {corporateStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* --- TAB VIEW 2: REAL-TIME AUTOMATION PAGE (Fully Preserved) --- */}
      {activeTab === 'automation' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: '0', color: '#1f2937' }}>⚙️ Option 2: Real-Time Webhook Pipeline Setup</h3>
          <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
            Configure your infrastructure to push new submissions instantly into the operational pipeline. When a client submits a Google Form, it updates the ledger and triggers a REST event directly to your cloud data model.
          </p>

          {/* Visual Architecture Map Flow Component Block */}
          <div className="automation-flow-container">
            <div className="flow-step-block">
              <strong style={{ color: '#2563eb' }}>📋 Google Form</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>User Submission</div>
            </div>
            <div className="flow-arrow" style={{ color: '#94a3b8', fontWeight: 'bold' }}>➔</div>
            <div className="flow-step-block">
              <strong style={{ color: '#0f766e' }}>📊 Google Sheets</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Row Generation</div>
            </div>
            <div className="flow-arrow" style={{ color: '#94a3b8', fontWeight: 'bold' }}>➔</div>
            <div className="flow-step-block">
              <strong style={{ color: '#b45309' }}>⚙️ Apps Script Trigger</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>OnFormSubmit Hook</div>
            </div>
            <div className="flow-arrow" style={{ color: '#94a3b8', fontWeight: 'bold' }}>➔</div>
            <div className="flow-step-block">
              <strong style={{ color: '#7c3aed' }}>🚀 CRM API Endpoint</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>POST Request</div>
            </div>
            <div className="flow-arrow" style={{ color: '#94a3b8', fontWeight: 'bold' }}>➔</div>
            <div className="flow-step-block">
              <strong style={{ color: '#475569' }}>🗄️ PostgreSQL</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Instant Refresh</div>
            </div>
          </div>

          {/* Interactive Endpoint Copy Block */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>Your Live Production Webhook URL</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                readOnly 
                value="https://crm-backend-api-o6ua.onrender.com/api/v1/leads" 
                style={{ flex: 1, minWidth: '250px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#334155', fontFamily: 'monospace', fontSize: '13px' }}
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("https://crm-backend-api-o6ua.onrender.com/api/v1/leads");
                  alert("Webhook API Endpoint copied to clipboard!");
                }}
                style={{ backgroundColor: '#0f766e', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Technical Setup Manual Accordion */}
          <h4 style={{ color: '#1f2937', marginBottom: '12px' }}>🛠️ Step-by-Step Implementation Instructions</h4>
          <ol style={{ paddingLeft: '20px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '8px' }}>Open the target <strong>Google Sheet</strong> connected to your Google Form.</li>
            <li style={{ marginBottom: '8px' }}>Navigate to the top menu option: <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Clear any template text in the editor workspace and paste the optimized automation hook function script snippet provided below.</li>
            <li style={{ marginBottom: '8px' }}>Click the <strong>Triggers</strong> configuration icon (shaped like an alarm clock) in the left sidebar menu.</li>
            <li style={{ marginBottom: '8px' }}>Select <strong>Add Trigger</strong>. Assign the model configuration to run the function <code>sendLeadToCRM</code>, specify the deployment source phase type as <strong>From Spreadsheet</strong>, and choose the validation event type as <strong>On form submit</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Click save and approve data sandbox access authorizations when requested. Your real-time connection pipeline is fully operational.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

// --- VISUAL STYLE CARD CONFIGURATORS ---
const cardStyle = (bgColor, textColor, fullBorder = false) => ({
  backgroundColor: bgColor,
  color: textColor,
  padding: '16px',
  borderRadius: '8px',
  border: fullBorder ? `2px dashed ${textColor}` : `1px solid rgba(0,0,0,0.06)`,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
});

const labelStyle = { fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', opacity: 0.8, marginBottom: '4px' };
const valueStyle = { fontSize: '26px', fontWeight: 'bold' };

const getBadgeStyles = (status) => {
  if (['New', 'Claimed', 'Contacted', 'Interested', 'Resurrected'].includes(status)) return { backgroundColor: '#eff6ff', color: '#1d4ed8' };
  if (['Document Pending', 'Under Review'].includes(status)) return { backgroundColor: '#fff7ed', color: '#c2410c' };
  if (status === 'Qualified') return { backgroundColor: '#fef9c3', color: '#a16207' };
  if (status === 'Approved') return { backgroundColor: '#ecfdf5', color: '#047857' };
  if (status === 'Converted') return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #059669' };
  return { backgroundColor: '#f1f5f9', color: '#475569' }; 
};