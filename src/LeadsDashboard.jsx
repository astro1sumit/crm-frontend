import React, { useState, useEffect } from 'react';

export default function LeadsDashboard() {
  const [leads, setLeads] = useState([]);
  const [newNotes, setNewNotes] = useState({}); // Tracking local inputs per lead ID
  const currentExecutive = "Alex (Sales)"; 
  const currentRole = "Executive"; // Explicitly defined to meet backend route access rules safely

  // Core linear pipeline steps for the visual tracker graphic
  const pipelineSteps = ['New', 'Contacted', 'Qualified', 'Approved', 'Converted'];

  // All valid enterprise corporate stages for the dropdown menu selection
  const corporateStages = [
    'New', 'Claimed', 'Contacted', 'Interested', 'Document Pending', 
    'Under Review', 'Qualified', 'Approved', 'Rejected', 'Converted', 'Lost'
  ];

  // Fetch leads from Node.js backend
  const fetchLeads = async () => {
    try {
      const response = await fetch('https://crm-backend-api-o6ua.onrender.com/api/v1/leads');
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  // Action to "Grab" the lead
  const handleGrabLead = async (leadId) => {
    try {
      const response = await fetch(`https://crm-backend-api-o6ua.onrender.com/api/v1/leads/${leadId}/grab`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          executiveName: currentExecutive,
          role: currentRole 
        })
      });
      if (response.ok) {
        alert(`Lead successfully assigned to you!`);
        fetchLeads(); 
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Triggers when an executive updates the CRM drop-down status
  const handleStageChange = async (leadId, newStatus) => {
    try {
      const response = await fetch(`https://crm-backend-api-o6ua.onrender.com/api/v1/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          role: currentRole
        })
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

  // Track the custom textarea entry text as the user types
  const handleNoteInputChange = (leadId, value) => {
    setNewNotes({ ...newNotes, [leadId]: value });
  };

  // Send the new note text to the historical append endpoint
  const handleAddNote = async (leadId) => {
    const noteText = newNotes[leadId];
    if (!noteText || !noteText.trim()) return;

    try {
      const response = await fetch(`https://crm-backend-api-o6ua.onrender.com/api/v1/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          note: noteText,
          role: currentRole
        })
      });

      if (response.ok) {
        setNewNotes({ ...newNotes, [leadId]: '' }); // Clear field locally
        fetchLeads(); // Refresh list to pull back the array including new item
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
    if (['Contacted', 'Interested', 'Claimed'].includes(currentStatus)) return 1; // Map backend claimed state into visual funnel step 1
    if (['Document Pending', 'Under Review', 'Qualified'].includes(currentStatus)) return 2; 
    if (currentStatus === 'Approved') return 3;
    if (currentStatus === 'Converted') return 4;
    return -1; // Statuses like Lost or Rejected do not advance the chevron tracker
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 4px 0', color: '#1f2937' }}>🔥 Enterprise Lead Pipeline & Dashboard</h2>
        <p style={{ margin: '0', color: '#4b5563' }}>Logged in as: <strong>{currentExecutive}</strong> ({currentRole})</p>
      </div>
      
      {/* --- ALL 8 METRICS DISPLAY GRID PANELS --- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
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

      {/* --- LEADS DATA MANAGEMENT TABLE --- */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: '0', color: '#374151' }}>Lead Pipeline Records</h3>
        <table border="0" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb', color: '#4b5563', fontSize: '14px' }}>
              <th>Company / Lead Name</th>
              <th>Pipeline Funnel (Visual Tracker)</th>
              <th>Current Stage</th>
              <th>Assigned To</th>
              <th style={{ width: '30%' }}>Historical Interaction Notes</th>
              <th>Workflow Controls</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => {
              const currentStepIdx = getActivePipelineIndex(lead.status);
              const savedNotesArray = Array.isArray(lead.notes) ? lead.notes : [];

              return (
                <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', backgroundColor: lead.status === 'New' ? '#f0f7ff' : 'transparent' }}>
                  {/* Basic Identifiers */}
                  <td style={{ paddingTop: '20px' }}>
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
                  </td>
                  
                  {/* VISUAL CRM PIPELINE TRACKER */}
                  <td style={{ paddingTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {pipelineSteps.map((step, idx) => {
                        let stepBg = '#e2e8f0'; 
                        let stepText = '#64748b';
                        
                        if (idx <= currentStepIdx && currentStepIdx !== -1) {
                          stepBg = step === 'Converted' ? '#10b981' : '#3b82f6'; 
                          stepText = '#fff';
                        }
                        
                        return (
                          <div key={step} style={{ 
                            flex: 1, 
                            backgroundColor: stepBg, 
                            color: stepText, 
                            padding: '6px 4px', 
                            textAlign: 'center', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}>
                            {step}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* STAGE BADGES */}
                  <td style={{ paddingTop: '20px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      ...getBadgeStyles(lead.status)
                    }}>
                      {lead.status}
                    </span>
                  </td>

                  {/* ASSIGNED INFO */}
                  <td style={{ paddingTop: '20px', color: '#4b5563' }}>
                    {lead.assigned_to || <em style={{ color: '#9ca3af' }}>Unassigned</em>}
                  </td>

                  {/* HISTORICAL TIMELINE NOTES */}
                  <td style={{ paddingTop: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* Historic Log Render Engine */}
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

                      {/* Input Text Form Area Component Block */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Add Note</label>
                        <textarea 
                          rows="2"
                          placeholder="e.g., Customer requested callback after 6 PM"
                          value={newNotes[lead.id] || ''}
                          onChange={(e) => handleNoteInputChange(lead.id, e.target.value)}
                          style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                        />
                        <button 
                          onClick={() => handleAddNote(lead.id)} 
                          style={{ width: 'fit-content', padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* DROPDOWN & GRAB PIPELINE CONTROLS */}
                  <td style={{ paddingTop: '20px' }}>
                    {lead.status === 'New' ? (
                      <button onClick={() => handleGrabLead(lead.id)} style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                        Grab Lead ⚡
                      </button>
                    ) : (
                      <select 
                        value={lead.status}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', width: '100%' }}
                      >
                        {corporateStages.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  if (['New', 'Claimed', 'Contacted', 'Interested'].includes(status)) return { backgroundColor: '#eff6ff', color: '#1d4ed8' };
  if (['Document Pending', 'Under Review'].includes(status)) return { backgroundColor: '#fff7ed', color: '#c2410c' };
  if (status === 'Qualified') return { backgroundColor: '#fef9c3', color: '#a16207' };
  if (status === 'Approved') return { backgroundColor: '#ecfdf5', color: '#047857' };
  if (status === 'Converted') return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #059669' };
  return { backgroundColor: '#f1f5f9', color: '#475569' }; 
};