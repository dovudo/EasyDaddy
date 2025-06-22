import React, { useEffect, useState } from 'react';
import {
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
} from '../lib/storage';

const Popup: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [text, setText] = useState('');

  useEffect(() => {
    (async () => {
      const ps = await listProfiles();
      setProfiles(ps.map((p) => p.id));
      const act = (await getActiveProfileId()) || (ps[0]?.id || '');
      if (act) {
        setActiveId(act);
        const data = await getProfile(act);
        setText(JSON.stringify(data ?? {}, null, 2));
      }
    })();
  }, []);

  const handleSelect = async (id: string) => {
    setActiveId(id);
    setActiveProfileId(id);
    const data = await getProfile(id);
    setText(JSON.stringify(data ?? {}, null, 2));
  };

  const handleCreate = async () => {
    const id = prompt('Profile name?');
    if (!id) return;
    await saveProfile(id, {});
    setProfiles([...profiles, id]);
    handleSelect(id);
  };

  const handleDelete = async () => {
    if (!activeId) return;
    if (!confirm('Delete profile?')) return;
    await deleteProfile(activeId);
    const remaining = profiles.filter((p) => p !== activeId);
    setProfiles(remaining);
    const next = remaining[0] || '';
    handleSelect(next);
  };

  const handleTextChange = async (val: string) => {
    setText(val);
    try {
      const obj = JSON.parse(val || '{}');
      if (activeId) await saveProfile(activeId, obj);
    } catch (e) {
      // ignore JSON parse errors while editing
    }
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let raw = '';
    if (ext === 'pdf') {
      const pdfjs = await import('pdfjs-dist');
      const data = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        raw += tc.items.map((it: any) => it.str).join(' ') + '\n';
      }
    } else {
      raw = await file.text();
    }
    const parsed = await chrome.runtime.sendMessage({
      type: 'extract_profile',
      text: raw,
    });
    if (parsed && activeId) {
      try {
        const current = JSON.parse(text || '{}');
        const merged = { ...current, ...parsed };
        setText(JSON.stringify(merged, null, 2));
        await saveProfile(activeId, merged);
      } catch (_) {
        // ignore
      }
    }
  };

  const handleFill = async () => {
    if (!activeId) return;
    const profile = await getProfile(activeId);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id)
      chrome.tabs.sendMessage(tab.id, { type: 'start_fill', profile });
  };

  return (
    <div>
      <select value={activeId} onChange={(e) => handleSelect(e.target.value)}>
        {profiles.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <button onClick={handleCreate}>New Profile</button>
      <button onClick={handleDelete}>Delete Profile</button>
      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      <input
        type="file"
        accept=".txt,.md,.pdf"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      <button onClick={handleFill}>Fill Out</button>
    </div>
  );
};

export default Popup;
