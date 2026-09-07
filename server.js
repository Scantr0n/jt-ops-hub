require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_TABLE = process.env.AIRTABLE_PROSPECTS_TABLE;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

const AUTOMATIONS = [
  {
    id: 'ULDPamu5oWy7jo8T',
    name: 'Prospect Research',
    workspace: 'csm',
    description: "Company/contact in, Perplexity researches it live, Claude writes the fit + drafts a first outreach email, both land in the pipeline automatically."
  },
  {
    id: 'GFOCJS3WL7g49p3f',
    name: 'Check Prospect Replies',
    workspace: 'csm',
    description: "Polls Gmail every 10 minutes. When a tracked prospect replies, Claude summarizes it and drafts a follow-up, both saved to their record."
  }
];

app.get('/api/prospects', async (req, res) => {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    const prospects = (data.records || []).map(rec => ({
      id: rec.id,
      name: rec.fields['Name'] || '',
      company: rec.fields['Company'] || '',
      status: rec.fields['Prospect Status'] || 'Researching',
      source: rec.fields['Source'] || '',
      notes: rec.fields['Notes'] || '',
      draftOutreach: rec.fields['Draft Outreach Email'] || '',
      approvedToSend: rec.fields['Approved to Send'] || false,
      latestReply: rec.fields['Latest Reply'] || '',
      draftedFollowup: rec.fields['Drafted Follow-up'] || '',
      contactEmail: rec.fields['Contact Email'] || '',
      contactPhone: rec.fields['Contact Phone'] || '',
      contactRole: rec.fields['Contact Role'] || '',
      contactMethod: rec.fields['Contact Method'] || 'Unconfirmed',
      followUpAttempts: rec.fields['Follow-up Attempts'] || 0,
      suggestedFollowup: rec.fields['Suggested Follow-up'] || '',
      activityNotes: rec.fields['Activity Notes'] || ''
    })).filter(p => p.name || p.company);
    res.json({ prospects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prospects/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note text required' });

    const getUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${id}`;
    const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const record = await getRes.json();
    if (!getRes.ok) return res.status(getRes.status).json({ error: record });

    const existing = record.fields['Activity Notes'] || '';
    const stamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const updated = existing ? `${existing}\n\n[${stamp}] ${note.trim()}` : `[${stamp}] ${note.trim()}`;

    const patchRes = await fetch(getUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { 'Activity Notes': updated, 'Last Contact Date': new Date().toISOString().slice(0, 10) } })
    });
    const patched = await patchRes.json();
    if (!patchRes.ok) return res.status(patchRes.status).json({ error: patched });
    res.json({ activityNotes: patched.fields['Activity Notes'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/automations', async (req, res) => {
  try {
    const results = await Promise.all(AUTOMATIONS.map(async (a) => {
      const r = await fetch(`${N8N_URL}/api/v1/workflows/${a.id}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      const wf = await r.json();
      const execRes = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${a.id}&limit=50`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      const execData = await execRes.json();
      const runs = execData.data || [];
      return {
        ...a,
        active: wf.active || false,
        runs: runs.length,
        succeeded: runs.filter(e => e.status === 'success').length,
        failed: runs.filter(e => e.status === 'error').length
      };
    }));
    res.json({ automations: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    const systemPrompt = `You are the assistant embedded in Jack's own local CSM/Sondrik ops hub, running on his Mac. Answer based on the real data given, be concise, no em dashes.\n\nCurrent data:\n${context}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: systemPrompt,
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    res.json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4477;
app.listen(PORT, () => {
  console.log(`JT Ops Hub running at http://localhost:${PORT}`);
});
